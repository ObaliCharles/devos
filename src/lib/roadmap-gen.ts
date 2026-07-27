import { z } from "zod";
import { completeChat } from "./ai-provider";

/**
 * Turning a topic and a goal into a full learning path.
 *
 * ## Why this is two passes
 *
 * The first version asked one call for the whole tree — structure, markdown
 * bodies, and a quiz for every one of ~15 lessons — in a single strict JSON
 * object. That fails constantly, and it fails in the worst possible way: the
 * model writes a good outline, runs out of output tokens somewhere inside
 * lesson nine's body, and the closing braces never arrive. One truncated
 * string invalidates the entire tree, so the learner gets "the generated path
 * was incomplete" and nothing at all. Making `body` optional papered over it
 * by letting thin paths through, which is the other half of the complaint:
 * every lesson opened with the same generic filler.
 *
 * So generation now runs in two stages:
 *
 *   Pass 1  The outline only — phases, skills, lesson titles and objectives.
 *           A few hundred tokens. It effectively always completes, and it is
 *           the only thing that must be well-formed for the tree to be valid.
 *
 *   Pass 2  One call per skill, in parallel, writing the real teaching content
 *           for that skill's two or three lessons: a body, a quiz question and
 *           practice tasks. A skill is a small enough unit that the JSON
 *           reliably closes, and — the important part — a failure is now
 *           contained. If one skill's content call fails, that skill falls
 *           back to a metadata-driven body and the other eleven lessons are
 *           still fully written. Before, one bad token cost you the roadmap.
 *
 * Everything is validated with Zod before a single document is written,
 * because a half-parsed roadmap is worse than none: the mastery gate, the
 * dashboard and the review queue all assume a well-formed tree.
 */

const Question = z.object({
  prompt: z.string().min(1),
  choices: z.array(z.string().min(1)).min(2).max(5),
  answerIndex: z.coerce.number().int().min(0).default(0),
  explanation: z.string().default(""),
});

/**
 * Practice tasks on a generated lesson, levelled the same way the hand-authored
 * catalog levels them so a generated path and a catalog course teach the same
 * shape. 1 recall, 2 apply, 3 solve.
 */
const Task = z.object({
  level: z.coerce.number().int().min(1).max(3).catch(1).default(1),
  prompt: z.string().min(1),
  hint: z.string().optional().default(""),
});

const Lesson = z.object({
  title: z.string().min(1).max(160),
  objectives: z.array(z.string().min(1)).min(1).max(6).catch(["Understand this lesson's core idea."]),
  estimatedMinutes: z.coerce.number().int().min(5).max(180).catch(30).default(30),
  body: z.string().optional().default(""),
  quiz: z.array(Question).max(5).optional().default([]),
  tasks: z.array(Task).max(6).optional().default([]),
});

const Skill = z.object({
  title: z.string().min(1).max(140),
  why: z.string().max(500).optional().default(""),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).catch("beginner").default("beginner"),
  lessons: z.array(Lesson).min(1).max(8),
});

const Phase = z.object({
  title: z.string().min(1).max(140),
  subtitle: z.string().max(200).optional().default(""),
  skills: z.array(Skill).min(1).max(6),
});

const GeneratedRoadmap = z.object({
  title: z.string().min(1).max(160),
  summary: z.string().max(600).optional().default(""),
  phases: z.array(Phase).min(2).max(8),
});

export type GeneratedRoadmap = z.infer<typeof GeneratedRoadmap>;

export type GenerateInput = {
  topic: string;
  goal: string;
  level: "beginner" | "intermediate" | "advanced";
  /** Optional pasted context, a syllabus, job description, notes. */
  context?: string;
};

/* ------------------------------------------------------------------ Pass 1 */

const OUTLINE_SYSTEM = `You are a senior curriculum designer building a structured learning path inside a developer learning app.

Output ONLY valid JSON — no prose, no markdown fences, no commentary. Every brace and bracket must be balanced.

You are writing the OUTLINE ONLY. Do not write lesson content, quizzes or exercises; another step does that. Keep every string short.

Shape:
{
  "title": string,                     // names the path, e.g. "Become a Backend Engineer"
  "summary": string,                   // one sentence
  "phases": [                          // 3 to 5 phases, fundamentals -> advanced
    {
      "title": string,
      "subtitle": string,              // short
      "skills": [                      // 1 to 2 skills per phase
        {
          "title": string,
          "why": string,               // one sentence: why it matters in practice
          "difficulty": "beginner" | "intermediate" | "advanced",
          "lessons": [                 // 2 to 3 lessons per skill
            {
              "title": string,         // concrete and specific: "Indexing a slow query", not "Databases part 2"
              "objectives": string[],  // 1 to 3 short objectives, each starting with a verb
              "estimatedMinutes": number
            }
          ]
        }
      ]
    }
  ]
}

Rules:
- Aim for 12 to 18 lessons total.
- Tailor everything to the learner's topic and goal. Do NOT default to Python or AI unless they asked for it.
- Follow the conventional teaching order for this subject — the order a well-regarded course or the official documentation would use, not an arbitrary one.
- Every lesson title must name a specific, checkable capability. Reject any title you could copy into an unrelated course.
- Order phases from fundamentals to advanced; later phases must build on earlier ones.`;

