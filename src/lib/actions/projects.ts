"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "../db";
import { dayKey } from "../day";
import {
  ActivityLog,
  ApiEndpoint,
  Bug,
  Deployment,
  Milestone,
  Project,
  SchemaDesign,
  Task,
  TASK_STATUSES,
  TimeEntry,
} from "../models";
import { recordActivity, requireUser } from "../user";

/* ------------------------------------------------------------------ helpers */

/**
 * Every write in this file goes through here first. It is the authorisation
 * check and the "does it exist" check in one, and it returns the project so a
 * caller cannot forget to scope the next query.
 */
async function ownedProject(userId: unknown, projectId: string) {
  const project = await Project.findOne({ _id: projectId, user: userId });
  if (!project) throw new Error("Project not found");
  return project;
}

async function log(userId: unknown, projectId: unknown, kind: string, message: string) {
  await ActivityLog.create({ user: userId, project: projectId, kind, message });
}

/** Keeps the denormalised counts on Project honest after any task/bug write. */
async function refreshCounts(projectId: unknown) {
  const [tasks, tasksDone, bugsOpen] = await Promise.all([
    Task.countDocuments({ project: projectId }),
    Task.countDocuments({ project: projectId, status: "done" }),
    Bug.countDocuments({ project: projectId, status: { $in: ["open", "confirmed", "fixing"] } }),
  ]);
  await Project.updateOne({ _id: projectId }, { $set: { counts: { tasks, tasksDone, bugsOpen } } });
}

function revalidateProject(projectId: string) {
  revalidatePath(`/projects/${projectId}`, "layout");
  revalidatePath("/projects");
}

/* ----------------------------------------------------------------- projects */

export async function createProject(input: {
  title: string;
  description?: string;
  goal?: string;
  category?: string;
  difficulty?: string;
  stack?: Record<string, string[]>;
  features?: string[];
  skillIds?: string[];
  deadline?: string;
  repoUrl?: string;
}) {
  await connectDB();
  const user = await requireUser();

  const title = input.title?.trim();
  if (!title) return { ok: false as const, message: "A project needs a name." };

  const project = await Project.create({
    user: user._id,
    title,
    description: input.description?.trim(),
    goal: input.goal?.trim(),
    category: input.category ?? "web",
    difficulty: input.difficulty ?? "intermediate",
    stack: input.stack ?? {},
    features: input.features ?? [],
    skills: input.skillIds ?? [],
    repoUrl: input.repoUrl?.trim(),
    deadline: input.deadline ? new Date(input.deadline) : undefined,
    startedAt: new Date(),
    status: "planning",
  });

  // A project created from the wizard's feature list starts with the tasks
  // that list implies. An empty board is the most common reason a project
  // never gets a second visit.
  if (input.features?.length) {
    await Task.insertMany(
      input.features.map((feature, i) => ({
        project: project._id,
        user: user._id,
        title: feature,
        status: "backlog",
        order: i,
        priority: "medium",
      }))
    );
    await refreshCounts(project._id);
  }

  await log(user._id, project._id, "project", `Created ${title}`);
  revalidatePath("/projects");
  return { ok: true as const, id: String(project._id) };
}

export async function updateProject(
  projectId: string,
  input: Partial<{
    title: string;
    description: string;
    goal: string;
    status: string;
    category: string;
    difficulty: string;
    visibility: string;
    repoUrl: string;
    liveUrl: string;
    figmaUrl: string;
    thumbnailUrl: string;
    deadline: string | null;
    skillIds: string[];
    features: string[];
    stack: Record<string, string[]>;
  }>
) {
  await connectDB();
  const user = await requireUser();
  await ownedProject(user._id, projectId);

  // Whitelist: server action arguments are JSON by the time they land, so
  // spreading `input` would let a caller set `user` and steal the project.
  const patch: Record<string, unknown> = {};
  const strings = [
    "title", "description", "goal", "status", "category", "difficulty",
    "visibility", "repoUrl", "liveUrl", "figmaUrl", "thumbnailUrl",
  ] as const;
  for (const key of strings) {
    if (typeof input[key] === "string") patch[key] = input[key];
  }
  if (Array.isArray(input.skillIds)) patch.skills = input.skillIds;
  if (Array.isArray(input.features)) patch.features = input.features;
  if (input.stack && typeof input.stack === "object") patch.stack = input.stack;
  if (input.deadline !== undefined) {
    patch.deadline = input.deadline ? new Date(input.deadline) : null;
  }
  if (input.status === "complete") patch.completedAt = new Date();

  if (Object.keys(patch).length === 0) return;

  await Project.updateOne({ _id: projectId, user: user._id }, { $set: patch });
  revalidateProject(projectId);
}

