import { connectDB } from "../db";
import { Backlink, Flashcard, Note, NoteCollection, Snippet } from "../models";

/**
 * Reads for the Knowledge module. The workspace loads once and does most of its
 * navigation on the client, so these are shaped to hand the client everything
 * it needs in as few round trips as the module has pages.
 */

export type NoteListItem = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  kind: string;
  favorite: boolean;
  collectionId?: string;
  lessonTitle?: string;
  updatedAt: string;
};

export async function getNotesWorkspace(userId: unknown) {
  await connectDB();

  const [notes, collections] = await Promise.all([
    Note.find({ user: userId, archived: false, trashedAt: null })
      .sort({ updatedAt: -1 })
      .populate({ path: "lesson", select: "title" })
      .lean(),
    NoteCollection.find({ user: userId }).sort({ order: 1 }).lean(),
  ]);

  const items: NoteListItem[] = notes.map((n) => ({
    id: String(n._id),
    title: String(n.title ?? "Untitled note"),
    body: String(n.body ?? ""),
    tags: (n.tags ?? []) as string[],
    kind: String(n.kind ?? "note"),
    favorite: Boolean(n.favorite),
    collectionId: n.noteCollection ? String(n.noteCollection) : undefined,
    lessonTitle: (n.lesson as { title?: string } | null)?.title,
    updatedAt: new Date(n.updatedAt as Date).toISOString(),
  }));

  return {
    notes: items,
    collections: collections.map((c) => ({
      id: String(c._id),
      name: String(c.name),
      icon: String(c.icon ?? "folder"),
      color: String(c.color ?? "var(--primary)"),
    })),
    tags: countTags(items),
  };
}

function countTags(notes: NoteListItem[]) {
  const counts = new Map<string, number>();
  for (const note of notes) {
    for (const tag of note.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count);
}

/** "Referenced by" for one note — one indexed query, thanks to the Backlink rows. */
export async function getBacklinks(userId: unknown, noteId: string) {
  await connectDB();
  const rows = await Backlink.find({ user: userId, to: noteId })
    .populate({ path: "from", select: "title" })
    .lean();

  const seen = new Set<string>();
  const out: { id: string; title: string }[] = [];
  for (const row of rows) {
    const from = row.from as { _id?: unknown; title?: string } | null;
    if (!from?._id) continue;
    const id = String(from._id);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, title: String(from.title ?? "Untitled") });
  }
  return out;
}

/**
 * The graph. Nodes are notes, edges are resolved backlinks. Built in two
 * queries and joined in memory — the same discipline getRoadmap follows, so a
 * few hundred notes stay one fast render rather than one query per edge.
 */
export async function getKnowledgeGraph(userId: unknown) {
  await connectDB();

  const [notes, links] = await Promise.all([
    Note.find({ user: userId, archived: false, trashedAt: null }).select("title").lean(),
    Backlink.find({ user: userId, to: { $ne: null } }).select("from to").lean(),
  ]);

  const ids = new Set(notes.map((n) => String(n._id)));
  const degree = new Map<string, number>();
  const edges: { source: string; target: string }[] = [];

  for (const link of links) {
    const source = String(link.from);
    const target = String(link.to);
    if (!ids.has(source) || !ids.has(target)) continue;
    edges.push({ source, target });
    degree.set(source, (degree.get(source) ?? 0) + 1);
    degree.set(target, (degree.get(target) ?? 0) + 1);
  }

  return {
    nodes: notes.map((n) => ({
      id: String(n._id),
      title: String(n.title ?? "Untitled"),
      degree: degree.get(String(n._id)) ?? 0,
    })),
    edges,
  };
}

export async function getTrash(userId: unknown) {
  await connectDB();
  const notes = await Note.find({ user: userId, trashedAt: { $ne: null } })
    .sort({ trashedAt: -1 })
    .lean();
  return notes.map((n) => ({
    id: String(n._id),
    title: String(n.title ?? "Untitled"),
    trashedAt: new Date(n.trashedAt as Date).toISOString(),
  }));
}

export async function getSnippets(userId: unknown) {
  await connectDB();
  const rows = await Snippet.find({ user: userId }).sort({ updatedAt: -1 }).lean();
  return rows.map((s) => ({
    id: String(s._id),
    title: String(s.title),
    description: s.description as string | undefined,
    language: String(s.language ?? "typescript"),
    framework: s.framework as string | undefined,
    code: String(s.code ?? ""),
    tags: (s.tags ?? []) as string[],
  }));
}

export async function getDueFlashcards(userId: unknown) {
  await connectDB();
  return Flashcard.find({ user: userId, dueAt: { $lte: new Date() } }).sort({ dueAt: 1 }).lean();
}

export async function getFlashcardStats(userId: unknown) {
  await connectDB();
  const [total, due] = await Promise.all([
    Flashcard.countDocuments({ user: userId }),
    Flashcard.countDocuments({ user: userId, dueAt: { $lte: new Date() } }),
  ]);
  return { total, due };
}
