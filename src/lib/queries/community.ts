import { connectDB } from "../db";
import { CommunityReply, Group, GroupMember, Post, PostBookmark, Reaction } from "../models";

/**
 * Reads for the Community module.
 *
 * The shape of every read here is the same: one query for the content, one for
 * *this* user's relationship to it (reacted / bookmarked / joined), joined in
 * memory. That is the same pattern the roadmap and practice queries use, and it
 * is what keeps "did I react to this" from becoming a query per row.
 */

export type Author = { id: string; name: string; avatarUrl: string };

export type PostCard = {
  id: string;
  kind: string;
  title: string;
  excerpt: string;
  tags: string[];
  author: Author;
  group: { id: string; slug: string; name: string } | null;
  replyCount: number;
  reactionCount: number;
  pinned: boolean;
  answered: boolean;
  reacted: boolean;
  bookmarked: boolean;
  createdAt: string;
  lastActivityAt: string;
};

type PopulatedUser = { _id: unknown; name?: string; avatarUrl?: string } | null | undefined;
type PopulatedGroup = { _id: unknown; slug?: string; name?: string } | null | undefined;

function toAuthor(u: PopulatedUser): Author {
  return {
    id: u ? String(u._id) : "",
    // A missing name is a real state — a user row can exist before Clerk has
    // sent one — so it gets a label rather than an empty span.
    name: u?.name?.trim() || "Anonymous developer",
    avatarUrl: u?.avatarUrl ?? "",
  };
}

/** First ~180 characters of the body, markdown stripped, for the feed card. */
function excerpt(body: string): string {
  const plain = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > 180 ? `${plain.slice(0, 177).trimEnd()}…` : plain;
}

export type FeedSort = "active" | "new" | "top";

export async function listPosts(
  userId: unknown,
  opts: { groupId?: string; sort?: FeedSort; kind?: string; tag?: string; limit?: number } = {},
): Promise<PostCard[]> {
  await connectDB();
  const { groupId, sort = "active", kind, tag, limit = 40 } = opts;

  const filter: Record<string, unknown> = {};
  if (groupId) filter.group = groupId;
  if (kind) filter.kind = kind;
  if (tag) filter.tags = tag;

  const order: Record<string, -1> =
    sort === "new"
      ? { createdAt: -1 }
      : sort === "top"
        ? { reactionCount: -1, lastActivityAt: -1 }
        : { lastActivityAt: -1 };

  const posts = await Post.find(filter)
    // Pinned first regardless of sort — a pin is a moderator saying "read this
    // before whatever the algorithm thinks", and a sort that buries it defeats it.
    .sort({ pinned: -1, ...order })
    .limit(limit)
    .populate({ path: "author", select: "name avatarUrl" })
    .populate({ path: "group", select: "slug name" })
    .lean();

  const ids = posts.map((p) => p._id);
  const [reactions, bookmarks] = await Promise.all([
    Reaction.find({ user: userId, targetType: "post", target: { $in: ids } })
      .select("target")
      .lean(),
    PostBookmark.find({ user: userId, post: { $in: ids } })
      .select("post")
      .lean(),
  ]);
  const reacted = new Set(reactions.map((r) => String(r.target)));
  const bookmarked = new Set(bookmarks.map((b) => String(b.post)));

  return posts.map((p) => {
    const g = p.group as PopulatedGroup;
    return {
      id: String(p._id),
      kind: String(p.kind ?? "discussion"),
      title: String(p.title ?? ""),
      excerpt: excerpt(String(p.body ?? "")),
      tags: (p.tags ?? []) as string[],
      author: toAuthor(p.author as PopulatedUser),
      group: g ? { id: String(g._id), slug: String(g.slug), name: String(g.name) } : null,
      replyCount: Number(p.replyCount ?? 0),
      reactionCount: Number(p.reactionCount ?? 0),
      pinned: Boolean(p.pinned),
      answered: Boolean(p.answeredBy),
      reacted: reacted.has(String(p._id)),
      bookmarked: bookmarked.has(String(p._id)),
      createdAt: new Date(p.createdAt ?? Date.now()).toISOString(),
      lastActivityAt: new Date(p.lastActivityAt ?? p.createdAt ?? Date.now()).toISOString(),
    };
  });
}

export type ReplyNode = {
  id: string;
  body: string;
  author: Author;
  parent: string | null;
  reactionCount: number;
  reacted: boolean;
  accepted: boolean;
  createdAt: string;
};

/** What `.lean()` gives back once author and group are populated. Mongoose
    widens a populated lean() to a union, so the shape is stated once here. */
type PostDoc = {
  _id: unknown;
  kind?: string;
  title?: string;
  body?: string;
  tags?: string[];
  author?: PopulatedUser;
  group?: PopulatedGroup;
  replyCount?: number;
  reactionCount?: number;
  pinned?: boolean;
  answeredBy?: unknown;
  createdAt?: Date;
};

