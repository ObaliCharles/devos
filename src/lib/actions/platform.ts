"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "../db";
import {
  AiConversation,
  AiMemory,
  AiMessage,
  Backlink,
  CalendarEvent,
  Certificate,
  Challenge,
  ChallengeAttempt,
  ChallengeProgress,
  Client,
  Flashcard,
  FocusSession,
  Goal,
  Habit,
  IncomeEntry,
  Interview,
  JobApplication,
  LessonProgress,
  Note,
  NoteCollection,
  NoteVersion,
  Notification,
  Portfolio,
  Project,
  Resume,
  Resource,
  Review,
  Snippet,
  StudySession,
  SupportTicket,
  Task,
  TimeEntry,
  User,
} from "../models";
import { requireUser } from "../user";

/* ---------------------------------------------------------------- settings */

export async function updateProfile(input: { name?: string }) {
  await connectDB();
  const user = await requireUser();
  if (typeof input.name === "string" && input.name.trim()) {
    await User.updateOne({ _id: user._id }, { $set: { name: input.name.trim() } });
  }
  revalidatePath("/settings");
}

export async function updatePreferences(prefs: Record<string, unknown>) {
  await connectDB();
  const user = await requireUser();

  // Whitelist each preference; never $set the whole object.
  const patch: Record<string, unknown> = {};
  const strings = ["theme", "locale", "timezone"] as const;
  const numbers = ["reminderHour", "editorFontSize", "pomodoroMinutes", "pomodoroBreakMinutes"] as const;
  const bools = ["emailDigest", "notifyLearning", "notifyProjects", "notifyReviews"] as const;
  for (const k of strings) if (typeof prefs[k] === "string") patch[`preferences.${k}`] = prefs[k];
  for (const k of numbers) if (typeof prefs[k] === "number") patch[`preferences.${k}`] = prefs[k];
  for (const k of bools) if (typeof prefs[k] === "boolean") patch[`preferences.${k}`] = prefs[k];
  if (typeof prefs.dailyGoalMinutes === "number") patch.dailyGoalMinutes = prefs.dailyGoalMinutes;

  if (Object.keys(patch).length > 0) await User.updateOne({ _id: user._id }, { $set: patch });
  revalidatePath("/settings");
}

/**
 * Export everything the user owns as one JSON blob. This is the honest half of
 * "your data is yours", the other half is the delete below. Returns a string
 * the client turns into a download.
 */
export async function exportData() {
  await connectDB();
  const user = await requireUser();
  const uid = user._id;

  const [notes, projects, tasks, snippets, flashcards, applications, resumes, goals, habits] = await Promise.all([
    Note.find({ user: uid }).lean(),
    Project.find({ user: uid }).lean(),
    Task.find({ user: uid }).lean(),
    Snippet.find({ user: uid }).lean(),
    Flashcard.find({ user: uid }).lean(),
    JobApplication.find({ user: uid }).lean(),
    Resume.find({ user: uid }).lean(),
    Goal.find({ user: uid }).lean(),
    Habit.find({ user: uid }).lean(),
  ]);

  const data = {
    exportedAt: new Date().toISOString(),
    user: { name: user.name, email: user.email, xp: user.xp, createdAt: user.createdAt },
    notes, projects, tasks, snippets, flashcards, applications, resumes, goals, habits,
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Delete every trace of the user's own data. Content (lessons, challenges) is
 * shared and stays; everything keyed to this user goes, including the User row.
 * Irreversible on purpose, the settings page gates it behind typing DELETE.
 */
export async function deleteAccount(confirm: string) {
  if (confirm !== "DELETE") return { ok: false as const };
  await connectDB();
  const user = await requireUser();
  const uid = user._id;

  await Promise.all([
    LessonProgress.deleteMany({ user: uid }),
    Review.deleteMany({ user: uid }),
    StudySession.deleteMany({ user: uid }),
    Note.deleteMany({ user: uid }),
    NoteVersion.deleteMany({ user: uid }),
    NoteCollection.deleteMany({ user: uid }),
    Backlink.deleteMany({ user: uid }),
    Snippet.deleteMany({ user: uid }),
    Flashcard.deleteMany({ user: uid }),
    Project.deleteMany({ user: uid }),
    Task.deleteMany({ user: uid }),
    ChallengeAttempt.deleteMany({ user: uid }),
    ChallengeProgress.deleteMany({ user: uid }),
    AiConversation.deleteMany({ user: uid }),
    AiMessage.deleteMany({ user: uid }),
    AiMemory.deleteMany({ user: uid }),
    Resume.deleteMany({ user: uid }),
    Portfolio.deleteMany({ user: uid }),
    JobApplication.deleteMany({ user: uid }),
    Interview.deleteMany({ user: uid }),
    Certificate.deleteMany({ user: uid }),
    Client.deleteMany({ user: uid }),
    IncomeEntry.deleteMany({ user: uid }),
    Goal.deleteMany({ user: uid }),
    Habit.deleteMany({ user: uid }),
    FocusSession.deleteMany({ user: uid }),
    TimeEntry.deleteMany({ user: uid }),
    CalendarEvent.deleteMany({ user: uid }),
    Notification.deleteMany({ user: uid }),
    SupportTicket.deleteMany({ user: uid }),
  ]);
  await User.deleteOne({ _id: uid });

  return { ok: true as const };
}

/* ----------------------------------------------------------- notifications */

export async function markNotificationRead(id: string) {
  await connectDB();
  const user = await requireUser();
  await Notification.updateOne({ _id: id, user: user._id }, { $set: { readAt: new Date() } });
  revalidatePath("/notifications");
}

export async function markAllNotificationsRead() {
  await connectDB();
  const user = await requireUser();
  await Notification.updateMany({ user: user._id, readAt: null }, { $set: { readAt: new Date() } });
  revalidatePath("/notifications");
}

/* ------------------------------------------------------------- help / tickets */

export async function createTicket(input: { kind?: string; subject: string; body?: string }) {
  await connectDB();
  const user = await requireUser();
  if (!input.subject?.trim()) return;
  await SupportTicket.create({
    user: user._id,
    kind: input.kind ?? "question",
    subject: input.subject.trim(),
    body: input.body?.trim(),
  });
  revalidatePath("/help");
}

/* --------------------------------------------------------------- resources */

export async function saveResource(input: { kind?: string; title: string; url?: string; description?: string; tags?: string[] }) {
  await connectDB();
  const user = await requireUser();
  if (!input.title?.trim()) return;
  await Resource.create({
    owner: user._id,
    kind: input.kind ?? "article",
    title: input.title.trim(),
    url: input.url?.trim(),
    description: input.description?.trim(),
    tags: input.tags ?? [],
    saved: true,
  });
  revalidatePath("/resources");
}

export async function deleteResource(id: string) {
  await connectDB();
  const user = await requireUser();
  await Resource.deleteOne({ _id: id, owner: user._id });
  revalidatePath("/resources");
}
