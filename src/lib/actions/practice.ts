"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "../db";
import { dayKey } from "../day";
import { runChallenge, type RunOutcome } from "../runner";
import { Challenge, ChallengeAttempt, ChallengeProgress, DailyChallenge, TimeEntry } from "../models";
import { addXp, recordActivity, requireUser } from "../user";

/**
 * Run the visible tests without recording anything. This is the "Run" button, 
 * fast feedback while you work, no XP, no progress. The hidden tests are held
 * back for Submit, so you cannot pass by hard-coding the visible cases.
 */
export async function runCode(challengeId: string, code: string): Promise<RunOutcome> {
  await connectDB();
  await requireUser();

  const challenge = await Challenge.findById(challengeId).select("tests").lean<{
    tests: { call: string; expected: string; hidden?: boolean; label?: string }[];
  } | null>();
  if (!challenge) return { ok: false, results: [], passedCount: 0, total: 0, error: "Challenge not found.", runtimeMs: 0, logs: [] };

  const visible = challenge.tests.filter((t) => !t.hidden);
  return runChallenge(code, visible);
}

/**
 * Run every test, record the attempt, and, if all pass, mark it solved and
 * award XP once. This is the graded path; unlike the lesson exercise gate,
 * "did it" here is decided by the machine, not the learner.
 */
export async function submitCode(challengeId: string, code: string, minutes = 0) {
  await connectDB();
  const user = await requireUser();

  const challenge = await Challenge.findById(challengeId).lean<{
    _id: unknown;
    tests: { call: string; expected: string; hidden?: boolean; label?: string }[];
    xp: number;
  } | null>();
  if (!challenge) return { ok: false as const, outcome: null };

  const outcome = runChallenge(code, challenge.tests);

  await ChallengeAttempt.create({
    user: user._id,
    challenge: challengeId,
    code,
    passed: outcome.ok,
    testsPassed: outcome.passedCount,
    testsTotal: outcome.total,
    runtimeMs: outcome.runtimeMs,
    error: outcome.error,
    minutesSpent: minutes,
  });

  const progress = await ChallengeProgress.findOneAndUpdate(
    { user: user._id, challenge: challengeId },
    {
      $inc: { attempts: 1 },
      $max: { bestTestsPassed: outcome.passedCount },
      $set: { lastCode: code },
    },
    { upsert: true, new: true }
  );

  let firstSolve = false;
  if (outcome.ok && !progress.solved) {
    progress.solved = true;
    progress.solvedAt = new Date();
    await progress.save();
    firstSolve = true;

    await addXp(user._id, challenge.xp ?? 30);
    await recordActivity(user._id, { challengesSolved: 1, minutes });
    if (minutes > 0) {
      await TimeEntry.create({ user: user._id, kind: "practice", minutes, day: dayKey(), challenge: challengeId });
    }

    // The daily challenge, if this was it.
    await DailyChallenge.updateOne(
      { user: user._id, day: dayKey(), challenge: challengeId },
      { $set: { completed: true } }
    );
  }

  revalidatePath(`/practice/challenges/${challengeId}`);
  revalidatePath("/practice");
  return { ok: outcome.ok, outcome, firstSolve, xp: firstSolve ? challenge.xp ?? 30 : 0 };
}

/** Persist the editor buffer so re-opening a challenge restores your work. */
export async function saveDraft(challengeId: string, code: string) {
  await connectDB();
  const user = await requireUser();
  await ChallengeProgress.updateOne(
    { user: user._id, challenge: challengeId },
    { $set: { lastCode: code } },
    { upsert: true }
  );
}

export async function toggleChallengeBookmark(challengeId: string) {
  await connectDB();
  const user = await requireUser();
  const progress = await ChallengeProgress.findOne({ user: user._id, challenge: challengeId });
  if (progress) {
    progress.bookmarked = !progress.bookmarked;
    await progress.save();
  } else {
    await ChallengeProgress.create({ user: user._id, challenge: challengeId, bookmarked: true });
  }
  revalidatePath("/practice/challenges");
}

/**
 * Pick (or recall) today's challenge for this user. Fixed per day so it does
 * not reshuffle on reload, the same reasoning as the daily note.
 */
export async function pickDailyChallenge() {
  await connectDB();
  const user = await requireUser();
  const day = dayKey();

  const existing = await DailyChallenge.findOne({ user: user._id, day }).lean<{ challenge: unknown } | null>();
  if (existing) return { id: String(existing.challenge) };

  // Prefer something not yet solved; fall back to anything.
  const solved = await ChallengeProgress.find({ user: user._id, solved: true }).select("challenge").lean();
  const solvedIds = solved.map((s) => s.challenge);

  const pool =
    (await Challenge.findOne({ _id: { $nin: solvedIds } }).sort({ createdAt: 1 }).select("_id").lean<{ _id: unknown } | null>()) ??
    (await Challenge.findOne().sort({ createdAt: 1 }).select("_id").lean<{ _id: unknown } | null>());

  if (!pool) return null;
  await DailyChallenge.create({ user: user._id, day, challenge: pool._id });
  return { id: String(pool._id) };
}
