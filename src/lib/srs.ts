/**
 * Spaced repetition, kept deliberately simple for v0.1.
 *
 * Chapter 6 specifies the ladder 1 / 3 / 7 / 14 / 30 days. A real SM-2
 * implementation with per-item ease factors is in the backlog; this fixed
 * ladder is enough to prove the loop and is easy to reason about.
 */

export const INTERVALS_DAYS = [1, 3, 7, 14, 30, 60];

export function nextDue(step: number, from: Date = new Date()) {
  const days = INTERVALS_DAYS[Math.min(step, INTERVALS_DAYS.length - 1)];
  const due = new Date(from);
  due.setDate(due.getDate() + days);
  due.setHours(4, 0, 0, 0); // early morning, so "due today" means all day
  return due;
}

/** Remembered it -> move up the ladder. Forgot it -> drop back two rungs. */
export function grade(step: number, remembered: boolean) {
  return remembered ? step + 1 : Math.max(0, step - 2);
}

export function intervalLabel(step: number) {
  const days = INTERVALS_DAYS[Math.min(step, INTERVALS_DAYS.length - 1)];
  return days === 1 ? "tomorrow" : `in ${days} days`;
}
