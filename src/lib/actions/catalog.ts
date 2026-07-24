"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "../db";
import { CatalogProgress } from "../models";
import { addXp, recordActivity, requireUser } from "../user";
import { getCourse, flatLessons } from "../catalog";

/** XP awarded the first time a catalog lesson is completed. */
const LESSON_XP = 20;

/**
 * Mark a catalog course lesson complete for the signed-in user.
 *
 * Idempotent and honest: XP, the streak and the "lessons completed" count are
 * credited exactly once per lesson (the first time it's completed), by checking
 * whether the index is already in the stored set before crediting. Re-opening a
 * finished lesson and pressing complete again does nothing. This reuses the
 * same recordActivity/addXp helpers the roadmap lessons use, so catalog lessons
 * feed the same streak, XP and heatmap as everything else.
 */
export async function completeCatalogLesson(course: string, lessonIndex: number) {
  await connectDB();
  const user = await requireUser();

  const def = getCourse(course);
  if (!def) return { ok: false as const, error: "Unknown course." };
  const total = flatLessons(def).length;
  if (lessonIndex < 0 || lessonIndex >= total) {
    return { ok: false as const, error: "Unknown lesson." };
  }

  const doc =
    (await CatalogProgress.findOne({ user: user._id, course })) ??
    new CatalogProgress({ user: user._id, course, completed: [] });

  const already = doc.completed.includes(lessonIndex);
  if (!already) {
    doc.completed.push(lessonIndex);
    await doc.save();
    // Credit exactly once: XP, the day's activity (which bumps the streak and
    // the heatmap) and the lessons-completed metric that drives achievements.
    await addXp(user._id, LESSON_XP);
    await recordActivity(user._id, { lessonsCompleted: 1 });
  }

  revalidatePath(`/learning/course/${course}`, "layout");
  revalidatePath("/learning");
  revalidatePath("/dashboard");

  const completed = doc.completed.length;
  return {
    ok: true as const,
    already,
    completed,
    total,
    xp: already ? 0 : LESSON_XP,
    courseComplete: completed >= total,
  };
}
