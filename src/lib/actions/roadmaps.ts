"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "../db";
import { Lesson, LessonProgress, Phase, Roadmap, Review, Skill, User } from "../models";
import { requireUser } from "../user";
import { checkCap } from "../ai";
import { generateRoadmap, type GenerateInput } from "../roadmap-gen";
import { countOwnedRoadmaps, MAX_AI_ROADMAPS, persistRoadmap } from "../roadmap-persist";

/**
 * Generate a roadmap with AI, persist the whole tree owned by the user, and
 * make it their active path. Guarded by the same daily AI cap as chat, and
 * counted so tokens are billed against the day.
 *
 * The builder drives generation through the streaming route instead, so it can
 * show which stage is running. This stays for callers that just want a path and
 * can wait in silence for it.
 */
export async function generateRoadmapAction(input: GenerateInput) {
  const user = await requireUser();

  const topic = input.topic?.trim();
  const goal = input.goal?.trim();
  if (!topic || !goal) {
    return { ok: false as const, error: "Give a topic and what you want to be able to do." };
  }

  const cap = await checkCap(user._id);
  if (!cap.ok) return { ok: false as const, error: cap.reason };

  if ((await countOwnedRoadmaps(user._id)) >= MAX_AI_ROADMAPS) {
    return {
      ok: false as const,
      error: `You can keep up to ${MAX_AI_ROADMAPS} generated paths. Delete one to make room.`,
    };
  }

  const result = await generateRoadmap({
    ...input,
    topic,
    goal,
    level: input.level ?? "beginner",
  });
  if (!result.ok) return { ok: false as const, error: result.error };

  const saved = await persistRoadmap({
    userId: user._id,
    input: { ...input, topic, goal, level: input.level ?? "beginner" },
    data: result.roadmap,
    provider: result.provider,
    resources: result.resources,
  });

  revalidatePath("/learning", "layout");
  revalidatePath("/dashboard");
  return { ok: true as const, roadmapId: saved.roadmapId, lessons: saved.lessons };
}

/** Switch the active path. Only a curated roadmap or one the user owns. */
export async function activateRoadmap(roadmapId: string) {
  const user = await requireUser();
  await connectDB();

  const roadmap = await Roadmap.findById(roadmapId).select("owner").lean<{ owner?: unknown } | null>();
  if (!roadmap) return { ok: false as const, error: "That path no longer exists." };
  if (roadmap.owner && String(roadmap.owner) !== String(user._id)) {
    return { ok: false as const, error: "That path is not yours." };
  }

  await User.updateOne({ _id: user._id }, { $set: { activeRoadmap: roadmapId } });
  revalidatePath("/learning", "layout");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

/**
 * Delete a generated path and everything under it, plus the user's progress on
 * its lessons. Curated roadmaps cannot be deleted. If the deleted path was
 * active, fall back to the default on next read (activeRoadmap is cleared).
 */
export async function deleteRoadmap(roadmapId: string) {
  const user = await requireUser();
  await connectDB();

  const roadmap = await Roadmap.findById(roadmapId).select("owner").lean<{ owner?: unknown } | null>();
  if (!roadmap) return { ok: false as const, error: "That path no longer exists." };
  if (!roadmap.owner || String(roadmap.owner) !== String(user._id)) {
    return { ok: false as const, error: "Only paths you generated can be deleted." };
  }

  const phaseIds = (await Phase.find({ roadmap: roadmapId }).select("_id").lean()).map((p) => p._id);
  const skillIds = (await Skill.find({ phase: { $in: phaseIds } }).select("_id").lean()).map((s) => s._id);
  const lessonIds = (await Lesson.find({ skill: { $in: skillIds } }).select("_id").lean()).map((l) => l._id);

  await Promise.all([
    Lesson.deleteMany({ _id: { $in: lessonIds } }),
    Skill.deleteMany({ _id: { $in: skillIds } }),
    Phase.deleteMany({ _id: { $in: phaseIds } }),
    Roadmap.deleteOne({ _id: roadmapId }),
    LessonProgress.deleteMany({ user: user._id, lesson: { $in: lessonIds } }),
    Review.deleteMany({ user: user._id, lesson: { $in: lessonIds } }),
  ]);

  await User.updateOne(
    { _id: user._id, activeRoadmap: roadmapId },
    { $unset: { activeRoadmap: "" } },
  );

  revalidatePath("/learning", "layout");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
