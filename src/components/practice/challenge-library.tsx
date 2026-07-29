"use client";

import { useEffect, useState, useTransition } from "react";
import Link, { useLinkStatus } from "next/link";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  Filter,
  Loader2,
  Search,
  Target,
  Users,
  X,
  Zap,
} from "lucide-react";
import type { ChallengeCard, ChallengePage } from "@/lib/queries/practice";
import { toggleChallengeBookmark } from "@/lib/actions";
import { ActionButton } from "@/components/action-button";

/**
 * The challenge library.
 *
 * Filtering, sorting and paging all live in the URL and run in the database.
 * The first version filtered in the browser over the whole catalogue, which was
 * instant on twelve challenges and unusable on a real library — every prompt in
 * the collection crossed the wire before the first row painted.
 *
 * The trade is that a filter now costs a round trip. That is paid for by the
 * URL being shareable, the back button working, and the page opening in constant
 * time no matter how large the library grows. The search box debounces so typing
 * costs one request, not one per keystroke.
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

/** Codewars-style language marks. Colour is the language's own, used only in
    this one pill — everywhere else the accent stays the accent. */
const LANGUAGE_META: Record<string, { label: string; colour: string }> = {
  javascript: { label: "JS", colour: "#f7df1e" },
  typescript: { label: "TS", colour: "#3178c6" },
  python: { label: "PY", colour: "#3776ab" },
  go: { label: "GO", colour: "#00add8" },
  rust: { label: "RS", colour: "#dea584" },
  java: { label: "JV", colour: "#e76f00" },
};

const SORTS = [
  { key: "newest", label: "Newest first" },
  { key: "difficulty", label: "Easiest first" },
  { key: "xp", label: "Most XP" },
  { key: "title", label: "A–Z" },
] as const;

const STATUSES = [
  { key: "all", label: "All" },
  { key: "unsolved", label: "Unsolved" },
  { key: "solved", label: "Solved" },
  { key: "saved", label: "Saved" },
] as const;

export type LibraryParams = {
  q: string;
  difficulty: string[];
  tag: string;
  status: string;
  sort: string;
  page: number;
};

export type LibraryProgress = { solved: number; total: number; accuracy: number };

