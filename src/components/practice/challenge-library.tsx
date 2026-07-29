"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Binary,
  Bookmark,
  Braces,
  Bug,
  CheckCircle2,
  Clock,
  Database,
  Dumbbell,
  Filter,
  Layout,
  RotateCcw,
  Search,
  Server,
  SlidersHorizontal,
  Target,
  Users,
  X,
  Zap,
} from "lucide-react";
import type { ChallengeCard } from "@/lib/queries/practice";
import { toggleChallengeBookmark } from "@/lib/actions";

/**
 * The challenge library.
 *
 * Filtering happens in the browser over the full set rather than through the
 * URL, because every control here is a *refinement* — you move a difficulty
 * pill, glance at the count, move it back. A round trip per keystroke would
 * make that loop feel like a form submission instead of a dial.
 *
 * Desktop puts the controls in a rail beside the results so the count moves
 * while your hand is still on the filter. On a phone there is no room for a
 * rail, so the same controls live in a sheet behind a button that carries a
 * badge of how many are active — the one thing you cannot see once they are
 * hidden.
 *
 * Every number on a card is a real count. A library nobody has attempted shows
 * no solve rates rather than a fabricated 82%.
 */

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "var(--success)",
  medium: "var(--warning)",
  hard: "var(--danger)",
};

const CATEGORY_ICON: Record<string, React.ComponentType<{ size?: number }>> = {
  algorithms: Binary,
  frontend: Layout,
  backend: Server,
  database: Database,
  debugging: Bug,
  typescript: Braces,
  react: Braces,
};

const SORTS = [
  { key: "newest", label: "Newest first" },
  { key: "difficulty", label: "Easiest first" },
  { key: "xp", label: "Most XP" },
  { key: "title", label: "A–Z" },
] as const;

type SortKey = (typeof SORTS)[number]["key"];
type Status = "all" | "unsolved" | "solved";

const DIFFICULTY_RANK: Record<string, number> = { easy: 0, medium: 1, hard: 2 };

