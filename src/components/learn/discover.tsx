"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Award,
  BookOpen,
  ClipboardList,
  FolderGit2,
  Route,
  Search,
} from "lucide-react";
import { DISCOVER, type DiscoverItem, type DiscoverKind } from "@/lib/learn-content";

/**
 * Discover: one search bar over the whole library. As you type, the results
 * re-group into their five kinds, Courses, Projects, Roadmaps, Certifications,
 * Assessments, matching the reference where searching "Docker" surfaces one of
 * each. Empty query shows a curated default so the section is never blank.
 */

const KINDS: { kind: DiscoverKind; plural: string; icon: React.ReactNode; accent: string }[] = [
  { kind: "Course", plural: "Courses", icon: <BookOpen size={13} />, accent: "var(--info)" },
  { kind: "Project", plural: "Projects", icon: <FolderGit2 size={13} />, accent: "var(--primary)" },
  { kind: "Roadmap", plural: "Roadmaps", icon: <Route size={13} />, accent: "var(--success)" },
  { kind: "Certification", plural: "Certifications", icon: <Award size={13} />, accent: "var(--warning)" },
  { kind: "Assessment", plural: "Assessments", icon: <ClipboardList size={13} />, accent: "var(--danger)" },
];

const TABS: (DiscoverKind | "All")[] = ["All", "Course", "Project", "Roadmap", "Certification", "Assessment"];

function matches(item: DiscoverItem, q: string) {
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

  // The hero search seeds this section via a custom event, so the two search
  // affordances stay in sync without hoisting state through the whole page.
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

  const groups = useMemo(() => {
    const hits = DISCOVER.filter((i) => matches(i, query.trim()));
    return KINDS.map((k) => ({
      ...k,
      items: hits.filter((i) => i.kind === k.kind).slice(0, 4),
    })).filter((g) => g.items.length > 0);
  }, [query]);

  const visibleGroups = tab === "All" ? groups : groups.filter((g) => g.kind === tab);
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <section className="panel overflow-hidden">
      <div className="border-b p-4 sm:p-5" style={{ borderColor: "var(--border)" }}>
        <label className="search h-11">
          <Search size={16} style={{ color: "var(--text-faint)" }} />
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
        <div className="grid gap-px sm:grid-cols-2 xl:grid-cols-4" style={{ background: "var(--border)" }}>
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
                    <button className="row-link flex w-full items-center gap-3 p-2 text-left">
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
                    </button>
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
