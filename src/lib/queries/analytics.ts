import { connectDB } from "../db";
import { dayKey, dayKeyOffset } from "../day";
import {
  Achievement,
  ChallengeProgress,
  FocusSession,
  Goal,
  Habit,
  LessonProgress,
  Note,
  Project,
  StudySession,
  Task,
  TimeEntry,
} from "../models";
import { ACHIEVEMENTS, earnedKeys, type AchievementMetric } from "../achievements";
import { levelFromXp } from "../user";

/**
 * Analytics reads across the collections every other module already writes —
 * it stores nothing of its own (see the note on productivity.ts). Each function
 * is an aggregation, kept to a small fixed number of queries.
 */

/** The counts every metric-driven feature (goals, achievements) needs. */
export async function getUserCounts(userId: unknown, xp: number, currentStreak: number) {
  await connectDB();
  const [lessonsMastered, challengesSolved, notesWritten, projectsCreated, projectsDeployed, reviewsAgg, focusAgg] =
    await Promise.all([
      LessonProgress.countDocuments({ user: userId, state: "mastered" }),
      ChallengeProgress.countDocuments({ user: userId, solved: true }),
      Note.countDocuments({ user: userId, trashedAt: null }),
      Project.countDocuments({ user: userId }),
      Project.countDocuments({ user: userId, status: { $in: ["deployed", "complete"] } }),
      StudySession.aggregate([{ $match: { user: userId } }, { $group: { _id: null, n: { $sum: "$reviewsDone" } } }]),
      StudySession.aggregate([{ $match: { user: userId } }, { $group: { _id: null, n: { $sum: "$focusMinutes" } } }]),
    ]);

  const counts: Record<AchievementMetric, number> = {
    lessonsMastered,
    challengesSolved,
    notesWritten,
    projectsCreated,
    projectsDeployed,
    reviewsDone: reviewsAgg[0]?.n ?? 0,
    focusMinutes: focusAgg[0]?.n ?? 0,
    currentStreak,
    xp,
  };
  return counts;
}

/** The analytics dashboard: totals, a time-by-kind split, and a 12-week heatmap. */
export async function getAnalytics(userId: unknown) {
  await connectDB();

  const [byKind, sessions, totals] = await Promise.all([
    TimeEntry.aggregate([
      { $match: { user: userId } },
      { $group: { _id: "$kind", minutes: { $sum: "$minutes" } } },
      { $sort: { minutes: -1 } },
    ]),
    // 84 days of study sessions for the heatmap.
    StudySession.find({ user: userId, day: { $gte: dayKeyOffset(-83) } }).lean(),
    Promise.all([
      LessonProgress.countDocuments({ user: userId, state: "mastered" }),
      ChallengeProgress.countDocuments({ user: userId, solved: true }),
      Task.countDocuments({ user: userId, status: "done" }),
      Note.countDocuments({ user: userId, trashedAt: null }),
    ]),
  ]);

  const byDay = new Map(sessions.map((s) => [s.day, s]));
  const heatmap = Array.from({ length: 84 }, (_, i) => {
    const day = dayKeyOffset(i - 83);
    const s = byDay.get(day);
    return { day, minutes: s?.minutes ?? 0 };
  });

  const totalMinutes = byKind.reduce((n, k) => n + k.minutes, 0);

  return {
    timeByKind: byKind.map((k) => ({ kind: String(k._id ?? "other"), minutes: k.minutes })),
    totalMinutes,
    totalHours: Math.round(totalMinutes / 60),
    heatmap,
    lessonsMastered: totals[0],
    challengesSolved: totals[1],
    tasksDone: totals[2],
    notesWritten: totals[3],
  };
}

/** Goal progress, computed live from the metric each goal tracks. */
export async function getGoals(userId: unknown) {
  await connectDB();
  const goals = await Goal.find({ user: userId, archived: false }).sort({ createdAt: -1 }).lean();

  // Resolve each goal's current value against its period window.
  const results = await Promise.all(
    goals.map(async (g) => {
      const since = periodStart(String(g.period ?? "week"));
      const value = await measureGoal(userId, String(g.metric ?? "minutes"), since, g.manualProgress ?? 0);
      return {
        id: String(g._id),
        title: String(g.title),
        metric: String(g.metric ?? "minutes"),
        target: Number(g.target ?? 0),
        period: String(g.period ?? "week"),
        value,
        achieved: value >= Number(g.target ?? 0),
      };
    })
  );
  return results;
}

