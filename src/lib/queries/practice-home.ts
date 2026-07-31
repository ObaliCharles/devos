import { connectDB } from "../db";
import {
  Challenge,
  ChallengeAttempt,
  ChallengeProgress,
  DailyChallenge,
  StudySession,
} from "../models";
import { dayKey, dayKeyOffset } from "../day";

/**
 * The Practice home reads.
 *
 * The rule this file follows: **challenges stay the subject.** Everything here
 * answers "what should I solve next" — the daily pick, the one you abandoned,
 * how far through the week you are, which topics you have not touched. None of
 * it is a metric for its own sake, because a practice page that opens on charts
 * is an analytics dashboard wearing a practice page's name.
 */

export type PracticeTeaser = {
  id: string;
  title: string;
  difficulty: string;
  category: string;
  xp: number;
  estimatedMinutes: number;
} | null;

/** Easiest first. The order a recommendation has to respect to be one. */
const DIFFICULTY_RANK = { easy: 0, medium: 1, hard: 2 } as const;

function teaser(c: Record<string, unknown>): PracticeTeaser {
  return {
    id: String(c._id),
    title: String(c.title ?? ""),
    difficulty: String(c.difficulty ?? "easy"),
    category: String(c.category ?? "algorithms"),
    xp: Number(c.xp ?? 30),
    estimatedMinutes: Number(c.estimatedMinutes ?? 20),
  };
}

/**
 * Which challenge to recommend next, and why.
 *
 * The pick used to be `$sample: 1` over everything unsolved, which is to say it
 * was a lottery. A lottery is not a recommendation: it will hand a first-day
 * user Merge Intervals as readily as FizzBuzz, and once it has done that the
 * card has taught them to ignore it.
 *
 * So the pick is ordered rather than drawn: the easiest unsolved challenge,
 * preferring a category you have already started over a cold start in a new
 * one, ties broken by title so the same state always yields the same pick.
 * That is a claim the data can actually support — difficulty and solved-state
 * are both real.
 *
 * What it deliberately does *not* claim is topical relevance to whatever you
 * are currently learning. Every challenge in the catalogue is an algorithms
 * challenge, so a "matched to your current skill" line would be decoration
 * over a join that does not exist. `Challenge` already carries `technology`
 * and `skills` refs for the day the catalogue earns that claim; this is the
 * function that should learn about them, and not before.
 *
 * Exported because the read path and the write path must agree. They did not:
 * this ranked one way and `pickDailyChallenge` pinned the oldest by
 * `createdAt`, so the card could name one challenge and open another. A stated
 * reason makes that mismatch a lie rather than a quirk, so both now call here.
 */
export async function selectRecommendedChallenge(userId: unknown) {
  await connectDB();

  const solvedRows = await ChallengeProgress.find({ user: userId, solved: true })
    .select("challenge")
    .populate({ path: "challenge", select: "category" })
    .lean();

  const startedCategories = new Set(
    solvedRows
      .map((r) => String((r.challenge as { category?: string } | null)?.category ?? ""))
      .filter(Boolean),
  );

  const unsolved = await Challenge.find({
    _id: { $nin: solvedRows.map((s) => s.challenge) },
  })
    .select("title difficulty category xp estimatedMinutes")
    .lean()
    .catch(() => [] as Record<string, unknown>[]);

  // Everything solved: fall back to the whole catalogue so the card still has
  // something to offer rather than emptying out as a reward for finishing.
  const pool = unsolved.length
    ? unsolved
    : await Challenge.find()
        .select("title difficulty category xp estimatedMinutes")
        .lean()
        .catch(() => [] as Record<string, unknown>[]);

  const pick = [...pool].sort((a, b) => {
    const da = DIFFICULTY_RANK[String(a.difficulty) as keyof typeof DIFFICULTY_RANK] ?? 1;
    const db = DIFFICULTY_RANK[String(b.difficulty) as keyof typeof DIFFICULTY_RANK] ?? 1;
    if (da !== db) return da - db;
    const ca = startedCategories.has(String(a.category)) ? 0 : 1;
    const cb = startedCategories.has(String(b.category)) ? 0 : 1;
    if (ca !== cb) return ca - cb;
    return String(a.title).localeCompare(String(b.title));
  })[0];

  if (!pick) return null;

  const difficulty = String(pick.difficulty ?? "easy");
  const category = String(pick.category ?? "algorithms");

  return {
    doc: pick,
    reason: !unsolved.length
      ? "You have solved everything. This one is worth a second pass."
      : startedCategories.has(category)
        ? `Your easiest unsolved ${category} challenge.`
        : `The easiest ${difficulty} challenge you have not solved.`,
  };
}

/** Today's pick, recalled if it exists so it does not reshuffle on reload. */
export async function getDailyChallenge(userId: unknown) {
  await connectDB();
  const day = dayKey();

  const existing = await DailyChallenge.findOne({ user: userId, day })
    .populate({ path: "challenge", select: "title difficulty category xp estimatedMinutes" })
    .lean<{ completed?: boolean; challenge?: Record<string, unknown> } | null>();

  if (existing?.challenge) {
    return {
      completed: Boolean(existing.completed),
      challenge: teaser(existing.challenge),
      reason: null as string | null,
    };
  }

  // No pick yet. Read-only here on purpose: a GET should not write, so the row
  // is created by `pickDailyChallenge` when the card is actually engaged with.
  const recommended = await selectRecommendedChallenge(userId);
  if (!recommended) return { completed: false, challenge: null, reason: null as string | null };

  return {
    completed: false,
    challenge: teaser(recommended.doc),
    reason: recommended.reason,
  };
}

