"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "../db";
import { Project, ProjectInvite, ProjectMember, ProjectMessage } from "../models";
import { requireUser } from "../user";
import { requireProjectAccess, type ProjectRole } from "../project-access";

/**
 * Writes for project collaboration.
 *
 * Every one of these begins with `requireProjectAccess` at the minimum role the
 * operation needs. That is the whole authorisation model — no action trusts a
 * role sent from the client, and none re-implements the check.
 */

const ASSIGNABLE: ProjectRole[] = ["maintainer", "contributor", "viewer"];

function bad(error: string) {
  return { ok: false as const, error };
}

/** Invite someone. Idempotent: a second invite updates the pending one. */
export async function inviteToProject(projectId: string, userId: string, role: string, message = "") {
  await connectDB();
  const me = await requireUser();
  if (!(await requireProjectAccess(me._id, projectId, "maintainer"))) {
    return bad("Only maintainers can invite people.");
  }
  if (await ProjectMember.exists({ project: projectId, user: userId })) {
    return bad("They are already on the team.");
  }

  const safeRole = ASSIGNABLE.includes(role as ProjectRole) ? role : "contributor";
  await ProjectInvite.findOneAndUpdate(
    { project: projectId, user: userId },
    {
      $set: {
        direction: "invite",
        role: safeRole,
        message: message.slice(0, 400),
        status: "pending",
        createdBy: me._id,
      },
    },
    { upsert: true },
  );

  revalidatePath(`/projects/${projectId}/team`);
  return { ok: true as const };
}

/** Ask to join an open project. */
export async function requestToJoin(projectId: string, message = "") {
  await connectDB();
  const me = await requireUser();

  const project = await Project.findById(projectId).select("openToContributors").lean<{
    openToContributors?: boolean;
  } | null>();
  if (!project?.openToContributors) return bad("This project is not taking contributors.");
  if (await ProjectMember.exists({ project: projectId, user: me._id })) {
    return bad("You are already on this team.");
  }

  await ProjectInvite.findOneAndUpdate(
    { project: projectId, user: me._id },
    {
      $set: {
        direction: "request",
        role: "contributor",
        message: message.slice(0, 400),
        status: "pending",
        createdBy: me._id,
      },
    },
    { upsert: true },
  );

  revalidatePath("/projects/discover");
  return { ok: true as const };
}

/**
 * Accept or decline a pending edge.
 *
 * Who may answer depends on which way it points: an invite is answered by the
 * person invited, a request by a maintainer. Getting that backwards would let
 * anyone approve their own join request, so it is checked here rather than
 * inferred from the UI that called it.
 */
export async function respondToEdge(edgeId: string, accept: boolean) {
  await connectDB();
  const me = await requireUser();

  const edge = await ProjectInvite.findById(edgeId);
  if (!edge || edge.status !== "pending") return bad("That invitation is no longer open.");

  const isRecipient = String(edge.user) === String(me._id);
  const canModerate = Boolean(await requireProjectAccess(me._id, String(edge.project), "maintainer"));

  const allowed = edge.direction === "invite" ? isRecipient : canModerate;
  if (!allowed) return bad("That is not yours to answer.");

  edge.status = accept ? "accepted" : "declined";
  await edge.save();

  if (accept) {
    await ProjectMember.updateOne(
      { project: edge.project, user: edge.user },
      { $setOnInsert: { role: edge.role ?? "contributor" } },
      { upsert: true },
    );
  }

  revalidatePath(`/projects/${edge.project}/team`);
  revalidatePath("/projects");
  return { ok: true as const };
}

export async function setMemberRole(projectId: string, memberId: string, role: string) {
  await connectDB();
  const me = await requireUser();
  const access = await requireProjectAccess(me._id, projectId, "maintainer");
  if (!access) return bad("Only maintainers can change roles.");
  if (!ASSIGNABLE.includes(role as ProjectRole)) return bad("Unknown role.");

  const member = await ProjectMember.findOne({ _id: memberId, project: projectId });
  if (!member) return bad("They are not on this team.");
  // The owner row is not editable, by anyone. A project with no owner has no
  // one who can delete it, and that is not a state worth allowing.
  if (member.role === "owner") return bad("The owner's role cannot be changed.");

  member.role = role;
  await member.save();
  revalidatePath(`/projects/${projectId}/team`);
  return { ok: true as const };
}

export async function removeMember(projectId: string, memberId: string) {
  await connectDB();
  const me = await requireUser();
  if (!(await requireProjectAccess(me._id, projectId, "maintainer"))) {
    return bad("Only maintainers can remove people.");
  }

  const member = await ProjectMember.findOne({ _id: memberId, project: projectId });
  if (!member) return bad("Already gone.");
  if (member.role === "owner") return bad("The owner cannot be removed.");

  await member.deleteOne();
  revalidatePath(`/projects/${projectId}/team`);
  return { ok: true as const };
}

export async function leaveProject(projectId: string) {
  await connectDB();
  const me = await requireUser();
  const member = await ProjectMember.findOne({ project: projectId, user: me._id });
  if (!member) return bad("You are not on this team.");
  if (member.role === "owner") return bad("Hand the project over before leaving it.");

  await member.deleteOne();
  revalidatePath("/projects");
  return { ok: true as const };
}

export async function setOpenToContributors(projectId: string, open: boolean) {
  await connectDB();
  const me = await requireUser();
  if (!(await requireProjectAccess(me._id, projectId, "maintainer"))) {
    return bad("Only maintainers can change this.");
  }
  await Project.updateOne({ _id: projectId }, { $set: { openToContributors: open } });
  revalidatePath(`/projects/${projectId}/team`);
  return { ok: true as const, open };
}

/** Project chat. Contributor and above — a viewer reads, it does not speak. */
export async function sendProjectMessage(projectId: string, body: string) {
  await connectDB();
  const me = await requireUser();
  if (!(await requireProjectAccess(me._id, projectId, "contributor"))) {
    return bad("You need contributor access to post here.");
  }

  const text = body.trim().slice(0, 4000);
  if (!text) return bad("Nothing to send.");

  await ProjectMessage.create({ project: projectId, author: me._id, body: text });
  revalidatePath(`/projects/${projectId}/chat`);
  return { ok: true as const };
}
