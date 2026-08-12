"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "../db";
import { dayKey } from "../day";
import { GATE_STEPS, Lesson, LessonProgress, Note, Review, TimeEntry } from "../models";
import type { GateKey } from "../models";
import { addXp, recordActivity, requireUser } from "../user";
import { grade, nextDue } from "../srs";
import { evidenceFromExerciseClaim, evidenceFromQuiz, evidenceFromReview } from "../evidence";
import { checkCap, isConfigured, recordUsage } from "../ai";
import { completeChat } from "../ai-provider";
import { LADDER_INSTRUCTION, isLevelAllowed, type HintLevel } from "../hint-ladder";
import { learnerStateSummary } from "../ai-context";

const PASS_MARK = 0.8;

/**
 * A heartbeat from the open lesson page, called every 30 seconds while the tab
 * is focused. This is what replaced masterLesson's flat 30-minute credit
 * (BACKLOG Tier 0): time on a lesson is now measured, not assumed. Capped per
 * beat so a stuck timer cannot inflate it.
 */
export async function trackLessonTime(lessonId: string, seconds: number) {
  await connectDB();
  const user = await requireUser();
  const minutes = Math.min(2, Math.max(0, seconds / 60)); // one beat is ~0.5 min; 2 is the ceiling

  const { progress } = await progressFor(user._id, lessonId);
  progress.minutesSpent = (progress.minutesSpent ?? 0) + minutes;
  progress.lastOpenedAt = new Date();
  await progress.save();

  // One TimeEntry per lesson per day, incremented, not one per beat, which
  // would be 120 rows an hour. Analytics reads these; keep them coarse.
  await TimeEntry.updateOne(
    { user: user._id, kind: "lesson", lesson: lessonId, day: dayKey() },
    { $inc: { minutes } },
    { upsert: true }
  );
  await recordActivity(user._id, { minutes });
}

async function progressFor(userId: unknown, lessonId: string) {
  const lesson = await Lesson.findById(lessonId).select("skill xp").lean<{
    _id: unknown;
    skill: unknown;
    xp: number;
  }>();
  if (!lesson) throw new Error("Lesson not found");

  const progress = await LessonProgress.findOneAndUpdate(
    { user: userId, lesson: lessonId },
    { $setOnInsert: { skill: lesson.skill, state: "learning" } },
    { upsert: true, new: true }
  );

  return { lesson, progress };
}

/**
 * `noted` is never trusted from the stored flag, it is counted from the notes
 * themselves. Otherwise writing one note and deleting it would leave the gate
 * permanently open, and "you cannot mark it done until you can do it" would be
 * a claim the database quietly stops enforcing.
 */
async function syncNotedGate(userId: unknown, lessonId: string, progress: { gate: { noted: boolean } }) {
  // Trashed notes do not count, a note you have thrown away is not a note you
  // have written, so trashing your only lesson note reopens the gate.
  const notes = await Note.countDocuments({ user: userId, lesson: lessonId, trashedAt: null });
  progress.gate.noted = notes > 0;
}

/**
 * Recompute the note gate for a lesson from scratch and persist it. The
 * knowledge module calls this after any note write, because notes and the
 * mastery gate are connected and only the server knows it.
 */
export async function recomputeNotedGate(userId: unknown, lessonId: string) {
  const { progress } = await progressFor(userId, lessonId);
  await syncNotedGate(userId, lessonId, progress);
  await progress.save();
  revalidatePath(`/learning/lesson/${lessonId}`);
}

/** Tick or untick one requirement of the mastery gate. */
export async function setGateStep(lessonId: string, key: GateKey, value: boolean) {
  await connectDB();
  const user = await requireUser();

  // The quiz gate is earned by passing the quiz, and the note gate by writing
  // a note. Neither is a checkbox.
  if (key === "quizzed" || key === "noted") return;

  const { progress } = await progressFor(user._id, lessonId);

  const was = progress.gate[key];
  progress.gate[key] = value;
  // Mastery is not undone by fiddling with a checkbox afterwards.
  if (progress.state !== "mastered") {
    progress.state = progress.gate.exercised ? "practicing" : "learning";
  }

  // Read before the reset below, so the evidence call after `save()` reports
  // how much help *this* attempt used, not zero.
  const hintLevelUsed = progress.hintLevel ?? 0;
  const isExerciseTransition = key === "exercised" && value && !was;
  if (isExerciseTransition) {
    // Fresh ladder for next time — see the field's own comment on
    // LessonProgress. Redoing the exercise later should not inherit today's
    // assistance.
    progress.hintLevel = 0;
  }
  await progress.save();

  // Only the exercise claim, and only on the transition. `read` and `reviewed`
  // demonstrate nothing so they record nothing, and writing a row on every
  // toggle would let one impatient click produce a pile of identical evidence.
  if (isExerciseTransition) {
    await evidenceFromExerciseClaim(user._id, lessonId, hintLevelUsed);
  }

  revalidatePath(`/learning/lesson/${lessonId}`);
}

/**
 * The hint ladder (lib/hint-ladder.ts), for the exercise on this lesson.
 *
 * `level` is what the client is asking for; whether it gets it is decided
 * here, against the deepest level already reached — the same "client disables
 * as a courtesy, server refuses as a rule" split the mastery gate uses. A
 * request for level 6 from someone who has not yet asked for level 1 is
 * refused, not served at a lower level and not silently capped: the caller
 * needs to know its request did not go through, or a client bug would look
 * like the ladder working.
 */
