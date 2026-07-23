import { connectDB } from "../db";
import {
  ActivityLog,
  ApiEndpoint,
  Bug,
  Deployment,
  Milestone,
  Project,
  SchemaDesign,
  Skill,
  Task,
  FileAsset,
} from "../models";

/**
 * Reads for the Projects module. Every function takes `userId` and filters on
 * it — the caller is not trusted to have done that, per ARCHITECTURE.md.
 */

export type ProjectCard = {
  id: string;
  title: string;
  description?: string;
  status: string;
  category: string;
  difficulty: string;
  thumbnailUrl?: string;
  pinned: boolean;
  archived: boolean;
  deadline?: string;
  tasks: number;
  tasksDone: number;
  bugsOpen: number;
  skills: { id: string; title: string }[];
  updatedAt: string;
};

function toCard(p: Record<string, unknown>): ProjectCard {
  const counts = (p.counts ?? {}) as { tasks?: number; tasksDone?: number; bugsOpen?: number };
  const skills = (p.skills ?? []) as { _id?: unknown; title?: string }[];
  return {
    id: String(p._id),
    title: String(p.title),
    description: p.description as string | undefined,
    status: String(p.status ?? "planning"),
    category: String(p.category ?? "web"),
    difficulty: String(p.difficulty ?? "intermediate"),
    thumbnailUrl: p.thumbnailUrl as string | undefined,
    pinned: Boolean(p.pinned),
    archived: Boolean(p.archived),
    deadline: p.deadline ? new Date(p.deadline as Date).toISOString() : undefined,
    tasks: counts.tasks ?? 0,
    tasksDone: counts.tasksDone ?? 0,
    bugsOpen: counts.bugsOpen ?? 0,
    // Populated when the caller asked for it; a bare ObjectId has no title.
    skills: skills.filter((s) => s?.title).map((s) => ({ id: String(s._id), title: String(s.title) })),
    updatedAt: new Date(p.updatedAt as Date).toISOString(),
  };
}

export async function getProjects(userId: unknown, opts: { archived?: boolean } = {}) {
  await connectDB();
  const rows = await Project.find({ user: userId, archived: opts.archived ?? false })
    .sort({ pinned: -1, updatedAt: -1 })
    .populate({ path: "skills", model: Skill, select: "title" })
    .lean();
  return rows.map(toCard);
}

export async function getProjectStats(userId: unknown) {
  await connectDB();
  const [all, bugs, deployments] = await Promise.all([
    Project.find({ user: userId }).select("status archived counts minutesSpent deadline").lean(),
    Bug.countDocuments({ user: userId, status: { $in: ["open", "confirmed", "fixing"] } }),
    Deployment.countDocuments({ user: userId }),
  ]);

  const active = all.filter((p) => !p.archived && p.status !== "complete").length;
  const complete = all.filter((p) => p.status === "complete").length;
  const archived = all.filter((p) => p.archived).length;
  const minutes = all.reduce((n, p) => n + (p.minutesSpent ?? 0), 0);
  const tasksDue = all.reduce((n, p) => {
    const c = (p.counts ?? {}) as { tasks?: number; tasksDone?: number };
    return n + Math.max(0, (c.tasks ?? 0) - (c.tasksDone ?? 0));
  }, 0);

  return { active, complete, archived, bugs, deployments, tasksDue, hours: Math.round(minutes / 60) };
}

export type ProjectDoc = {
  _id: unknown;
  title: string;
  description?: string;
  goal?: string;
  status: string;
  category: string;
  difficulty: string;
  visibility?: string;
  stack?: Record<string, string[]>;
  features?: string[];
  skills?: { _id: unknown; title: string; difficulty?: string }[];
  repoUrl?: string;
  liveUrl?: string;
  figmaUrl?: string;
  deadline?: Date;
  archived?: boolean;
  counts?: { tasks?: number; tasksDone?: number; bugsOpen?: number };
  minutesSpent?: number;
};

/** The project workspace header — one read, used by every sub-page. */
export async function getProject(userId: unknown, projectId: string) {
  await connectDB();
  const project = await Project.findOne({ _id: projectId, user: userId })
    .populate({ path: "skills", model: Skill, select: "title difficulty" })
    .lean<ProjectDoc | null>();
  return project;
}

export async function getProjectBoard(userId: unknown, projectId: string) {
  await connectDB();
  const tasks = await Task.find({ project: projectId, user: userId })
    .sort({ status: 1, order: 1 })
    .lean();
  return tasks;
}

export async function getProjectOverview(userId: unknown, projectId: string) {
  await connectDB();
  const [milestones, activity, openBugs, deployments, endpoints, schemas, files] = await Promise.all([
    Milestone.find({ project: projectId, user: userId }).sort({ order: 1 }).lean(),
    ActivityLog.find({ project: projectId, user: userId }).sort({ createdAt: -1 }).limit(12).lean(),
    Bug.countDocuments({ project: projectId, user: userId, status: { $in: ["open", "confirmed", "fixing"] } }),
    Deployment.find({ project: projectId, user: userId }).sort({ deployedAt: -1 }).limit(5).lean(),
    ApiEndpoint.countDocuments({ project: projectId, user: userId }),
    SchemaDesign.countDocuments({ project: projectId, user: userId }),
    FileAsset.countDocuments({ project: projectId, user: userId }),
  ]);
  return { milestones, activity, openBugs, deployments, endpoints, schemas, files };
}

/**
 * The link that justifies the module: for a skill, which projects practise it.
 * Used on the skill page so the roadmap can point at the work.
 */
export async function getProjectsForSkill(userId: unknown, skillId: string) {
  await connectDB();
  return Project.find({ user: userId, skills: skillId, archived: false })
    .select("title status")
    .sort({ updatedAt: -1 })
    .limit(5)
    .lean();
}
