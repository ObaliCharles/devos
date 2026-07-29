import { Types } from "mongoose";
import { connectDB } from "../db";
import {
  Achievement,
  ChallengeProgress,
  Follow,
  GroupMember,
  Post,
  Project,
  StudySession,
  User,
} from "../models";
import { levelFromXp } from "../user";
import { dayKey, dayKeyOffset } from "../day";

/**
 * The public profile.
 *
 * The rule that shapes this file: **a profile is mostly earned, not typed.**
 * Bio, links and self-declared skills are optional garnish; the parts anyone
 * actually reads — level, streak, contribution graph, solved challenges,
 * shipped projects — are computed from what the person did. That is why a
 * profile with every text field empty still looks like something.
 *
 * Nothing here is scoped to the viewer except `isFollowing` and `isSelf`. Every
 * other read is the same for everyone, because this is a public page.
 */

export type ProfileStat = { label: string; value: string };

export type Profile = {
  id: string;
  username: string;
  name: string;
  avatarUrl: string;
  bio: string;
  location: string;
  website: string;
  githubUsername: string;
  skills: string[];
  joinedAt: string;

  level: number;
  title: string;
  xp: number;
  into: number;
  need: number;
  streak: number;
  longestStreak: number;

  solved: number;
  projectsShipped: number;
  posts: number;
  badges: number;
  badgeNames: string[];

  followers: number;
  following: number;
  isFollowing: boolean;
  isSelf: boolean;

  /** 182 days, oldest first — the contribution graph. */
  activity: { day: string; minutes: number }[];
  recentSolves: { id: string; title: string; difficulty: string; at: string }[];
  groups: { slug: string; name: string }[];
};

/** `/u/<handle>` accepts a username or a raw id, so a user who has not claimed
    a handle still has a reachable, linkable profile. */
async function findByHandle(handle: string) {
  const byName = await User.findOne({ username: handle }).lean();
  if (byName) return byName;
  if (!Types.ObjectId.isValid(handle)) return null;
  return User.findById(handle).lean();
}

const ACTIVITY_DAYS = 182;

export async function getProfile(viewerId: unknown, handle: string): Promise<Profile | null> {
  await connectDB();
  const user = (await findByHandle(handle)) as Record<string, unknown> | null;
  if (!user) return null;

  const id = String(user._id);
  const xp = Number(user.xp ?? 0);
  const level = levelFromXp(xp);

  const from = new Date();
  from.setDate(from.getDate() - (ACTIVITY_DAYS - 1));

  const [
    sessions,
    solved,
    recent,
    projectsShipped,
    posts,
    achievements,
    followers,
    following,
    isFollowing,
    memberships,
  ] = await Promise.all([
    StudySession.find({ user: id, day: { $gte: dayKey(from) } })
      .select("day minutes")
      .lean(),
    ChallengeProgress.countDocuments({ user: id, solved: true }),
    ChallengeProgress.find({ user: id, solved: true })
      .sort({ solvedAt: -1 })
      .limit(5)
      .populate({ path: "challenge", select: "title difficulty" })
      .lean(),
    Project.countDocuments({ user: id, status: "complete" }).catch(() => 0),
    Post.countDocuments({ author: id }).catch(() => 0),
    Achievement.find({ user: id, unlocked: true }).select("name").lean().catch(() => []),
    Follow.countDocuments({ following: id }).catch(() => 0),
    Follow.countDocuments({ follower: id }).catch(() => 0),
    Follow.exists({ follower: viewerId, following: id }).catch(() => null),
    GroupMember.find({ user: id })
      .limit(8)
      .populate({ path: "group", select: "slug name" })
      .lean()
      .catch(() => []),
  ]);

  const byDay = new Map(sessions.map((s) => [String(s.day), Number(s.minutes ?? 0)]));
  const activity = Array.from({ length: ACTIVITY_DAYS }, (_, i) => {
    const day = dayKeyOffset(i, from);
    return { day, minutes: byDay.get(day) ?? 0 };
  });

  const badgeNames = (achievements as { name?: string }[])
    .map((a) => String(a.name ?? ""))
    .filter(Boolean);

  return {
    id,
    username: String(user.username ?? "") || id,
    name: String(user.name ?? "").trim() || "Anonymous developer",
    avatarUrl: String(user.avatarUrl ?? ""),
    bio: String(user.bio ?? ""),
    location: String(user.location ?? ""),
    website: String(user.website ?? ""),
    githubUsername: String(user.githubUsername ?? ""),
    skills: (user.skills ?? []) as string[],
    joinedAt: new Date((user.createdAt as Date) ?? Date.now()).toISOString(),

    level: level.level,
    title: level.title,
    xp,
    into: level.into,
    need: level.need,
    streak: Number(user.currentStreak ?? 0),
    longestStreak: Number(user.longestStreak ?? 0),

    solved,
    projectsShipped,
    posts,
    badges: badgeNames.length,
    badgeNames: badgeNames.slice(0, 8),

    followers,
    following,
    isFollowing: Boolean(isFollowing),
    isSelf: String(viewerId) === id,

    activity,
    recentSolves: (recent as { challenge?: { _id?: unknown; title?: string; difficulty?: string }; solvedAt?: Date }[])
      .filter((p) => p.challenge)
      .map((p) => ({
        id: String(p.challenge?._id ?? ""),
        title: String(p.challenge?.title ?? ""),
        difficulty: String(p.challenge?.difficulty ?? "easy"),
        at: new Date(p.solvedAt ?? Date.now()).toISOString(),
      })),
    groups: (memberships as { group?: { slug?: string; name?: string } }[])
      .filter((m) => m.group)
      .map((m) => ({ slug: String(m.group?.slug ?? ""), name: String(m.group?.name ?? "") })),
  };
}

export type PersonCard = {
  id: string;
  username: string;
  name: string;
  avatarUrl: string;
  level: number;
  isFollowing: boolean;
};

/** Followers or following, for the two tabs on a profile. */
export async function listConnections(
  viewerId: unknown,
  userId: string,
  kind: "followers" | "following",
): Promise<PersonCard[]> {
  await connectDB();
  const edges = await Follow.find(kind === "followers" ? { following: userId } : { follower: userId })
    .limit(100)
    .populate({
      path: kind === "followers" ? "follower" : "following",
      select: "name avatarUrl username xp",
    })
    .lean();

  const people = edges
    .map((e) => (kind === "followers" ? e.follower : e.following))
    .filter(Boolean) as { _id: unknown; name?: string; avatarUrl?: string; username?: string; xp?: number }[];

  const mine = await Follow.find({ follower: viewerId, following: { $in: people.map((p) => p._id) } })
    .select("following")
    .lean();
  const followed = new Set(mine.map((m) => String(m.following)));

  return people.map((p) => ({
    id: String(p._id),
    username: String(p.username ?? "") || String(p._id),
    name: String(p.name ?? "").trim() || "Anonymous developer",
    avatarUrl: String(p.avatarUrl ?? ""),
    level: levelFromXp(Number(p.xp ?? 0)).level,
    isFollowing: followed.has(String(p._id)),
  }));
}