export async function requestExerciseHint(lessonId: string, level: number) {
  await connectDB();
  const user = await requireUser();

  const { progress } = await progressFor(user._id, lessonId);
  const current = progress.hintLevel ?? 0;

  if (!isLevelAllowed(level, current)) {
    return { ok: false as const, message: "Try the level below first." };
  }

  if (!isConfigured()) {
    return { ok: false as const, message: "The AI tutor is not configured." };
  }
  const cap = await checkCap(user._id);
  if (!cap.ok) return { ok: false as const, message: cap.reason };

  const lesson = await Lesson.findById(lessonId).select("title exercise skill").lean<{
    title: string;
    exercise?: { brief?: string; acceptance?: string[] };
    skill?: unknown;
  } | null>();
  if (!lesson?.exercise?.brief) {
    return { ok: false as const, message: "This lesson has no exercise to get a hint on." };
  }

  // §10's "current mastery" and "AI dependency" made concrete: the same
  // learner state the concept tutor reads, here at the point it matters most
  // — someone already on the hint ladder is exactly who "have they been
  // leaning on full solutions lately" should change the tone for.
  const state = await learnerStateSummary(user._id, lesson.skill);

  const { text, usage, provider } = await completeChat({
    maxTokens: 500,
    system:
      "You are the tutor inside DeveloperOS, walking a learner down a hint ladder on their " +
      "exercise. Answer at exactly the level you are given, never more. Be concrete and use code " +
      "where the level allows it. Stay under 200 words unless writing a full solution.\n\n" +
      `Level ${level} of 6: ${LADDER_INSTRUCTION[level as HintLevel]}` +
      (state ? `\n\nWhat you know about this learner:\n${state}` : ""),
    messages: [
      {
        role: "user",
        content:
          `Lesson: ${lesson.title}\n\nExercise:\n${lesson.exercise.brief}` +
          (lesson.exercise.acceptance?.length
            ? `\n\nDone when:\n${lesson.exercise.acceptance.map((a) => `- ${a}`).join("\n")}`
            : ""),
      },
    ],
  });

  await recordUsage(user._id, usage.input, usage.output, provider);

  progress.hintLevel = Math.max(current, level);
  await progress.save();

  revalidatePath(`/learning/lesson/${lessonId}`);
  return { ok: true as const, text, level };
}

export async function submitQuiz(lessonId: string, correct: number, total: number) {
  await connectDB();
  const user = await requireUser();
  const { progress } = await progressFor(user._id, lessonId);

  const score = total === 0 ? 0 : correct / total;
  // Keep the best attempt, not the latest, retrying should never cost you a
  // gate you have already cleared.
  progress.quizScore = Math.max(progress.quizScore ?? 0, Math.round(score * 100));
  progress.gate.quizzed ||= score >= PASS_MARK;
  if (progress.gate.quizzed && progress.state !== "mastered") progress.state = "confident";
  await progress.save();

  // Every graded attempt is an artefact, including the failed ones — the log is
  // append-only and a failure at 40% is a real fact about what was known that
  // day. Repetition is handled by the diminishing returns in competency.ts, not
  // by refusing to write the row.
  await evidenceFromQuiz(user._id, lessonId, score);

  revalidatePath(`/learning/lesson/${lessonId}`);
  // The score reported back is this attempt's, so the result line matches what
  // the learner just did; the best attempt is what gets stored.
  return { passed: score >= PASS_MARK, score: Math.round(score * 100) };
}

/**
 * The gate itself. Refuses to mark a lesson mastered unless every requirement
 * is met, this check is server-side on purpose, because the whole product
 * claim rests on it being real.
 */
export async function masterLesson(lessonId: string) {
  await connectDB();
  const user = await requireUser();
  const { lesson, progress } = await progressFor(user._id, lessonId);

  await syncNotedGate(user._id, lessonId, progress);

  const unmet = GATE_STEPS.filter((step) => !progress.gate[step.key]);
  if (unmet.length > 0) {
    await progress.save();
    return { ok: false as const, message: `Still open: ${unmet.map((s) => s.label).join(", ")}` };
  }
  if (progress.state === "mastered") {
    return { ok: true as const, message: "Already mastered." };
  }

  progress.state = "mastered";
  progress.masteredAt = new Date();
  await progress.save();

  await Review.updateOne(
    { user: user._id, lesson: lessonId },
    { $set: { dueAt: nextDue(0), step: 0 } },
    { upsert: true }
  );

  await addXp(user._id, lesson.xp ?? 50);
  // Credit the lesson as completed, but do NOT re-credit time, the minutes were
  // already tracked by the heartbeat while the page was open. Only the
  // completion count is new here.
  await recordActivity(user._id, { lessonsCompleted: 1 });

  revalidatePath("/learning", "layout");
  revalidatePath("/dashboard");
  return { ok: true as const, message: `Mastered. +${lesson.xp ?? 50} XP` };
}

/* ---------------------------------------------------------------- reviews */

export async function gradeReview(reviewId: string, remembered: boolean) {
  await connectDB();
  const user = await requireUser();

  const review = await Review.findOne({ _id: reviewId, user: user._id });
  if (!review) return;

  review.step = grade(review.step, remembered);
  review.dueAt = nextDue(review.step);
  if (!remembered) {
    review.lapses += 1;
    await LessonProgress.updateOne(
      { user: user._id, lesson: review.lesson },
      { $set: { state: "needs_revision" } }
    );
  }
  await review.save();

  await evidenceFromReview(user._id, review.lesson, remembered);
  await recordActivity(user._id, { reviewsDone: 1 });
  await addXp(user._id, 15);

  revalidatePath("/review");
  revalidatePath("/dashboard");
}
