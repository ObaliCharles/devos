"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "../db";
import { Match, Rating } from "../models";
import { requireUser } from "../user";
import { pickDuelChallenge } from "../queries/compete";
import { START_RATING, currentSeason, nextRating } from "../rating";

/**
 * Writes for competitive play.
 *
 * Scoring lives in `scoreMatch`, which is the only function that moves a
 * rating. It is written to be safe to call twice — a match already marked
 * complete returns early — because it is reachable from a submission, from a
 * lobby refresh finding an expired match, and eventually from a cron.
 */

const MATCH_WINDOW_MS = 30 * 60 * 1000;

function bad(error: string) {
  return { ok: false as const, error };
}

async function standingOf(userId: unknown) {
  const season = currentSeason();
  const row = await Rating.findOneAndUpdate(
    { user: userId, season },
    { $setOnInsert: { rating: START_RATING, peak: START_RATING } },
    { upsert: true, new: true },
  );
  return row;
}

/** Open a duel and wait for someone to take it. */
export async function createMatch(difficulty?: string, mode: "ranked" | "casual" = "ranked") {
  await connectDB();
  const me = await requireUser();

  const challengeId = await pickDuelChallenge(difficulty);
  if (!challengeId) return bad("No challenges are loaded to duel over yet.");

  const mine = await standingOf(me._id);
  const match = await Match.create({
    challenge: challengeId,
    mode,
    status: "open",
    players: [{ user: me._id, ratingBefore: mine.rating }],
  });

  revalidatePath("/compete");
  return { ok: true as const, id: String(match._id) };
}

/**
 * Join an open match. The `status: "open"` in the filter is the lock: two people
 * pressing Join at the same moment both run this, and only the update that sees
 * the match still open wins. Checking first and updating after would let both in.
 */
export async function joinMatch(matchId: string) {
  await connectDB();
  const me = await requireUser();

  const existing = await Match.findById(matchId).select("players status").lean<{
    players?: { user: unknown }[];
    status?: string;
  } | null>();
  if (!existing) return bad("That match is gone.");
  if (existing.status !== "open") return bad("Someone already took that one.");
  if (existing.players?.some((p) => String(p.user) === String(me._id))) {
    return bad("That is your own match.");
  }

  const mine = await standingOf(me._id);
  const now = new Date();
  const claimed = await Match.findOneAndUpdate(
    { _id: matchId, status: "open" },
    {
      $push: { players: { user: me._id, ratingBefore: mine.rating } },
      $set: { status: "active", startedAt: now, expiresAt: new Date(+now + MATCH_WINDOW_MS) },
    },
    { new: true },
  );
  if (!claimed) return bad("Someone already took that one.");

  revalidatePath("/compete");
  return { ok: true as const, challengeId: String(claimed.challenge) };
}

/**
 * Record a submission against any active match on this challenge.
 *
 * Called from the challenge submit path, so duelling reuses the whole existing
 * runner rather than a parallel one. A duel you forgot you were in still counts.
 */
export async function recordMatchSubmission(
  challengeId: string,
  passed: boolean,
  testsPassed: number,
) {
  await connectDB();
  const me = await requireUser();

  const match = await Match.findOne({
    challenge: challengeId,
    status: "active",
    "players.user": me._id,
  });
  if (!match) return { ok: true as const, matched: false };

  const player = match.players.find(
    (p: { user: unknown }) => String(p.user) === String(me._id),
  );
  if (!player || player.solved) return { ok: true as const, matched: true };

  player.testsPassed = Math.max(player.testsPassed ?? 0, testsPassed);
  player.submittedAt = new Date();
  if (passed) {
    player.solved = true;
    player.elapsedMs = Date.now() - new Date(match.startedAt ?? Date.now()).getTime();
  }
  await match.save();

  // First to pass ends it. Waiting for the second player to also finish would
  // mean the winner sits on an unresolved match for half an hour.
  if (passed) await scoreMatch(String(match._id));

  revalidatePath("/compete");
  return { ok: true as const, matched: true };
}

