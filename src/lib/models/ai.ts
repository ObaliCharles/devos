import { Schema, model, models } from "mongoose";

/* ===========================================================================
   AI (Chapter 8) — the intelligence layer.

   `AiUsage` is not an analytics nicety. BACKLOG calls rate limiting "urgent
   before launch" because one loop in a client component can cost real money,
   and a cap you can enforce needs a counter you can read cheaply. One document
   per user per day, incremented atomically.
   ======================================================================== */

const AiConversationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, default: "New conversation" },
    /** What the assistant could see. Kept so history is reproducible. */
    context: {
      lesson: { type: Schema.Types.ObjectId, ref: "Lesson" },
      project: { type: Schema.Types.ObjectId, ref: "Project" },
      note: { type: Schema.Types.ObjectId, ref: "Note" },
      challenge: { type: Schema.Types.ObjectId, ref: "Challenge" },
    },
    tool: {
      type: String,
      enum: ["chat", "tutor", "review", "debug", "project", "roadmap", "quiz", "flashcards", "docs", "resume"],
      default: "chat",
    },
    tags: [String],
    pinned: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    messageCount: { type: Number, default: 0 },
    lastMessageAt: Date,
  },
  { timestamps: true }
);
AiConversationSchema.index({ user: 1, archived: 1, lastMessageAt: -1 });

const AiMessageSchema = new Schema(
  {
    conversation: { type: Schema.Types.ObjectId, ref: "AiConversation", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, default: "" },
    model: String,
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    /** Set when generation failed, so a broken turn is visible not invisible. */
    error: String,
  },
  { timestamps: true }
);
AiMessageSchema.index({ conversation: 1, createdAt: 1 });

/**
 * What the assistant is allowed to remember. Chapter 8 insists the user can
 * see and edit it, which is the only version of this feature that is honest —
 * so every row is a plain editable fact, not an opaque embedding.
 */
const AiMemorySchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    key: { type: String, required: true },
    value: { type: String, required: true },
    kind: {
      type: String,
      enum: ["goal", "stack", "preference", "weakness", "project", "fact"],
      default: "fact",
    },
    pinned: { type: Boolean, default: false },
    /** Where it came from, so the user can judge whether to keep it. */
    source: String,
  },
  { timestamps: true }
);
AiMemorySchema.index({ user: 1, key: 1 }, { unique: true });

const AiPromptSchema = new Schema(
  {
    /** Empty owner means it ships with the platform. */
    owner: { type: Schema.Types.ObjectId, ref: "User", index: true },
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ["explain", "review", "generate", "improve", "debug", "summarise", "document", "architecture", "interview", "career"],
      default: "explain",
    },
    body: { type: String, required: true },
    description: String,
    usedCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const AiUsageSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    day: { type: String, required: true },
    requests: { type: Number, default: 0 },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    /** Micro-dollars, to stay in integers. */
    costMicros: { type: Number, default: 0 },
  },
  { timestamps: true }
);
AiUsageSchema.index({ user: 1, day: 1 }, { unique: true });

export const AiConversation = models.AiConversation ?? model("AiConversation", AiConversationSchema);
export const AiMessage = models.AiMessage ?? model("AiMessage", AiMessageSchema);
export const AiMemory = models.AiMemory ?? model("AiMemory", AiMemorySchema);
export const AiPrompt = models.AiPrompt ?? model("AiPrompt", AiPromptSchema);
export const AiUsage = models.AiUsage ?? model("AiUsage", AiUsageSchema);
