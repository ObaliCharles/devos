import { Schema, model, models } from "mongoose";

/* ===========================================================================
   PRACTICE (Chapter 7) — where knowledge becomes skill.

   Test cases are stored as expression/expected pairs rather than a test file,
   because the runner has to evaluate them somewhere sandboxed. See
   lib/runner.ts for what that currently means and what it does not.
   ======================================================================== */

const TestCaseSchema = new Schema(
  {
    /** A call against the user's solution, e.g. `twoSum([2,7,11], 9)`. */
    call: { type: String, required: true },
    /** JSON of the expected result. Compared structurally, not by identity. */
    expected: { type: String, required: true },
    hidden: { type: Boolean, default: false },
    label: String,
  },
  { _id: false }
);

const ChallengeSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ["algorithms", "frontend", "backend", "database", "debugging", "typescript", "react"],
      default: "algorithms",
    },
    technology: [String],
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "easy" },
    /** Markdown: statement, constraints, worked examples. */
    prompt: { type: String, required: true },
    language: { type: String, enum: ["javascript", "typescript"], default: "javascript" },
    /** What the editor opens with. Should compile and fail, not error. */
    starterCode: { type: String, default: "" },
    /** The exported name the tests call. */
    entryPoint: { type: String, default: "solution" },
    tests: [TestCaseSchema],
    hints: [String],
    xp: { type: Number, default: 30 },
    estimatedMinutes: { type: Number, default: 20 },
    skills: [{ type: Schema.Types.ObjectId, ref: "Skill", index: true }],
    lesson: { type: Schema.Types.ObjectId, ref: "Lesson", index: true },
  },
  { timestamps: true }
);
ChallengeSchema.index({ category: 1, difficulty: 1 });
// language_override: the `language` field ("javascript") must not be read as the
// text-search language. See the same note on SnippetSchema.
ChallengeSchema.index({ title: "text", prompt: "text" }, { language_override: "searchLang" });

const ChallengeAttemptSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    challenge: { type: Schema.Types.ObjectId, ref: "Challenge", required: true, index: true },
    code: String,
    passed: { type: Boolean, default: false },
    testsPassed: { type: Number, default: 0 },
    testsTotal: { type: Number, default: 0 },
    runtimeMs: Number,
    error: String,
    minutesSpent: { type: Number, default: 0 },
  },
  { timestamps: true }
);
ChallengeAttemptSchema.index({ user: 1, challenge: 1, createdAt: -1 });

/** One row per user+challenge — the "solved" state the browse page filters on. */
const ChallengeProgressSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    challenge: { type: Schema.Types.ObjectId, ref: "Challenge", required: true },
    solved: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 },
    bestTestsPassed: { type: Number, default: 0 },
    /** Kept so re-opening a challenge restores what you were writing. */
    lastCode: String,
    bookmarked: { type: Boolean, default: false },
    solvedAt: Date,
  },
  { timestamps: true }
);
ChallengeProgressSchema.index({ user: 1, challenge: 1 }, { unique: true });

/** The daily challenge, pinned per user per day so it does not change on reload. */
const DailyChallengeSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    day: { type: String, required: true },
    challenge: { type: Schema.Types.ObjectId, ref: "Challenge", required: true },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);
DailyChallengeSchema.index({ user: 1, day: 1 }, { unique: true });

export const Challenge = models.Challenge ?? model("Challenge", ChallengeSchema);
export const ChallengeAttempt =
  models.ChallengeAttempt ?? model("ChallengeAttempt", ChallengeAttemptSchema);
export const ChallengeProgress =
  models.ChallengeProgress ?? model("ChallengeProgress", ChallengeProgressSchema);
export const DailyChallenge = models.DailyChallenge ?? model("DailyChallenge", DailyChallengeSchema);
