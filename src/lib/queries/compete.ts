import { connectDB } from "../db";
import { Challenge, Match, Rating, User } from "../models";
import { START_RATING, currentSeason, leagueFor, toNextLeague } from "../rating";

/** Reads for competitive play. */

export type Standing = {
  rating: number;
  peak: number;
  wins: number;
  losses: number;
  draws: number;
  streak: number;
  played: number;
  league: { key: string; name: string; colour: string };
  next: { name: string; needed: number } | null;
  rank: number | null;
  season: string;
};

export async function getStanding(userId: unknown): Promise<Standing> {
  await connectDB();
  const season = currentSeason();
  const row = await Rating.findOne({ user: userId, season }).lean<{
    rating?: number;
    peak?: number;
    wins?: number;
    losses?: number;
    draws?: number;
    streak?: number;
    played?: number;
  } | null>();

  const rating = row?.rating ?? START_RATING;
  const league = leagueFor(rating);
  const next = toNextLeague(rating);

  // Rank is only meaningful once you have played; an unranked player sitting at
  // "#1 of 1" is a lie the first time anyone else joins.
  const rank = row?.played
    ? (await Rating.countDocuments({ season, rating: { $gt: rating } })) + 1
    : null;

  return {
    rating,
    peak: row?.peak ?? rating,
    wins: row?.wins ?? 0,
    losses: row?.losses ?? 0,
    draws: row?.draws ?? 0,
    streak: row?.streak ?? 0,
    played: row?.played ?? 0,
    league: { key: league.key, name: league.name, colour: league.colour },
    next: next ? { name: next.next.name, needed: next.needed } : null,
    rank,
    season,
  };
}

export type LeaderRow = {
  userId: string;
  name: string;
  username: string;
  avatarUrl: string;
  rating: number;
  wins: number;
  losses: number;
  league: string;
  colour: string;
  isMe: boolean;
};

export async function getLeaderboard(userId: unknown, limit = 50): Promise<LeaderRow[]> {
  await connectDB();
  const rows = await Rating.find({ season: currentSeason(), played: { $gt: 0 } })
    .sort({ rating: -1 })
    .limit(limit)
    .populate({ path: "user", select: "name username avatarUrl" })
    .lean();

  return rows
    .filter((r) => r.user)
    .map((r) => {
      const u = r.user as { _id: unknown; name?: string; username?: string; avatarUrl?: string };
      const league = leagueFor(Number(r.rating ?? START_RATING));
      return {
        userId: String(u._id),
        name: u.name?.trim() || "Anonymous developer",
        username: u.username || String(u._id),
        avatarUrl: u.avatarUrl ?? "",
        rating: Number(r.rating ?? START_RATING),
        wins: Number(r.wins ?? 0),
        losses: Number(r.losses ?? 0),
        league: league.name,
        colour: league.colour,
        isMe: String(u._id) === String(userId),
      };
    });
}

export type MatchCard = {
  id: string;
  mode: string;
  status: string;
  challengeTitle: string;
  challengeId: string;
  difficulty: string;
  opponent: { name: string; username: string; avatarUrl: string } | null;
  you: { solved: boolean; elapsedMs?: number; delta?: number };
  result: "win" | "loss" | "draw" | null;
  expiresAt: string | null;
  createdAt: string;
};

type PlayerRow = {
  user?: { _id?: unknown; name?: string; username?: string; avatarUrl?: string } | unknown;
  solved?: boolean;
  elapsedMs?: number;
  ratingBefore?: number;
  ratingAfter?: number;
};

function shape(m: Record<string, unknown>, userId: unknown): MatchCard {
  const players = (m.players ?? []) as PlayerRow[];
  const mine = players.find((p) => String((p.user as { _id?: unknown })?._id ?? p.user) === String(userId));
  const theirs = players.find((p) => p !== mine);
  const other = theirs?.user as { name?: string; username?: string; avatarUrl?: string; _id?: unknown } | undefined;
  const ch = m.challenge as { _id?: unknown; title?: string; difficulty?: string } | undefined;

  const winner = m.winner ? String(m.winner) : null;
  const result =
    m.status !== "complete"
      ? null
      : !winner
        ? ("draw" as const)
        : winner === String(userId)
          ? ("win" as const)
          : ("loss" as const);

  return {
    id: String(m._id),
    mode: String(m.mode ?? "ranked"),
    status: String(m.status ?? "open"),
    challengeTitle: String(ch?.title ?? "Challenge"),
    challengeId: String(ch?._id ?? ""),
    difficulty: String(ch?.difficulty ?? "easy"),
    opponent: other?._id
      ? {
          name: other.name?.trim() || "Anonymous developer",
          username: other.username || String(other._id),
          avatarUrl: other.avatarUrl ?? "",
        }
      : null,
    you: {
      solved: Boolean(mine?.solved),
      elapsedMs: mine?.elapsedMs,
      delta:
        mine?.ratingAfter !== undefined && mine?.ratingBefore !== undefined
          ? mine.ratingAfter - mine.ratingBefore
          : undefined,
    },
    result,
    expiresAt: m.expiresAt ? new Date(m.expiresAt as Date).toISOString() : null,
    createdAt: new Date((m.createdAt as Date) ?? Date.now()).toISOString(),
  };
}

/** Your matches: live ones first, then history. */
export async function getMyMatches(userId: unknown, limit = 20) {
  await connectDB();
  const rows = await Match.find({ "players.user": userId })
    .sort({ status: 1, createdAt: -1 })
    .limit(limit)
    .populate({ path: "challenge", select: "title difficulty" })
    .populate({ path: "players.user", select: "name username avatarUrl" })
    .lean();

  const cards = rows.map((m) => shape(m as Record<string, unknown>, userId));
  return {
    active: cards.filter((c) => c.status === "active"),
    history: cards.filter((c) => c.status === "complete" || c.status === "expired"),
  };
}

/** Matches waiting for a second player — the lobby. */
export async function getOpenMatches(userId: unknown, limit = 20) {
  await connectDB();
  const rows = await Match.find({ status: "open", "players.user": { $ne: userId } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate({ path: "challenge", select: "title difficulty" })
    .populate({ path: "players.user", select: "name username avatarUrl" })
    .lean();
  return rows.map((m) => shape(m as Record<string, unknown>, userId));
}

/** A challenge to duel over, drawn at random from the requested difficulty. */
export async function pickDuelChallenge(difficulty?: string) {
  await connectDB();
  const filter = difficulty ? { difficulty } : {};
  const [row] = await Challenge.aggregate([{ $match: filter }, { $sample: { size: 1 } }]);
  return row ? String(row._id) : null;
}

export async function countCompetitors() {
  await connectDB();
  return User.countDocuments();
}
