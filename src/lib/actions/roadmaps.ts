"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "../db";
import { Lesson, LessonProgress, Phase, Roadmap, Review, Skill, User } from "../models";
import { requireUser } from "../user";
import { checkCap, recordUsage } from "../ai";
import { generateRoadmap, type GenerateInput } from "../roadmap-gen";

/**
 * How many AI paths one person may keep. Generation is the most expensive thing
 * a user can do, and an unbounded pile of half-followed roadmaps helps nobody.
 */
const MAX_AI_ROADMAPS = 8;

function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48) || "path"
  );
}

/**
 * Generate a roadmap with AI, persist the whole tree owned by the user, and
 * make it their active path. Guarded by the same daily AI cap as chat, and
 * counted so tokens are billed against the day.
 */
export async function generateRoadmapAction(input: GenerateInput) {
  const user = await requireUser();

  const topic = input.topic?.trim();
  const goal = input.goal?.trim();
  if (!topic || !goal) {
    return { ok: false as const, error: "Give a topic and what you want to be able to do." };
  }

  const cap = await checkCap(user._id);
  if (!cap.ok) return { ok: false as const, error: cap.reason };

  await connectDB();
  const owned = await Roadmap.countDocuments({ owner: user._id });
  if (owned >= MAX_AI_ROADMAPS) {
    return {
      ok: false as const,
      error: `You can keep up to ${MAX_AI_ROADMAPS} generated paths. Delete one to make room.`,
    };
  }

  const result = await generateRoadmap({
    topic,
    goal,
    level: input.level ?? "beginner",
    context: input.context,
  });
  if (!result.ok) return { ok: false as const, error: result.error };

  const { roadmap: data, provider } = result;

  // Persist the tree. Order is assigned here from array position so the app's
  // ordering never depends on the model returning things in order.
  const roadmap = await Roadmap.create({
    slug: `${slugify(data.title)}-${Date.now().toString(36)}`,
    title: data.title,
    summary: data.summary,
    owner: user._id,
    origin: "ai",
    generatedFrom: { topic, goal, level: input.level ?? "beginner" },
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
          xp: 50,
        });
        lessonCount += 1;
      }
    }
  }

  // Bill the tokens and make this the active path in one go.
  await recordUsage(
    user._id,
    // completeChat does not thread usage out here; approximate by output size.
    // The cap that matters (request count) is already incremented.
    Math.round(JSON.stringify(data).length / 4),
    0,
    provider as "anthropic" | "groq",
  );
  await User.updateOne({ _id: user._id }, { $set: { activeRoadmap: roadmap._id } });

  revalidatePath("/learning", "layout");
  revalidatePath("/dashboard");
  return { ok: true as const, roadmapId: String(roadmap._id), lessons: lessonCount };
}

/** Switch the active path. Only a curated roadmap or one the user owns. */
export async function activateRoadmap(roadmapId: string) {
  const user = await requireUser();
  await connectDB();

  const roadmap = await Roadmap.findById(roadmapId).select("owner").lean<{ owner?: unknown } | null>();
  if (!roadmap) return { ok: false as const, error: "That path no longer exists." };
  if (roadmap.owner && String(roadmap.owner) !== String(user._id)) {
    return { ok: false as const, error: "That path is not yours." };
  }

  await User.updateOne({ _id: user._id }, { $set: { activeRoadmap: roadmapId } });
  revalidatePath("/learning", "layout");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

/**
 * Delete a generated path and everything under it, plus the user's progress on
 * its lessons. Curated roadmaps cannot be deleted. If the deleted path was
 * active, fall back to the default on next read (activeRoadmap is cleared).
 */
export async function deleteRoadmap(roadmapId: string) {
  const user = await requireUser();
  await connectDB();

  const roadmap = await Roadmap.findById(roadmapId).select("owner").lean<{ owner?: unknown } | null>();
  if (!roadmap) return { ok: false as const, error: "That path no longer exists." };
  if (!roadmap.owner || String(roadmap.owner) !== String(user._id)) {
    return { ok: false as const, error: "Only paths you generated can be deleted." };
  }

  const phaseIds = (await Phase.find({ roadmap: roadmapId }).select("_id").lean()).map((p) => p._id);
  const skillIds = (await Skill.find({ phase: { $in: phaseIds } }).select("_id").lean()).map((s) => s._id);
  const lessonIds = (await Lesson.find({ skill: { $in: skillIds } }).select("_id").lean()).map((l) => l._id);

  await Promise.all([
    Lesson.deleteMany({ _id: { $in: lessonIds } }),
    Skill.deleteMany({ _id: { $in: skillIds } }),
    Phase.deleteMany({ _id: { $in: phaseIds } }),
    Roadmap.deleteOne({ _id: roadmapId }),
    LessonProgress.deleteMany({ user: user._id, lesson: { $in: lessonIds } }),
    Review.deleteMany({ user: user._id, lesson: { $in: lessonIds } }),
  ]);

  await User.updateOne(
    { _id: user._id, activeRoadmap: roadmapId },
    { $unset: { activeRoadmap: "" } },
  );

  revalidatePath("/learning", "layout");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
