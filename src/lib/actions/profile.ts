"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "../db";
import { Follow, User } from "../models";
import { requireUser } from "../user";

/**
 * Profile writes.
 *
 * The username rules are the interesting part. A handle appears in a URL, so it
 * is lowercased and restricted to `[a-z0-9-]`; it is checked for collision
 * against the unique index rather than a pre-read, because two people claiming
 * the same handle at once would both pass a pre-read and one would then get a
 * duplicate-key 500 instead of a message.
 */

const HANDLE = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;
const RESERVED = new Set([
  "admin", "api", "settings", "dashboard", "learning", "practice", "community",
  "projects", "career", "analytics", "notes", "review", "calendar", "ai", "u",
  "help", "new", "me", "sign-in", "sign-up",
]);

export async function updateProfile(input: {
  username?: string;
  name?: string;
  bio?: string;
  location?: string;
  website?: string;
  githubUsername?: string;
  skills?: string;
}) {
  await connectDB();
  const user = await requireUser();

  const patch: Record<string, unknown> = {};

  if (input.username !== undefined) {
    const handle = input.username.trim().toLowerCase();
    if (handle) {
      if (!HANDLE.test(handle)) {
        return {
          ok: false as const,
          error: "Handles are 3–30 characters, letters, numbers and hyphens.",
        };
      }
      if (RESERVED.has(handle)) return { ok: false as const, error: "That handle is reserved." };
      patch.username = handle;
    }
  }

  if (input.name !== undefined) patch.name = input.name.trim().slice(0, 60);
  if (input.bio !== undefined) patch.bio = input.bio.trim().slice(0, 280);
  if (input.location !== undefined) patch.location = input.location.trim().slice(0, 80);
  if (input.githubUsername !== undefined) {
    patch.githubUsername = input.githubUsername.trim().replace(/^@/, "").slice(0, 60);
  }
  if (input.website !== undefined) {
    const raw = input.website.trim().slice(0, 200);
    // A bare domain is what people type; without a scheme the browser reads it
    // as a relative path and the link silently points inside the app.
    patch.website = raw && !/^https?:\/\//i.test(raw) ? `https://${raw}` : raw;
  }
  if (input.skills !== undefined) {
    patch.skills = [
      ...new Set(
        input.skills
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && s.length <= 24),
      ),
    ].slice(0, 12);
  }

  try {
    await User.updateOne({ _id: user._id }, { $set: patch });
  } catch {
    return { ok: false as const, error: "That handle is taken." };
  }

  revalidatePath("/settings");
  if (patch.username) revalidatePath(`/u/${patch.username}`);
  return { ok: true as const, username: String(patch.username ?? user.username ?? user._id) };
}

/** Follow or unfollow. Self-follow is refused rather than filtered later. */
export async function toggleFollow(userId: string) {
  await connectDB();
  const user = await requireUser();
  if (String(user._id) === userId) {
    return { ok: false as const, error: "You cannot follow yourself." };
  }

  const existing = await Follow.findOneAndDelete({ follower: user._id, following: userId });
  if (!existing) await Follow.create({ follower: user._id, following: userId });

  revalidatePath(`/u/${userId}`);
  return { ok: true as const, following: !existing };
}