export function ChallengeLibrary({
  data,
  params,
  basePath,
  streak,
  progress,
}: {
  data: ChallengePage;
  params: LibraryParams;
  basePath: string;
  streak: number;
  progress?: LibraryProgress;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [query, setQuery] = useState(params.q);
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeCount =
    (params.q ? 1 : 0) +
    (params.status !== "all" ? 1 : 0) +
    params.difficulty.length +
    (params.tag ? 1 : 0);

  /** Writes the next state into the URL. Any change resets to page 1 — staying
      on page 7 of a result set that just shrank to two pages is a dead end. */
  function apply(next: Partial<LibraryParams>) {
    const merged = { ...params, page: 1, ...next };
    const sp = new URLSearchParams();
    if (merged.q) sp.set("q", merged.q);
    if (merged.difficulty.length) sp.set("difficulty", merged.difficulty.join(","));
    if (merged.tag) sp.set("tag", merged.tag);
    if (merged.status !== "all") sp.set("status", merged.status);
    if (merged.sort !== "newest") sp.set("sort", merged.sort);
    if (merged.page > 1) sp.set("page", String(merged.page));
    const qs = sp.toString();
    start(() => router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false }));
  }

  // Debounced search. 300ms is long enough that ordinary typing produces one
  // request and short enough that it still feels like the box is live.
  useEffect(() => {
    if (query === params.q) return;
    const t = setTimeout(() => apply({ q: query }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function reset() {
    setQuery("");
    start(() => router.push(basePath, { scroll: false }));
  }

  const pages = Math.max(1, Math.ceil(data.total / data.perPage));

  const filters = (
    <Filters
      query={query}
      setQuery={setQuery}
      params={params}
      tags={data.tags}
      apply={apply}
      activeCount={activeCount}
      onReset={reset}
    />
  );

  return (
    <div className="section-stack">
      <DailyBanner streak={streak} />

      <div className="grid gap-5 lg:grid-cols-[248px_minmax(0,1fr)] lg:items-start">
        <div className="hidden lg:sticky lg:top-5 lg:flex lg:flex-col lg:gap-4">
          {filters}
          {progress && <ProgressCard {...progress} />}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex items-center gap-3">
            <p className="num text-[13px]" style={{ color: "var(--text-muted)" }}>
              {pending ? "Loading…" : `${data.total} ${data.total === 1 ? "challenge" : "challenges"}`}
            </p>

            <button className="btn btn-secondary btn-sm lg:hidden" onClick={() => setSheetOpen(true)}>
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

            <label className="ml-auto">
              <span className="sr-only">Sort challenges</span>
              <select
                className="select h-8 text-[13px]"
                value={params.sort}
                onChange={(e) => apply({ sort: e.target.value })}
              >
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {data.items.length === 0 ? (
            <Empty status={params.status} activeCount={activeCount} onReset={reset} />
          ) : (
            /* A list of rows on one surface, not a stack of floating cards.
               Dividers separate them; only hover gives a row its own background. */
            <ul
              className="card overflow-hidden"
              style={{ opacity: pending ? 0.6 : 1, transition: "opacity 130ms" }}
            >
              {data.items.map((c, i) => (
                <li
                  key={c.id}
                  className={i > 0 ? "border-t" : ""}
                  style={i > 0 ? { borderColor: "var(--border-faint)" } : undefined}
                >
                  <Row challenge={c} />
                </li>
              ))}
            </ul>
          )}

          {pages > 1 && (
            <nav className="flex items-center justify-between gap-3" aria-label="Pagination">
              <button
                className="btn btn-secondary btn-sm"
                disabled={params.page <= 1 || pending}
                onClick={() => apply({ page: params.page - 1 })}
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <span className="num text-[13px]" style={{ color: "var(--text-faint)" }}>
                Page {params.page} of {pages}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={params.page >= pages || pending}
                onClick={() => apply({ page: params.page + 1 })}
              >
                Next <ChevronRight size={14} />
              </button>
            </nav>
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
              Show {data.total} {data.total === 1 ? "challenge" : "challenges"}
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
  params,
  tags,
  apply,
  activeCount,
  onReset,
}: {
  query: string;
  setQuery: (v: string) => void;
  params: LibraryParams;
  tags: string[];
  apply: (next: Partial<LibraryParams>) => void;
  activeCount: number;
  onReset: () => void;
}) {
  return (
    <aside className="card flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="eyebrow">Filter</h2>
        {activeCount > 0 && (
          <button className="text-[12px]" style={{ color: "var(--primary)" }} onClick={onReset}>
            Reset
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

      <Group label="Progress">
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => (
            <button
              key={s.key}
              className={`chip chip-sm ${params.status === s.key ? "chip-on" : ""}`}
              aria-pressed={params.status === s.key}
              onClick={() => apply({ status: s.key })}
            >
              {s.label}
            </button>
          ))}
        </div>
      </Group>

      <Group label="Difficulty">
        <div className="flex flex-wrap gap-1.5">
          <button
            className={`chip chip-sm ${params.difficulty.length === 0 ? "chip-on" : ""}`}
            onClick={() => apply({ difficulty: [] })}
          >
            Any
          </button>
          {DIFFICULTIES.map((d) => {
            const on = params.difficulty.includes(d);
            return (
              <button
                key={d}
                className={`chip chip-sm capitalize ${on ? "chip-on" : ""}`}
                aria-pressed={on}
                onClick={() =>
                  apply({
                    difficulty: on
                      ? params.difficulty.filter((v) => v !== d)
                      : [...params.difficulty, d],
                  })
                }
                style={{
                  color: DIFFICULTY_COLOR[d],
                  borderColor: `color-mix(in srgb, ${DIFFICULTY_COLOR[d]} ${on ? 55 : 28}%, transparent)`,
                  background: on
                    ? `color-mix(in srgb, ${DIFFICULTY_COLOR[d]} 12%, transparent)`
                    : undefined,
                }}
              >
                {d}
              </button>
            );
          })}
        </div>
      </Group>

      {tags.length > 0 && (
        <Group label="Technology">
          <div className="flex flex-wrap gap-1.5">
            {tags.slice(0, 16).map((t) => (
              <button
                key={t}
                className={`chip chip-sm ${params.tag === t ? "chip-on" : ""}`}
                aria-pressed={params.tag === t}
                onClick={() => apply({ tag: params.tag === t ? "" : t })}
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
  const colour = DIFFICULTY_COLOR[c.difficulty] ?? "var(--text-muted)";

  return (
    <div className="row-link relative flex items-start gap-3 px-4 py-3.5">
      <Link href={`/learning/challenges/${c.id}`} className="absolute inset-0">
        <span className="sr-only">{c.title}</span>
        <Opening />
      </Link>

      {/* A 3px difficulty rule instead of a coloured tile: it grades the row
          without adding another box inside a box. */}
      <span
        className="mt-0.5 h-9 w-[3px] shrink-0 rounded-full"
        style={{ background: colour }}
        aria-hidden
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {c.solved && (
            <CheckCircle2 size={13} className="shrink-0" style={{ color: "var(--success)" }} />
          )}
          <h3 className="min-w-0 text-[14px] font-medium">{c.title}</h3>
          <span className="text-[12px] capitalize" style={{ color: colour }}>
            {c.difficulty}
          </span>
        </div>

        {c.description && (
          <p className="mt-1 line-clamp-1 text-[13px]" style={{ color: "var(--text-muted)" }}>
            {c.description}
          </p>
        )}

        <div
          className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[12px]"
          style={{ color: "var(--text-faint)" }}
        >
          <LanguageMarks challenge={c} />
          <span className="num flex items-center gap-1">
            <Zap size={11} style={{ color: "var(--warning)" }} /> {c.xp}
          </span>
          <span className="num flex items-center gap-1">
            <Clock size={11} /> {c.estimatedMinutes}m
          </span>
          {c.solvedBy > 0 && (
            <span className="num flex items-center gap-1">
              <Users size={11} /> {c.solvedBy}
            </span>
          )}
          {c.solveRate !== null && (
            <span className="num flex items-center gap-1">
              <Target size={11} /> {c.solveRate}%
            </span>
          )}
          {c.technology.slice(0, 2).map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </div>

      <button
        className="btn-icon-sm relative shrink-0"
        aria-label={saved ? "Remove bookmark" : "Bookmark this challenge"}
        aria-pressed={saved}
        onClick={() => {
          setSaved((v) => !v);
          start(() => void toggleChallengeBookmark(c.id));
        }}
      >
        <Bookmark
          size={14}
          style={saved ? { color: "var(--primary)", fill: "var(--primary)" } : undefined}
        />
      </button>
    </div>
  );
}

/**
 * The languages a challenge can be solved in. Codewars puts these on every row
 * because it is the first thing you filter on mentally — there is no point
 * opening a Rust kata if you are here to practise TypeScript.
 */
function LanguageMarks({ challenge }: { challenge: ChallengeCard }) {
  const langs = new Set<string>([challenge.language]);
  for (const t of challenge.technology) {
    const key = t.toLowerCase();
    if (LANGUAGE_META[key]) langs.add(key);
  }

  return (
    <span className="flex items-center gap-1">
      {[...langs].map((l) => {
        const meta = LANGUAGE_META[l] ?? { label: l.slice(0, 2).toUpperCase(), colour: "var(--text-faint)" };
        return (
          <span
            key={l}
            title={l}
            className="num grid h-[18px] min-w-[24px] place-items-center rounded-[4px] px-1 text-[10px] font-bold tracking-wide"
            style={{
              color: meta.colour,
              background: `color-mix(in srgb, ${meta.colour} 14%, transparent)`,
            }}
          >
            {meta.label}
          </span>
        );
      })}
    </span>
  );
}

function Opening() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      className="absolute inset-0 grid place-items-center"
      style={{ background: "color-mix(in srgb, var(--bg) 55%, transparent)" }}
    >
      <Loader2 size={16} className="animate-spin" style={{ color: "var(--primary)" }} />
    </span>
  );
}

/* ------------------------------------------------------------------- pieces */

function ProgressCard({ solved, total, accuracy }: LibraryProgress) {
  const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
  const r = 38;
  const circumference = 2 * Math.PI * r;

  return (
    <section className="card flex flex-col items-center gap-3 p-4">
      <h2 className="eyebrow self-start">Your progress</h2>
      <div className="relative grid place-items-center">
        <svg width={96} height={96} viewBox="0 0 96 96" className="-rotate-90">
          <circle cx="48" cy="48" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="7" />
          <circle
            cx="48"
            cy="48"
            r={r}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct / 100)}
          />
        </svg>
        <span className="num absolute text-[19px] font-bold">{pct}%</span>
      </div>
      <p className="text-meta text-center text-[12px]">
        {solved} of {total} solved
        {accuracy > 0 && ` · ${accuracy}% accuracy`}
      </p>
    </section>
  );
}

function DailyBanner({ streak }: { streak: number }) {
  return (
    <Link
      href="/practice"
      className="card card-link flex items-center gap-3 px-4 py-3"
      aria-label="Daily challenge"
    >
      <Target size={16} style={{ color: "var(--primary)" }} className="shrink-0" />
      <span className="min-w-0 flex-1 text-[13px]">
        <span className="font-medium">Daily challenge</span>
        <span className="ml-2" style={{ color: "var(--text-faint)" }}>
          {streak > 0 ? "Keep the streak alive." : "Solve one today and start a streak."}
        </span>
      </span>
      {streak > 0 && (
        <span className="num shrink-0 text-[13px] font-medium" style={{ color: "var(--warning)" }}>
          {streak}d
        </span>
      )}
    </Link>
  );
}

function Empty({
  status,
  activeCount,
  onReset,
}: {
  status: string;
  activeCount: number;
  onReset: () => void;
}) {
  const saved = status === "saved" && activeCount === 1;
  return (
    <div className="card grid place-items-center gap-2 p-8 text-center">
      <span className="icon-tile icon-tile-lg">
        {saved ? <Bookmark size={18} /> : <Dumbbell size={18} />}
      </span>
      <p className="text-[14px] font-medium">{saved ? "Nothing saved yet" : "No challenges match"}</p>
      <p className="text-body max-w-sm text-[13px]">
        {saved
          ? "Bookmark a challenge from its page and it waits for you here."
          : "Loosen a filter, or clear them all and start again."}
      </p>
      {activeCount > 0 && (
        <ActionButton className="btn btn-secondary btn-sm mt-1" onClick={onReset}>
          Clear filters
        </ActionButton>
      )}
    </div>
  );
}
