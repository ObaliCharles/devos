/**
 * Elo, and the league ladder built on it.
 *
 * K is 40 while a player is provisional (under ten matches) and 24 afterwards.
 * A single K would make either the first ten matches useless at placing someone
 * or every later match jump their rating around; two values is the smallest
 * honest fix and is what chess federations settled on for the same reason.
 *
 * Nothing here touches the database, so it is testable and callable from both
 * the action that scores a match and the UI that previews what a win is worth.
 */

export const START_RATING = 1200;
const PROVISIONAL_MATCHES = 10;

export function kFactor(played: number): number {
  return played < PROVISIONAL_MATCHES ? 40 : 24;
}

/** Probability that `a` beats `b`. */
export function expected(a: number, b: number): number {
  return 1 / (1 + 10 ** ((b - a) / 400));
}

/** `score` is 1 for a win, 0.5 for a draw, 0 for a loss. */
export function nextRating(rating: number, opponent: number, score: number, played: number): number {
  return Math.round(rating + kFactor(played) * (score - expected(rating, opponent)));
}

export type League = {
  key: string;
  name: string;
  floor: number;
  /** A token name, so the ladder follows the theme rather than hard-coding hex. */
  colour: string;
};

/**
 * Six leagues. The floors are spaced so the middle three hold most players —
 * a ladder where everyone is in the bottom tier tells you nothing.
 */
export const LEAGUES: League[] = [
  { key: "bronze", name: "Bronze", floor: 0, colour: "var(--text-faint)" },
  { key: "silver", name: "Silver", floor: 1100, colour: "var(--text-muted)" },
  { key: "gold", name: "Gold", floor: 1300, colour: "var(--warning)" },
  { key: "platinum", name: "Platinum", floor: 1500, colour: "var(--info)" },
  { key: "diamond", name: "Diamond", floor: 1700, colour: "var(--primary)" },
  { key: "master", name: "Master", floor: 1900, colour: "var(--success)" },
];

export function leagueFor(rating: number): League {
  let found = LEAGUES[0];
  for (const l of LEAGUES) if (rating >= l.floor) found = l;
  return found;
}

/** Points to the next league, or null at the top. */
export function toNextLeague(rating: number): { next: League; needed: number } | null {
  const next = LEAGUES.find((l) => l.floor > rating);
  return next ? { next, needed: next.floor - rating } : null;
}

/** Seasons are calendar quarters — long enough to climb, short enough to reset. */
export function currentSeason(now = new Date()): string {
  return `${now.getUTCFullYear()}-Q${Math.floor(now.getUTCMonth() / 3) + 1}`;
}
