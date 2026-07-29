import { Schema, model, models } from "mongoose";

/**
 * Competitive play.
 *
 * The format is an **asynchronous duel**: two people are given the same
 * challenge and a deadline, each solves it alone, and the result is decided by
 * who passed and how fast. That choice is deliberate — a live side-by-side
 * battle needs a socket, a shared clock and a spectator channel, none of which
 * exist yet, and shipping a ranked ladder that only works when two people are
 * online at the same second means shipping a ladder nobody can climb.
 *
 * Async duels use the runner that already exists, work across timezones, and
 * produce exactly the same rating signal. Live mode is a later surface over the
 * same Match record, not a different system.
 */

const MatchSchema = new Schema(
  {
    challenge: { type: Schema.Types.ObjectId, ref: "Challenge", required: true },
    mode: { type: String, enum: ["ranked", "casual"], default: "ranked", index: true },
    status: {
      type: String,
      enum: ["open", "active", "complete", "expired"],
      default: "open",
      index: true,
    },
    /** Exactly two once matched. The first entry is whoever opened it. */
    players: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        /** Rating at the moment the match started, so history stays honest even
            after the player's current rating has moved on. */
        ratingBefore: { type: Number, default: 1200 },
        ratingAfter: Number,
        solved: { type: Boolean, default: false },
        /** Milliseconds from match start to the passing submission. */
        elapsedMs: Number,
        testsPassed: { type: Number, default: 0 },
        submittedAt: Date,
      },
    ],
    startedAt: Date,
    /** After this, whoever has more passing tests wins; a tie is a draw. */
    expiresAt: { type: Date, index: true },
    winner: { type: Schema.Types.ObjectId, ref: "User" },
    /** Null on a draw, set on a decided match. Kept separate from `winner` so a
        completed draw is distinguishable from a match still being scored. */
    decided: { type: Boolean, default: false },
  },
  { timestamps: true },
);
MatchSchema.index({ status: 1, mode: 1, createdAt: -1 });
MatchSchema.index({ "players.user": 1, status: 1, createdAt: -1 });

/**
 * A player's competitive standing. Separate from User because it is a different
 * lifecycle — it resets per season, and User does not.
 */
const RatingSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    season: { type: String, required: true, index: true },
    rating: { type: Number, default: 1200 },
    peak: { type: Number, default: 1200 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    draws: { type: Number, default: 0 },
    /** Consecutive wins. Reset by any non-win. */
    streak: { type: Number, default: 0 },
    /** Provisional until this many matches, when K is still large. */
    played: { type: Number, default: 0 },
  },
  { timestamps: true },
);
RatingSchema.index({ season: 1, rating: -1 });
RatingSchema.index({ user: 1, season: 1 }, { unique: true });

export const Match = models.Match || model("Match", MatchSchema);
export const Rating = models.Rating || model("Rating", RatingSchema);