export function ChallengeLibrary({
  challenges,
  streak,
}: {
  challenges: ChallengeCard[];
  streak: number;
}) {
  const [tab, setTab] = useState<"library" | "saved">("library");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [difficulty, setDifficulty] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>("newest");
  const [sheetOpen, setSheetOpen] = useState(false);

  const allTags = useMemo(() => {
    const seen = new Map<string, number>();
    for (const c of challenges) for (const t of c.technology) seen.set(t, (seen.get(t) ?? 0) + 1);
    return [...seen.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
  }, [challenges]);

  const activeCount =
    (query ? 1 : 0) + (status !== "all" ? 1 : 0) + difficulty.length + tags.length;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = challenges.filter((c) => {
      if (tab === "saved" && !c.bookmarked) return false;
      if (status === "solved" && !c.solved) return false;
      if (status === "unsolved" && c.solved) return false;
      if (difficulty.length > 0 && !difficulty.includes(c.difficulty)) return false;
      if (tags.length > 0 && !tags.some((t) => c.technology.includes(t))) return false;
      if (q) {
        const hay = `${c.title} ${c.description} ${c.category} ${c.technology.join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return out.sort((a, b) => {
      if (sort === "difficulty") return DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty];
      if (sort === "xp") return b.xp - a.xp;
      if (sort === "title") return a.title.localeCompare(b.title);
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [challenges, tab, query, status, difficulty, tags, sort]);

  function reset() {
    setQuery("");
    setStatus("all");
    setDifficulty([]);
    setTags([]);
  }

  const filters = (
    <Filters
      query={query}
      setQuery={setQuery}
      status={status}
      setStatus={setStatus}
      difficulty={difficulty}
      setDifficulty={setDifficulty}
      tags={tags}
      setTags={setTags}
      allTags={allTags}
      sort={sort}
      setSort={setSort}
      activeCount={activeCount}
      onReset={reset}
    />
  );

  return (
    <div className="section-stack">
      {/* ------------------------------------------------------------ tabs */}
      <nav className="segmented w-fit" aria-label="Challenge view">
        <button
          className={`segment ${tab === "library" ? "segment-active" : ""}`}
          aria-current={tab === "library" ? "page" : undefined}
          onClick={() => setTab("library")}
        >
          Library
        </button>
        <button
          className={`segment ${tab === "saved" ? "segment-active" : ""}`}
          aria-current={tab === "saved" ? "page" : undefined}
          onClick={() => setTab("saved")}
        >
          Saved
        </button>
      </nav>

      <DailyBanner streak={streak} />

      <div className="grid gap-5 lg:grid-cols-[264px_minmax(0,1fr)] lg:items-start">
        {/* --------------------------------------------------- filter rail */}
        <div className="hidden lg:sticky lg:top-5 lg:block">{filters}</div>

        {/* ------------------------------------------------------- results */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex items-center gap-3">
            <p className="num text-[14px] font-medium">
              {results.length} {results.length === 1 ? "challenge" : "challenges"}
            </p>

            {/* The filter sheet trigger only exists where the rail does not. */}
            <button
              className="btn btn-secondary btn-sm lg:hidden"
              onClick={() => setSheetOpen(true)}
            >
              <Filter size={14} /> Filters
              {activeCount > 0 && (
                <span
                  className="num grid h-4 min-w-4 place-items-center rounded-[var(--radius-pill)] px-1 text-[11px]"
                  style={{ background: "var(--primary)", color: "var(--primary-ink)" }}
                >
                  {activeCount}
                </span>
              )}
            </button>

            <label className="ml-auto flex items-center gap-2">
              <SlidersHorizontal size={14} style={{ color: "var(--text-faint)" }} />
              <span className="sr-only">Sort challenges</span>
              <select
                className="select h-9 text-[13px]"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
              >
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {results.length === 0 ? (
            <Empty tab={tab} activeCount={activeCount} onReset={reset} />
          ) : (
            <ul className="flex flex-col gap-3">
              {results.map((c) => (
                <li key={c.id}>
                  <Row challenge={c} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
          <button
            aria-label="Close filters"
            className="absolute inset-0"
            style={{ background: "color-mix(in srgb, var(--bg) 70%, transparent)" }}
            onClick={() => setSheetOpen(false)}
          />
          <div className="relative max-h-[85vh] overflow-y-auto p-3 pb-5">
            {filters}
            <button className="btn btn-primary btn-block mt-3" onClick={() => setSheetOpen(false)}>
              Show {results.length} {results.length === 1 ? "challenge" : "challenges"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ filters */

function Filters({
  query,
  setQuery,
  status,
  setStatus,
  difficulty,
  setDifficulty,
  tags,
  setTags,
  allTags,
  sort,
  setSort,
  activeCount,
  onReset,
}: {
  query: string;
  setQuery: (v: string) => void;
  status: Status;
  setStatus: (v: Status) => void;
  difficulty: string[];
  setDifficulty: (v: string[]) => void;
  tags: string[];
  setTags: (v: string[]) => void;
  allTags: string[];
  sort: SortKey;
  setSort: (v: SortKey) => void;
  activeCount: number;
  onReset: () => void;
}) {
  function toggle(list: string[], set: (v: string[]) => void, value: string) {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  return (
    <aside className="card flex flex-col gap-5 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="eyebrow">Filter challenges</h2>
        {activeCount > 0 && (
          <button
            className="flex items-center gap-1 text-[12px]"
            style={{ color: "var(--text-faint)" }}
            onClick={onReset}
          >
            <RotateCcw size={11} /> Reset
          </button>
        )}
      </div>

      <div className="search">
        <Search size={15} />
        <input
          className="search-input"
          type="search"
          placeholder="Search challenges…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search challenges"
        />
      </div>

      <Group label="Sort by">
        <select
          className="select w-full"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </Group>

      <Group label="Progress">
        <select
          className="select w-full"
          value={status}
          onChange={(e) => setStatus(e.target.value as Status)}
        >
          <option value="all">All</option>
          <option value="unsolved">Unsolved</option>
          <option value="solved">Solved</option>
        </select>
      </Group>

      <Group label="Difficulty">
        <div className="flex flex-wrap gap-1.5">
          <button
            className={`chip chip-sm ${difficulty.length === 0 ? "chip-on" : ""}`}
            onClick={() => setDifficulty([])}
          >
            All
          </button>
          {DIFFICULTIES.map((d) => {
            const on = difficulty.includes(d);
            return (
              <button
                key={d}
                className={`chip chip-sm capitalize ${on ? "chip-on" : ""}`}
                aria-pressed={on}
                onClick={() => toggle(difficulty, setDifficulty, d)}
                style={{
                  color: DIFFICULTY_COLOR[d],
                  borderColor: `color-mix(in srgb, ${DIFFICULTY_COLOR[d]} ${on ? 60 : 30}%, transparent)`,
                  background: on ? `color-mix(in srgb, ${DIFFICULTY_COLOR[d]} 14%, transparent)` : undefined,
                }}
              >
                {d}
              </button>
            );
          })}
        </div>
      </Group>

      {allTags.length > 0 && (
        <Group label="Tags">
          <div className="flex flex-wrap gap-1.5">
            {allTags.slice(0, 14).map((t) => (
              <button
                key={t}
                className={`chip chip-sm ${tags.includes(t) ? "chip-on" : ""}`}
                aria-pressed={tags.includes(t)}
                onClick={() => toggle(tags, setTags, t)}
              >
                {t}
              </button>
            ))}
          </div>
        </Group>
      )}

      {activeCount > 0 && (
        <button className="btn btn-ghost btn-sm w-full" onClick={onReset}>
          <X size={13} /> Clear filters
        </button>
      )}
    </aside>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="label">{label}</p>
      {children}
    </div>
  );
}

/* --------------------------------------------------------------------- rows */

function Row({ challenge: c }: { challenge: ChallengeCard }) {
  const [saved, setSaved] = useState(c.bookmarked);
  const [, start] = useTransition();
  const Icon = CATEGORY_ICON[c.category] ?? Dumbbell;
  const colour = DIFFICULTY_COLOR[c.difficulty] ?? "var(--text-muted)";

  return (
    <div className="card card-link relative p-4">
      {/* One stretched link over the whole card, so the row is a single target
          and the bookmark button still gets its own hit area above it. */}
      <Link href={`/learning/challenges/${c.id}`} className="absolute inset-0 rounded-[inherit]">
        <span className="sr-only">{c.title}</span>
      </Link>

      <div className="flex items-start gap-3.5">
        <span
          className="icon-tile icon-tile-lg shrink-0"
          style={{
            color: colour,
            background: `color-mix(in srgb, ${colour} 12%, transparent)`,
          }}
        >
          {c.solved ? <CheckCircle2 size={18} /> : <Icon size={18} />}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="chip chip-sm capitalize"
              style={{
                color: colour,
                borderColor: `color-mix(in srgb, ${colour} 35%, transparent)`,
                background: `color-mix(in srgb, ${colour} 10%, transparent)`,
              }}
            >
              {c.difficulty}
            </span>
            <h3 className="min-w-0 text-[15px] font-semibold">{c.title}</h3>
            {c.solved && (
              <span className="flex items-center gap-1 text-[12px]" style={{ color: "var(--success)" }}>
                <CheckCircle2 size={12} /> Solved
              </span>
            )}
          </div>

          {c.description && (
            <p className="text-body mt-1.5 line-clamp-2 text-[13px]">{c.description}</p>
          )}

          <div
            className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px]"
            style={{ color: "var(--text-faint)" }}
          >
            <span className="num flex items-center gap-1.5">
              <Zap size={12} style={{ color: "var(--warning)" }} /> {c.xp} XP
            </span>
            <span className="num flex items-center gap-1.5">
              <Clock size={12} /> ~{c.estimatedMinutes} min
            </span>
            {c.solvedBy > 0 && (
              <span className="num flex items-center gap-1.5">
                <Users size={12} /> {c.solvedBy} solved
              </span>
            )}
            {c.solveRate !== null && (
              <span className="num flex items-center gap-1.5">
                <Target size={12} /> {c.solveRate}%
              </span>
            )}
            {c.attempts > 0 && !c.solved && (
              <span className="num" style={{ color: "var(--warning)" }}>
                {c.attempts} {c.attempts === 1 ? "attempt" : "attempts"}
              </span>
            )}
          </div>

          {c.technology.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {c.technology.slice(0, 4).map((t) => (
                <span key={t} className="chip chip-sm">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          className="btn-icon relative shrink-0"
          aria-label={saved ? "Remove bookmark" : "Bookmark this challenge"}
          aria-pressed={saved}
          onClick={() => {
            setSaved((v) => !v);
            start(() => void toggleChallengeBookmark(c.id));
          }}
        >
          <Bookmark
            size={15}
            style={saved ? { color: "var(--primary)", fill: "var(--primary)" } : undefined}
          />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- pieces */

function DailyBanner({ streak }: { streak: number }) {
  return (
    <Link href="/practice" className="card card-link flex items-center gap-3.5 p-4">
      <span className="icon-tile icon-tile-lg icon-tile-primary">
        <Target size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold">Daily challenge</span>
        <span className="text-meta mt-0.5 block text-[12px]">
          {streak > 0
            ? "Solve today's pick and keep the streak alive."
            : "Solve one today and start a streak."}
        </span>
      </span>
      {streak > 0 && (
        <span className="num shrink-0 text-[13px] font-medium" style={{ color: "var(--warning)" }}>
          {streak}-day streak
        </span>
      )}
    </Link>
  );
}

function Empty({
  tab,
  activeCount,
  onReset,
}: {
  tab: "library" | "saved";
  activeCount: number;
  onReset: () => void;
}) {
  const saved = tab === "saved" && activeCount === 0;
  return (
    <div className="card grid place-items-center gap-2 p-8 text-center">
      <span className="icon-tile icon-tile-lg">
        {saved ? <Bookmark size={18} /> : <Dumbbell size={18} />}
      </span>
      <p className="text-[14px] font-medium">
        {saved ? "Nothing saved yet" : "No challenges match"}
      </p>
      <p className="text-body max-w-sm text-[13px]">
        {saved
          ? "Bookmark a challenge from its page and it waits for you here."
          : "Loosen a filter, or clear them all and start again."}
      </p>
      {activeCount > 0 && (
        <button className="btn btn-secondary btn-sm mt-1" onClick={onReset}>
          Clear filters
        </button>
      )}
    </div>
  );
}
