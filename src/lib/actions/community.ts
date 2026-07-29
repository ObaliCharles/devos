"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "../db";
import { CommunityReply, Group, GroupMember, Post, PostBookmark, Reaction } from "../models";
import { addXp, requireUser } from "../user";

/**
 * Writes for the Community module.
 *
 * Two rules hold throughout.
 *
 * **Every counter is moved by the same action that causes it**, in the same
 * call, with `$inc`. `$inc` is atomic server-side, so two people replying at
 * once both land — which a read-modify-write would not.
 *
 * **Authorship is checked against the session user, never against an id from
 * the client.** Every one of these is callable by anyone who can post a form.
 */

const MAX_TITLE = 160;
const MAX_BODY = 20_000;
const MAX_TAGS = 5;

function cleanTags(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(",")
        .map((t) => t.trim().toLowerCase().replace(/\s+/g, "-"))
        .filter((t) => t.length > 0 && t.length <= 24),
    ),
  ].slice(0, MAX_TAGS);
}

export async function createPost(input: {
  title: string;
  body: string;
  kind?: string;
  tags?: string;
  groupId?: string;
}) {
  await connectDB();
  const user = await requireUser();

  const title = input.title.trim().slice(0, MAX_TITLE);
  if (!title) return { ok: false as const, error: "A post needs a title." };

  const post = await Post.create({
    author: user._id,
    group: input.groupId || undefined,
    kind: input.kind || "discussion",
    title,
    body: input.body.trim().slice(0, MAX_BODY),
    tags: cleanTags(input.tags ?? ""),
    lastActivityAt: new Date(),
  });

  if (input.groupId) await Group.updateOne({ _id: input.groupId }, { $inc: { postCount: 1 } });
  // Posting is a contribution, so it earns like one — small, because volume
  // must not be the way to farm XP.
  await addXp(user._id, 5);

  revalidatePath("/community");
  return { ok: true as const, id: String(post._id) };
}

export async function replyToPost(postId: string, body: string, parentId?: string) {
  await connectDB();
  const user = await requireUser();

  const text = body.trim().slice(0, MAX_BODY);
  if (!text) return { ok: false as const, error: "Write something first." };

  const reply = await CommunityReply.create({
    author: user._id,
    post: postId,
    parent: parentId || undefined,
    body: text,
  });

  await Post.updateOne(
    { _id: postId },
    { $inc: { replyCount: 1 }, $set: { lastActivityAt: new Date() } },
  );
  await addXp(user._id, 3);

  revalidatePath(`/community/${postId}`);
  return { ok: true as const, id: String(reply._id) };
}

/**
 * Toggle a reaction. The unique index on (user, target) is what makes this safe
 * under a double-click: the second insert fails rather than double-counting.
 */
export async function toggleReaction(target: string, targetType: "post" | "reply") {
  await connectDB();
  const user = await requireUser();

  const existing = await Reaction.findOneAndDelete({ user: user._id, target });
  const delta = existing ? -1 : 1;
  if (!existing) await Reaction.create({ user: user._id, target, targetType, kind: "like" });

  const Model = targetType === "post" ? Post : CommunityReply;
  await Model.updateOne({ _id: target }, { $inc: { reactionCount: delta } });

  revalidatePath("/community");
  return { ok: true as const, reacted: !existing };
}

export async function togglePostBookmark(postId: string) {
  await connectDB();
  const user = await requireUser();
  const existing = await PostBookmark.findOneAndDelete({ user: user._id, post: postId });
  if (!existing) await PostBookmark.create({ user: user._id, post: postId });
  revalidatePath("/community");
  return { ok: true as const, bookmarked: !existing };
}

/** Mark a reply as the answer. Only the person who asked may do this. */
export async function acceptAnswer(postId: string, replyId: string) {
  await connectDB();
  const user = await requireUser();

  const post = await Post.findById(postId).select("author answeredBy").lean<{
    author: unknown;
    answeredBy?: unknown;
  } | null>();
  if (!post) return { ok: false as const, error: "That post is gone." };
  if (String(post.author) !== String(user._id)) {
    return { ok: false as const, error: "Only the author can accept an answer." };
  }

  // Clearing the previous acceptance keeps "accepted" single-valued, which is
  // what makes it mean anything.
  if (post.answeredBy) {
    await CommunityReply.updateOne({ _id: post.answeredBy }, { $set: { accepted: false } });
  }
  const same = String(post.answeredBy ?? "") === String(replyId);
  await CommunityReply.updateOne({ _id: replyId }, { $set: { accepted: !same } });
  await Post.updateOne({ _id: postId }, { $set: { answeredBy: same ? null : replyId } });

  revalidatePath(`/community/${postId}`);
  return { ok: true as const };
}

export async function deletePost(postId: string) {
  await connectDB();
  const user = await requireUser();
  const post = await Post.findById(postId).select("author group").lean<{
    author: unknown;
    group?: unknown;
  } | null>();
  if (!post) return { ok: false as const, error: "Already gone." };
  if (String(post.author) !== String(user._id) && user.role !== "admin") {
    return { ok: false as const, error: "That is not yours to delete." };
  }

  await Promise.all([
    Post.deleteOne({ _id: postId }),
    CommunityReply.deleteMany({ post: postId }),
    Reaction.deleteMany({ target: postId }),
    PostBookmark.deleteMany({ post: postId }),
  ]);
  if (post.group) await Group.updateOne({ _id: post.group }, { $inc: { postCount: -1 } });

  revalidatePath("/community");
  return { ok: true as const };
}

/* --------------------------------------------------------------- groups -- */

export async function createGroup(input: {
  name: string;
  description: string;
  topic?: string;
}) {
  await connectDB();
  const user = await requireUser();

  const name = input.name.trim().slice(0, 60);
  if (!name) return { ok: false as const, error: "A group needs a name." };

  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  // Collide-and-suffix rather than pre-checking: two people creating the same
  // name at once would both pass a pre-check, and the unique index would then
  // fail one of them with a 500 instead of a second group.
  let slug = base;
  for (let n = 2; await Group.exists({ slug }); n += 1) slug = `${base}-${n}`;

  const group = await Group.create({
    slug,
    name,
    description: input.description.trim().slice(0, 400),
    topic: (input.topic ?? "general").trim().toLowerCase() || "general",
    createdBy: user._id,
    memberCount: 1,
  });
  await GroupMember.create({ user: user._id, group: group._id, role: "owner" });

  revalidatePath("/community");
  return { ok: true as const, slug };
}

export async function toggleGroupMembership(groupId: string) {
  await connectDB();
  const user = await requireUser();

  const existing = await GroupMember.findOne({ user: user._id, group: groupId });
  if (existing) {
    // The owner leaving would orphan the group, so that is refused rather than
    // silently ignored — a button that does nothing is worse than one that says why.
    if (existing.role === "owner") {
      return { ok: false as const, error: "Hand the group over before leaving it." };
    }
    await existing.deleteOne();
    await Group.updateOne({ _id: groupId }, { $inc: { memberCount: -1 } });
    revalidatePath("/community");
    return { ok: true as const, joined: false };
  }

  await GroupMember.create({ user: user._id, group: groupId });
  await Group.updateOne({ _id: groupId }, { $inc: { memberCount: 1 } });
  revalidatePath("/community");
  return { ok: true as const, joined: true };
}
