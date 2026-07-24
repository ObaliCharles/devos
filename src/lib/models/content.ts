import { Schema, model, models, type InferSchemaType } from "mongoose";

/* ===========================================================================
   CONTENT, authored once, shared by every user.
   Roadmap > Phase > Skill > Topic > Lesson

   Topic is optional. A lesson with no topic hangs directly off its skill,
   which is how every v0.1 lesson was seeded and still works. That keeps the
   level from becoming a forced click for skills that do not need it, see
   DECISIONS 005.
   ======================================================================== */

const RoadmapSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    summary: String,
    /** Empty means the roadmap is global. Set it and it is that user's own. */
    owner: { type: Schema.Types.ObjectId, ref: "User", index: true },
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const PhaseSchema = new Schema(
  {
    roadmap: { type: Schema.Types.ObjectId, ref: "Roadmap", required: true, index: true },
    order: { type: Number, required: true },
    title: { type: String, required: true },
    subtitle: String,
    summary: String,
    estimatedWeeks: Number,
  },
  { timestamps: true }
);
PhaseSchema.index({ roadmap: 1, order: 1 });

const SkillSchema = new Schema(
  {
    phase: { type: Schema.Types.ObjectId, ref: "Phase", required: true, index: true },
    order: { type: Number, required: true },
    title: { type: String, required: true },
    /** Short answer to "why does this exist", shown on the skill hero. */
    why: String,
    difficulty: { type: String, enum: ["beginner", "intermediate", "advanced"], default: "beginner" },
    estimatedHours: Number,
  },
  { timestamps: true }
);
SkillSchema.index({ phase: 1, order: 1 });

const TopicSchema = new Schema(
  {
    skill: { type: Schema.Types.ObjectId, ref: "Skill", required: true, index: true },
    order: { type: Number, required: true },
    title: { type: String, required: true },
    summary: String,
  },
  { timestamps: true }
);
TopicSchema.index({ skill: 1, order: 1 });

const QuestionSchema = new Schema(
  {
    prompt: { type: String, required: true },
    choices: { type: [String], required: true },
    answerIndex: { type: Number, required: true },
    /** Shown after answering, right or wrong. Teaching beats scoring. */
    explanation: String,
  },
  { _id: false }
);

const LessonSchema = new Schema(
  {
    skill: { type: Schema.Types.ObjectId, ref: "Skill", required: true, index: true },
    /** Optional middle level. Null lessons sit directly under the skill. */
    topic: { type: Schema.Types.ObjectId, ref: "Topic", index: true },
    order: { type: Number, required: true },
    title: { type: String, required: true },
    objectives: [String],
    estimatedMinutes: { type: Number, default: 30 },
    /** Markdown. */
    body: { type: String, required: true },
    exercise: {
      brief: String,
      acceptance: [String],
    },
    quiz: [QuestionSchema],
    xp: { type: Number, default: 50 },
  },
  { timestamps: true }
);
LessonSchema.index({ skill: 1, order: 1 });
// Backs the lesson search on /learning. Mongo's own text index is enough at
// this size; Atlas Search is the upgrade when relevance starts mattering.
LessonSchema.index({ title: "text", body: "text" });

/**
 * The mastery gate (Chapter 4). A lesson is only "mastered" when every
 * requirement is satisfied. This is the product's central promise, so the
 * requirements live in the database rather than in component state.
 */
const GateSchema = new Schema(
  {
    read: { type: Boolean, default: false },
    noted: { type: Boolean, default: false },
    exercised: { type: Boolean, default: false },
    quizzed: { type: Boolean, default: false },
    reviewed: { type: Boolean, default: false },
  },
  { _id: false }
);

const LessonProgressSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    lesson: { type: Schema.Types.ObjectId, ref: "Lesson", required: true, index: true },
    skill: { type: Schema.Types.ObjectId, ref: "Skill", required: true, index: true },
    state: {
      type: String,
      enum: ["not_started", "learning", "practicing", "confident", "mastered", "needs_revision"],
      default: "learning",
    },
    gate: { type: GateSchema, default: () => ({}) },
    quizScore: Number,
    minutesSpent: { type: Number, default: 0 },
    /** Set while the lesson page is open, so time on it can be measured. */
    lastOpenedAt: Date,
    bookmarked: { type: Boolean, default: false },
    masteredAt: Date,
  },
  { timestamps: true }
);
LessonProgressSchema.index({ user: 1, lesson: 1 }, { unique: true });

/** Spaced repetition queue. One row per lesson the user has mastered. */
const ReviewSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    lesson: { type: Schema.Types.ObjectId, ref: "Lesson", required: true },
    dueAt: { type: Date, required: true, index: true },
    /** Index into the interval ladder in lib/srs.ts. */
    step: { type: Number, default: 0 },
    lapses: { type: Number, default: 0 },
  },
  { timestamps: true }
);
ReviewSchema.index({ user: 1, lesson: 1 }, { unique: true });

export const Roadmap = models.Roadmap ?? model("Roadmap", RoadmapSchema);
export const Phase = models.Phase ?? model("Phase", PhaseSchema);
export const Skill = models.Skill ?? model("Skill", SkillSchema);
export const Topic = models.Topic ?? model("Topic", TopicSchema);
export const Lesson = models.Lesson ?? model("Lesson", LessonSchema);
export const LessonProgress = models.LessonProgress ?? model("LessonProgress", LessonProgressSchema);
export const Review = models.Review ?? model("Review", ReviewSchema);

export type GateKey = keyof InferSchemaType<typeof GateSchema>;

export const GATE_STEPS: { key: GateKey; label: string; hint: string }[] = [
  { key: "read", label: "Read the lesson", hint: "Scroll to the end of the material." },
  { key: "noted", label: "Write a note", hint: "In your own words. That is the whole point." },
  { key: "exercised", label: "Do the exercise", hint: "Tick it off once your code meets the acceptance list." },
  { key: "quizzed", label: "Pass the quiz", hint: "You need 80% or better." },
  { key: "reviewed", label: "Review the summary", hint: "One last pass before it enters your revision queue." },
];
