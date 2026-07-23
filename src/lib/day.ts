/**
 * Day keys, as "YYYY-MM-DD" in the server's local timezone.
 *
 * `toISOString().slice(0, 10)` looks like the same thing and is not: it is UTC.
 * West of Greenwich that means an evening's work is filed under tomorrow, so a
 * streak can advance twice in one sitting and the activity chart draws a bar on
 * a day the user was asleep. Local date parts, formatted by hand, avoid it.
 *
 * Pure and dependency-free on purpose — this is the one piece of date handling
 * everything else agrees on.
 */
export function dayKey(date: Date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** `offset` days from today. Negative goes backwards. */
export function dayKeyOffset(offset: number, from: Date = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + offset);
  return dayKey(d);
}
