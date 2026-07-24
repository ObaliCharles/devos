import { connectDB } from "./db";
import { AiMemory, Challenge, Lesson, Note, Project } from "./models";
import { levelFromXp } from "./user";

/**
 * Assembles what the assistant is allowed to know about this user and what they
 * are looking at. This is the entire reason the AI Centre exists rather than a
 * link to ChatGPT: the model answers with the workspace in front of it.
 *
 * Everything here is the user's own data, fetched with their id. Memory is the
 * editable facts they have let the assistant keep, see the memory page.
 */

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
    ctx.lessonId ? Lesson.findById(ctx.lessonId).select("title objectives body").lean() : null,
    ctx.projectId ? Project.findOne({ _id: ctx.projectId, user: user._id }).select("title description goal stack").lean() : null,
    ctx.noteId ? Note.findOne({ _id: ctx.noteId, user: user._id }).select("title body").lean() : null,
    ctx.challengeId ? Challenge.findById(ctx.challengeId).select("title prompt").lean() : null,
  ]);

  if (lesson) {
    parts.push(
      `They are reading the lesson "${(lesson as { title?: string }).title}". Its material:\n` +
        String((lesson as { body?: string }).body ?? "").slice(0, 5000)
    );
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
