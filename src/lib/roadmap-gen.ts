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

const Question = z.object({
  prompt: z.string().min(1),
  choices: z.array(z.string().min(1)).min(2).max(5),
  answerIndex: z.number().int().min(0),
  explanation: z.string().default(""),
});

const Lesson = z.object({
  title: z.string().min(1).max(140),
  objectives: z.array(z.string().min(1)).min(1).max(6),
  estimatedMinutes: z.number().int().min(5).max(180).default(30),
  body: z.string().min(1),
  quiz: z.array(Question).min(1).max(5),
});

const Skill = z.object({
  title: z.string().min(1).max(120),
  why: z.string().min(1).max(400),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
  lessons: z.array(Lesson).min(1).max(6),
});

const Phase = z.object({
  title: z.string().min(1).max(120),
  subtitle: z.string().max(200).optional().default(""),
  skills: z.array(Skill).min(1).max(5),
});

const GeneratedRoadmap = z.object({
  title: z.string().min(1).max(140),
  summary: z.string().min(1).max(600),
  phases: z.array(Phase).min(2).max(6),
});

export type GeneratedRoadmap = z.infer<typeof GeneratedRoadmap>;

export type GenerateInput = {
  topic: string;
  goal: string;
  level: "beginner" | "intermediate" | "advanced";
  /** Optional pasted context, a syllabus, job description, notes. */
  context?: string;
};

const SYSTEM = `You are a senior curriculum designer building a structured, masterable learning path inside a developer learning app.

Rules:
- Output ONLY valid JSON. No prose, no markdown fences, no commentary.
- The JSON must match this exact shape:
  {
    "title": string,
    "summary": string,
    "phases": [
      {
        "title": string,
        "subtitle": string,
        "skills": [
          {
            "title": string,
            "why": string,
            "difficulty": "beginner" | "intermediate" | "advanced",
            "lessons": [
              {
                "title": string,
                "objectives": string[],
                "estimatedMinutes": number,
                "body": string (markdown, 150-400 words, teaches the concept with at least one example),
                "quiz": [ { "prompt": string, "choices": string[], "answerIndex": number, "explanation": string } ]
              }
            ]
          }
        ]
      }
    ]
  }
- 2 to 4 phases. Each phase 1 to 3 skills. Each skill 2 to 4 lessons. Each lesson 1 to 3 quiz questions.
- Order phases from fundamentals to advanced. Later phases build on earlier ones.
- "why" explains, in one or two sentences, why the skill matters in practice.
- Lesson "body" is real teaching content in markdown: explain the idea, show a concrete example, note a common mistake.
- Every quiz question has one correct answer; answerIndex is its 0-based position in choices.
- Keep it focused and achievable. Do not pad. Total lessons should be roughly 8 to 20.`;

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
    return {
      ok: false,
      error: "The generated path did not have the right shape. Try a more specific topic and goal.",
    };
  }

  // Clamp any out-of-range answerIndex the model may have produced.
  for (const phase of result.data.phases) {
    for (const skill of phase.skills) {
      for (const lesson of skill.lessons) {
        for (const q of lesson.quiz) {
          if (q.answerIndex >= q.choices.length) q.answerIndex = 0;
        }
      }
    }
  }

  return { ok: true, roadmap: result.data, provider: reply.provider };
}