export async function toggleProjectPin(projectId: string) {
  await connectDB();
  const user = await requireUser();
  const project = await ownedProject(user._id, projectId);
  project.pinned = !project.pinned;
  await project.save();
  revalidatePath("/projects");
}

export async function archiveProject(projectId: string, archived = true) {
  await connectDB();
  const user = await requireUser();
  const project = await ownedProject(user._id, projectId);
  project.archived = archived;
  await project.save();
  await log(user._id, project._id, "project", archived ? "Archived" : "Restored");
  revalidateProject(projectId);
}

/** Deletes the project and everything hanging off it. */
export async function deleteProject(projectId: string) {
  await connectDB();
  const user = await requireUser();
  await ownedProject(user._id, projectId);

  await Promise.all([
    Task.deleteMany({ project: projectId, user: user._id }),
    Milestone.deleteMany({ project: projectId, user: user._id }),
    Bug.deleteMany({ project: projectId, user: user._id }),
    Deployment.deleteMany({ project: projectId, user: user._id }),
    ApiEndpoint.deleteMany({ project: projectId, user: user._id }),
    SchemaDesign.deleteMany({ project: projectId, user: user._id }),
    ActivityLog.deleteMany({ project: projectId, user: user._id }),
  ]);
  await Project.deleteOne({ _id: projectId, user: user._id });

  revalidatePath("/projects");
  return { ok: true as const };
}

/* -------------------------------------------------------------------- tasks */

export async function createTask(input: {
  projectId: string;
  title: string;
  status?: string;
  priority?: string;
  description?: string;
  deadline?: string;
  milestoneId?: string;
  estimatedHours?: number;
}) {
  await connectDB();
  const user = await requireUser();
  await ownedProject(user._id, input.projectId);

  const title = input.title?.trim();
  if (!title) return { ok: false as const, message: "A task needs a title." };

  const status = (TASK_STATUSES as readonly string[]).includes(input.status ?? "")
    ? input.status
    : "todo";

  // New tasks go to the top of their column, which is where you look.
  const first = await Task.findOne({ project: input.projectId, status }).sort({ order: 1 }).lean<{ order?: number }>();

  const task = await Task.create({
    project: input.projectId,
    user: user._id,
    title,
    description: input.description?.trim(),
    status,
    priority: input.priority ?? "medium",
    order: (first?.order ?? 0) - 1,
    deadline: input.deadline ? new Date(input.deadline) : undefined,
    milestone: input.milestoneId || undefined,
    estimatedHours: input.estimatedHours,
  });

  await refreshCounts(input.projectId);
  revalidateProject(input.projectId);
  return { ok: true as const, id: String(task._id) };
}

/**
 * A drag-and-drop drop. `order` is fractional — the midpoint between the two
 * neighbours — so moving one card is one write instead of renumbering the
 * column.
 */
export async function moveTask(taskId: string, status: string, beforeOrder?: number, afterOrder?: number) {
  await connectDB();
  const user = await requireUser();

  const task = await Task.findOne({ _id: taskId, user: user._id });
  if (!task) return;
  if (!(TASK_STATUSES as readonly string[]).includes(status)) return;

  let order: number;
  if (beforeOrder === undefined && afterOrder === undefined) order = 0;
  else if (beforeOrder === undefined) order = (afterOrder ?? 0) - 1;
  else if (afterOrder === undefined) order = beforeOrder + 1;
  else order = (beforeOrder + afterOrder) / 2;

  const wasDone = task.status === "done";
  task.status = status;
  task.order = order;

  if (status === "done" && !wasDone) {
    task.completedAt = new Date();
    await recordActivity(user._id, { tasksCompleted: 1 });
    await log(user._id, task.project, "task", `Finished "${task.title}"`);
  } else if (status !== "done" && wasDone) {
    task.completedAt = undefined;
  }

  await task.save();
  await refreshCounts(task.project);
  revalidateProject(String(task.project));
}

