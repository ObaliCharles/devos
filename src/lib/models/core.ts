import { Schema, model, models } from "mongoose";

/* ===========================================================================
   CORE, identity, and the cross-cutting collections every module writes to.
   ======================================================================== */

const UserSchema = new Schema(
  {
    clerkId: { type: String, required: true, unique: true },
    name: String,
    email: String,
    avatarUrl: String,
    /** "user" for everyone; "admin" unlocks /admin. First user is promoted. */
    role: { type: String, enum: ["user", "admin"], default: "user" },

    xp: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    /** YYYY-MM-DD of the last day the user completed anything. */
    lastActiveDay: String,
    dailyGoalMinutes: { type: Number, default: 60 },

    /** Everything on /settings. Kept on the user so one read has it all. */
    preferences: {
      theme: { type: String, enum: ["dark", "light"], default: "dark" },
      locale: { type: String, default: "en" },
      /** IANA name. Empty means "use the server's zone", see lib/day.ts. */
      timezone: { type: String, default: "" },
      reminderHour: { type: Number, default: 19 },
      emailDigest: { type: Boolean, default: false },
      notifyLearning: { type: Boolean, default: true },
      notifyProjects: { type: Boolean, default: true },
      notifyReviews: { type: Boolean, default: true },
      editorFontSize: { type: Number, default: 13 },
      pomodoroMinutes: { type: Number, default: 25 },
      pomodoroBreakMinutes: { type: Number, default: 5 },
    },

    onboardedAt: Date,
  },
  { timestamps: true }
);

const StudySessionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    /** YYYY-MM-DD, so a day is one document and the heatmap is one query. */
    day: { type: String, required: true },
    minutes: { type: Number, default: 0 },
    focusMinutes: { type: Number, default: 0 },
    lessonsCompleted: { type: Number, default: 0 },
    notesWritten: { type: Number, default: 0 },
    reviewsDone: { type: Number, default: 0 },
    challengesSolved: { type: Number, default: 0 },
    tasksCompleted: { type: Number, default: 0 },
  },
  { timestamps: true }
);
StudySessionSchema.index({ user: 1, day: 1 }, { unique: true });

/**
 * Every module can raise one. `href` is what makes it useful, a notification
 * you cannot act on is just noise.
 */
const NotificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    kind: {
      type: String,
      enum: ["review", "learning", "project", "task", "achievement", "practice", "career", "ai", "system"],
      default: "system",
    },
    title: { type: String, required: true },
    body: String,
    href: String,
    readAt: Date,
  },
  { timestamps: true }
);
NotificationSchema.index({ user: 1, readAt: 1, createdAt: -1 });

/** The global file manager. Project files reference these rather than copying. */
const FileAssetSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    url: { type: String, required: true },
    /** Cloudinary public id, when the upload went there. */
    publicId: String,
    mime: String,
    bytes: { type: Number, default: 0 },
    folder: { type: String, default: "" },
    kind: {
      type: String,
      enum: ["image", "video", "document", "archive", "design", "other"],
      default: "other",
    },
    project: { type: Schema.Types.ObjectId, ref: "Project", index: true },
  },
  { timestamps: true }
);
FileAssetSchema.index({ user: 1, folder: 1, createdAt: -1 });

/** Curated links. `owner` empty means it ships with the platform. */
const ResourceSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", index: true },
    kind: {
      type: String,
      enum: ["book", "article", "video", "cheatsheet", "docs", "template", "roadmap", "course", "other"],
      default: "article",
    },
    title: { type: String, required: true },
    url: String,
    description: String,
    tags: [String],
    skills: [{ type: Schema.Types.ObjectId, ref: "Skill" }],
    saved: { type: Boolean, default: false },
  },
  { timestamps: true }
);
ResourceSchema.index({ owner: 1, kind: 1 });

const SupportTicketSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    kind: { type: String, enum: ["bug", "feature", "question", "feedback"], default: "question" },
    subject: { type: String, required: true },
    body: String,
    status: { type: String, enum: ["open", "in_progress", "closed"], default: "open" },
    response: String,
  },
  { timestamps: true }
);

/**
 * Admin-only. DECISIONS 007 says a gate with a silent bypass is worse than no
 * gate, so anything an admin does that touches another user's data lands here.
 */
const AuditLogSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: { type: String, required: true },
    target: String,
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);
AuditLogSchema.index({ createdAt: -1 });

const FeatureFlagSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: false },
    description: String,
  },
  { timestamps: true }
);

export const User = models.User ?? model("User", UserSchema);
export const StudySession = models.StudySession ?? model("StudySession", StudySessionSchema);
export const Notification = models.Notification ?? model("Notification", NotificationSchema);
export const FileAsset = models.FileAsset ?? model("FileAsset", FileAssetSchema);
export const Resource = models.Resource ?? model("Resource", ResourceSchema);
export const SupportTicket = models.SupportTicket ?? model("SupportTicket", SupportTicketSchema);
export const AuditLog = models.AuditLog ?? model("AuditLog", AuditLogSchema);
export const FeatureFlag = models.FeatureFlag ?? model("FeatureFlag", FeatureFlagSchema);
