/**
 * Writing evidence.
 *
 * ## This file is not a server action, and must never become one
 *
 * Every function here takes `verified`, `strength` and `dimension` and writes
 * them to the database. If any of it were exported with `"use server"`, the
 * client could call it — and a client that can post
 * `{ verified: true, strength: 1 }` can reach mastery in a loop without opening
 * a lesson. The whole model would be decorative.
 *
 * So: **plain module, no `"use server"`, callers only.** The callers are the
 * places that have already graded something on the server and therefore know
 * the truth about it — `submitQuiz`, `submitCode`, `gradeReview`. The rule for
 * adding a caller is the same rule the mastery gate follows: if a human
 * asserted the outcome, `verified` is false; only a machine's verdict sets it
 * true. There is no third case.
 *
 * ## Everything here is best-effort
 *
 * Evidence is a derived record of something that already happened. If writing
 * it fails, the quiz was still passed and the challenge was still solved, so a
 * failure here must never fail the action that triggered it — the learner would
 * lose the XP and the gate for a bookkeeping error. Hence `safely()` below.
 */

import { connectDB } from "./db";
import { Evidence, Lesson, Challenge } from "./models";
import type { Dimension, EvidenceSource } from "./competency";

type RecordInput = {
  userId: unknown;
  /** Optional for exactly one case: `source: "diagnostic"` evidence, taken
   *  before a learner has a roadmap to scope it to. See the field's own note
   *  on the Evidence model. Every other recorder in this file still always
   *  passes one. */
  skill?: unknown;
  lesson?: unknown;
  project?: unknown;
  dimension: Dimension;
  source: EvidenceSource;
  /** 0–1. Clamped here so a caller's arithmetic cannot store an impossible row. */
  strength: number;
  /** True only if a machine decided this. See the note above. */
  verified: boolean;
  /** Omit unless actually measured — absent means "not measured", not "unaided". */
  assistLevel?: number;
  aiFree?: boolean;
  activityType?: string;
  ref?: string;
  detail?: string;
};

/**
 * Append one artefact. Never updates, never upserts: the collection is a
 * ledger, and re-grading something means another row, not an edited one.
 */
export async function recordEvidence(input: RecordInput) {
  await connectDB();
  await Evidence.create({
    user: input.userId,
    skill: input.skill,
    lesson: input.lesson,
    project: input.project,
    dimension: input.dimension,
    source: input.source,
    strength: Math.min(1, Math.max(0, input.strength)),
    verified: input.verified,
    assistLevel: input.assistLevel,
    aiFree: input.aiFree ?? false,
    activityType: input.activityType,
    ref: input.ref,
    detail: input.detail,
  });
}

/** Run a recorder without letting it take the caller down with it. */
async function safely(work: () => Promise<void>) {
  try {
    await work();
  } catch (err) {
    console.error("[evidence] not recorded:", err);
  }
}

/* ------------------------------------------------------------- the recorders

   One per graded event. They exist so that the mapping from "what happened" to
   "which dimension, how strong, verified or not" lives here, in one file that
   can be read end to end, rather than being decided ad hoc at four call sites
   that will drift.
   -------------------------------------------------------------------------- */

/**
 * A quiz. Knowledge, machine-graded, so verified — but quizzes carry the lowest
 * source weight in `competency.ts` for the obvious reason: recognising the right
 * answer among four is the weakest thing this product measures.
 */
export async function evidenceFromQuiz(userId: unknown, lessonId: string, score: number) {
  await safely(async () => {
    const lesson = await Lesson.findById(lessonId).select("skill").lean<{ skill: unknown } | null>();
    if (!lesson) return;
    await recordEvidence({
      userId,
      skill: lesson.skill,
      lesson: lessonId,
      dimension: "knowledge",
      source: "quiz",
      strength: score,
      verified: true,
      ref: lessonId,
      detail: `Quiz scored ${Math.round(score * 100)}%`,
    });
  });
}

