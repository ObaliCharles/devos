"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "../db";
import { dayKey, dayKeyOffset } from "../day";
import { Achievement, CalendarEvent, FocusSession, Goal, Habit } from "../models";
import { ACHIEVEMENTS } from "../achievements";
import { getUserCounts } from "../queries/analytics";
import { recordActivity, requireUser } from "../user";

/* ------------------------------------------------------------------- goals */

export async function createGoal(input: { title: string; metric?: string; target: number; period?: string }) {
  await connectDB();
  const user = await requireUser();
  if (!input.title?.trim() || !input.target) return;
  await Goal.create({
    user: user._id,
    title: input.title.trim(),
    metric: input.metric ?? "minutes",
    target: input.target,
    period: input.period ?? "week",
  });
  revalidatePath("/analytics/goals");
}

export async function bumpGoalProgress(id: string, delta: number) {
  await connectDB();
  const user = await requireUser();
  // Only custom goals are hand-incremented; the rest are measured live.
  await Goal.updateOne({ _id: id, user: user._id, metric: "custom" }, { $inc: { manualProgress: delta } });
  revalidatePath("/analytics/goals");
}

export async function deleteGoal(id: string) {
  await connectDB();
  const user = await requireUser();
  await Goal.deleteOne({ _id: id, user: user._id });
  revalidatePath("/analytics/goals");
}

/* ------------------------------------------------------------------ habits */

export async function createHabit(input: { title: string; colour?: string }) {
  await connectDB();
  const user = await requireUser();
  if (!input.title?.trim()) return;
  await Habit.create({ user: user._id, title: input.title.trim(), colour: input.colour ?? "var(--primary)" });
  revalidatePath("/analytics/habits");
}

/**
 * Toggle today on a habit and recompute its streak. The streak is derived from
 * the completed-days set walking backwards from today, so it is always correct
 * even if the app was not opened yesterday.
 */
export async function toggleHabitToday(id: string) {
  await connectDB();
  const user = await requireUser();
  const habit = await Habit.findOne({ _id: id, user: user._id });
  if (!habit) return;

  const today = dayKey();
  const days = new Set((habit.completedDays ?? []) as string[]);
  if (days.has(today)) days.delete(today);
  else {
    days.add(today);
    await recordActivity(user._id, {}); // counts toward the daily streak too
  }

  const sorted = [...days].sort();
  habit.completedDays = sorted;

  // Current streak: consecutive days ending today (or yesterday if not yet done today).
  let streak = 0;
  let cursor = days.has(today) ? 0 : -1;
  while (days.has(dayKeyOffset(cursor))) { streak += 1; cursor -= 1; }
  habit.currentStreak = streak;
  habit.longestStreak = Math.max(habit.longestStreak ?? 0, streak);

  await habit.save();
  revalidatePath("/analytics/habits");
}

export async function deleteHabit(id: string) {
  await connectDB();
  const user = await requireUser();
  await Habit.deleteOne({ _id: id, user: user._id });
  revalidatePath("/analytics/habits");
}

/* ------------------------------------------------------------ focus sessions */

/** Record a completed Pomodoro/focus block. Time flows into the same places lessons do. */
export async function logFocusSession(input: { minutes: number; kind?: string; intent?: string }) {
  await connectDB();
  const user = await requireUser();
  const minutes = Math.max(1, Math.min(240, Math.round(input.minutes)));

  await FocusSession.create({
    user: user._id,
    kind: input.kind ?? "pomodoro",
    plannedMinutes: minutes,
    minutes,
    completed: true,
    endedAt: new Date(),
    day: dayKey(),
    intent: input.intent?.trim(),
  });

  await recordActivity(user._id, { minutes, focusMinutes: minutes });
  revalidatePath("/analytics/focus");
  revalidatePath("/analytics");
}

/* --------------------------------------------------------------- calendar */

export async function createEvent(input: {
  title: string;
  kind?: string;
  startAt: string;
  endAt?: string;
  allDay?: boolean;
}) {
  await connectDB();
  const user = await requireUser();
  if (!input.title?.trim() || !input.startAt) return;
  await CalendarEvent.create({
    user: user._id,
    title: input.title.trim(),
    kind: input.kind ?? "study",
    startAt: new Date(input.startAt),
    endAt: input.endAt ? new Date(input.endAt) : undefined,
    allDay: input.allDay ?? false,
  });
  revalidatePath("/calendar");
}

export async function toggleEventDone(id: string) {
  await connectDB();
  const user = await requireUser();
  const e = await CalendarEvent.findOne({ _id: id, user: user._id }).select("done");
  if (!e) return;
  e.done = !e.done;
  await e.save();
  revalidatePath("/calendar");
}

export async function deleteEvent(id: string) {
  await connectDB();
  const user = await requireUser();
  await CalendarEvent.deleteOne({ _id: id, user: user._id });
  revalidatePath("/calendar");
}

/* --------------------------------------------------------- achievement sweep */

/**
 * Re-evaluate every badge against the user's current counts and unlock any
 * newly earned. Idempotent, the unique index means an already-unlocked badge
 * is a no-op, so it is safe to call on any page load in the module.
 */
export async function syncAchievements() {
  await connectDB();
  const user = await requireUser();
  const counts = await getUserCounts(user._id, user.xp ?? 0, user.currentStreak ?? 0);

  const newly: string[] = [];
  for (const def of ACHIEVEMENTS) {
    if ((counts[def.metric] ?? 0) >= def.threshold) {
      const res = await Achievement.updateOne(
        { user: user._id, key: def.key },
        { $setOnInsert: { unlockedAt: new Date(), value: counts[def.metric] } },
        { upsert: true }
      );
      if (res.upsertedCount > 0) newly.push(def.title);
    }
  }
  return { newly };
}
