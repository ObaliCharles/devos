import { connectDB } from "../db";
import { Project, ProjectInvite, ProjectMember, ProjectMessage, User } from "../models";
import { getProjectAccess, type ProjectRole } from "../project-access";

/**
 * Reads for project collaboration: who is on a team, who is waiting, and what
 * has been said.
 */

export type Member = {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string;
  username: string;
  role: ProjectRole;
  joinedAt: string;
};

export type PendingEdge = {
  id: string;
  direction: "invite" | "request";
  role: string;
  message: string;
  name: string;
  avatarUrl: string;
  username: string;
  userId: string;
  createdAt: string;
};

type Populated = {
  _id: unknown;
  name?: string;
  avatarUrl?: string;
  username?: string;
} | null;

function person(u: Populated) {
  return {
    userId: u ? String(u._id) : "",
    name: u?.name?.trim() || "Anonymous developer",
    avatarUrl: u?.avatarUrl ?? "",
    username: u?.username || (u ? String(u._id) : ""),
  };
}

export async function getTeam(userId: unknown, projectId: string) {
  await connectDB();
  const access = await getProjectAccess(userId, projectId);
  if (!access) return null;

  const [members, pending, project] = await Promise.all([
    ProjectMember.find({ project: projectId })
      .populate({ path: "user", select: "name avatarUrl username" })
      .lean(),
    // Only maintainers and above see the queue; a contributor has no action to
    // take on it, and a list you cannot act on is noise.
    access.role === "owner" || access.role === "maintainer"
      ? ProjectInvite.find({ project: projectId, status: "pending" })
          .populate({ path: "user", select: "name avatarUrl username" })
          .lean()
      : Promise.resolve([]),
    Project.findById(projectId).select("title openToContributors visibility").lean<{
      title?: string;
      openToContributors?: boolean;
      visibility?: string;
    } | null>(),
  ]);

  const ranked: Member[] = members
    .map((m) => ({
      id: String(m._id),
      ...person(m.user as Populated),
      role: (m.role ?? "contributor") as ProjectRole,
      joinedAt: new Date(m.createdAt ?? Date.now()).toISOString(),
    }))
    .sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));

  return {
    access,
    title: String(project?.title ?? ""),
    openToContributors: Boolean(project?.openToContributors),
    visibility: String(project?.visibility ?? "private"),
    members: ranked,
    pending: pending.map<PendingEdge>((p) => ({
      id: String(p._id),
      direction: (p.direction ?? "invite") as "invite" | "request",
      role: String(p.role ?? "contributor"),
      message: String(p.message ?? ""),
      ...person(p.user as Populated),
      createdAt: new Date(p.createdAt ?? Date.now()).toISOString(),
    })),
  };
}

export type ProjectLine = {
  id: string;
  body: string;
  author: { id: string; name: string; avatarUrl: string };
  createdAt: string;
};

/** Newest-first with a limit, then reversed — an ascending limit would return
    the oldest N, which is the wrong end of a log. */
export async function listProjectMessages(userId: unknown, projectId: string, limit = 60) {
  await connectDB();
  if (!(await getProjectAccess(userId, projectId))) return [];
  const rows = await ProjectMessage.find({ project: projectId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate({ path: "author", select: "name avatarUrl" })
    .lean();

  return rows.reverse().map<ProjectLine>((m) => {
    const a = m.author as Populated;
    return {
      id: String(m._id),
      body: String(m.body ?? ""),
      author: {
        id: a ? String(a._id) : "",
        name: a?.name?.trim() || "Anonymous developer",
        avatarUrl: a?.avatarUrl ?? "",
      },
      createdAt: new Date(m.createdAt ?? Date.now()).toISOString(),
    };
  });
}

export type OpenProject = {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  status: string;
  stack: string[];
  members: number;
  owner: string;
  requested: boolean;
  joined: boolean;
};

/** Projects looking for contributors — the discovery surface. */
export async function listOpenProjects(userId: unknown, limit = 40): Promise<OpenProject[]> {
  await connectDB();
  const rows = await Project.find({ openToContributors: true, archived: { $ne: true } })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .populate({ path: "user", select: "name" })
    .lean();

  const ids = rows.map((r) => r._id);
  const [mine, counts, requests] = await Promise.all([
    ProjectMember.find({ user: userId, project: { $in: ids } }).select("project").lean(),
    ProjectMember.aggregate<{ _id: unknown; n: number }>([
      { $match: { project: { $in: ids } } },
      { $group: { _id: "$project", n: { $sum: 1 } } },
    ]).catch(() => []),
    ProjectInvite.find({ user: userId, project: { $in: ids }, status: "pending" })
      .select("project")
      .lean(),
  ]);
  const joined = new Set(mine.map((m) => String(m.project)));
  const byCount = new Map(counts.map((c) => [String(c._id), c.n]));
  const asked = new Set(requests.map((r) => String(r.project)));

  return rows.map((p) => {
    const stack = (p.stack ?? {}) as Record<string, unknown>;
    return {
      id: String(p._id),
      title: String(p.title ?? ""),
      description: String(p.description ?? ""),
      category: String(p.category ?? "web"),
      difficulty: String(p.difficulty ?? "intermediate"),
      status: String(p.status ?? "planning"),
      stack: Object.values(stack).flat().filter(Boolean).map(String).slice(0, 4),
      members: byCount.get(String(p._id)) ?? 1,
      owner: String((p.user as { name?: string } | null)?.name ?? "Someone"),
      requested: asked.has(String(p._id)),
      joined: joined.has(String(p._id)),
    };
  });
}

/** Invites waiting for *you*, for the projects index. */
export async function getMyInvites(userId: unknown) {
  await connectDB();
  const rows = await ProjectInvite.find({ user: userId, direction: "invite", status: "pending" })
    .populate({ path: "project", select: "title" })
    .lean();
  return rows
    .filter((r) => r.project)
    .map((r) => ({
      id: String(r._id),
      role: String(r.role ?? "contributor"),
      message: String(r.message ?? ""),
      projectId: String((r.project as { _id?: unknown })?._id ?? ""),
      projectTitle: String((r.project as { title?: string })?.title ?? ""),
    }));
}

export async function findPeople(query: string, limit = 8) {
  await connectDB();
  const q = query.trim();
  if (q.length < 2) return [];
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rows = await User.find({
    $or: [
      { name: { $regex: safe, $options: "i" } },
      { username: { $regex: safe, $options: "i" } },
      { email: { $regex: safe, $options: "i" } },
    ],
  })
    .select("name avatarUrl username")
    .limit(limit)
    .lean();
  return rows.map((u) => person(u as Populated));
}
