import { connectDB } from "./db";
import { Project, ProjectMember } from "./models";

/**
 * The single answer to "may this person touch this project".
 *
 * Before collaboration, every project read was scoped `{ project, user }` —
 * ownership was a filter on the row. That works exactly until a second person
 * needs in, at which point the filter is both the authorisation *and* the
 * reason a teammate sees an empty board.
 *
 * So access moves here. Sub-resources (tasks, bugs, milestones) are scoped to
 * the *project* and the project is scoped to the person, which is the correct
 * shape: a task belongs to the project, not to whoever typed it.
 *
 * Roles are ordered, so a check is a comparison rather than a set of ifs.
 */

export const ROLE_RANK = { viewer: 0, contributor: 1, maintainer: 2, owner: 3 } as const;
export type ProjectRole = keyof typeof ROLE_RANK;

export type Access = { role: ProjectRole; isOwner: boolean } | null;

/**
 * Resolve a user's role on a project.
 *
 * Falls back to `Project.user` when no membership row exists: every project
 * created before collaboration shipped has an owner but no `ProjectMember`, and
 * backfilling on read is cheaper and safer than a migration that has to run
 * before the deploy is useful.
 */
export async function getProjectAccess(userId: unknown, projectId: string): Promise<Access> {
  await connectDB();

  const membership = await ProjectMember.findOne({ project: projectId, user: userId })
    .select("role")
    .lean<{ role?: string } | null>();
  if (membership) {
    const role = (membership.role ?? "contributor") as ProjectRole;
    return { role, isOwner: role === "owner" };
  }

  const owned = await Project.exists({ _id: projectId, user: userId });
  if (owned) {
    // Self-heal: write the row so every later check is one indexed lookup.
    await ProjectMember.updateOne(
      { project: projectId, user: userId },
      { $setOnInsert: { role: "owner" } },
      { upsert: true },
    ).catch(() => {});
    return { role: "owner", isOwner: true };
  }

  return null;
}

export async function requireProjectAccess(
  userId: unknown,
  projectId: string,
  min: ProjectRole = "viewer",
): Promise<Access> {
  const access = await getProjectAccess(userId, projectId);
  if (!access || ROLE_RANK[access.role] < ROLE_RANK[min]) return null;
  return access;
}

export function can(access: Access, min: ProjectRole): boolean {
  return Boolean(access && ROLE_RANK[access.role] >= ROLE_RANK[min]);
}
