import { Schema, model, models } from "mongoose";

/**
 * The community module: Group → Post → Reply, plus reactions and membership.
 *
 * Two decisions worth recording.
 *
 * **Counters are denormalised.** `replyCount`, `reactionCount` and
 * `memberCount` live on the parent document and are bumped by the action that
 * causes them. A feed of fifty posts otherwise costs fifty count queries, and a
 * feed is the one screen that must be fast. They are advisory numbers on
 * social content, not ledger balances — a lost increment costs nothing, so the
 * trade is worth making here and would not be in Career or Practice.
 *
 * **Reactions are their own collection, not an array on the post.** An array
 * grows without bound on a popular post and has to be loaded in full to answer
 * "did *I* react", which is the only question the feed asks. A row per
 * user+target with a unique index answers that with an index hit and makes the
 * toggle idempotent under a double-click.
 */

/* --------------------------------------------------------------- groups -- */

const GroupSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    /** Freeform, e.g. "react", "career", "algorithms". Drives discovery. */
    topic: { type: String, default: "general" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", index: true },
    memberCount: { type: Number, default: 0 },
    postCount: { type: Number, default: 0 },
    /** Only public groups exist today; the field is the seam for private ones. */
    visibility: { type: String, enum: ["public", "private"], default: "public" },
  },
  { timestamps: true },
);
GroupSchema.index({ topic: 1, memberCount: -1 });

const GroupMemberSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    group: { type: Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    role: { type: String, enum: ["owner", "moderator", "member"], default: "member" },
  },
  { timestamps: true },
);
GroupMemberSchema.index({ user: 1, group: 1 }, { unique: true });

/* ---------------------------------------------------------------- posts -- */

const PostSchema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    group: { type: Schema.Types.ObjectId, ref: "Group", index: true },
    /** A question can be answered; a discussion cannot. That is the whole
        difference, and it is why the kinds are not just labels. */
    kind: {
      type: String,
      enum: ["discussion", "question", "showcase", "announcement"],
      default: "discussion",
    },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    tags: [String],
    replyCount: { type: Number, default: 0 },
    reactionCount: { type: Number, default: 0 },
    pinned: { type: Boolean, default: false },
    /** Set when a reply on a question is accepted. */
    answeredBy: { type: Schema.Types.ObjectId, ref: "CommunityReply" },
    /** Bumped by every reply, so "active" sorting is one indexed sort. */
    lastActivityAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);
PostSchema.index({ group: 1, lastActivityAt: -1 });
PostSchema.index({ pinned: -1, lastActivityAt: -1 });
// language_override: `kind` and `tags` must not be read as a text-search
// language. Same note as SnippetSchema.
PostSchema.index({ title: "text", body: "text" }, { language_override: "searchLang" });

const CommunityReplySchema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    post: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    /** One level of nesting only. Threads deeper than that stop being readable
        on a phone, and nobody has ever wanted the fourth level. */
    parent: { type: Schema.Types.ObjectId, ref: "CommunityReply" },
    body: { type: String, required: true },
    reactionCount: { type: Number, default: 0 },
    accepted: { type: Boolean, default: false },
  },
  { timestamps: true },
);
CommunityReplySchema.index({ post: 1, createdAt: 1 });

const ReactionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    /** The post or reply being reacted to. Kept as a bare id plus a type rather
        than two nullable refs, so the unique index below covers both. */
    target: { type: Schema.Types.ObjectId, required: true },
    targetType: { type: String, enum: ["post", "reply"], required: true },
    kind: { type: String, enum: ["like", "insightful", "celebrate"], default: "like" },
  },
  { timestamps: true },
);
ReactionSchema.index({ user: 1, target: 1 }, { unique: true });
ReactionSchema.index({ target: 1 });

const PostBookmarkSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
  },
  { timestamps: true },
);
PostBookmarkSchema.index({ user: 1, post: 1 }, { unique: true });

export const Group = models.Group || model("Group", GroupSchema);
export const GroupMember = models.GroupMember || model("GroupMember", GroupMemberSchema);
export const Post = models.Post || model("Post", PostSchema);
export const CommunityReply =
  models.CommunityReply || model("CommunityReply", CommunityReplySchema);
export const Reaction = models.Reaction || model("Reaction", ReactionSchema);
export const PostBookmark = models.PostBookmark || model("PostBookmark", PostBookmarkSchema);
