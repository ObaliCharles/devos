"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "../db";
import { AuditLog, Challenge, FeatureFlag, Lesson, Phase, Skill, User } from "../models";
import { requireAdmin } from "../user";

/**
 * Admin mutations. Every one that changes another user or the shared content
 * writes an AuditLog row first, DECISIONS 007 is explicit that admin power
 * without a trail is exactly the kind of silent bypass the product refuses.
 */
async function audit(actorId: unknown, action: string, target?: string, meta?: unknown) {
  await AuditLog.create({ actor: actorId, action, target, meta });
}

/* ------------------------------------------------------------------- users */

export async function setUserRole(userId: string, role: "user" | "admin") {
  await connectDB();
  const admin = await requireAdmin();

  const target = await User.findById(userId);
  if (!target) return { ok: false as const };

  // Guard against demoting the last admin, locking everyone out of /admin is
  // not a recoverable mistake from inside the app.
  if (target.role === "admin" && role === "user") {
    const admins = await User.countDocuments({ role: "admin" });
    if (admins <= 1) return { ok: false as const, message: "Cannot demote the last admin." };
  }

  target.role = role;
  await target.save();
  await audit(admin._id, `set role to ${role}`, target.email ?? String(target._id));
  revalidatePath("/admin/users");
  return { ok: true as const };
}

/* ------------------------------------------------------------ feature flags */

export async function upsertFlag(input: { key: string; enabled: boolean; description?: string }) {
  await connectDB();
  const admin = await requireAdmin();
  if (!input.key?.trim()) return;
  await FeatureFlag.updateOne(
    { key: input.key.trim() },
    { $set: { enabled: input.enabled, description: input.description } },
    { upsert: true }
  );
  await audit(admin._id, `${input.enabled ? "enabled" : "disabled"} flag`, input.key.trim());
  revalidatePath("/admin/flags");
}

export async function deleteFlag(id: string) {
  await connectDB();
  const admin = await requireAdmin();
  const flag = await FeatureFlag.findByIdAndDelete(id).lean<{ key?: string } | null>();
  if (flag) await audit(admin._id, "deleted flag", flag.key);
  revalidatePath("/admin/flags");
}

/* --------------------------------------------------------- content: lessons */

export async function updateLessonContent(
  lessonId: string,
  input: { title?: string; body?: string; objectives?: string[]; xp?: number }
) {
  await connectDB();
  const admin = await requireAdmin();

  const patch: Record<string, unknown> = {};
  if (typeof input.title === "string" && input.title.trim()) patch.title = input.title.trim();
  if (typeof input.body === "string") patch.body = input.body;
  if (Array.isArray(input.objectives)) patch.objectives = input.objectives.filter(Boolean);
  if (typeof input.xp === "number") patch.xp = input.xp;
  if (Object.keys(patch).length === 0) return;

  await Lesson.updateOne({ _id: lessonId }, { $set: patch });
  await audit(admin._id, "edited lesson", String(patch.title ?? lessonId));
  revalidatePath(`/admin/content`);
  revalidatePath(`/learning/lesson/${lessonId}`);
}

/* ------------------------------------------------------ roadmap builder ---- */

export async function createPhase(input: { title: string; subtitle?: string }) {
  await connectDB();
  const admin = await requireAdmin();
  const { Roadmap } = await import("../models");
  const roadmap = await Roadmap.findOne().select("_id").lean<{ _id: unknown } | null>();
  if (!roadmap || !input.title?.trim()) return;
  const last = await Phase.findOne({ roadmap: roadmap._id }).sort({ order: -1 }).lean<{ order?: number }>();
  await Phase.create({ roadmap: roadmap._id, order: (last?.order ?? 0) + 1, title: input.title.trim(), subtitle: input.subtitle?.trim() });
  await audit(admin._id, "created phase", input.title.trim());
  revalidatePath("/admin/content");
}

export async function createSkill(input: { phaseId: string; title: string; why?: string; difficulty?: string }) {
  await connectDB();
  const admin = await requireAdmin();
  if (!input.title?.trim()) return;
  const last = await Skill.findOne({ phase: input.phaseId }).sort({ order: -1 }).lean<{ order?: number }>();
  await Skill.create({ phase: input.phaseId, order: (last?.order ?? 0) + 1, title: input.title.trim(), why: input.why?.trim(), difficulty: input.difficulty ?? "beginner" });
  await audit(admin._id, "created skill", input.title.trim());
  revalidatePath("/admin/content");
}

export async function createLesson(input: { skillId: string; title: string; body?: string }) {
  await connectDB();
  const admin = await requireAdmin();
  if (!input.title?.trim()) return;
  const last = await Lesson.findOne({ skill: input.skillId }).sort({ order: -1 }).lean<{ order?: number }>();
  await Lesson.create({
    skill: input.skillId,
    order: (last?.order ?? 0) + 1,
    title: input.title.trim(),
    body: input.body?.trim() || "New lesson. Edit the body in the admin content editor.",
    xp: 50,
  });
  await audit(admin._id, "created lesson", input.title.trim());
  revalidatePath("/admin/content");
}

export async function deleteLesson(lessonId: string) {
  await connectDB();
  const admin = await requireAdmin();
  const lesson = await Lesson.findByIdAndDelete(lessonId).lean<{ title?: string } | null>();
  if (lesson) await audit(admin._id, "deleted lesson", lesson.title);
  revalidatePath("/admin/content");
}
