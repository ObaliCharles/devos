import { z } from "zod";
import { completeChat } from "./ai-provider";

/**
 * Turning a topic and a goal into a full learning path.
 *
 * The model is asked for strict JSON matching {@link GeneratedRoadmap}. We
 * validate it with Zod before a single document is written, because a roadmap
 * that is half-parsed is worse than none: the mastery gate, the dashboard and
 * the review queue all assume a well-formed tree. If the JSON is malformed or
 * the shape is wrong, generation fails cleanly and nothing is persisted.
 */

/**
 * The schema is deliberately forgiving about the *content* of a lesson and
 * strict only about its *structure*. Asking a model to emit a full markdown
 * body and a valid quiz for every one of ~15 lessons in a single strict JSON
 * call is the reason generation used to fail "shape" validation constantly:
 * one truncated body or missing quiz array failed the whole tree. So body and
 * quiz are optional here, the outline (phases → skills → lessons with
 * objectives) is what must be well-formed, and any lesson the model leaves thin
 * gets a real body filled in afterwards. Structure is enforced; prose is
 * best-effort and topped up.
 */
const Question = z.object({
  prompt: z.string().min(1),
  choices: z.array(z.string().min(1)).min(2).max(5),
  answerIndex: z.coerce.number().int().min(0).default(0),
  explanation: z.string().default(""),
});

const Lesson = z.object({
  title: z.string().min(1).max(160),
  objectives: z.array(z.string().min(1)).min(1).max(6).catch(["Understand this lesson's core idea."]),
  estimatedMinutes: z.coerce.number().int().min(5).max(180).catch(30).default(30),
  body: z.string().optional().default(""),
  quiz: z.array(Question).max(5).optional().default([]),
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

const SYSTEM = `You are a senior curriculum designer building a structured learning path inside a developer learning app.

Output ONLY valid JSON — no prose, no markdown fences, no commentary. It MUST be complete and closed (every brace and bracket balanced). Finishing the JSON is more important than long lesson bodies.

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
              "title": string,
              "objectives": string[],  // 1 to 3 short objectives
              "estimatedMinutes": number,
              "body": string,          // 2 to 4 short markdown paragraphs with one small code example
              "quiz": [ { "prompt": string, "choices": string[], "answerIndex": number, "explanation": string } ] // exactly 1 question
            }
          ]
        }
      ]
    }
  ]
}

Rules:
- Aim for about 10 to 16 lessons total. Keep bodies SHORT so the JSON completes.
- Tailor everything to the learner's topic and goal — do NOT default to Python or AI unless they asked for it.
- answerIndex is the 0-based position of the correct choice.
- Order phases from fundamentals to advanced; later phases build on earlier ones.`;

function buildPrompt(input: GenerateInput) {
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
  parts.push("Generate the learning path now as JSON only.");
  return parts.join("\n\n");
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
export async function generateRoadmap(input: GenerateInput): Promise<GenerateResult> {
  let reply;
  try {
    reply = await completeChat({
      system: SYSTEM,
      messages: [{ role: "user", content: buildPrompt(input) }],
      // Roomy: a full path with lesson bodies is a lot of tokens.
      maxTokens: 8000,
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
    console.error("[roadmap-gen] validation failed:", JSON.stringify(result.error.issues.slice(0, 4)));
    return {
      ok: false,
      error: `The generated path was incomplete (${where}: ${issue?.message ?? "invalid"}). Please try again.`,
    };
  }

  // Normalise the tree: clamp answer indices and fill any lesson the model left
  // thin with a real, metadata-driven body so no lesson opens blank.
  for (const phase of result.data.phases) {
    for (const skill of phase.skills) {
      for (const lesson of skill.lessons) {
        for (const q of lesson.quiz) {
          if (q.answerIndex >= q.choices.length) q.answerIndex = 0;
        }
        if (!lesson.body || lesson.body.trim().length < 40) {
          lesson.body = fallbackLessonBody(lesson.title, lesson.objectives, skill.title);
        }
      }
    }
  }

  return { ok: true, roadmap: result.data, provider: reply.provider };
}

/** A real (if brief) body for a lesson the model didn't fully write, so the
 *  lesson page never opens empty and the in-lesson AI tutor can take it deeper. */
function fallbackLessonBody(title: string, objectives: string[], skill: string): string {
  const objs = objectives.map((o) => `- ${o}`).join("\n");
  return `## ${title}

Part of **${skill}**.

**By the end you'll be able to:**

${objs}

---

Work through the idea, try the smallest example yourself, then use the **AI tutor** on this page for a worked example, a different explanation, or the common mistakes — it has this lesson's context. When you can do the objectives above without looking them up, move on.`;
}
