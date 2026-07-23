"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "../db";
import { dayKey } from "../day";
import { extractLinks } from "../wikilinks";
import { grade, nextDue } from "../srs";
import { Backlink, Flashcard, Note, NoteCollection, NoteVersion, Snippet } from "../models";
import { addXp, recordActivity, requireUser } from "../user";
import { recomputeNotedGate } from "./learning";

/* -------------------------------------------------------------- backlinks */

/**
 * Rebuilds the backlink rows for one note from its body. Called on every save.
 * Storing links as their own rows is what lets "referenced by" be an indexed
 * query rather than a regex scan of every note the user owns — the difference
 * between a graph view that opens and one that times out.
 *
 * Targets resolve by title, case-insensitively. A link to a note that does not
 * exist yet is kept with a null target, so it lights up the moment that note
 * is created.
 */
async function syncBacklinks(userId: unknown, noteId: unknown, body: string) {
  await Backlink.deleteMany({ from: noteId });

  const links = extractLinks(body);
  if (links.length === 0) return;

  // One query resolves every target title to an id.
  const titles = links.map((l) => l.target);
  const matches = await Note.find({
    user: userId,
    title: { $in: titles.map((t) => new RegExp(`^${escapeRegex(t)}$`, "i")) },
  })
    .select("title")
    .lean();

  const byTitle = new Map(matches.map((m) => [String(m.title).toLowerCase(), m._id]));

  await Backlink.insertMany(
    links.map((l) => ({
      user: userId,
      from: noteId,
      to: byTitle.get(l.target.toLowerCase()) ?? undefined,
      text: l.target,
    })),
    { ordered: false }
  ).catch(() => {
    // A duplicate (same from+text) is harmless — the unique index is only there
    // to stop the same link being counted twice.
  });
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * When a note is created or renamed, any dangling links that named it by title
 * should resolve to it. This is what makes `[[Some Note]]` connect the instant
 * "Some Note" exists, in either order of creation.
 */
async function resolveDanglingLinks(userId: unknown, note: { _id: unknown; title: string }) {
  await Backlink.updateMany(
    { user: userId, to: null, text: new RegExp(`^${escapeRegex(note.title)}$`, "i") },
    { $set: { to: note._id } }
  );
}

/* ------------------------------------------------------------------ notes */

export async function createNote(input: {
  title?: string;
  body?: string;
  lessonId?: string;
  projectId?: string;
  collectionId?: string;
  tags?: string[];
  kind?: string;
}) {
  await connectDB();
  const user = await requireUser();

  const note = await Note.create({
    user: user._id,
    title: input.title?.trim() || "Untitled note",
    body: input.body ?? "",
    lesson: input.lessonId || undefined,
    project: input.projectId || undefined,
    noteCollection: input.collectionId || undefined,
    tags: input.tags ?? [],
    kind: input.kind ?? "note",
    day: input.kind === "daily" ? dayKey() : undefined,
  });

  await Promise.all([
    syncBacklinks(user._id, note._id, note.body),
    resolveDanglingLinks(user._id, { _id: note._id, title: note.title }),
  ]);

  if (input.lessonId) await recomputeNotedGate(user._id, input.lessonId);

  await recordActivity(user._id, { notesWritten: 1 });
  revalidatePath("/notes");
  return { id: String(note._id) };
}

/**
 * The autosave target. Chapter 6 wants a snapshot per save and a save every
 * few seconds — but a version row on every keystroke-batch would be thousands
 * of near-identical rows a day. So a snapshot is only cut when the body has
 * meaningfully moved on from the last one, which keeps history useful and the
 * collection small.
 */
export async function updateNote(
  id: string,
  input: { title?: string; body?: string; tags?: string[]; collectionId?: string | null; snapshot?: boolean }
) {
  await connectDB();
  const user = await requireUser();

  const note = await Note.findOne({ _id: id, user: user._id });
  if (!note) return;

  const oldTitle = note.title;

  if (typeof input.title === "string") note.title = input.title.trim() || "Untitled note";
  if (Array.isArray(input.tags)) note.tags = input.tags;
  if (input.collectionId !== undefined) note.noteCollection = input.collectionId || undefined;

  let bodyChanged = false;
  if (typeof input.body === "string" && input.body !== note.body) {
    // Snapshot the version we are about to overwrite, not the new one — so
    // "restore" goes back to what was there before this save.
    if (input.snapshot && note.body.trim()) {
      await NoteVersion.create({ note: note._id, user: user._id, title: oldTitle, body: note.body });
    }
    note.body = input.body;
    bodyChanged = true;
  }

  await note.save();

  if (bodyChanged) await syncBacklinks(user._id, note._id, note.body);
  // A rename can resolve links that pointed at the new title, and orphan ones
  // that pointed at the old.
  if (note.title !== oldTitle) {
    await resolveDanglingLinks(user._id, { _id: note._id, title: note.title });
    await Backlink.updateMany(
      { user: user._id, to: note._id, text: new RegExp(`^${escapeRegex(oldTitle)}$`, "i") },
      { $set: { to: null } }
    );
    await resolveDanglingLinks(user._id, { _id: note._id, title: note.title });
  }
  if (note.lesson) await recomputeNotedGate(user._id, String(note.lesson));

  revalidatePath("/notes");
}

export async function deleteNote(id: string) {
  await connectDB();
  const user = await requireUser();

  const note = await Note.findOne({ _id: id, user: user._id });
  if (!note) return;

  // Trash first, delete on the second try. 30 days of grace, per Chapter 6 —
  // except a note that is already in the trash is gone for good.
  if (!note.trashedAt) {
    note.trashedAt = new Date();
    await note.save();
    if (note.lesson) await recomputeNotedGate(user._id, String(note.lesson));
    revalidatePath("/notes");
    return;
  }

  await Promise.all([
    Note.deleteOne({ _id: id, user: user._id }),
    NoteVersion.deleteMany({ note: id }),
    Backlink.deleteMany({ from: id }),
    // Links that pointed *at* this note become dangling again, not deleted.
    Backlink.updateMany({ to: id }, { $set: { to: null } }),
  ]);

  if (note.lesson) await recomputeNotedGate(user._id, String(note.lesson));
  revalidatePath("/notes");
}

export async function restoreNote(id: string) {
  await connectDB();
  const user = await requireUser();
  await Note.updateOne({ _id: id, user: user._id }, { $unset: { trashedAt: 1 } });
  revalidatePath("/notes");
}

export async function toggleNoteFavorite(id: string) {
  await connectDB();
  const user = await requireUser();
  const note = await Note.findOne({ _id: id, user: user._id }).select("favorite");
  if (!note) return;
  note.favorite = !note.favorite;
  await note.save();
  revalidatePath("/notes");
}

export async function setNoteArchived(id: string, archived: boolean) {
  await connectDB();
  const user = await requireUser();
  await Note.updateOne({ _id: id, user: user._id }, { $set: { archived } });
  revalidatePath("/notes");
}

/** Restore a note's body to an earlier snapshot, keeping the current one first. */
export async function restoreVersion(noteId: string, versionId: string) {
  await connectDB();
  const user = await requireUser();

  const [note, version] = await Promise.all([
    Note.findOne({ _id: noteId, user: user._id }),
    NoteVersion.findOne({ _id: versionId, user: user._id }),
  ]);
  if (!note || !version) return;

  // Snapshot the current body before overwriting, so restoring is itself
  // undoable.
  await NoteVersion.create({ note: note._id, user: user._id, title: note.title, body: note.body });
  note.body = version.body ?? "";
  if (version.title) note.title = version.title;
  await note.save();
  await syncBacklinks(user._id, note._id, note.body);

  revalidatePath("/notes");
}

/** Ensure today's daily note exists and return its id — the "Daily note" button. */
export async function openDailyNote() {
  await connectDB();
  const user = await requireUser();
  const day = dayKey();

  const existing = await Note.findOne({ user: user._id, kind: "daily", day }).select("_id").lean<{ _id: unknown } | null>();
  if (existing) return { id: String(existing._id) };

  const pretty = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const note = await Note.create({
    user: user._id,
    kind: "daily",
    day,
    title: pretty,
    body: `# ${pretty}\n\n## Today's goals\n\n- \n\n## Learned\n\n- \n\n## Notes\n\n\n\n## Tomorrow\n\n- \n`,
  });
  await recordActivity(user._id, { notesWritten: 1 });
  revalidatePath("/notes");
  return { id: String(note._id) };
}

/* ------------------------------------------------------------ collections */

export async function createCollection(input: { name: string; icon?: string; color?: string }) {
  await connectDB();
  const user = await requireUser();
  if (!input.name?.trim()) return;
  const last = await NoteCollection.findOne({ user: user._id }).sort({ order: -1 }).lean<{ order?: number }>();
  await NoteCollection.create({
    user: user._id,
    name: input.name.trim(),
    icon: input.icon ?? "folder",
    color: input.color ?? "var(--primary)",
    order: (last?.order ?? -1) + 1,
  });
  revalidatePath("/notes");
}

export async function deleteCollection(id: string) {
  await connectDB();
  const user = await requireUser();
  await NoteCollection.deleteOne({ _id: id, user: user._id });
  // Notes keep existing; they just fall out of the collection.
  await Note.updateMany({ user: user._id, noteCollection: id }, { $unset: { noteCollection: 1 } });
  revalidatePath("/notes");
}

/* --------------------------------------------------------------- snippets */

export async function saveSnippet(input: {
  id?: string;
  title: string;
  description?: string;
  language?: string;
  framework?: string;
  code: string;
  tags?: string[];
}) {
  await connectDB();
  const user = await requireUser();
  if (!input.title?.trim()) return;

  const doc = {
    title: input.title.trim(),
    description: input.description?.trim(),
    language: input.language ?? "typescript",
    framework: input.framework?.trim(),
    code: input.code ?? "",
    tags: input.tags ?? [],
  };

  if (input.id) {
    await Snippet.updateOne({ _id: input.id, user: user._id }, { $set: doc });
  } else {
    await Snippet.create({ ...doc, user: user._id });
  }
  revalidatePath("/notes/snippets");
}

export async function deleteSnippet(id: string) {
  await connectDB();
  const user = await requireUser();
  await Snippet.deleteOne({ _id: id, user: user._id });
  revalidatePath("/notes/snippets");
}

/* ------------------------------------------------------------- flashcards */

export async function createFlashcard(input: { front: string; back: string; tags?: string[]; lessonId?: string }) {
  await connectDB();
  const user = await requireUser();
  if (!input.front?.trim() || !input.back?.trim()) return;
  await Flashcard.create({
    user: user._id,
    front: input.front.trim(),
    back: input.back.trim(),
    tags: input.tags ?? [],
    lesson: input.lessonId || undefined,
  });
  revalidatePath("/notes/flashcards");
}

export async function deleteFlashcard(id: string) {
  await connectDB();
  const user = await requireUser();
  await Flashcard.deleteOne({ _id: id, user: user._id });
  revalidatePath("/notes/flashcards");
}

/** Grade a flashcard review on the same ladder as lessons (lib/srs.ts). */
export async function gradeFlashcard(id: string, remembered: boolean) {
  await connectDB();
  const user = await requireUser();
  const card = await Flashcard.findOne({ _id: id, user: user._id });
  if (!card) return;

  card.step = grade(card.step, remembered);
  card.dueAt = nextDue(card.step);
  if (!remembered) card.lapses += 1;
  await card.save();

  await recordActivity(user._id, { reviewsDone: 1 });
  await addXp(user._id, 5);
  revalidatePath("/notes/flashcards");
}
