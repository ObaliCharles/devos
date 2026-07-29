import type { ChallengeQuery } from "./queries/practice";
import type { LibraryParams } from "@/components/practice/challenge-library";

/**
 * The one place raw search params become a query.
 *
 * Both challenge pages read the same URL contract, so parsing it twice would be
 * two chances to disagree about what `?difficulty=easy,hard` means. Everything
 * is clamped here: an unknown sort falls back rather than reaching the database,
 * and `page` cannot go negative and turn into a `$skip` of -25.
 */

const SORTS = new Set(["newest", "difficulty", "xp", "title"]);
const STATUSES = new Set(["all", "solved", "unsolved", "saved"]);
const DIFFICULTIES = new Set(["easy", "medium", "hard"]);

export type RawParams = {
  q?: string;
  difficulty?: string;
  tag?: string;
  status?: string;
  sort?: string;
  page?: string;
};

export function parseLibraryParams(raw: RawParams): LibraryParams {
  const difficulty = (raw.difficulty ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter((d) => DIFFICULTIES.has(d));

  const page = Number.parseInt(raw.page ?? "1", 10);

  return {
    q: (raw.q ?? "").slice(0, 80),
    difficulty,
    tag: (raw.tag ?? "").slice(0, 40),
    status: STATUSES.has(raw.status ?? "") ? (raw.status as string) : "all",
    sort: SORTS.has(raw.sort ?? "") ? (raw.sort as string) : "newest",
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 500) : 1,
  };
}

export function toChallengeQuery(params: LibraryParams, perPage = 25): ChallengeQuery {
  return {
    q: params.q || undefined,
    difficulty: params.difficulty,
    tag: params.tag || undefined,
    status: params.status as ChallengeQuery["status"],
    sort: params.sort as ChallengeQuery["sort"],
    page: params.page,
    perPage,
  };
}