/**
 * A challenge submission. The strongest routine evidence in the product,
 * because the tests decide and the hidden ones cannot be hard-coded against.
 *
 * A debugging challenge is evidence of debugging, not of implementation — the
 * two are different capabilities and the whole point of eight dimensions is to
 * stop them being averaged into one number. One row per skill the challenge
 * declares, because a challenge that practises three skills is evidence for
 * three skills.
 */
export async function evidenceFromChallenge(
  userId: unknown,
  challengeId: string,
  outcome: { passedCount: number; total: number }
) {
  await safely(async () => {
    const challenge = await Challenge.findById(challengeId)
      .select("skills lesson category title")
      .lean<{ skills?: unknown[]; lesson?: unknown; category?: string; title?: string } | null>();
    if (!challenge) return;

    // A challenge nobody mapped to a skill cannot be evidence *for* anything.
    // Silently attaching it to a guess would be worse than recording nothing.
    const skills = challenge.skills ?? [];
    if (skills.length === 0 || outcome.total === 0) return;

    const dimension: Dimension = challenge.category === "debugging" ? "debugging" : "implementation";
    const strength = outcome.passedCount / outcome.total;

    for (const skill of skills) {
      await recordEvidence({
        userId,
        skill,
        lesson: challenge.lesson,
        dimension,
        source: "challenge",
        strength,
        verified: true,
        ref: challengeId,
        detail: `${outcome.passedCount}/${outcome.total} tests passed on ${challenge.title ?? "a challenge"}`,
      });
    }
  });
}

/**
 * A spaced-repetition grade. Recall — and **not verified**, because "did you
 * remember it" is answered by the learner, not by a machine. It is the honest
 * case for `verified: false`: real evidence, self-assessed, weighted down.
 */
export async function evidenceFromReview(userId: unknown, lessonId: unknown, remembered: boolean) {
  await safely(async () => {
    const lesson = await Lesson.findById(lessonId).select("skill").lean<{ skill: unknown } | null>();
    if (!lesson) return;
    await recordEvidence({
      userId,
      skill: lesson.skill,
      lesson: lessonId,
      dimension: "recall",
      source: "review",
      strength: remembered ? 1 : 0,
      verified: false,
      ref: String(lessonId),
      detail: remembered ? "Recalled at review" : "Forgotten at review",
    });
  });
}

/**
 * Ticking "I did the exercise". The weakest row the system writes: a
 * self-report, unverified, so `0.15 × 0.5` of an assessment. Recorded anyway,
 * because "I did it" is weak evidence rather than none — and recording it at
 * its real weight is what lets the skill page show an honest picture instead of
 * either believing the checkbox or pretending the work never happened.
 *
 * Note what is *not* recorded: `read` and `reviewed`. Reading a page and
 * looking at a summary demonstrate nothing, which is exactly what
 * `ACTIVITY_META` says about `text` and `reflection`. The two files agree on
 * purpose.
 */
/**
 * `assistLevel` is the deepest rung of the hint ladder (lib/hint-ladder.ts)
 * the learner reached before ticking the box — 0 if they never asked, up to 6
 * if they were shown the full solution. This is the row `independenceFrom` in
 * `lib/competency.ts` was built to read; before the hint ladder existed to
 * produce a real number, every exercise claim wrote `assistLevel: undefined`,
 * and the independence metric had nothing to measure. Omit the argument and
 * that stays true for a caller that has no ladder to report from.
 */
export async function evidenceFromExerciseClaim(userId: unknown, lessonId: string, assistLevel?: number) {
  await safely(async () => {
    const lesson = await Lesson.findById(lessonId).select("skill").lean<{ skill: unknown } | null>();
    if (!lesson) return;
    const level = typeof assistLevel === "number" && assistLevel > 0 ? assistLevel : undefined;
    await recordEvidence({
      userId,
      skill: lesson.skill,
      lesson: lessonId,
      dimension: "application",
      source: "self_report",
      strength: 1,
      verified: false,
      assistLevel: level,
      ref: lessonId,
      detail: level
        ? `Self-reported the exercise complete, after a level ${level} hint`
        : "Self-reported the exercise complete, unaided",
    });
  });
}
