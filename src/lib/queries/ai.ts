import { connectDB } from "../db";
import { dayKey } from "../day";
import { AiConversation, AiMemory, AiMessage, AiPrompt, AiUsage } from "../models";
import { DAILY_COST_CAP_MICROS, DAILY_REQUEST_CAP } from "../ai";

export async function getConversations(userId: unknown) {
  await connectDB();
  const rows = await AiConversation.find({ user: userId, archived: false })
    .sort({ pinned: -1, lastMessageAt: -1, updatedAt: -1 })
    .lean();

  // The last reply, as a one-line preview under each title. Fetched as a
  // single grouped query rather than one per conversation, the list is short,
  // but N+1 in a sidebar is still N+1.
  const ids = rows.map((c) => c._id);
  const latest = await AiMessage.aggregate<{ _id: unknown; content: string }>([
    { $match: { conversation: { $in: ids }, role: "assistant" } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$conversation", content: { $first: "$content" } } },
  ]);
  const previewOf = new Map(latest.map((m) => [String(m._id), String(m.content ?? "")]));

  return rows.map((c) => ({
    id: String(c._id),
    title: String(c.title ?? "New conversation"),
    tool: String(c.tool ?? "chat"),
    pinned: Boolean(c.pinned),
    messageCount: Number(c.messageCount ?? 0),
    preview: (previewOf.get(String(c._id)) ?? "").replace(/\s+/g, " ").slice(0, 90),
    lastMessageAt: c.lastMessageAt ? new Date(c.lastMessageAt as Date).toISOString() : undefined,
  }));
}

export async function getConversation(userId: unknown, conversationId: string) {
  await connectDB();
  const convo = await AiConversation.findOne({ _id: conversationId, user: userId }).lean<{
    _id: unknown;
    title?: string;
    tool?: string;
  } | null>();
  if (!convo) return null;

  const messages = await AiMessage.find({ conversation: conversationId })
    .sort({ createdAt: 1 })
    .select("role content error createdAt")
    .lean();

  return {
    id: String(convo._id),
    title: String(convo.title ?? "New conversation"),
    tool: String(convo.tool ?? "chat"),
    messages: messages.map((m) => ({
      id: String(m._id),
      role: String(m.role) as "user" | "assistant",
      content: String(m.content ?? ""),
      error: m.error as string | undefined,
    })),
  };
}

export async function getMemory(userId: unknown) {
  await connectDB();
  const rows = await AiMemory.find({ user: userId }).sort({ pinned: -1, updatedAt: -1 }).lean();
  return rows.map((m) => ({
    id: String(m._id),
    key: String(m.key),
    value: String(m.value),
    kind: String(m.kind ?? "fact"),
    pinned: Boolean(m.pinned),
    source: m.source as string | undefined,
  }));
}

export async function getPrompts(userId: unknown) {
  await connectDB();
  // The user's own prompts plus the shipped ones (owner unset).
  const rows = await AiPrompt.find({ $or: [{ owner: userId }, { owner: { $exists: false } }, { owner: null }] })
    .sort({ category: 1, title: 1 })
    .lean();
  return rows.map((p) => ({
    id: String(p._id),
    title: String(p.title),
    category: String(p.category ?? "explain"),
    body: String(p.body),
    description: p.description as string | undefined,
    mine: String(p.owner ?? "") === String(userId),
  }));
}

/** Today's AI usage against the caps, for the meter on the AI home. */
export async function getAiUsage(userId: unknown) {
  await connectDB();
  const usage = await AiUsage.findOne({ user: userId, day: dayKey() }).lean<{
    requests?: number;
    costMicros?: number;
  } | null>();
  const requests = usage?.requests ?? 0;
  const costMicros = usage?.costMicros ?? 0;
  return {
    requests,
    requestCap: DAILY_REQUEST_CAP,
    costUsd: costMicros / 1_000_000,
    costCapUsd: DAILY_COST_CAP_MICROS / 1_000_000,
  };
}
