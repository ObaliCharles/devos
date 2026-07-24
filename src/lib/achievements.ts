/**
 * The achievement engine. Definitions live here so the engine can re-evaluate
 * them from the user's real counts; the `Achievement` collection only records
 * what has been unlocked. BACKLOG notes XP and levels exist but badges do not, 
 * this is the badges.
 *
 * Each badge has a `metric` the engine knows how to count and a `threshold`.
 * Keeping the check data-driven means adding a badge is one line here, not a
 * new branch in the engine.
 */

export type AchievementMetric =
  | "lessonsMastered"
  | "challengesSolved"
  | "notesWritten"
  | "projectsCreated"
  | "projectsDeployed"
  | "reviewsDone"
  | "currentStreak"
  | "focusMinutes"
  | "xp";

export type AchievementDef = {
  key: string;
  title: string;
  description: string;
  metric: AchievementMetric;
  threshold: number;
  tier: "bronze" | "silver" | "gold";
};

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: "first-lesson", title: "First step", description: "Master your first lesson.", metric: "lessonsMastered", threshold: 1, tier: "bronze" },
  { key: "ten-lessons", title: "Getting serious", description: "Master ten lessons.", metric: "lessonsMastered", threshold: 10, tier: "silver" },
  { key: "fifty-lessons", title: "Scholar", description: "Master fifty lessons.", metric: "lessonsMastered", threshold: 50, tier: "gold" },

  { key: "first-challenge", title: "Hello, world", description: "Solve your first challenge.", metric: "challengesSolved", threshold: 1, tier: "bronze" },
  { key: "ten-challenges", title: "Problem solver", description: "Solve ten challenges.", metric: "challengesSolved", threshold: 10, tier: "silver" },
  { key: "fifty-challenges", title: "Algorithmist", description: "Solve fifty challenges.", metric: "challengesSolved", threshold: 50, tier: "gold" },

  { key: "first-note", title: "Second brain booted", description: "Write your first note.", metric: "notesWritten", threshold: 1, tier: "bronze" },
  { key: "fifty-notes", title: "Prolific", description: "Write fifty notes.", metric: "notesWritten", threshold: 50, tier: "silver" },

  { key: "first-project", title: "Builder", description: "Create your first project.", metric: "projectsCreated", threshold: 1, tier: "bronze" },
  { key: "first-deploy", title: "Shipped it", description: "Deploy a project.", metric: "projectsDeployed", threshold: 1, tier: "silver" },
  { key: "three-deploys", title: "In production", description: "Deploy three projects.", metric: "projectsDeployed", threshold: 3, tier: "gold" },

  { key: "streak-7", title: "A week straight", description: "Reach a 7-day streak.", metric: "currentStreak", threshold: 7, tier: "bronze" },
  { key: "streak-30", title: "A month straight", description: "Reach a 30-day streak.", metric: "currentStreak", threshold: 30, tier: "gold" },

  { key: "reviews-25", title: "Nothing forgotten", description: "Complete 25 reviews.", metric: "reviewsDone", threshold: 25, tier: "silver" },
  { key: "focus-600", title: "Deep worker", description: "Log ten hours of focus.", metric: "focusMinutes", threshold: 600, tier: "silver" },

  { key: "level-5", title: "Builder rank", description: "Reach level 5.", metric: "xp", threshold: 800, tier: "silver" },
  { key: "level-10", title: "Developer rank", description: "Reach level 10.", metric: "xp", threshold: 2800, tier: "gold" },
];

export const TIER_COLOR: Record<string, string> = {
  bronze: "#cd7f32",
  silver: "#9ca3af",
  gold: "var(--warning)",
};

/** Given a user's counts, return the keys of every badge they now qualify for. */
export function earnedKeys(counts: Partial<Record<AchievementMetric, number>>): string[] {
  return ACHIEVEMENTS.filter((a) => (counts[a.metric] ?? 0) >= a.threshold).map((a) => a.key);
}
