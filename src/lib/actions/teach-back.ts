"use server";

import { z } from "zod";
import { connectDB } from "../db";
import { Lesson } from "../models";
import { requireUser } from "../user";
import { checkCap, isConfigured, recordUsage } from "../ai";
import { completeChat } from "../ai-provider";
import { extractJson } from "../ai-json";
import { recordEvidence } from "../evidence";

/**
 * Grading a teach-back (Chapter 5's closing step, spec §29).
 *
 * This is the one activity in the whole structured-lesson reader that writes
 * evidence — a deliberate, narrow exception to DECISIONS 027's rule that
 * nothing in `ActivityRenderer` does. Every other formative activity there is
 * `useState` that grades itself locally because a client click has not been
 * graded by anyone; a teach-back is different in kind, not just degree — §29
 * calls it "stronger evidence than reading", `EVIDENCE_SOURCES` has carried
 * `"teach_back"` at a real weight (0.8, the same tier as a project or a
 * challenge) since Phase 1a, and writing a real explanation and having it
 * judged is comparable in rigor to a challenge submission, not to picking a
 * multiple-choice option. The exception is principled, not a crack in the
 * rule — see DECISIONS on why.
 */

const Grade = z.object({
  score: z.coerce.number().min(0).max(1).catch(0),
  matched: z.array(z.string()).catch([]),
  feedback: z.string().catch(""),
});

export type TeachBackResult =
  | { ok: true; score: number; matched: string[]; feedback: string }
  | { ok: false; message: string };

export async function gradeTeachBack(
  lessonId: string,
  prompt: string,
  rubric: string[],
  answer: string,
): Promise<TeachBackResult> {
  await connectDB();
  const user = await requireUser();

  if (!answer.trim()) {
    return { ok: false, message: "Write an explanation first." };
  }
  if (!isConfigured()) {
    return { ok: false, message: "The AI tutor is not configured, so this cannot be graded right now." };
  }
  const cap = await checkCap(user._id);
  if (!cap.ok) return { ok: false, message: cap.reason };

  const lesson = await Lesson.findById(lessonId).select("skill").lean<{ skill: unknown } | null>();
  if (!lesson) return { ok: false, message: "Lesson not found." };

  let reply;
  try {
    reply = await completeChat({
      maxTokens: 500,
      system:
        "You grade how completely and correctly a learner's explanation covers a rubric. Score " +
        "understanding, not phrasing — a correct idea in the learner's own words counts even if it " +
        "does not match the rubric's wording. Do not be pedantic. Output ONLY this JSON, no prose: " +
        '{"score": 0 to 1, "matched": string[] (the rubric points actually covered, copied verbatim ' +
        'from the rubric given to you), "feedback": string (2-3 sentences, specific to what they wrote, ' +
        "no generic praise)}.",
      messages: [
        {
          role: "user",
          content:
            `Prompt they were asked: ${prompt}\n\n` +
            `Rubric — what a complete answer covers:\n${rubric.map((r) => `- ${r}`).join("\n")}\n\n` +
            `Their explanation:\n${answer.trim().slice(0, 3000)}`,
        },
      ],
    });
  } catch (err) {
    console.error("[teach-back]", err);
    return { ok: false, message: "Could not reach the grader. Try again." };
  }

  await recordUsage(user._id, reply.usage.input, reply.usage.output, reply.provider);

  let parsed;
  try {
    parsed = Grade.parse(extractJson(reply.text));
  } catch {
    return { ok: false, message: "The grader returned something unusable. Try again." };
  }

  // A machine decided this outcome — a model, not the learner — the same
  // sense DECISIONS 026 already uses for `verified`. It is a judged score
  // rather than an exact match, which is exactly what the 0.8 source weight
  // (below a challenge's 1.0, above a quiz's 0.5) already prices in.
  await recordEvidence({
    userId: user._id,
    skill: lesson.skill,
    lesson: lessonId,
    dimension: "explanation",
    source: "teach_back",
    strength: parsed.score,
    verified: true,
    aiFree: true,
    detail: `Teach-back scored ${Math.round(parsed.score * 100)}%`,
  });

  return { ok: true, score: parsed.score, matched: parsed.matched, feedback: parsed.feedback };
}
