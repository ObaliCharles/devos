import { connectDB } from "./db";
import { Lesson, Phase, Roadmap, Skill, User } from "./models";
import { recordUsage } from "./ai";
import type { Resource } from "./ai-provider";
import type { GeneratedRoadmap, GenerateInput } from "./roadmap-gen";

/**
 * Writing a generated path to the database.
 *
 * Lives on its own rather than inside the server action because generation is
 * now driven from a streaming route handler as well — the route needs to save
 * the tree the moment the last skill is written, without going through an
 * action boundary that would buffer the whole thing first.
 */

/**
 * How many AI paths one person may keep. Generation is the most expensive thing
 * a user can do, and an unbounded pile of half-followed roadmaps helps nobody.
 */
export const MAX_AI_ROADMAPS = 8;

function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48) || "path"
  );
}

export async function countOwnedRoadmaps(userId: unknown) {
  await connectDB();
  return Roadmap.countDocuments({ owner: userId });
}

/**
 * Persist the whole tree owned by the user and make it their active path.
 *
 * Order is assigned here from array position, so the app's ordering never
 * depends on the model having returned things in order.
 */
export async function persistRoadmap({
  userId,
  input,
  data,
  provider,
  resources,
}: {
  userId: unknown;
  input: GenerateInput;
  data: GeneratedRoadmap;
  provider: string;
  resources: Resource[];
}) {
  await connectDB();

  const roadmap = await Roadmap.create({
    slug: `${slugify(data.title)}-${Date.now().toString(36)}`,
    title: data.title,
    summary: data.summary,
    owner: userId,
    origin: "ai",
    generatedFrom: {
      topic: input.topic,
      goal: input.goal,
      level: input.level ?? "beginner",
      months: input.months,
      hoursPerDay: input.hoursPerDay,
      style: input.style,
    },
    resources,
    grounded: resources.length > 0,
  });

  let lessonCount = 0;
  for (const [pi, phase] of data.phases.entries()) {
    const phaseDoc = await Phase.create({
      roadmap: roadmap._id,
      order: pi + 1,
      title: phase.title,
      subtitle: phase.subtitle,
    });
    for (const [si, skill] of phase.skills.entries()) {
      const skillDoc = await Skill.create({
        phase: phaseDoc._id,
        order: si + 1,
        title: skill.title,
        why: skill.why,
        difficulty: skill.difficulty,
      });
      for (const [li, lesson] of skill.lessons.entries()) {
        await Lesson.create({
          skill: skillDoc._id,
          order: li + 1,
          title: lesson.title,
          objectives: lesson.objectives,
          estimatedMinutes: lesson.estimatedMinutes,
          body: lesson.body,
          quiz: lesson.quiz,
          tasks: lesson.tasks,
          xp: 50,
        });
        lessonCount += 1;
      }
    }
  }

  // Bill the tokens and make this the active path in one go.
  await recordUsage(
    userId,
    // Generation does not thread usage out here; approximate by output size.
    // The cap that matters (request count) is already incremented.
    Math.round(JSON.stringify(data).length / 4),
    0,
    provider as "anthropic" | "groq",
  );
  await User.updateOne({ _id: userId }, { $set: { activeRoadmap: roadmap._id } });

  return { roadmapId: String(roadmap._id), lessons: lessonCount };
}