export async function updateTask(
  taskId: string,
  input: Partial<{
    title: string;
    description: string;
    status: string;
    priority: string;
    deadline: string | null;
    tags: string[];
    estimatedHours: number;
    actualMinutes: number;
    milestoneId: string | null;
    checklist: { text: string; done: boolean }[];
  }>
) {
  await connectDB();
  const user = await requireUser();

  const task = await Task.findOne({ _id: taskId, user: user._id });
  if (!task) return;

  if (typeof input.title === "string" && input.title.trim()) task.title = input.title.trim();
  if (typeof input.description === "string") task.description = input.description;
  if (typeof input.priority === "string") task.priority = input.priority;
  if (typeof input.estimatedHours === "number") task.estimatedHours = input.estimatedHours;
  if (typeof input.actualMinutes === "number") task.actualMinutes = input.actualMinutes;
  if (Array.isArray(input.tags)) task.tags = input.tags;
  if (Array.isArray(input.checklist)) task.checklist = input.checklist;
  if (input.milestoneId !== undefined) task.milestone = input.milestoneId || undefined;
  if (input.deadline !== undefined) task.deadline = input.deadline ? new Date(input.deadline) : undefined;

  if (typeof input.status === "string" && (TASK_STATUSES as readonly string[]).includes(input.status)) {
    const wasDone = task.status === "done";
    task.status = input.status;
    if (input.status === "done" && !wasDone) {
      task.completedAt = new Date();
      await recordActivity(user._id, { tasksCompleted: 1 });
    }
    if (input.status !== "done" && wasDone) task.completedAt = undefined;
  }

  await task.save();
  await refreshCounts(task.project);
  revalidateProject(String(task.project));
}

export async function deleteTask(taskId: string) {
  await connectDB();
  const user = await requireUser();
  const task = await Task.findOneAndDelete({ _id: taskId, user: user._id }).lean<{ project?: unknown } | null>();
  if (!task?.project) return;
  await refreshCounts(task.project);
  revalidateProject(String(task.project));
}

/** Time actually spent, logged against the project and the day. */
export async function logProjectTime(projectId: string, minutes: number, taskId?: string) {
  await connectDB();
  const user = await requireUser();
  await ownedProject(user._id, projectId);

  const clamped = Math.max(1, Math.min(600, Math.round(minutes)));
  await TimeEntry.create({
    user: user._id,
    kind: taskId ? "task" : "project",
    minutes: clamped,
    day: dayKey(),
    project: projectId,
    task: taskId,
  });
  await Project.updateOne({ _id: projectId }, { $inc: { minutesSpent: clamped } });
  if (taskId) await Task.updateOne({ _id: taskId, user: user._id }, { $inc: { actualMinutes: clamped } });

  await recordActivity(user._id, { minutes: clamped });
  revalidateProject(projectId);
}

/* --------------------------------------------------------------- milestones */

export async function createMilestone(input: {
  projectId: string;
  title: string;
  description?: string;
  dueAt?: string;
}) {
  await connectDB();
  const user = await requireUser();
  await ownedProject(user._id, input.projectId);
  if (!input.title?.trim()) return;

  const last = await Milestone.findOne({ project: input.projectId }).sort({ order: -1 }).lean<{ order?: number }>();
  await Milestone.create({
    project: input.projectId,
    user: user._id,
    title: input.title.trim(),
    description: input.description?.trim(),
    dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
    order: (last?.order ?? -1) + 1,
  });
  revalidateProject(input.projectId);
}

export async function setMilestoneStatus(milestoneId: string, status: string) {
  await connectDB();
  const user = await requireUser();
  const milestone = await Milestone.findOne({ _id: milestoneId, user: user._id });
  if (!milestone) return;

  milestone.status = status;
  milestone.completedAt = status === "done" ? new Date() : undefined;
  await milestone.save();

  if (status === "done") await log(user._id, milestone.project, "milestone", `Reached "${milestone.title}"`);
  revalidateProject(String(milestone.project));
}

export async function deleteMilestone(milestoneId: string) {
  await connectDB();
  const user = await requireUser();
  const m = await Milestone.findOneAndDelete({ _id: milestoneId, user: user._id }).lean<{ project?: unknown } | null>();
  if (m?.project) {
    await Task.updateMany({ milestone: milestoneId }, { $unset: { milestone: 1 } });
    revalidateProject(String(m.project));
  }
}

/* --------------------------------------------------------------------- bugs */

export async function createBug(input: {
  projectId: string;
  title: string;
  description?: string;
  steps?: string;
  severity?: string;
}) {
  await connectDB();
  const user = await requireUser();
  await ownedProject(user._id, input.projectId);
  if (!input.title?.trim()) return;

  await Bug.create({
    project: input.projectId,
    user: user._id,
    title: input.title.trim(),
    description: input.description?.trim(),
    steps: input.steps?.trim(),
    severity: input.severity ?? "medium",
  });
  await refreshCounts(input.projectId);
  revalidateProject(input.projectId);
}