/**
 * Decide a match and move both ratings. Idempotent.
 *
 * Ratings are read from the stored `ratingBefore` rather than the players'
 * current rows, so a match scored late produces the same numbers it would have
 * produced on time.
 */
export async function scoreMatch(matchId: string) {
  await connectDB();
  const match = await Match.findById(matchId);
  if (!match || match.status === "complete") return { ok: true as const };
  if (match.players.length < 2) {
    // Nobody ever joined; expire it rather than rating a solo.
    if (match.expiresAt && match.expiresAt < new Date()) {
      match.status = "expired";
      await match.save();
    }
    return { ok: true as const };
  }

  const [a, b] = match.players;

  function better(x: typeof a, y: typeof b) {
    if (x.solved !== y.solved) return x.solved ? 1 : -1;
    if (x.solved && y.solved) {
      const dx = x.elapsedMs ?? Infinity;
      const dy = y.elapsedMs ?? Infinity;
      return dx === dy ? 0 : dx < dy ? 1 : -1;
    }
    // Neither passed — more passing tests wins, which rewards getting closer.
    const tx = x.testsPassed ?? 0;
    const ty = y.testsPassed ?? 0;
    return tx === ty ? 0 : tx > ty ? 1 : -1;
  }

  const verdict = better(a, b);
  const scoreA = verdict === 0 ? 0.5 : verdict > 0 ? 1 : 0;

  const season = currentSeason();
  const rows = await Promise.all(
    match.players.map((p: { user: unknown }) =>
      Rating.findOneAndUpdate(
        { user: p.user, season },
        { $setOnInsert: { rating: START_RATING, peak: START_RATING } },
        { upsert: true, new: true },
      ),
    ),
  );

  const ranked = match.mode === "ranked";
  for (let i = 0; i < 2; i += 1) {
    const me = match.players[i];
    const them = match.players[1 - i];
    const score = i === 0 ? scoreA : 1 - scoreA;
    const row = rows[i];

    const after = ranked
      ? nextRating(me.ratingBefore ?? START_RATING, them.ratingBefore ?? START_RATING, score, row.played ?? 0)
      : (me.ratingBefore ?? START_RATING);
    me.ratingAfter = after;

    row.rating = after;
    row.peak = Math.max(row.peak ?? after, after);
    row.played = (row.played ?? 0) + 1;
    if (score === 1) {
      row.wins = (row.wins ?? 0) + 1;
      row.streak = (row.streak ?? 0) + 1;
    } else if (score === 0) {
      row.losses = (row.losses ?? 0) + 1;
      row.streak = 0;
    } else {
      row.draws = (row.draws ?? 0) + 1;
      row.streak = 0;
    }
    await row.save();
  }

  match.status = "complete";
  match.decided = verdict !== 0;
  match.winner = verdict === 0 ? undefined : match.players[verdict > 0 ? 0 : 1].user;
  await match.save();

  revalidatePath("/compete");
  return { ok: true as const };
}

/** Called on lobby load: settle anything past its window. */
export async function settleExpiredMatches() {
  await connectDB();
  await requireUser();
  const stale = await Match.find({ status: "active", expiresAt: { $lt: new Date() } })
    .select("_id")
    .limit(20)
    .lean();
  for (const m of stale) await scoreMatch(String(m._id));
  return { ok: true as const, settled: stale.length };
}

export async function cancelMatch(matchId: string) {
  await connectDB();
  const me = await requireUser();
  const match = await Match.findById(matchId);
  if (!match) return bad("Already gone.");
  if (match.status !== "open") return bad("You cannot cancel a match in progress.");
  if (String(match.players[0]?.user) !== String(me._id)) return bad("That is not yours.");
  await match.deleteOne();
  revalidatePath("/compete");
  return { ok: true as const };
}