/* ------------------------------------------------------------------ Pass 2 */

const CONTENT_SYSTEM = `You are a senior engineer writing the teaching content for a few lessons in a learning path.

Output ONLY valid JSON — no prose, no markdown fences, no commentary. Every brace and bracket must be balanced.

Shape:
{
  "lessons": [
    {
      "title": string,      // echo the title you were given, unchanged
      "body": string,       // markdown. See rules.
      "quiz": [ { "prompt": string, "choices": string[], "answerIndex": number, "explanation": string } ],
      "tasks": [ { "level": 1 | 2 | 3, "prompt": string, "hint": string } ]
    }
  ]
}

Body rules:
- 250 to 450 words of real teaching, in markdown. Use "##" subheadings.
- Include at least one fenced code block with a working, runnable example in the right language for the subject. If the subject is not code, use a concrete worked example instead.
- Explain WHY, not just what. Name the mistake a beginner actually makes here.
- Never write filler like "this lesson covers" or "let's dive in". Start with the idea.

Quiz rules:
- Exactly 1 question. answerIndex is the 0-based position of the correct choice.
- The wrong choices must be plausible — a misconception someone would really hold, not an obvious throwaway.

Task rules:
- 3 to 5 tasks. Level 1 is recall you can do straight after reading, level 2 combines two ideas, level 3 is a small problem where the approach is not handed to you.
- Each task must be something you can actually sit down and do. State the input and what the finished result looks like.
- Include at least one level 1 and at least one level 2.`;

function buildOutlinePrompt(input: GenerateInput) {
  const parts = [
    `Topic: ${input.topic}`,
    `Learner's goal: ${input.goal}`,
    `Current level: ${input.level}`,
  ];
  if (input.context?.trim()) {
    parts.push(
      `Additional context to follow closely (a syllabus, job description, or notes the learner provided):\n${input.context.trim().slice(0, 6000)}`,
    );
  }
  parts.push("Generate the outline now as JSON only.");
  return parts.join("\n\n");
}

function buildContentPrompt(
  input: GenerateInput,
  pathTitle: string,
  skill: { title: string; why: string; difficulty: string },
  lessons: { title: string; objectives: string[] }[],
) {
  return [
    `Learning path: ${pathTitle}`,
    `Learner's goal: ${input.goal}. Current level: ${input.level}.`,
    `Skill: ${skill.title}${skill.why ? ` — ${skill.why}` : ""} (${skill.difficulty})`,
    "",
    "Write the content for exactly these lessons, in this order:",
    lessons
      .map(
        (l, i) =>
          `${i + 1}. ${l.title}\n   Objectives: ${l.objectives.join("; ")}`,
      )
      .join("\n"),
    "",
    "Return JSON only.",
  ].join("\n");
}