/**
 * The challenge you opened, did not finish, and would otherwise never find
 * again. Ranked by how recently you touched it.
 */
export async function getContinuePractice(userId: unknown): Promise<PracticeTeaser> {
  await connectDB();
  const row = await ChallengeProgress.findOne({ user: userId, solved: false, attempts: { $gt: 0 } })
    .sort({ updatedAt: -1 })
    .populate({ path: "challenge", select: "title difficulty category xp estimatedMinutes" })
    .lean<{ challenge?: Record<string, unknown> } | null>();

  const c = row?.challenge;
  if (!c) return null;
  return {
    id: String(c._id),
    title: String(c.title ?? ""),
    difficulty: String(c.difficulty ?? "easy"),
    category: String(c.category ?? "algorithms"),
    xp: Number(c.xp ?? 30),
    estimatedMinutes: Number(c.estimatedMinutes ?? 20),
  };
}

export type WeekProgress = {
  solved: number;
  goal: number;
  /** Seven entries, Monday first, each with the day key and whether you solved. */
  days: { day: string; label: string; solved: number; isToday: boolean }[];
};

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * This week's solves, Monday to Sunday.
 *
 * Weeks start on Monday because a practice week is a work week; a Sunday start
 * puts two rest days at opposite ends and makes the streak look broken.
 */
export async function getWeekProgress(userId: unknown, goal = 5): Promise<WeekProgress> {
  await connectDB();
  const now = new Date();
  // getDay(): 0 is Sunday, so Monday is an offset of -6 on Sundays and 1-day on others.
  const offsetToMonday = now.getDay() === 0 ? -6 : 1 - now.getDay();

  const days = Array.from({ length: 7 }, (_, i) => ({
    day: dayKeyOffset(offsetToMonday + i, now),
    label: DAY_LABELS[i],
    solved: 0,
    isToday: false,
  }));
  const today = dayKey();
  for (const d of days) d.isToday = d.day === today;

  const from = days[0].day;
  const solvedRows = await ChallengeProgress.find({
    user: userId,
    solved: true,
    solvedAt: { $gte: new Date(`${from}T00:00:00`) },
  })
    .select("solvedAt")
    .lean();

  for (const row of solvedRows) {
    if (!row.solvedAt) continue;
    const key = dayKey(new Date(row.solvedAt));
    const slot = days.find((d) => d.day === key);
    if (slot) slot.solved += 1;
  }

  return { solved: days.reduce((n, d) => n + d.solved, 0), goal, days };
}

export type Collection = {
  key: string;
  label: string;
  total: number;
  solved: number;
};

/**
 * Topic collections, derived from the catalogue rather than stored.
 *
 * A separate Collection model would need curating by hand and would drift from
 * the challenges the moment anyone added one. Grouping by the `category` the
 * challenge already carries is always correct and always complete.
 */
export async function getCollections(userId: unknown): Promise<Collection[]> {
  await connectDB();
  const [totals, mine] = await Promise.all([
    Challenge.aggregate<{ _id: string; n: number }>([
      { $group: { _id: "$category", n: { $sum: 1 } } },
      { $sort: { n: -1 } },
    ]).catch(() => []),
    ChallengeProgress.find({ user: userId, solved: true })
      .select("challenge")
      .populate({ path: "challenge", select: "category" })
      .lean()
      .catch(() => []),
  ]);

  const solvedByCategory = new Map<string, number>();
  for (const row of mine) {
    const cat = String((row.challenge as { category?: string } | null)?.category ?? "");
    if (cat) solvedByCategory.set(cat, (solvedByCategory.get(cat) ?? 0) + 1);
  }

  return totals
    .filter((t) => t._id)
    .map((t) => ({
      key: t._id,
      label: t._id.charAt(0).toUpperCase() + t._id.slice(1),
      total: t.n,
      solved: solvedByCategory.get(t._id) ?? 0,
    }));
}

export type AttemptRow = {
  id: string;
  challengeId: string;
  title: string;
  passed: boolean;
  testsPassed: number;
  testsTotal: number;
  at: string;
};

/** Your last submissions, passed or not. Failures are the useful half. */
export async function getRecentAttempts(userId: unknown, limit = 8): Promise<AttemptRow[]> {
  await connectDB();
  const rows = await ChallengeAttempt.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate({ path: "challenge", select: "title" })
    .lean();

  return rows
    .filter((r) => r.challenge)
    .map((r) => {
      const c = r.challenge as { _id?: unknown; title?: string };
      return {
        id: String(r._id),
        challengeId: String(c._id ?? ""),
        title: String(c.title ?? "Challenge"),
        passed: Boolean(r.passed),
        testsPassed: Number(r.testsPassed ?? 0),
        testsTotal: Number(r.testsTotal ?? 0),
        at: new Date(r.createdAt ?? Date.now()).toISOString(),
      };
    });
}

/** Practice activity for the heatmap — 182 days, oldest first. */
export async function getPracticeActivity(userId: unknown, days = 182) {
  await connectDB();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));

  const sessions = await StudySession.find({ user: userId, day: { $gte: dayKey(from) } })
    .select("day minutes")
    .lean();
  const byDay = new Map(sessions.map((s) => [String(s.day), Number(s.minutes ?? 0)]));

  return Array.from({ length: days }, (_, i) => {
    const day = dayKeyOffset(i, from);
    return { day, minutes: byDay.get(day) ?? 0 };
  });
}
