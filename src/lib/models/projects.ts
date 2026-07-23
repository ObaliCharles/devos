import { Schema, model, models } from "mongoose";

/* ===========================================================================
   PROJECTS (Chapter 5) — where learning becomes something that exists.

   The field that justifies this module is `skills` on Project. Trello does
   boards better and Jira does tickets better; neither knows that the thing you
   are building is the thing you just learned. Everything else here is
   table stakes — that link is the product.
   ======================================================================== */

const StackSchema = new Schema(
  {
    frontend: [String],
    backend: [String],
    database: [String],
    auth: [String],
    storage: [String],
    deployment: [String],
    ai: [String],
  },
  { _id: false }
);

const ProjectSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    description: String,
    /** The problem it solves, who it is for — the overview page's substance. */
    goal: String,
    category: {
      type: String,
      enum: ["web", "mobile", "api", "cli", "library", "data", "ai", "game", "other"],
      default: "web",
    },
    difficulty: { type: String, enum: ["beginner", "intermediate", "advanced"], default: "intermediate" },
    status: {
      type: String,
      enum: ["planning", "building", "testing", "deployed", "paused", "complete", "archived"],
      default: "planning",
    },
    visibility: { type: String, enum: ["private", "public"], default: "private" },
    thumbnailUrl: String,
    stack: { type: StackSchema, default: () => ({}) },
    features: [String],

    /**
     * The skills this project practises. This is what lets the roadmap say
     * "you have learned JWT — here is where you used it", and what makes the
     * portfolio in Chapter 9 more than a list of repos.
     */
    skills: [{ type: Schema.Types.ObjectId, ref: "Skill", index: true }],

    repoUrl: String,
    liveUrl: String,
    figmaUrl: String,

    startedAt: Date,
    deadline: Date,
    completedAt: Date,

    pinned: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },

    /** Denormalised so the projects list does not need a per-card aggregate. */
    counts: {
      tasks: { type: Number, default: 0 },
      tasksDone: { type: Number, default: 0 },
      bugsOpen: { type: Number, default: 0 },
    },
    minutesSpent: { type: Number, default: 0 },
  },
  { timestamps: true }
);
ProjectSchema.index({ user: 1, archived: 1, updatedAt: -1 });
ProjectSchema.index({ user: 1, pinned: -1 });

export const TASK_STATUSES = [
  "ideas",
  "backlog",
  "todo",
  "doing",
  "review",
  "testing",
  "done",
] as const;

const ChecklistItemSchema = new Schema(
  { text: { type: String, required: true }, done: { type: Boolean, default: false } },
  { _id: false }
);

const TaskSchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    description: String,
    status: { type: String, enum: TASK_STATUSES, default: "todo" },
    priority: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
    /** Position within its column. Fractional, so a drop is one write. */
    order: { type: Number, default: 0 },
    estimatedHours: Number,
    actualMinutes: { type: Number, default: 0 },
    deadline: Date,
    tags: [String],
    checklist: [ChecklistItemSchema],
    milestone: { type: Schema.Types.ObjectId, ref: "Milestone", index: true },
    blockedBy: [{ type: Schema.Types.ObjectId, ref: "Task" }],
    completedAt: Date,
  },
  { timestamps: true }
);
TaskSchema.index({ project: 1, status: 1, order: 1 });

const MilestoneSchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    description: String,
    order: { type: Number, default: 0 },
    dueAt: Date,
    status: { type: String, enum: ["planned", "active", "done"], default: "planned" },
    completedAt: Date,
  },
  { timestamps: true }
);
MilestoneSchema.index({ project: 1, order: 1 });

const BugSchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    description: String,
    steps: String,
    severity: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
    status: { type: String, enum: ["open", "confirmed", "fixing", "fixed", "wontfix"], default: "open" },
    screenshotUrl: String,
    fixedIn: String,
    fixedAt: Date,
  },
  { timestamps: true }
);
BugSchema.index({ project: 1, status: 1 });

const DeploymentSchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    environment: { type: String, enum: ["development", "staging", "production"], default: "production" },
    platform: {
      type: String,
      enum: ["vercel", "railway", "render", "aws", "docker", "netlify", "fly", "digitalocean", "other"],
      default: "vercel",
    },
    url: String,
    status: { type: String, enum: ["queued", "building", "live", "failed", "rolled_back"], default: "live" },
    version: String,
    notes: String,
    deployedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
DeploymentSchema.index({ project: 1, deployedAt: -1 });

const ApiEndpointSchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    method: { type: String, enum: ["GET", "POST", "PATCH", "PUT", "DELETE"], default: "GET" },
    path: { type: String, required: true },
    group: String,
    description: String,
    auth: { type: Boolean, default: true },
    /** Raw JSON strings — the point is documentation, not validation. */
    headers: String,
    requestBody: String,
    responseBody: String,
    /** Not `errors` — reserved by Mongoose for validation errors. */
    errorResponses: String,
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);
ApiEndpointSchema.index({ project: 1, group: 1, order: 1 });

const SchemaFieldSchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, default: "String" },
    required: { type: Boolean, default: false },
    unique: { type: Boolean, default: false },
    indexed: { type: Boolean, default: false },
    /** Set for ObjectId fields: the collection this points at. */
    ref: String,
    note: String,
  },
  { _id: false }
);

const SchemaDesignSchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    description: String,
    fields: [SchemaFieldSchema],
    indexes: [String],
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);
SchemaDesignSchema.index({ project: 1, order: 1 });

/** The project activity feed. Written by the actions, never by hand. */
const ActivityLogSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    project: { type: Schema.Types.ObjectId, ref: "Project", index: true },
    kind: { type: String, required: true },
    message: { type: String, required: true },
    href: String,
  },
  { timestamps: true }
);
ActivityLogSchema.index({ project: 1, createdAt: -1 });
ActivityLogSchema.index({ user: 1, createdAt: -1 });

export const Project = models.Project ?? model("Project", ProjectSchema);
export const Task = models.Task ?? model("Task", TaskSchema);
export const Milestone = models.Milestone ?? model("Milestone", MilestoneSchema);
export const Bug = models.Bug ?? model("Bug", BugSchema);
export const Deployment = models.Deployment ?? model("Deployment", DeploymentSchema);
export const ApiEndpoint = models.ApiEndpoint ?? model("ApiEndpoint", ApiEndpointSchema);
export const SchemaDesign = models.SchemaDesign ?? model("SchemaDesign", SchemaDesignSchema);
export const ActivityLog = models.ActivityLog ?? model("ActivityLog", ActivityLogSchema);