function periodStart(period: string): string {
  if (period === "day") return dayKey();
  if (period === "week") return dayKeyOffset(-6);
  if (period === "month") return dayKeyOffset(-29);
  if (period === "quarter") return dayKeyOffset(-89);
  return dayKeyOffset(-364);
}

async function measureGoal(userId: unknown, metric: string, sinceDay: string, manual: number): Promise<number> {
  if (metric === "custom") return manual;

  // minutes / focus come from sessions; the rest from their own collections in
  // the window. The day string compares lexicographically, so >= sinceDay works.
  if (metric === "minutes") {
    const agg = await StudySession.aggregate([
      { $match: { user: userId, day: { $gte: sinceDay } } },
      { $group: { _id: null, n: { $sum: "$minutes" } } },
    ]);
    return agg[0]?.n ?? 0;
  }
  const since = new Date(sinceDay + "T00:00:00");
  if (metric === "lessons") return LessonProgress.countDocuments({ user: userId, state: "mastered", masteredAt: { $gte: since } });
  if (metric === "challenges") return ChallengeProgress.countDocuments({ user: userId, solved: true, solvedAt: { $gte: since } });
  if (metric === "notes") return Note.countDocuments({ user: userId, trashedAt: null, createdAt: { $gte: since } });
  if (metric === "tasks") return Task.countDocuments({ user: userId, status: "done", completedAt: { $gte: since } });
  if (metric === "reviews") {
    const agg = await StudySession.aggregate([
      { $match: { user: userId, day: { $gte: sinceDay } } },
      { $group: { _id: null, n: { $sum: "$reviewsDone" } } },
    ]);
    return agg[0]?.n ?? 0;
  }
  return 0;
}

export async function getHabits(userId: unknown) {
  await connectDB();
  const habits = await Habit.find({ user: userId, archived: false }).sort({ createdAt: 1 }).lean();
  const today = dayKey();
  return habits.map((h) => {
    const days = (h.completedDays ?? []) as string[];
    return {
      id: String(h._id),
      title: String(h.title),
      colour: String(h.colour ?? "var(--primary)"),
      currentStreak: Number(h.currentStreak ?? 0),
      longestStreak: Number(h.longestStreak ?? 0),
      doneToday: days.includes(today),
      // Last 28 days for the mini-heatmap.
      recent: Array.from({ length: 28 }, (_, i) => {
        const day = dayKeyOffset(i - 27);
        return { day, done: days.includes(day) };
      }),
    };
  });
}

export async function getFocusToday(userId: unknown) {
  await connectDB();
  const sessions = await FocusSession.find({ user: userId, day: dayKey() }).sort({ startedAt: -1 }).lean();
  const minutes = sessions.filter((s) => s.completed).reduce((n, s) => n + (s.minutes ?? 0), 0);
  return {
    minutes,
    count: sessions.filter((s) => s.completed).length,
    recent: sessions.slice(0, 8).map((s) => ({
      id: String(s._id),
      minutes: Number(s.minutes ?? 0),
      completed: Boolean(s.completed),
      intent: s.intent as string | undefined,
    })),
  };
}

/** Achievements: which are unlocked, which are still locked, with progress. */
export async function getAchievements(userId: unknown, xp: number, currentStreak: number) {
  await connectDB();
  const counts = await getUserCounts(userId, xp, currentStreak);
  const unlocked = new Set((await Achievement.find({ user: userId }).select("key").lean()).map((a) => String(a.key)));

  return ACHIEVEMENTS.map((a) => ({
    ...a,
    unlocked: unlocked.has(a.key),
    value: counts[a.metric] ?? 0,
    progress: Math.min(100, Math.round(((counts[a.metric] ?? 0) / a.threshold) * 100)),
  }));
}

/** Level + XP for the header of the analytics page. */
export function levelInfo(xp: number) {
  return levelFromXp(xp);
}

export { earnedKeys };