/** Pull the JSON object out of a model reply, tolerant of stray text/fences. */
function extractJson(text: string): unknown {
  const trimmed = text.trim();
  // Strip a ```json ... ``` fence if the model added one despite instructions.
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("The model did not return JSON.");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

export type GenerateResult =
  | { ok: true; roadmap: GeneratedRoadmap; provider: string }
  | { ok: false; error: string };

/**
 * Ask the model for a roadmap and validate it. Does not touch the database , 
 * persistence is the caller's job (the server action), so this stays a pure,
 * testable transform from input to a validated tree.
 */
/** The pass-2 reply: content for one skill's lessons, matched back by title. */
const SkillContent = z.object({
  lessons: z
    .array(
      z.object({
        title: z.string().default(""),
        body: z.string().default(""),
        quiz: z.array(Question).max(3).optional().default([]),
        tasks: z.array(Task).max(6).optional().default([]),
      }),
    )
    .default([]),
});

export async function generateRoadmap(input: GenerateInput): Promise<GenerateResult> {
  /* ---- Pass 1: the outline ------------------------------------------- */
  let reply;
  try {
    reply = await completeChat({
      system: OUTLINE_SYSTEM,
      messages: [{ role: "user", content: buildOutlinePrompt(input) }],
      // An outline of ~15 lessons with no bodies is small. This is deliberately
      // generous rather than tight, so length is never the failure.
      maxTokens: 3000,
    });
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? `The generator could not reach a model. ${err.message}`
          : "The generator could not reach a model.",
    };
  }

  let parsed: unknown;
  try {
    parsed = extractJson(reply.text);
  } catch {
    return { ok: false, error: "The model returned something that was not valid JSON. Try again." };
  }

  const result = GeneratedRoadmap.safeParse(parsed);
  if (!result.success) {
    // Surface the first concrete problem so failures are debuggable rather than
    // a blanket "wrong shape". The path names exactly which field was off.
    const issue = result.error.issues[0];
    const where = issue?.path?.join(".") || "the response";
    console.error("[roadmap-gen] outline validation failed:", JSON.stringify(result.error.issues.slice(0, 4)));
    return {
      ok: false,
      error: `The generated path was incomplete (${where}: ${issue?.message ?? "invalid"}). Please try again.`,
    };
  }

  const roadmap = result.data;

  /* ---- Pass 2: content, one call per skill, in parallel ---------------- */

  // Flattened so every skill is filled concurrently rather than phase by
  // phase. A 15-lesson path is 6-8 calls; run in sequence that is a minute of
  // staring at a spinner, in parallel it is one call's latency.
  const skills = roadmap.phases.flatMap((phase) => phase.skills);

  await Promise.all(
    skills.map(async (skill) => {
      try {
        const res = await completeChat({
          system: CONTENT_SYSTEM,
          messages: [
            {
              role: "user",
              content: buildContentPrompt(input, roadmap.title, skill, skill.lessons),
            },
          ],
          maxTokens: 4000,
        });
        const content = SkillContent.safeParse(extractJson(res.text));
        if (!content.success) return;

        // Match on title where the model echoed it, fall back to position.
        // Never trust order alone: a model that drops a lesson would otherwise
        // shift every body onto the wrong lesson, which is worse than blank.
        const byTitle = new Map(
          content.data.lessons
            .filter((l) => l.title.trim())
            .map((l) => [l.title.trim().toLowerCase(), l]),
        );

        skill.lessons.forEach((lesson, i) => {
          const written =
            byTitle.get(lesson.title.trim().toLowerCase()) ?? content.data.lessons[i];
          if (!written) return;
          if (written.body.trim().length >= 120) lesson.body = written.body;
          if (written.quiz.length) lesson.quiz = written.quiz;
          if (written.tasks.length) lesson.tasks = written.tasks;
        });
      } catch (err) {
        // A skill whose content call failed keeps its outline and gets a
        // metadata body below. One bad call must not cost the whole path.
        console.error(`[roadmap-gen] content pass failed for "${skill.title}":`, err);
      }
    }),
  );

  /* ---- Normalise ------------------------------------------------------ */
  for (const skill of skills) {
    for (const lesson of skill.lessons) {
      for (const q of lesson.quiz) {
        if (q.answerIndex >= q.choices.length) q.answerIndex = 0;
      }
      // Drop a quiz whose choices are all identical — a real failure mode, and
      // an unanswerable question is worse than no question.
      if (lesson.quiz.some((q) => new Set(q.choices).size < q.choices.length)) {
        lesson.quiz = [];
      }
      if (!lesson.body || lesson.body.trim().length < 120) {
        lesson.body = fallbackLessonBody(lesson.title, lesson.objectives, skill.title);
      }
    }
  }

  return { ok: true, roadmap, provider: reply.provider };
}

/**
 * The body for a lesson whose content call failed.
 *
 * This should now be rare — it takes a network error or malformed JSON on a
 * single skill, not merely a long path. When it does happen the honest move is
 * to say so and hand the learner something they can act on, rather than
 * printing three lines of encouragement dressed up as a lesson. The previous
 * version ("work through the idea, try the smallest example yourself") was
 * indistinguishable from a lesson that had simply not been written, which is
 * exactly what it was.
 */
function fallbackLessonBody(title: string, objectives: string[], skill: string): string {
  const objs = objectives.map((o) => `- ${o}`).join("\n");
  return `## ${title}

Part of **${skill}**.

**By the end of this lesson you should be able to:**

${objs}

---

### This lesson's written content is missing

The path outline generated correctly, but the step that writes the teaching
content for **${skill}** did not come back. Nothing is wrong with your path —
this lesson just has no prose yet.

Two ways forward, both of which work right now:

1. **Ask the tutor below.** It has this lesson's title, its objectives and the
   skill it belongs to, and it will write you the explanation and a worked
   example on demand. Start with *"Teach me ${title.toLowerCase()} from first
   principles, with a code example."*
2. **Regenerate the path** from the roadmap page if you would rather have the
   written version stored.

The objectives above are real and were written for you — they are the checklist
to measure yourself against either way.`;
}