export async function getPost(userId: unknown, postId: string) {
  await connectDB();
  const post = await Post.findById(postId)
    .populate({ path: "author", select: "name avatarUrl" })
    .populate({ path: "group", select: "slug name" })
    .lean<PostDoc | null>();
  if (!post) return null;

  const replies = await CommunityReply.find({ post: postId })
    .sort({ accepted: -1, createdAt: 1 })
    .populate({ path: "author", select: "name avatarUrl" })
    .lean();

  const targets = [post._id, ...replies.map((r) => r._id)];
  const [myReactions, bookmark] = await Promise.all([
    Reaction.find({ user: userId, target: { $in: targets } })
      .select("target")
      .lean(),
    PostBookmark.findOne({ user: userId, post: postId }).lean(),
  ]);
  const reacted = new Set(myReactions.map((r) => String(r.target)));

  const g = post.group as PopulatedGroup;
  return {
    id: String(post._id),
    kind: String(post.kind ?? "discussion"),
    title: String(post.title ?? ""),
    body: String(post.body ?? ""),
    tags: (post.tags ?? []) as string[],
    author: toAuthor(post.author as PopulatedUser),
    group: g ? { id: String(g._id), slug: String(g.slug), name: String(g.name) } : null,
    replyCount: Number(post.replyCount ?? 0),
    reactionCount: Number(post.reactionCount ?? 0),
    pinned: Boolean(post.pinned),
    answered: Boolean(post.answeredBy),
    reacted: reacted.has(String(post._id)),
    bookmarked: Boolean(bookmark),
    isAuthor: String((post.author as PopulatedUser)?._id ?? "") === String(userId),
    createdAt: new Date(post.createdAt ?? Date.now()).toISOString(),
    replies: replies.map<ReplyNode>((r) => ({
      id: String(r._id),
      body: String(r.body ?? ""),
      author: toAuthor(r.author as PopulatedUser),
      parent: r.parent ? String(r.parent) : null,
      reactionCount: Number(r.reactionCount ?? 0),
      reacted: reacted.has(String(r._id)),
      accepted: Boolean(r.accepted),
      createdAt: new Date(r.createdAt ?? Date.now()).toISOString(),
    })),
  };
}

export type GroupCard = {
  id: string;
  slug: string;
  name: string;
  description: string;
  topic: string;
  memberCount: number;
  postCount: number;
  joined: boolean;
};

export async function listGroups(userId: unknown, limit = 24): Promise<GroupCard[]> {
  await connectDB();
  const [groups, memberships] = await Promise.all([
    Group.find({ visibility: "public" }).sort({ memberCount: -1, name: 1 }).limit(limit).lean(),
    GroupMember.find({ user: userId }).select("group").lean(),
  ]);
  const joined = new Set(memberships.map((m) => String(m.group)));

  return groups.map((g) => ({
    id: String(g._id),
    slug: String(g.slug),
    name: String(g.name),
    description: String(g.description ?? ""),
    topic: String(g.topic ?? "general"),
    memberCount: Number(g.memberCount ?? 0),
    postCount: Number(g.postCount ?? 0),
    joined: joined.has(String(g._id)),
  }));
}

export async function getGroupBySlug(userId: unknown, slug: string) {
  await connectDB();
  const group = await Group.findOne({ slug }).lean<{
    _id: unknown;
    slug?: string;
    name?: string;
    description?: string;
    topic?: string;
    memberCount?: number;
    postCount?: number;
  } | null>();
  if (!group) return null;
  const membership = await GroupMember.findOne({ user: userId, group: group._id }).lean<{
    role?: string;
  } | null>();
  return {
    id: String(group._id),
    slug: String(group.slug),
    name: String(group.name),
    description: String(group.description ?? ""),
    topic: String(group.topic ?? "general"),
    memberCount: Number(group.memberCount ?? 0),
    postCount: Number(group.postCount ?? 0),
    joined: Boolean(membership),
    role: String(membership?.role ?? ""),
  };
}

/** The counters on the Community landing header. */
export async function getCommunityStats(userId: unknown) {
  await connectDB();
  const [posts, replies, groups, myGroups, myPosts] = await Promise.all([
    Post.countDocuments(),
    CommunityReply.countDocuments(),
    Group.countDocuments({ visibility: "public" }),
    GroupMember.countDocuments({ user: userId }),
    Post.countDocuments({ author: userId }),
  ]);
  return { posts, replies, groups, myGroups, myPosts };
}

/** Tags across the feed, most used first — the discovery rail. */
export async function listPostTags(limit = 16): Promise<string[]> {
  await connectDB();
  const rows = await Post.aggregate<{ _id: string; n: number }>([
    { $unwind: "$tags" },
    { $group: { _id: "$tags", n: { $sum: 1 } } },
    { $sort: { n: -1, _id: 1 } },
    { $limit: limit },
  ]).catch(() => []);
  return rows.map((r) => r._id).filter(Boolean);
}