export async function setBugStatus(bugId: string, status: string) {
  await connectDB();
  const user = await requireUser();
  const bug = await Bug.findOne({ _id: bugId, user: user._id });
  if (!bug) return;

  bug.status = status;
  if (status === "fixed") {
    bug.fixedAt = new Date();
    await log(user._id, bug.project, "bug", `Fixed "${bug.title}"`);
  }
  await bug.save();
  await refreshCounts(bug.project);
  revalidateProject(String(bug.project));
}

export async function deleteBug(bugId: string) {
  await connectDB();
  const user = await requireUser();
  const bug = await Bug.findOneAndDelete({ _id: bugId, user: user._id }).lean<{ project?: unknown } | null>();
  if (bug?.project) {
    await refreshCounts(bug.project);
    revalidateProject(String(bug.project));
  }
}

/* -------------------------------------------------------------- deployments */

export async function createDeployment(input: {
  projectId: string;
  environment?: string;
  platform?: string;
  url?: string;
  version?: string;
  notes?: string;
  status?: string;
}) {
  await connectDB();
  const user = await requireUser();
  const project = await ownedProject(user._id, input.projectId);

  await Deployment.create({
    project: input.projectId,
    user: user._id,
    environment: input.environment ?? "production",
    platform: input.platform ?? "vercel",
    url: input.url?.trim(),
    version: input.version?.trim(),
    notes: input.notes?.trim(),
    status: input.status ?? "live",
  });

  // The first production deployment is the moment a project stops being a
  // plan, so it moves the project's own status too.
  if ((input.environment ?? "production") === "production" && input.status !== "failed") {
    if (input.url?.trim()) project.liveUrl = input.url.trim();
    if (project.status === "planning" || project.status === "building") project.status = "deployed";
    await project.save();
  }

  await log(user._id, input.projectId, "deployment", `Deployed to ${input.platform ?? "vercel"}`);
  revalidateProject(input.projectId);
}

/* ------------------------------------------------------------- api & schema */

export async function saveEndpoint(input: {
  projectId: string;
  endpointId?: string;
  method: string;
  path: string;
  group?: string;
  description?: string;
  auth?: boolean;
  headers?: string;
  requestBody?: string;
  responseBody?: string;
  errorResponses?: string;
}) {
  await connectDB();
  const user = await requireUser();
  await ownedProject(user._id, input.projectId);
  if (!input.path?.trim()) return;

  const doc = {
    method: input.method,
    path: input.path.trim(),
    group: input.group?.trim(),
    description: input.description?.trim(),
    auth: input.auth ?? true,
    headers: input.headers,
    requestBody: input.requestBody,
    responseBody: input.responseBody,
    errorResponses: input.errorResponses,
  };

  if (input.endpointId) {
    await ApiEndpoint.updateOne({ _id: input.endpointId, user: user._id }, { $set: doc });
  } else {
    const last = await ApiEndpoint.findOne({ project: input.projectId }).sort({ order: -1 }).lean<{ order?: number }>();
    await ApiEndpoint.create({ ...doc, project: input.projectId, user: user._id, order: (last?.order ?? -1) + 1 });
  }
  revalidateProject(input.projectId);
}

export async function deleteEndpoint(endpointId: string) {
  await connectDB();
  const user = await requireUser();
  const e = await ApiEndpoint.findOneAndDelete({ _id: endpointId, user: user._id }).lean<{ project?: unknown } | null>();
  if (e?.project) revalidateProject(String(e.project));
}

export async function saveSchemaDesign(input: {
  projectId: string;
  schemaId?: string;
  name: string;
  description?: string;
  fields: { name: string; type: string; required?: boolean; unique?: boolean; indexed?: boolean; ref?: string; note?: string }[];
  indexes?: string[];
}) {
  await connectDB();
  const user = await requireUser();
  await ownedProject(user._id, input.projectId);
  if (!input.name?.trim()) return;

  const doc = {
    name: input.name.trim(),
    description: input.description?.trim(),
    fields: input.fields ?? [],
    indexes: input.indexes ?? [],
  };

  if (input.schemaId) {
    await SchemaDesign.updateOne({ _id: input.schemaId, user: user._id }, { $set: doc });
  } else {
    const last = await SchemaDesign.findOne({ project: input.projectId }).sort({ order: -1 }).lean<{ order?: number }>();
    await SchemaDesign.create({ ...doc, project: input.projectId, user: user._id, order: (last?.order ?? -1) + 1 });
  }
  revalidateProject(input.projectId);
}

export async function deleteSchemaDesign(schemaId: string) {
  await connectDB();
  const user = await requireUser();
  const s = await SchemaDesign.findOneAndDelete({ _id: schemaId, user: user._id }).lean<{ project?: unknown } | null>();
  if (s?.project) revalidateProject(String(s.project));
}
