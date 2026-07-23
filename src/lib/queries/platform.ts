import { connectDB } from "../db";
import { Notification, Resource, SupportTicket } from "../models";

export async function getNotifications(userId: unknown) {
  await connectDB();
  const rows = await Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(50).lean();
  return rows.map((n) => ({
    id: String(n._id),
    kind: String(n.kind ?? "system"),
    title: String(n.title),
    body: n.body as string | undefined,
    href: n.href as string | undefined,
    read: Boolean(n.readAt),
    at: new Date(n.createdAt as Date).toISOString(),
  }));
}

export async function countUnreadNotifications(userId: unknown) {
  await connectDB();
  return Notification.countDocuments({ user: userId, readAt: null });
}

export async function getResources(userId: unknown) {
  await connectDB();
  // The user's own saved resources plus the platform library (owner unset).
  const rows = await Resource.find({ $or: [{ owner: userId }, { owner: { $exists: false } }, { owner: null }] })
    .sort({ createdAt: -1 })
    .lean();
  return rows.map((r) => ({
    id: String(r._id),
    kind: String(r.kind ?? "article"),
    title: String(r.title),
    url: r.url as string | undefined,
    description: r.description as string | undefined,
    tags: (r.tags ?? []) as string[],
    mine: String(r.owner ?? "") === String(userId),
  }));
}

export async function getTickets(userId: unknown) {
  await connectDB();
  const rows = await SupportTicket.find({ user: userId }).sort({ createdAt: -1 }).lean();
  return rows.map((t) => ({
    id: String(t._id),
    kind: String(t.kind ?? "question"),
    subject: String(t.subject),
    status: String(t.status ?? "open"),
    at: new Date(t.createdAt as Date).toISOString(),
  }));
}
