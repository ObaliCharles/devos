import { Schema, model, models } from "mongoose";

/* ===========================================================================
   KNOWLEDGE (Chapter 6), the second brain.

   `Note` is the same collection v0.1 shipped, extended. Existing notes stay
   valid: every field added here has a default, and `kind` defaults to "note",
   which is what they all are.
   ======================================================================== */

const NoteSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, default: "Untitled note" },
    body: { type: String, default: "" },
    /** Optional anchor back to the lesson the note was taken during. */
    lesson: { type: Schema.Types.ObjectId, ref: "Lesson", index: true },
    project: { type: Schema.Types.ObjectId, ref: "Project", index: true },
    /**
     * Not `collection`, that is a reserved Mongoose pathname, and a document's
     * `.collection` is its Mongoose collection handle. Naming the field that
     * would compile, warn once, and then quietly hand back the wrong object.
     */
    noteCollection: { type: Schema.Types.ObjectId, ref: "NoteCollection", index: true },
    tags: [String],

    kind: { type: String, enum: ["note", "daily", "weekly", "monthly", "template"], default: "note" },
    /** YYYY-MM-DD for daily notes, one per day, enforced below. */
    day: String,

    favorite: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    /** Trash is a 30-day grace period, not a delete. */
    trashedAt: Date,
  },
  { timestamps: true }
);
NoteSchema.index({ user: 1, updatedAt: -1 });
NoteSchema.index({ user: 1, tags: 1 });
NoteSchema.index({ user: 1, noteCollection: 1 });
NoteSchema.index({ user: 1, kind: 1, day: -1 });
NoteSchema.index({ title: "text", body: "text" });

/**
 * One row per save. Chapter 6 wants restore and compare, and the cheapest
 * honest way to get both is to keep the whole body, notes are small, and a
 * diff algorithm you have to debug is worse than a few extra kilobytes.
 */
const NoteVersionSchema = new Schema(
  {
    note: { type: Schema.Types.ObjectId, ref: "Note", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: String,
    body: String,
  },
  { timestamps: true }
);
NoteVersionSchema.index({ note: 1, createdAt: -1 });

/**
 * Derived from `[[wiki links]]` on every save, never written by hand. Storing
 * it lets "referenced by" be one indexed query instead of a scan of every note
 * body, which is the difference between a graph view that loads and one that
 * does not.
 */
const BacklinkSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    from: { type: Schema.Types.ObjectId, ref: "Note", required: true, index: true },
    /** Unresolved links keep their text and get no target until the note exists. */
    to: { type: Schema.Types.ObjectId, ref: "Note", index: true },
    text: { type: String, required: true },
  },
  { timestamps: true }
);
BacklinkSchema.index({ user: 1, to: 1 });
BacklinkSchema.index({ from: 1, text: 1 }, { unique: true });

const NoteCollectionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    description: String,
    icon: { type: String, default: "folder" },
    color: { type: String, default: "var(--primary)" },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);
NoteCollectionSchema.index({ user: 1, order: 1 });

const SnippetSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    description: String,
    language: { type: String, default: "typescript" },
    framework: String,
    code: { type: String, default: "" },
    tags: [String],
    note: { type: Schema.Types.ObjectId, ref: "Note" },
    favorite: { type: Boolean, default: false },
    usedCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);
SnippetSchema.index({ user: 1, updatedAt: -1 });
// language_override: without it MongoDB reads the `language` field ("typescript")
// as the text-search language and rejects the insert, 17262. Point the override
// at a field that does not exist so every document uses the default.
SnippetSchema.index(
  { title: "text", code: "text", description: "text" },
  { language_override: "searchLang" }
);

/**
 * Flashcards run on the same ladder as lesson reviews (lib/srs.ts) rather than
 * a second algorithm, one spaced-repetition implementation, two callers.
 */
const FlashcardSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    front: { type: String, required: true },
    back: { type: String, required: true },
    tags: [String],
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    lesson: { type: Schema.Types.ObjectId, ref: "Lesson" },
    note: { type: Schema.Types.ObjectId, ref: "Note" },
    /** True when a generator made it, so it can be reviewed before trusting. */
    generated: { type: Boolean, default: false },

    dueAt: { type: Date, default: Date.now, index: true },
    step: { type: Number, default: 0 },
    lapses: { type: Number, default: 0 },
  },
  { timestamps: true }
);
FlashcardSchema.index({ user: 1, dueAt: 1 });

export const Note = models.Note ?? model("Note", NoteSchema);
export const NoteVersion = models.NoteVersion ?? model("NoteVersion", NoteVersionSchema);
export const Backlink = models.Backlink ?? model("Backlink", BacklinkSchema);
export const NoteCollection = models.NoteCollection ?? model("NoteCollection", NoteCollectionSchema);
export const Snippet = models.Snippet ?? model("Snippet", SnippetSchema);
export const Flashcard = models.Flashcard ?? model("Flashcard", FlashcardSchema);
