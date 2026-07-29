import { connectDB } from "../db";
import { Challenge, ChallengeAttempt, ChallengeProgress } from "../models";

/**
 * Reads for the Practice module. The challenge list folds each user's solved
 * state in, the same way the roadmap folds in lesson progress, one query for
 * challenges, one for the user's progress, joined in memory.
 */

export type ChallengeCard = {
  id: string;
  slug: string;
  title: string;
  /** One-line summary lifted from the prompt, for the library card. */
  description: string;
  category: string;
  difficulty: string;
  technology: string[];
  /** The language the runner executes for this challenge. */
  language: string;
  xp: number;
  estimatedMinutes: number;
  solved: boolean;
  attempts: number;
  bookmarked: boolean;
  /** How many people have solved it, across everyone. */
  solvedBy: number;
  /** Share of everyone who opened it and got there, or null if nobody has. */
  solveRate: number | null;
  /** Freshly added, before anyone has opened it. Drives the "New" flag. */
  createdAt: string;
};

/**
 * The card blurb. A prompt is markdown with a statement, constraints and worked
 * examples; only the opening sentence belongs on a card, so take the first real
 * paragraph, strip the markdown that would render as literal punctuation, and
 * clamp it. Anything longer competes with the title for the same glance.
 */
function summarise(prompt: string): string {
  const firstPara =
    prompt
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .find((p) => p.length > 0 && !p.startsWith("#") && !p.startsWith("```")) ?? "";
  const plain = firstPara
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]*)\*\*/g, "$1")
    .replace(/[*_>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > 160 ? `${plain.slice(0, 157).trimEnd()}…` : plain;
}

export type ChallengeQuery = {
  q?: string;
  difficulty?: string[];
  category?: string;
  tag?: string;
  status?: "all" | "solved" | "unsolved" | "saved";
  sort?: "newest" | "difficulty" | "xp" | "title";
  page?: number;
  perPage?: number;
};

export type ChallengePage = {
  items: ChallengeCard[];
  total: number;
  page: number;
  perPage: number;
  /** Every technology present across the whole library, for the filter rail. */
  tags: string[];
};

/**
 * One page of the challenge library.
 *
 * This used to load every challenge — full markdown `prompt` and all — summarise
 * them in Node, and hand the entire catalogue to the browser to filter. That is
 * fine for twelve challenges and unusable for a real library: the prompt is the
 * largest field on the document, and it was being fetched for rows nobody was
 * going to look at.
 *
 * Now the database does the work. Filtering, sorting and paging happen in the
 * query; `$substrCP` truncates the prompt server-side so the blurb costs 200
 * bytes instead of 8KB; and only one page crosses the wire. The user's own
 * progress is still a second read joined in memory, because that part is small
 * and indexed.
 */
export async function getChallengePage(
  userId: unknown,
  opts: ChallengeQuery = {},
): Promise<ChallengePage> {
  await connectDB();
  const {
    q,
    difficulty = [],
    category,
    tag,
    status = "all",
    sort = "newest",
    page = 1,
    perPage = 25,
  } = opts;

  const filter: Record<string, unknown> = {};
  if (difficulty.length > 0) filter.difficulty = { $in: difficulty };
  if (category) filter.category = category;
  if (tag) filter.technology = tag;
  if (q?.trim()) {
    // A prefix-anchored regex rather than $text: it matches mid-word the way a
    // filter box is expected to, and $text cannot do "rev" → "reverse".
    const safe = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { title: { $regex: safe, $options: "i" } },
      { technology: { $regex: safe, $options: "i" } },
      { category: { $regex: safe, $options: "i" } },
    ];
  }

  // Solved / unsolved / saved need the user's own rows, and they are the only
  // filters that do — so they are resolved to an id set first and folded in.
  if (status !== "all") {
    const own = await ChallengeProgress.find(
      status === "saved" ? { user: userId, bookmarked: true } : { user: userId, solved: true },
    )
      .select("challenge")
      .lean();
    const ids = own.map((p) => p.challenge);
    filter._id = status === "unsolved" ? { $nin: ids } : { $in: ids };
  }

  const order: Record<string, 1 | -1> =
    sort === "difficulty"
      ? { difficultyRank: 1, createdAt: -1 }
      : sort === "xp"
        ? { xp: -1 }
        : sort === "title"
          ? { title: 1 }
          : { createdAt: -1 };

  const skip = Math.max(0, (page - 1) * perPage);

  const [rows, total, tags] = await Promise.all([
    Challenge.aggregate<{
      _id: unknown;
      slug: string;
      title: string;
      blurb: string;
      category: string;
      difficulty: string;
      technology: string[];
      language: string;
      xp: number;
      estimatedMinutes: number;
      createdAt: Date;
    }>([
      { $match: filter },
      {
        $addFields: {
          difficultyRank: {
            $switch: {
              branches: [
                { case: { $eq: ["$difficulty", "easy"] }, then: 0 },
                { case: { $eq: ["$difficulty", "medium"] }, then: 1 },
              ],
              default: 2,
            },
          },
        },
      },
      { $sort: order },
      { $skip: skip },
      { $limit: perPage },
      {
        $project: {
          slug: 1,
          title: 1,
          category: 1,
          difficulty: 1,
          technology: 1,
          language: 1,
          xp: 1,
          estimatedMinutes: 1,
          createdAt: 1,
          // 400 characters is comfortably more than the blurb needs and still a
          // twentieth of a real prompt.
          blurb: { $substrCP: [{ $ifNull: ["$prompt", ""] }, 0, 400] },
        },
      },
    ]),
    Challenge.countDocuments(filter),
    Challenge.distinct("technology").catch((): string[] => []),
  ]);

  const ids = rows.map((r) => r._id);
  const [mine, cohort] = await Promise.all([
    ChallengeProgress.find({ user: userId, challenge: { $in: ids } }).lean(),
    ChallengeProgress.aggregate<{ _id: unknown; attempted: number; solved: number }>([
      { $match: { challenge: { $in: ids } } },
      {
        $group: {
          _id: "$challenge",
          attempted: { $sum: 1 },
          solved: { $sum: { $cond: ["$solved", 1, 0] } },
        },
      },
    ]).catch(() => []),
  ]);

  const byChallenge = new Map(mine.map((p) => [String(p.challenge), p]));
  const byCohort = new Map(cohort.map((c) => [String(c._id), c]));

  const items: ChallengeCard[] = rows.map((c) => {
    const p = byChallenge.get(String(c._id));
    const co = byCohort.get(String(c._id));
    const attempted = co?.attempted ?? 0;
    return {
      id: String(c._id),
      slug: String(c.slug ?? ""),
      title: String(c.title ?? ""),
      description: summarise(String(c.blurb ?? "")),
      category: String(c.category ?? "algorithms"),
      difficulty: String(c.difficulty ?? "easy"),
      technology: (c.technology ?? []) as string[],
      language: String(c.language ?? "javascript"),
      xp: Number(c.xp ?? 30),
      estimatedMinutes: Number(c.estimatedMinutes ?? 20),
      solved: Boolean(p?.solved),
      attempts: Number(p?.attempts ?? 0),
      bookmarked: Boolean(p?.bookmarked),
      solvedBy: co?.solved ?? 0,
      solveRate: attempted > 0 ? Math.round(((co?.solved ?? 0) / attempted) * 100) : null,
      createdAt: (c.createdAt instanceof Date ? c.createdAt : new Date(0)).toISOString(),
    };
  });

  return {
    items,
    total,
    page,
    perPage,
    tags: (tags as string[]).filter(Boolean).sort(),
  };
}

