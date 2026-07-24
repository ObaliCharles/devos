import { Schema, model, models } from "mongoose";

/* ===========================================================================
   PRODUCTIVITY & ANALYTICS (Chapter 10).

   Analytics reads; it does not store its own copies. Every chart in the module
   is an aggregation over StudySession, TimeEntry, LessonProgress, Task and
   ChallengeAttempt, the collections that were already being written by the
   modules that own them. A separate "analytics" collection would only be a
   second source of truth to keep in sync.
   ======================================================================== */

/**
 * Where time actually went. `minutes` is measured, not assumed, this is what
 * replaced masterLesson's flat 30-minute credit.
 */
const TimeEntrySchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    kind: {
      type: String,
      enum: ["lesson", "project", "task", "practice", "review", "notes", "focus", "other"],
      default: "other",
    },
    minutes: { type: Number, required: true },
    day: { type: String, required: true },
    lesson: { type: Schema.Types.ObjectId, ref: "Lesson" },
    project: { type: Schema.Types.ObjectId, ref: "Project" },
    task: { type: Schema.Types.ObjectId, ref: "Task" },
    challenge: { type: Schema.Types.ObjectId, ref: "Challenge" },
    note: String,
  },
  { timestamps: true }
);
TimeEntrySchema.index({ user: 1, day: -1 });
TimeEntrySchema.index({ user: 1, kind: 1, day: -1 });

const FocusSessionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    kind: { type: String, enum: ["pomodoro", "deep", "break"], default: "pomodoro" },
    plannedMinutes: { type: Number, default: 25 },
    minutes: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    endedAt: Date,
    completed: { type: Boolean, default: false },
    day: { type: String, required: true },
    intent: String,
    lesson: { type: Schema.Types.ObjectId, ref: "Lesson" },
    project: { type: Schema.Types.ObjectId, ref: "Project" },
  },
  { timestamps: true }
);
FocusSessionSchema.index({ user: 1, day: -1 });

const GoalSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    /** What to count. The metric is computed, never typed in by hand. */
    metric: {
      type: String,
      enum: ["minutes", "lessons", "challenges", "notes", "tasks", "reviews", "custom"],
      default: "minutes",
    },
    target: { type: Number, required: true },
    period: { type: String, enum: ["day", "week", "month", "quarter", "year"], default: "week" },
    /** Only used when metric is "custom", then progress is user-reported. */
    manualProgress: { type: Number, default: 0 },
    startAt: { type: Date, default: Date.now },
    dueAt: Date,
    archived: { type: Boolean, default: false },
    achievedAt: Date,
  },
  { timestamps: true }
);
GoalSchema.index({ user: 1, archived: 1 });

const HabitSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    cadence: { type: String, enum: ["daily", "weekdays", "weekly"], default: "daily" },
    colour: { type: String, default: "var(--primary)" },
    /** YYYY-MM-DD strings. A set, kept sorted, so the heatmap is one read. */
    completedDays: [String],
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);
HabitSchema.index({ user: 1, archived: 1 });

/**
 * Badges. The definitions live in lib/achievements.ts so the engine can
 * re-evaluate them; this collection is only the record of what was unlocked.
 */
const AchievementSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    key: { type: String, required: true },
    unlockedAt: { type: Date, default: Date.now },
    /** The value that tripped it, for the "how did I get this" question. */
    value: Number,
  },
  { timestamps: true }
);
AchievementSchema.index({ user: 1, key: 1 }, { unique: true });

const CalendarEventSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    description: String,
    kind: {
      type: String,
      enum: ["study", "project", "interview", "deadline", "focus", "practice", "personal"],
      default: "study",
    },
    startAt: { type: Date, required: true },
    endAt: Date,
    allDay: { type: Boolean, default: false },
    /** Optional link back to whatever the event is about. */
    lesson: { type: Schema.Types.ObjectId, ref: "Lesson" },
    project: { type: Schema.Types.ObjectId, ref: "Project" },
    task: { type: Schema.Types.ObjectId, ref: "Task" },
    interview: { type: Schema.Types.ObjectId, ref: "Interview" },
    colour: String,
    done: { type: Boolean, default: false },
  },
  { timestamps: true }
);
CalendarEventSchema.index({ user: 1, startAt: 1 });

export const TimeEntry = models.TimeEntry ?? model("TimeEntry", TimeEntrySchema);
export const FocusSession = models.FocusSession ?? model("FocusSession", FocusSessionSchema);
export const Goal = models.Goal ?? model("Goal", GoalSchema);
export const Habit = models.Habit ?? model("Habit", HabitSchema);
export const Achievement = models.Achievement ?? model("Achievement", AchievementSchema);
export const CalendarEvent = models.CalendarEvent ?? model("CalendarEvent", CalendarEventSchema);
