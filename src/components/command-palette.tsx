"use client";

import { COMMUNITY_LINKS, isExternal } from "@/lib/community-links";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Braces,
  Briefcase,
  Calendar,
  CornerDownLeft,
  Dumbbell,
  MessagesSquare,
  FolderKanban,
  Layers,
  NotebookPen,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { SearchHit } from "@/lib/queries";

/**
 * The global command palette, ⌘K / Ctrl+K. Two jobs: jump to any page, and
 * search the user's own content (lessons, notes, projects, challenges,
 * snippets) through /api/search.
 *
 * Keyboard-first, and genuinely so: arrows move, enter opens, escape closes,
 * and the highlighted row scrolls itself into view as you travel past the
 * fold. Results are grouped, because fifteen undifferentiated rows are not a
 * search result, they are a haystack.
 *
 * Mounted once in the app shell, so it is available on every route.
 */

type Page = { label: string; href: string; icon: LucideIcon; keywords: string };

const PAGES: Page[] = [
  { label: "Home", href: "/dashboard", icon: BarChart3, keywords: "dashboard overview today" },
  { label: "Learn Overview", href: "/learning", icon: BookOpen, keywords: "continue learning current lessons" },
  { label: "Learning Paths", href: "/learning/roadmap", icon: BookOpen, keywords: "roadmap path curriculum" },
  { label: "Course Library", href: "/learning/courses", icon: BookOpen, keywords: "courses catalog explore" },
  { label: "Skill Challenges", href: "/learning/challenges", icon: Dumbbell, keywords: "learning challenges tests" },
  { label: "Project Briefs", href: "/learning/projects", icon: FolderKanban, keywords: "learning projects briefs build" },
  { label: "Practice Overview", href: "/practice", icon: Dumbbell, keywords: "practice drills exercises" },
  { label: "Coding Exercises", href: "/practice/challenges", icon: Dumbbell, keywords: "code problems challenges" },
  { label: "Review Queue", href: "/review", icon: RotateCcw, keywords: "spaced repetition due srs" },
  { label: "Projects", href: "/projects", icon: FolderKanban, keywords: "build kanban ship" },
  { label: "Discover Projects", href: "/projects/discover", icon: FolderKanban, keywords: "collaborate contribute join team open source" },
  { label: "Calendar", href: "/calendar", icon: Calendar, keywords: "schedule events agenda" },
  { label: "Community", href: "/community", icon: MessagesSquare, keywords: "people groups social" },
  { label: "Discussions", href: COMMUNITY_LINKS.discussions, icon: MessagesSquare, keywords: "community forum posts ask question help github" },
  { label: "Chat", href: COMMUNITY_LINKS.discord, icon: MessagesSquare, keywords: "community rooms messages talk discord" },
  { label: "Progress", href: "/analytics", icon: BarChart3, keywords: "stats analytics goals habits focus" },
  { label: "Achievements", href: "/analytics/achievements", icon: BarChart3, keywords: "badges proof progress" },
  { label: "Career", href: "/career", icon: Briefcase, keywords: "resume portfolio jobs ats certificates" },
  { label: "Resources", href: "/resources", icon: NotebookPen, keywords: "library reading resources" },
  { label: "Knowledge Base", href: "/notes", icon: NotebookPen, keywords: "notes second brain wiki" },
  { label: "Snippets", href: "/notes/snippets", icon: Braces, keywords: "code vault reusable" },
  { label: "Flashcards", href: "/notes/flashcards", icon: Layers, keywords: "cards memorise" },
  { label: "AI Tutor", href: "/ai", icon: Sparkles, keywords: "chat assistant tutor explain" },
  { label: "Settings", href: "/settings", icon: Settings, keywords: "profile preferences theme" },
];

const TYPE_ICON: Record<string, LucideIcon> = {
  Lesson: BookOpen,
  Note: NotebookPen,
  Project: FolderKanban,
  Challenge: Dumbbell,
  Snippet: Braces,
};

