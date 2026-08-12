import { connectDB } from "./db";
import { AiMemory, Challenge, Lesson, Note, Project } from "./models";
import { levelFromXp } from "./user";
import { getIndependence, getSkillCompetency } from "./queries/competency";

/**
 * Assembles what the assistant is allowed to know about this user and what they
 * are looking at. This is the entire reason the AI Centre exists rather than a
 * link to ChatGPT: the model answers with the workspace in front of it.
 *
 * Everything here is the user's own data, fetched with their id. Memory is the
 * editable facts they have let the assistant keep, see the memory page.
 */

/**
 * The learner-state half of Chapter 8 §10 — "current mastery" and "AI
 * dependency" — as a short paragraph any AI-facing prompt can append. Shared
 * rather than duplicated: `buildSystemContext` (the concept tutor) and
 * `requestExerciseHint` (the hint ladder) both need it, and they need it
 * phrased the same way, not two independent guesses at what "lean toward
 * lower hints" should sound like.
 *
 * Both halves are silent unless there is something real to say. A skill with
 * no evidence yet says nothing about mastery — there is nothing to report,
 * not a mastery of zero worth mentioning — and the independence share stays
 * quiet below a sample of 10, the same threshold `Independence.sample`'s own
 * doc comment already sets: fewer graded pieces than that do not mean
 * anything yet, and telling a model "62% independent" on a sample of two
 * would be steering its behaviour off noise.
 */
export async function learnerStateSummary(userId: unknown, skillId?: unknown): Promise<string> {
  const parts: string[] = [];

  if (skillId) {
    const competency = await getSkillCompetency(userId, skillId);
    if (competency.overall > 0) {
      parts.push(
        `Their recorded competency in this skill: ${competency.level} (${Math.round(competency.overall * 100)}% across the dimensions that matter for it).` +
          (competency.missing.length > 0
            ? ` Weakest so far: ${competency.missing.join(", ")}.`
            : " Every relevant dimension already has evidence behind it."),
      );
    }
  }

  const independence = await getIndependence(userId);
  if (independence.sample >= 10) {
    const solvedPct = Math.round(independence.solved * 100);
    const independentPct = Math.round(independence.independent * 100);
    let guidance = "";
    if (independence.solved > 0.3) {
      guidance =
        " They have been shown a full solution or strategy on a large share of recent work — favour the lower rungs of the hint ladder here, and ask what they have already tried before offering more.";
    } else if (independence.independent > 0.6) {
      guidance = " They solve most things unaided — a small nudge is usually enough; do not over-explain.";
    }
    parts.push(
      `Across their last ${independence.sample} graded pieces of work: ${independentPct}% solved unaided, ` +
        `${Math.round(independence.hinted * 100)}% with a hint, ${solvedPct}% where they were shown a solution or strategy.${guidance}`,
    );
  }

  return parts.join("\n\n");
}

export type Context = {
  lessonId?: string;
  projectId?: string;
  noteId?: string;
  challengeId?: string;
};

type UserLike = { _id: unknown; name?: string; xp?: number };

export async function buildSystemContext(user: UserLike, ctx: Context): Promise<string> {
  await connectDB();

  const parts: string[] = [];

  const level = levelFromXp(user.xp ?? 0);
  parts.push(
    `You are the assistant inside DeveloperOS, a workspace where ${user.name ?? "the user"} ` +
      `learns to build software. They are level ${level.level} (${level.title}). Be concrete, ` +
      `use code, and never hand over a finished solution to an exercise or challenge, explain ` +
      `well enough that they can write it themselves.`
  );

  // Editable long-term memory.
  const memory = await AiMemory.find({ user: user._id }).sort({ pinned: -1, updatedAt: -1 }).limit(30).lean();
  if (memory.length > 0) {
    parts.push(
      "What you remember about them (they can edit or delete any of this):\n" +
        memory.map((m) => `- ${m.key}: ${m.value}`).join("\n")
    );
  }

  // Whatever they are looking at right now.
  const [lesson, project, note, challenge] = await Promise.all([
    ctx.lessonId ? Lesson.findById(ctx.lessonId).select("title objectives body skill").lean() : null,
    ctx.projectId ? Project.findOne({ _id: ctx.projectId, user: user._id }).select("title description goal stack").lean() : null,
    ctx.noteId ? Note.findOne({ _id: ctx.noteId, user: user._id }).select("title body").lean() : null,
    ctx.challengeId ? Challenge.findById(ctx.challengeId).select("title prompt").lean() : null,
  ]);

  if (lesson) {
    const l = lesson as { title?: string; body?: string; skill?: unknown };
    parts.push(
      `They are reading the lesson "${l.title}". Its material:\n` + String(l.body ?? "").slice(0, 5000)
    );
    // Mastery + AI dependency (§10). Scoped to this lesson's skill, so the
    // tutor's tone can actually change: careful and hint-first for a skill
    // they lean on solutions for, lighter-touch for one they already handle.
    const state = await learnerStateSummary(user._id, l.skill);
    if (state) parts.push(state);
  }
  if (project) {
    const p = project as { title?: string; description?: string; goal?: string; stack?: Record<string, string[]> };
    const stack = Object.values(p.stack ?? {}).flat().filter(Boolean).join(", ");
    parts.push(
      `They are working on the project "${p.title}"` +
        (p.goal ? `, ${p.goal}` : p.description ? `, ${p.description}` : "") +
        (stack ? `. Stack: ${stack}.` : ".")
    );
  }
  if (note) {
    const n = note as { title?: string; body?: string };
    parts.push(`They have this note open, "${n.title}":\n${String(n.body ?? "").slice(0, 3000)}`);
  }
  if (challenge) {
    const c = challenge as { title?: string; prompt?: string };
    parts.push(
      `They are solving the coding challenge "${c.title}". Do not give the full solution:\n` +
        String(c.prompt ?? "").slice(0, 2000)
    );
  }

  return parts.join("\n\n");
}