/** The unpaged list, for the small rails on Learn and the dashboard. */
export async function getChallenges(userId: unknown, limit = 24) {
  const { items } = await getChallengePage(userId, { perPage: limit, sort: "difficulty" });
  return items;
}


export async function getPracticeStats(userId: unknown) {
  await connectDB();
  const [total, solved, attempts] = await Promise.all([
    Challenge.countDocuments(),
    ChallengeProgress.countDocuments({ user: userId, solved: true }),
    ChallengeAttempt.countDocuments({ user: userId }),
  ]);

  // Accuracy over recorded attempts, as a rough signal not a grade.
  const passed = await ChallengeAttempt.countDocuments({ user: userId, passed: true });
  const accuracy = attempts > 0 ? Math.round((passed / attempts) * 100) : 0;

  return { total, solved, attempts, accuracy };
}

type ChallengeDoc = {
  _id: unknown;
  title: string;
  category?: string;
  difficulty?: string;
  technology?: string[];
  prompt?: string;
  language?: string;
  starterCode?: string;
  hints?: string[];
  xp?: number;
  estimatedMinutes?: number;
  tests?: { call: string; expected: string; hidden?: boolean; label?: string }[];
};

/** The full challenge, plus this user's saved draft and solved state. */
export async function getChallenge(userId: unknown, challengeId: string) {
  await connectDB();
  const challenge = await Challenge.findById(challengeId).lean<ChallengeDoc | null>();
  if (!challenge) return null;

  // Cohort numbers for the stats panel. These are counts over real rows, so a
  // brand-new challenge honestly reads zero rather than inventing a baseline.
  const [progress, attemptedBy, solvedBy, runs, passedRuns] = await Promise.all([
    ChallengeProgress.findOne({ user: userId, challenge: challengeId }).lean<{
      solved?: boolean;
      lastCode?: string;
      bookmarked?: boolean;
      attempts?: number;
    } | null>(),
    ChallengeProgress.countDocuments({ challenge: challengeId }),
    ChallengeProgress.countDocuments({ challenge: challengeId, solved: true }),
    ChallengeAttempt.countDocuments({ challenge: challengeId }),
    ChallengeAttempt.countDocuments({ challenge: challengeId, passed: true }),
  ]);

  // Hidden test bodies never leave the server; the client only learns how many
  // there are, so it cannot be gamed by reading them.
  const tests = (challenge.tests ?? []) as { call: string; expected: string; hidden?: boolean; label?: string }[];

  return {
    id: String(challenge._id),
    title: String(challenge.title),
    category: String(challenge.category ?? "algorithms"),
    difficulty: String(challenge.difficulty ?? "easy"),
    technology: (challenge.technology ?? []) as string[],
    prompt: String(challenge.prompt ?? ""),
    language: String(challenge.language ?? "javascript"),
    starterCode: String(challenge.starterCode ?? ""),
    hints: (challenge.hints ?? []) as string[],
    xp: Number(challenge.xp ?? 30),
    estimatedMinutes: Number(challenge.estimatedMinutes ?? 20),
    visibleTests: tests.filter((t) => !t.hidden).map((t) => ({ call: t.call, expected: t.expected, label: t.label })),
    hiddenCount: tests.filter((t) => t.hidden).length,
    solved: Boolean(progress?.solved),
    lastCode: progress?.lastCode,
    bookmarked: Boolean(progress?.bookmarked),
    attempts: Number(progress?.attempts ?? 0),
    stats: {
      attemptedBy,
      solvedBy,
      /** Share of people who opened it and got there. */
      solveRate: attemptedBy > 0 ? Math.round((solvedBy / attemptedBy) * 100) : null,
      /** Share of all submissions that passed — the LeetCode-style number. */
      acceptance: runs > 0 ? Math.round((passedRuns / runs) * 100) : null,
    },
  };
}

export async function getAttempts(userId: unknown, limit = 20) {
  await connectDB();
  return ChallengeAttempt.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate({ path: "challenge", select: "title slug difficulty" })
    .lean();
}
