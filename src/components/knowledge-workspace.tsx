"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Eye,
  FileText,
  FolderPlus,
  Hash,
  Link2,
  Pencil,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";
import {
  createCollection,
  createNote,
  deleteNote,
  openDailyNote,
  toggleNoteFavorite,
  updateNote,
} from "@/lib/actions";
import type { NoteListItem } from "@/lib/queries";
import { extractLinks } from "@/lib/wikilinks";
import { relativeDate } from "@/lib/utils";
import { WikiMarkdown } from "./wiki-markdown";
import { SearchInput } from "./search-input";
import { EmptyState } from "./ui";

type Collection = { id: string; name: string; icon: string; color: string };
type SortKey = "edited" | "title";

const AUTOSAVE_MS = 3000;

/**
 * Three panes: filters, the note list, the editor. That split is the reason
 * a second brain stays usable past fifty notes — narrowing (collection, tag,
 * text) and reading are separate motions, and collapsing them into one list
 * turns finding a note into scrolling for it.
 */
export function KnowledgeWorkspace({
  notes: initialNotes,
  collections,
  tags,
}: {
  notes: NoteListItem[];
  collections: Collection[];
  tags: { tag: string; count: number }[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const [notes, setNotes] = useState(initialNotes);
  const [activeId, setActiveId] = useState<string | null>(
    params.get("note") ?? initialNotes[0]?.id ?? null,
  );
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [filterCollection, setFilterCollection] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("edited");
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  // Title -> id, so the preview can resolve [[links]] and the editor can hint.
  const titleToId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const n of notes) map[n.title.toLowerCase()] = n.id;
    return map;
  }, [notes]);

  const active = notes.find((n) => n.id === activeId) ?? null;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = notes.filter((n) => {
      if (filterCollection && n.collectionId !== filterCollection) return false;
      if (filterTag && !n.tags.includes(filterTag)) return false;
      if (q && !n.title.toLowerCase().includes(q) && !n.body.toLowerCase().includes(q)) return false;
      return true;
    });
    return list.sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : +new Date(b.updatedAt) - +new Date(a.updatedAt),
    );
  }, [notes, query, filterCollection, filterTag, sort]);

  /* ----------------------------------------------------------- Autosave */

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  const flush = useCallback(
    (snapshot: boolean) => {
      if (!dirty.current || !activeId) return;
      const note = notes.find((n) => n.id === activeId);
      if (!note) return;
      dirty.current = false;
      setSaving(true);
      startTransition(async () => {
        await updateNote(activeId, {
          title: note.title,
          body: note.body,
          tags: note.tags,
          snapshot,
        });
        setSaving(false);
      });
    },
    [activeId, notes],
  );

  // Save every few seconds while editing, and once more on unmount.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => flush(false), AUTOSAVE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [notes, flush]);

  // A version snapshot when leaving the note or the page — coarse enough that
  // history stays readable instead of one row per keystroke burst.
  const switchNote = (id: string | null) => {
    flush(true);
    setActiveId(id);
    setPreview(false);
  };

  useEffect(() => {
    const onLeave = () => flush(true);
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [flush]);

  function patchActive(patch: Partial<NoteListItem>) {
    if (!activeId) return;
    dirty.current = true;
    setNotes((list) =>
      list.map((n) =>
        n.id === activeId ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n,
      ),
    );
  }

  /* ---------------------------------------------------------- Mutations */

  function newNote() {
    startTransition(async () => {
      const { id } = await createNote({
        title: "Untitled note",
        body: "",
        collectionId: filterCollection ?? undefined,
      });
      const fresh: NoteListItem = {
        id,
        title: "Untitled note",
        body: "",
        tags: [],
        kind: "note",
        favorite: false,
        collectionId: filterCollection ?? undefined,
        updatedAt: new Date().toISOString(),
      };
      setNotes((list) => [fresh, ...list]);
      setActiveId(id);
      setPreview(false);
    });
  }

  function daily() {
    startTransition(async () => {
      const { id } = await openDailyNote();
      router.refresh();
      setActiveId(id);
    });
  }

  function remove(id: string) {
    flush(false);
    startTransition(async () => {
      await deleteNote(id);
      setNotes((list) => {
        const rest = list.filter((n) => n.id !== id);
        if (activeId === id) setActiveId(rest[0]?.id ?? null);
        return rest;
      });
    });
  }

  function favorite(id: string) {
    setNotes((list) => list.map((n) => (n.id === id ? { ...n, favorite: !n.favorite } : n)));
    startTransition(() => toggleNoteFavorite(id));
  }

  function addCollection() {
    const name = prompt("Collection name");
    if (!name?.trim()) return;
    startTransition(async () => {
      await createCollection({ name });
      router.refresh();
    });
  }

  const filtering = Boolean(query || filterTag || filterCollection);

  return (
    // Three panes need ~1280px to give the editor a workable measure. Below
    // that the rail turns into a horizontal strip spanning the full width, so
    // the list and the editor keep the room they need on a 1024px laptop.
    <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[196px_248px_minmax(0,1fr)]">
      {/* ============================================================ Rail */}
      <aside className="flex flex-col gap-6 lg:col-span-2 lg:flex-row lg:flex-wrap lg:items-start lg:gap-x-8 xl:col-span-1 xl:flex-col xl:gap-6">
        <div className="flex gap-2 lg:shrink-0 xl:flex-col">
          <button className="btn btn-primary btn-block" onClick={newNote}>
            <Plus size={15} /> New note
          </button>
          <button className="btn btn-secondary btn-block" onClick={daily}>
            <FileText size={15} /> Daily note
          </button>
        </div>

        <div className="min-w-0 lg:flex-1 xl:flex-none">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="overline">Collections</p>
            <button
              onClick={addCollection}
              className="btn-icon btn-icon-sm h-6 w-6"
              aria-label="New collection"
            >
              <FolderPlus size={13} />
            </button>
          </div>
          <ul className="flex flex-wrap gap-0.5 lg:flex-row xl:flex-col">
            <li>
              <FilterButton
                active={!filterCollection && !filterTag}
                onClick={() => {
                  setFilterCollection(null);
                  setFilterTag(null);
                }}
                count={notes.length}
              >
                All notes
              </FilterButton>
            </li>
            {collections.map((c) => (
              <li key={c.id}>
                <FilterButton
                  active={filterCollection === c.id}
                  onClick={() => {
                    setFilterCollection(c.id);
                    setFilterTag(null);
                  }}
                  count={notes.filter((n) => n.collectionId === c.id).length}
                  dot={c.color}
                >
                  {c.name}
                </FilterButton>
              </li>
            ))}
          </ul>
        </div>

        {tags.length > 0 && (
          <div className="min-w-0 lg:flex-1 xl:flex-none">
            <p className="overline mb-2 px-1">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {tags.slice(0, 20).map((t) => {
                const on = filterTag === t.tag;
                return (
                  <button
                    key={t.tag}
                    onClick={() => {
                      setFilterTag(on ? null : t.tag);
                      setFilterCollection(null);
                    }}
                    className={`badge ${on ? "badge-primary" : ""}`}
                    aria-pressed={on}
                  >
                    <Hash size={10} /> {t.tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </aside>

      {/* ======================================================= Note list */}
      <div className="flex min-w-0 flex-col gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search notes" />

        <div className="flex items-center justify-between gap-2 px-0.5">
          <span className="text-meta num">
            {visible.length} {visible.length === 1 ? "note" : "notes"}
          </span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="select h-7 w-auto border-transparent bg-transparent pl-1.5 pr-7 text-[12px]"
            aria-label="Sort notes"
          >
            <option value="edited">Last edited</option>
            <option value="title">Title</option>
          </select>
        </div>

        {visible.length === 0 ? (
          <div className="well px-3 py-6 text-center">
            <p className="text-[13px] font-medium">
              {filtering ? "Nothing matches" : "No notes yet"}
            </p>
            <p className="text-meta mt-1">
              {filtering ? "Try a different filter." : "Your first note starts the graph."}
            </p>
            {filtering ? (
              <button
                className="btn btn-ghost btn-sm mt-3"
                onClick={() => {
                  setQuery("");
                  setFilterTag(null);
                  setFilterCollection(null);
                }}
              >
                Clear filters
              </button>
            ) : (
              <button className="btn btn-secondary btn-sm mt-3" onClick={newNote}>
                <Plus size={14} /> New note
              </button>
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: "62vh" }}>
            {visible.map((n) => {
              const isActive = n.id === activeId;
              return (
                <li key={n.id}>
                  <button
                    onClick={() => switchNote(n.id)}
                    aria-current={isActive ? "true" : undefined}
                    className="w-full rounded-[var(--radius-tile)] px-3 py-2.5 text-left"
                    style={{
                      background: isActive ? "var(--primary-faint)" : "transparent",
                      transition: "background var(--dur-fast) var(--ease)",
                    }}
                  >
                    <span className="flex items-center gap-1.5">
                      {n.favorite && (
                        <Star
                          size={11}
                          className="shrink-0"
                          style={{ color: "var(--warning)", fill: "var(--warning)" }}
                        />
                      )}
                      <span
                        className="min-w-0 flex-1 truncate text-[13.5px] font-medium"
                        style={{ color: isActive ? "var(--primary)" : "var(--text)" }}
                      >
                        {n.title}
                      </span>
                    </span>
                    <span className="mt-1 flex items-baseline justify-between gap-2">
                      <span className="text-meta min-w-0 flex-1 truncate">
                        {n.lessonTitle ? `From ${n.lessonTitle}` : n.body.slice(0, 48) || "Empty"}
                      </span>
                      <span className="text-meta shrink-0 text-[11px]">
                        {relativeDate(n.updatedAt)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ========================================================== Editor */}
      {active ? (
        <Editor
          key={active.id}
          note={active}
          tags={active.tags ?? []}
          titleToId={titleToId}
          preview={preview}
          saving={saving}
          onPatch={patchActive}
          onTogglePreview={() => {
            flush(false);
            setPreview((p) => !p);
          }}
          onFavorite={() => favorite(active.id)}
          onDelete={() => remove(active.id)}
        />
      ) : (
        <EmptyState
          icon={<Link2 size={22} />}
          title="Your second brain"
          body="Write a note, then link to another with [[double brackets]] — the connection shows up on both sides and the graph builds itself. Notes you take inside a lesson land here too."
          action={
            <button className="btn btn-primary" onClick={newNote}>
              <Plus size={15} /> New note
            </button>
          }
          secondary={
            <button className="btn btn-ghost" onClick={daily}>
              <FileText size={15} /> Daily note
            </button>
          }
        />
      )}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
  count,
  dot,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
  dot?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className="flex w-full items-center gap-2 rounded-[var(--radius-control)] px-2.5 py-1.5 text-left text-[13px] lg:w-auto xl:w-full"
      style={{
        background: active ? "var(--primary-faint)" : "transparent",
        color: active ? "var(--primary)" : "var(--text-muted)",
        fontWeight: active ? 600 : 500,
        transition: "background var(--dur-fast) var(--ease)",
      }}
    >
      {dot && (
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: dot }} aria-hidden />
      )}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {count !== undefined && (
        <span className="num text-[11px]" style={{ color: "var(--text-faint)" }}>
          {count}
        </span>
      )}
    </button>
  );
}

function Editor({
  note,
  tags,
  titleToId,
  preview,
  saving,
  onPatch,
  onTogglePreview,
  onFavorite,
  onDelete,
}: {
  note: NoteListItem;
  tags: string[];
  titleToId: Record<string, string>;
  preview: boolean;
  saving: boolean;
  onPatch: (patch: Partial<NoteListItem>) => void;
  onTogglePreview: () => void;
  onFavorite: () => void;
  onDelete: () => void;
}) {
  const [tagDraft, setTagDraft] = useState("");
  const links = extractLinks(note.body);
  const unresolved = links.filter((l) => !titleToId[l.target.toLowerCase()]);

  return (
    <div className="panel flex min-h-[560px] flex-col overflow-hidden">
      {/* --------------------------------------------------------- Toolbar */}
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <input
          className="min-w-0 flex-1 bg-transparent text-[17px] font-semibold tracking-[-0.018em] outline-none"
          value={note.title}
          onChange={(e) => onPatch({ title: e.target.value })}
          aria-label="Note title"
          placeholder="Untitled note"
        />
        <span
          className="shrink-0 text-[11px]"
          style={{ color: saving ? "var(--warning)" : "var(--text-faint)" }}
          aria-live="polite"
        >
          {saving ? "Saving…" : "Saved"}
        </span>
        <button className="btn btn-ghost btn-sm shrink-0" onClick={onTogglePreview}>
          {preview ? <Pencil size={14} /> : <Eye size={14} />}
          {preview ? "Edit" : "Preview"}
        </button>
        <button
          className="btn-icon btn-icon-sm shrink-0"
          style={{ color: note.favorite ? "var(--warning)" : undefined }}
          onClick={onFavorite}
          aria-label={note.favorite ? "Remove from favourites" : "Add to favourites"}
          aria-pressed={note.favorite}
        >
          <Star size={15} style={note.favorite ? { fill: "var(--warning)" } : undefined} />
        </button>
        <button
          className="btn-icon btn-icon-sm shrink-0"
          style={{ color: "var(--danger)" }}
          onClick={onDelete}
          aria-label="Delete note"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* ------------------------------------------------------ Meta strip */}
      <div className="flex flex-wrap items-center gap-1.5 border-b px-4 py-2.5">
        {note.lessonTitle && <span className="badge badge-info">From {note.lessonTitle}</span>}
        {tags.map((t) => (
          <span key={t} className="badge">
            <Hash size={10} /> {t}
            <button
              onClick={() => onPatch({ tags: tags.filter((x) => x !== t) })}
              aria-label={`Remove tag ${t}`}
              className="ml-0.5 opacity-60 transition-opacity hover:opacity-100"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          className="w-24 bg-transparent text-[12px] outline-none"
          value={tagDraft}
          onChange={(e) => setTagDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && tagDraft.trim()) {
              e.preventDefault();
              if (!tags.includes(tagDraft.trim())) onPatch({ tags: [...tags, tagDraft.trim()] });
              setTagDraft("");
            }
          }}
          placeholder="+ Add tag"
          aria-label="Add a tag"
          style={{ color: "var(--text-muted)" }}
        />
      </div>

      {/* ----------------------------------------------------------- Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {preview ? (
          <WikiMarkdown body={note.body || "_Nothing written yet._"} titleToId={titleToId} />
        ) : (
          <textarea
            className="h-full min-h-[380px] w-full resize-none bg-transparent font-[family-name:var(--font-mono)] text-[13px] leading-[1.75] outline-none"
            value={note.body}
            onChange={(e) => onPatch({ body: e.target.value })}
            placeholder="Markdown supported. Link another note with [[its title]]. Autosaves as you type."
            aria-label="Note body"
          />
        )}
      </div>

      {!preview && unresolved.length > 0 && (
        <div className="border-t px-4 py-2.5">
          <p className="text-meta">
            Links to notes that do not exist yet:{" "}
            <span style={{ color: "var(--text-muted)" }}>
              {unresolved.map((l) => l.target).join(", ")}
            </span>
            . Create them and they connect.
          </p>
        </div>
      )}
    </div>
  );
}
