"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "../db";
import { AiConversation, AiMemory, AiMessage, AiPrompt } from "../models";
import { requireUser } from "../user";

/* ---------------------------------------------------------- conversations */

export async function createConversation(input: {
  title?: string;
  tool?: string;
  context?: { lessonId?: string; projectId?: string; noteId?: string; challengeId?: string };
}) {
  await connectDB();
  const user = await requireUser();

  const convo = await AiConversation.create({
    user: user._id,
    title: input.title?.trim() || "New conversation",
    tool: input.tool ?? "chat",
    context: {
      lesson: input.context?.lessonId || undefined,
      project: input.context?.projectId || undefined,
      note: input.context?.noteId || undefined,
      challenge: input.context?.challengeId || undefined,
    },
  });

  revalidatePath("/ai");
  return { id: String(convo._id) };
}

export async function renameConversation(id: string, title: string) {
  await connectDB();
  const user = await requireUser();
  await AiConversation.updateOne({ _id: id, user: user._id }, { $set: { title: title.trim() || "Untitled" } });
  revalidatePath("/ai");
}

export async function togglePinConversation(id: string) {
  await connectDB();
  const user = await requireUser();
  const c = await AiConversation.findOne({ _id: id, user: user._id }).select("pinned");
  if (!c) return;
  c.pinned = !c.pinned;
  await c.save();
  revalidatePath("/ai");
}

export async function deleteConversation(id: string) {
  await connectDB();
  const user = await requireUser();
  await Promise.all([
    AiConversation.deleteOne({ _id: id, user: user._id }),
    AiMessage.deleteMany({ conversation: id, user: user._id }),
  ]);
  revalidatePath("/ai");
}

/* ----------------------------------------------------------------- memory */

/**
 * Chapter 8 insists the user can see and edit what the AI remembers. So memory
 * is plain editable rows, never an opaque embedding, the whole page is a CRUD
 * over these.
 */
export async function saveMemory(input: { id?: string; key: string; value: string; kind?: string; pinned?: boolean }) {
  await connectDB();
  const user = await requireUser();
  if (!input.key?.trim() || !input.value?.trim()) return;

  if (input.id) {
    await AiMemory.updateOne(
      { _id: input.id, user: user._id },
      { $set: { key: input.key.trim(), value: input.value.trim(), kind: input.kind, pinned: input.pinned } }
    );
  } else {
    // Keyed unique per user, so re-saving a key updates rather than duplicates.
    await AiMemory.updateOne(
      { user: user._id, key: input.key.trim() },
      { $set: { value: input.value.trim(), kind: input.kind ?? "fact", source: "manual" }, $setOnInsert: { pinned: false } },
      { upsert: true }
    );
  }
  revalidatePath("/ai/memory");
}

export async function deleteMemory(id: string) {
  await connectDB();
  const user = await requireUser();
  await AiMemory.deleteOne({ _id: id, user: user._id });
  revalidatePath("/ai/memory");
}

export async function toggleMemoryPin(id: string) {
  await connectDB();
  const user = await requireUser();
  const m = await AiMemory.findOne({ _id: id, user: user._id }).select("pinned");
  if (!m) return;
  m.pinned = !m.pinned;
  await m.save();
  revalidatePath("/ai/memory");
}

/* ----------------------------------------------------------- prompt library */

export async function savePrompt(input: { id?: string; title: string; category?: string; body: string; description?: string }) {
  await connectDB();
  const user = await requireUser();
  if (!input.title?.trim() || !input.body?.trim()) return;

  const doc = {
    title: input.title.trim(),
    category: input.category ?? "explain",
    body: input.body.trim(),
    description: input.description?.trim(),
  };
  if (input.id) {
    await AiPrompt.updateOne({ _id: input.id, owner: user._id }, { $set: doc });
  } else {
    await AiPrompt.create({ ...doc, owner: user._id });
  }
  revalidatePath("/ai/prompts");
}

export async function deletePrompt(id: string) {
  await connectDB();
  const user = await requireUser();
  // Only your own prompts; the shipped ones (owner unset) cannot be deleted here.
  await AiPrompt.deleteOne({ _id: id, owner: user._id });
  revalidatePath("/ai/prompts");
}
