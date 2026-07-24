"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Award,
  BookOpen,
  ClipboardList,
  FolderGit2,
  Loader2,
  Route,
  Search,
} from "lucide-react";
import { DISCOVER_FALLBACK, type DiscoverItem, type DiscoverKind } from "@/lib/learn-content";

/**
 * Discover: one search bar over everything you can learn or build.
 *
 * It calls the real universal search (/api/search) for lessons, projects,
 * notes, challenges and snippets you actually have, then fills any thin columns
 * with the curated fallback index so a fresh account still sees a useful result
 * for common terms. Real hits always take precedence and always link to the
 * real route. Results re-group live into the five kinds as you type.
 */

const KINDS: { kind: DiscoverKind; plural: string; icon: React.ReactNode; accent: string }[] = [
  { kind: "Course", plural: "Courses", icon: <BookOpen size={13} />, accent: "var(--info)" },
  { kind: "Project", plural: "Projects", icon: <FolderGit2 size={13} />, accent: "var(--primary)" },
  { kind: "Roadmap", plural: "Roadmaps", icon: <Route size={13} />, accent: "var(--success)" },
  { kind: "Certification", plural: "Certifications", icon: <Award size={13} />, accent: "var(--warning)" },
  { kind: "Assessment", plural: "Assessments", icon: <ClipboardList size={13} />, accent: "var(--danger)" },
];

const TABS: (DiscoverKind | "All")[] = [
  "All",
  "Course",
  "Project",
  "Roadmap",
  "Certification",
  "Assessment",
];

type SearchHit = { type: string; id: string; title: string; subtitle?: string; href: string };

/** Map a universal-search hit's type to a Discover column. */
function kindFor(type: string): DiscoverKind {
  switch (type) {
    case "Lesson":
      return "Course";
    case "Challenge":
      return "Assessment";
    case "Project":
    case "Snippet":
    case "Note":
      return "Project";
    default:
      return "Course";
  }
}

function matchesFallback(item: DiscoverItem, q: string) {
  if (!q) return true;
  const hay = `${item.title} ${item.tags.join(" ")} ${item.level}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .every((term) => hay.includes(term));
}

export function Discover() {
  const [query, setQuery] = useState("Docker");
  const [tab, setTab] = useState<DiscoverKind | "All">("All");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Seed from the hero search.
  useEffect(() => {
    function onSearch(e: Event) {
      const term = (e as CustomEvent<string>).detail;
      if (typeof term === "string") {
        setQuery(term);
        setTab("All");
      }
    }
    window.addEventListener("discover-search", onSearch);
    return () => window.removeEventListener("discover-search", onSearch);
  }, []);

  // Debounced call to the real search endpoint.
  useEffect(() => {
    const term = query.trim();
    if (debounce.current) clearTimeout(debounce.current);
    if (term.length < 2) {
      setHits([]);
      return;
    }
    setLoading(true);
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
        const data = (await res.json()) as { hits?: SearchHit[] };
        setHits(data.hits ?? []);
      } catch {
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  // Build the five columns: real hits first, topped up from the fallback index
  // so no common term ever returns an empty section on a fresh account.
  const groups = useMemo(() => {
    const term = query.trim();
    const realByKind = new Map<DiscoverKind, DiscoverItem[]>();
    for (const h of hits) {
      const kind = kindFor(h.type);
      const list = realByKind.get(kind) ?? [];
      list.push({ title: h.title, kind, level: h.subtitle || h.type, href: h.href, tags: [] });
      realByKind.set(kind, list);
    }

    const fallback = DISCOVER_FALLBACK.filter((i) => matchesFallback(i, term));

    return KINDS.map((k) => {
      const real = realByKind.get(k.kind) ?? [];
      const seen = new Set(real.map((r) => r.title.toLowerCase()));
      const filler = fallback
        .filter((f) => f.kind === k.kind && !seen.has(f.title.toLowerCase()))
        .slice(0, Math.max(0, 4 - real.length));
      return { ...k, items: [...real, ...filler].slice(0, 4), realCount: real.length };
    }).filter((g) => g.items.length > 0);
  }, [hits, query]);

  const visibleGroups = tab === "All" ? groups : groups.filter((g) => g.kind === tab);
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <section className="panel overflow-hidden">
      <div className="border-b p-4 sm:p-5" style={{ borderColor: "var(--border)" }}>
        <label className="search h-11">
          {loading ? (
            <Loader2 size={16} className="animate-spin" style={{ color: "var(--text-faint)" }} />
          ) : (
            <Search size={16} style={{ color: "var(--text-faint)" }} />
          )}
          <input
            className="search-input text-[14.5px]"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses, projects, roadmaps, certifications…"
            aria-label="Search the library"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-[12px] font-medium"
              style={{ color: "var(--text-faint)" }}
            >
              Clear
            </button>
          )}
        </label>

        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              aria-pressed={tab === t}
              className={`chip chip-sm shrink-0 ${tab === t ? "chip-on" : ""}`}
            >
              {t === "All" ? "All" : KINDS.find((k) => k.kind === t)?.plural}
            </button>
          ))}
        </div>
      </div>

      {total === 0 ? (
        <div className="px-5 py-14 text-center">
          <span className="icon-tile icon-tile-lg mx-auto">
            <Search size={20} />
          </span>
          <p className="mt-3 text-[15px] font-semibold">Nothing matches “{query}”</p>
          <p className="text-body mt-1 text-[13px]">
            Try a broader term like “Python”, “AI”, “Docker” or “Security”.
          </p>
        </div>
      ) : (
        <div
          className="grid gap-px sm:grid-cols-2 xl:grid-cols-4"
          style={{ background: "var(--border)" }}
        >
          {visibleGroups.map((g) => (
            <div key={g.kind} className="p-4 sm:p-5" style={{ background: "var(--surface)" }}>
              <div className="mb-3 flex items-center justify-between">
                <span
                  className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.06em]"
                  style={{ color: g.accent }}
                >
                  {g.icon} {g.plural}
                </span>
                <span className="text-meta text-[11px]">{g.items.length}</span>
              </div>
              <ul className="flex flex-col gap-1">
                {g.items.map((item) => (
                  <li key={`${item.kind}-${item.title}`}>
                    <Link
                      href={item.href}
                      className="row-link flex w-full items-center gap-3 p-2 text-left"
                    >
                      <span
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-tile)]"
                        style={{
                          background: `color-mix(in srgb, ${g.accent} 14%, transparent)`,
                          color: g.accent,
                        }}
                      >
                        {g.icon}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium">{item.title}</span>
                        <span className="text-meta block truncate text-[11.5px]">{item.level}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