type Row =
  | { kind: "page"; label: string; href: string; icon: LucideIcon }
  | { kind: "hit"; hit: SearchHit };

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Global shortcut, plus a window event so the topbar button can open it too.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", onOpen);
    };
  }, []);

  // Reset on open, and stop the page behind from scrolling under the dialog.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHits([]);
    setIndex(0);
    const t = setTimeout(() => inputRef.current?.focus(), 20);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Debounced content search, with the in-flight request aborted when the
  // query moves on, otherwise a slow early response can overwrite a fast late
  // one and the list flickers back to stale results.
  useEffect(() => {
    if (query.trim().length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setHits(data.hits ?? []);
        setIndex(0);
      } catch {
        /* aborted or offline, leave the previous results in place */
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query]);

  const pageMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PAGES.slice(0, 6);
    return PAGES.filter((p) => (p.label + " " + p.keywords).toLowerCase().includes(q)).slice(0, 6);
  }, [query]);

  const rows: Row[] = useMemo(
    () => [
      ...pageMatches.map((p) => ({
        kind: "page" as const,
        label: p.label,
        href: p.href,
        icon: p.icon,
      })),
      ...hits.map((h) => ({ kind: "hit" as const, hit: h })),
    ],
    [pageMatches, hits],
  );

  // Keep the highlighted row visible while arrowing through a long list.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-row="${index}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [index]);

  function go(row: Row) {
    setOpen(false);
    const href = row.kind === "page" ? row.href : row.hit.href;
    // Discord and GitHub are not routes. Pushing them through the App Router
    // would 404 before the browser ever got a chance to leave.
    if (isExternal(href)) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => (rows.length ? (i + 1) % rows.length : 0));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => (rows.length ? (i - 1 + rows.length) % rows.length : 0));
    }
    if (e.key === "Enter" && rows[index]) {
      e.preventDefault();
      go(rows[index]);
    }
  }

  if (!open) return null;

  const firstHitIndex = pageMatches.length;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[10vh]"
      style={{ background: "rgb(4 5 8 / 0.62)", backdropFilter: "blur(3px)" }}
      onClick={() => setOpen(false)}
      role="presentation"
    >
      <div
        className="glass-strong scale-in w-full max-w-[560px] overflow-hidden"
        style={{ borderRadius: "var(--radius-dialog)", boxShadow: "var(--shadow-xl)" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        {/* --------------------------------------------------------- Input */}
        <div
          className="flex items-center gap-3 border-b px-4"
          style={{ borderColor: "var(--border)" }}
        >
          <Search size={16} className="shrink-0" style={{ color: "var(--text-faint)" }} />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent py-3.5 text-ui outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search lessons, notes, projects, or jump to a page"
            aria-label="Search"
            aria-controls="palette-results"
          />
          {loading && (
            <span
              className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-transparent"
              style={{
                borderTopColor: "var(--primary)",
                borderRightColor: "var(--primary)",
                animation: "spin 700ms linear infinite",
              }}
              aria-hidden
            />
          )}
        </div>

        {/* ------------------------------------------------------- Results */}
        <div ref={listRef} id="palette-results" className="max-h-[52vh] overflow-y-auto p-2">
          {rows.length === 0 ? (
            <div className="px-3 py-10 text-center">
              <p className="text-ui font-medium">
                {query.trim().length >= 2 ? `Nothing matches “${query.trim()}”` : "Start typing"}
              </p>
              <p className="text-meta mt-1">
                {query.trim().length >= 2
                  ? "Try a shorter term, or the name of a page."
                  : "Search your lessons, notes, projects and snippets."}
              </p>
            </div>
          ) : (
            <>
              {pageMatches.length > 0 && <GroupLabel>Go to</GroupLabel>}
              {rows.map((row, i) => {
                const Icon = row.kind === "page" ? row.icon : (TYPE_ICON[row.hit.type] ?? Search);
                const label = row.kind === "page" ? row.label : row.hit.title;
                const active = i === index;
                return (
                  <div key={i}>
                    {i === firstHitIndex && hits.length > 0 && (
                      <GroupLabel>Your workspace</GroupLabel>
                    )}
                    <button
                      data-row={i}
                      onMouseMove={() => setIndex(i)}
                      onClick={() => go(row)}
                      className="flex w-full items-center gap-3 rounded-[var(--radius-control)] px-2.5 py-2 text-left"
                      style={{
                        background: active ? "var(--primary-faint)" : "transparent",
                        transition: "background var(--dur-fast) var(--ease)",
                      }}
                    >
                      <span
                        className="icon-tile h-7 w-7 rounded-[var(--radius-tile)]"
                        style={{
                          background: active ? "var(--primary-soft)" : "var(--surface-2)",
                          color: active ? "var(--primary)" : "var(--text-faint)",
                        }}
                      >
                        <Icon size={14} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-ui">{label}</span>
                      {row.kind === "hit" && <span className="badge shrink-0">{row.hit.type}</span>}
                      {active && (
                        <CornerDownLeft
                          size={13}
                          className="shrink-0"
                          style={{ color: "var(--primary)" }}
                        />
                      )}
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* -------------------------------------------------------- Footer */}
        <div
          className="flex items-center gap-4 border-t px-4 py-2.5 text-micro"
          style={{ borderColor: "var(--border)", color: "var(--text-faint)" }}
        >
          <span className="flex items-center gap-1.5">
            <kbd>↑</kbd>
            <kbd>↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1.5">
            <kbd>↵</kbd> open
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <kbd>esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <p className="group-heading px-2.5 pb-1.5 pt-2">{children}</p>;
}
