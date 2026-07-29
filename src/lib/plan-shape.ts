/**
 * How big a generated path should be, from how much time the learner has.
 *
 * This lives on its own, with no imports, because two very different callers
 * need the same answer: the builder's "Journey Preview" in the browser, and the
 * generator's prompt on the server. A preview that promises 124 lessons and a
 * generator told to write 40 is a lie the user finds out about a minute later,
 * so both read this one function.
 *
 * A lesson is ~40 minutes of real work including the exercise, and nobody
 * studies seven days a week, so a week is costed at five days. The 0.6 factor
 * is the share of study time that goes on lessons rather than projects,
 * revision and getting stuck.
 */
export type PlanShape = {
  lessons: number;
  phases: number;
  projects: number;
  assessments: number;
  certifications: number;
  hours: number;
};

export function planShape(months = 6, hoursPerDay = 2): PlanShape {
  const hours = Math.max(1, months) * 4.3 * 5 * Math.max(0.5, hoursPerDay);
  const lessons = Math.min(40, Math.max(8, Math.round((hours * 0.6) / 0.66)));
  const phases = Math.min(6, Math.max(3, Math.round(lessons / 4)));
  return {
    lessons,
    phases,
    projects: Math.max(1, Math.round(lessons / 7)),
    assessments: Math.max(2, phases - 1),
    certifications: Math.max(1, Math.round(months / 2)),
    hours: Math.round(hours),
  };
}

/** "December 2026" — when a path of this length lands, from today. */
export function completionLabel(months: number, now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth() + Math.max(1, months), 1);
  return end.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}
