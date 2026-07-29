"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  Check,
  ChevronDown,
  Clock,
  Lightbulb,
  Lock,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
  Send,
  Terminal,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { runCode, saveDraft, submitCode, toggleChallengeBookmark } from "@/lib/actions";
import type { RunOutcome, TestResult } from "@/lib/runner";

export type ChallengeData = {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  technology: string[];
  prompt: string;
  language: string;
  starterCode: string;
  hints: string[];
  xp: number;
  estimatedMinutes: number;
  visibleTests: { call: string; expected: string; label?: string }[];
  hiddenCount: number;
  solved: boolean;
  lastCode?: string;
  bookmarked: boolean;
  attempts: number;
  stats: {
    attemptedBy: number;
    solvedBy: number;
    solveRate: number | null;
    acceptance: number | null;
  };
};

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "var(--success)",
  medium: "var(--warning)",
  hard: "var(--danger)",
};

/**
 * The challenge workspace.
 *
 * Two columns on desktop: the work on the left (problem, editor, testcases),
 * the reference on the right (examples, hints, stats). The split is by *role*,
 * not by size — everything you type into is on one side, everything you read
 * from is on the other, so your eye never has to cross the page mid-thought.
 *
 * On phones it collapses to one column in that same order, and the Run/Submit
 * bar sticks to the bottom of the viewport, because with the keyboard open the
 * buttons would otherwise be a scroll away from the code you just wrote.
 *
 * The editor is a good textarea with a line gutter, not Monaco — DECISIONS 004
 * defers Monaco until it earns its place. It runs the same code against the
 * same server executor.
 *
 * "Run" grades the visible tests only; "Submit" runs the hidden ones too and is
 * the one that awards XP. Hidden test bodies never reach the client, so the
 * locked tabs show a lock rather than a call — the grade cannot be read off the
 * page.
 */
export function ChallengeWorkspace({ challenge }: { challenge: ChallengeData }) {
  const router = useRouter();
  const [code, setCode] = useState(challenge.lastCode || challenge.starterCode);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);
  const [submitted, setSubmitted] = useState<{ passed: boolean; firstSolve: boolean; xp: number } | null>(null);
  const [activeCase, setActiveCase] = useState(0);
  const [showConsole, setShowConsole] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [pending, start] = useTransition();
  const startedAt = useRef(Date.now());

  // Persist the buffer a couple of seconds after typing stops, so a refresh
  // never loses work. Draft save is fire-and-forget; it is not graded.
  useEffect(() => {
    const t = setTimeout(() => {
      if (code !== challenge.starterCode) saveDraft(challenge.id, code);
    }, 2500);
    return () => clearTimeout(t);
  }, [code, challenge.id, challenge.starterCode]);

  // Escape leaves the expanded editor — the only way out otherwise is the
  // button, which is off-screen once you have scrolled inside the code.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setExpanded(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  function run() {
    setSubmitted(null);
    setShowConsole(false);
    start(async () => {
      const result = await runCode(challenge.id, code);
      setOutcome(result);
      const firstFail = result.results.findIndex((r) => !r.passed && !r.hidden);
      if (firstFail >= 0) setActiveCase(firstFail);
      if (result.error) setShowConsole(true);
    });
  }

  function submit() {
    const minutes = Math.max(1, Math.round((Date.now() - startedAt.current) / 60000));
    start(async () => {
      const result = await submitCode(challenge.id, code, minutes);
      setOutcome(result.outcome);
      setSubmitted({ passed: result.ok, firstSolve: Boolean(result.firstSolve), xp: result.xp ?? 0 });
      if (result.ok) router.refresh();
    });
  }

  function handleTab(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const el = e.currentTarget;
    const from = el.selectionStart;
    const to = el.selectionEnd;
    setCode(code.slice(0, from) + "  " + code.slice(to));
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = from + 2;
    });
  }

  // Results are keyed back onto the visible tests by position, so a tab keeps
  // showing the same case whether or not a run has happened yet.
  const visibleResults = useMemo(
    () => (outcome ? outcome.results.filter((r) => !r.hidden) : []),
    [outcome]
  );

  const editor = (
    <Editor
      code={code}
      onChange={setCode}
      onTab={handleTab}
      language={challenge.language}
      expanded={expanded}
      onToggleExpand={() => setExpanded((v) => !v)}
      onReset={() => {
        setCode(challenge.starterCode);
        setOutcome(null);
        setSubmitted(null);
      }}
    />
  );

  return (
    <>
      {/* min-w-0 on both tracks is what stops a long code line from sizing a
          grid column wider than the viewport and pushing the page sideways. */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        {/* ============================================================ work */}
        <div className="flex min-w-0 flex-col gap-5">
          <ProblemCard challenge={challenge} />

          {/* While expanded the editor is lifted into an overlay, so leave a
              placeholder here rather than letting the layout jump. */}
          {expanded ? (
            <div
              className="card grid place-items-center p-8 text-[13px]"
              style={{ color: "var(--text-faint)" }}
            >
              Editor is full screen — press Escape to bring it back.
            </div>
          ) : (
            editor
          )}

          <TestcasePanel
            visibleTests={challenge.visibleTests}
            hiddenCount={challenge.hiddenCount}
            results={visibleResults}
            outcome={outcome}
            active={activeCase}
            onSelect={(i) => {
              setActiveCase(i);
              setShowConsole(false);
            }}
            showConsole={showConsole}
            onSelectConsole={() => setShowConsole(true)}
          />

          {submitted && <SubmitBanner {...submitted} />}

          <ActionBar
            pending={pending}
            solved={challenge.solved}
            onRun={run}
            onSubmit={submit}
            summary={
              outcome && !outcome.error
                ? `${outcome.passedCount}/${outcome.total} passing · ${outcome.runtimeMs}ms`
                : `${challenge.visibleTests.length} visible · ${challenge.hiddenCount} hidden`
            }
          />
        </div>

        {/* ======================================================= reference */}
        <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-5">
          <Examples tests={challenge.visibleTests} />
          <Hints hints={challenge.hints} />
          <Stats challenge={challenge} />
        </aside>
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex flex-col p-3 sm:p-5"
          style={{ background: "color-mix(in srgb, var(--bg) 92%, transparent)" }}
        >
          {editor}
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ problem */

function ProblemCard({ challenge }: { challenge: ChallengeData }) {
  const [saved, setSaved] = useState(challenge.bookmarked);
  const [, start] = useTransition();
  const colour = DIFFICULTY_COLOR[challenge.difficulty] ?? "var(--text-muted)";

  return (
    <section className="card min-w-0 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="title-card">{challenge.title}</h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span
              className="chip chip-sm capitalize"
              style={{
                color: colour,
                borderColor: `color-mix(in srgb, ${colour} 35%, transparent)`,
                background: `color-mix(in srgb, ${colour} 10%, transparent)`,
              }}
            >
              {challenge.difficulty}
            </span>
            <span className="chip chip-sm capitalize">{challenge.category}</span>
            {challenge.technology.slice(0, 3).map((t) => (
              <span key={t} className="chip chip-sm">
                {t}
              </span>
            ))}
            {challenge.solved && (
              <span
                className="chip chip-sm"
                style={{
                  color: "var(--success)",
                  borderColor: "color-mix(in srgb, var(--success) 35%, transparent)",
                  background: "color-mix(in srgb, var(--success) 10%, transparent)",
                }}
              >
                <Check size={11} strokeWidth={2.8} /> Solved
              </span>
            )}
          </div>
        </div>

        <button
          className="btn-icon shrink-0"
          aria-label={saved ? "Remove bookmark" : "Bookmark this challenge"}
          aria-pressed={saved}
          onClick={() => {
            setSaved((v) => !v);
            start(() => void toggleChallengeBookmark(challenge.id));
          }}
        >
          <Bookmark
            size={16}
            style={saved ? { color: "var(--primary)", fill: "var(--primary)" } : undefined}
          />
        </button>
      </div>

      {/* Meta row — the four numbers worth knowing before you start. */}
      <div
        className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-4 text-[12px]"
        style={{ borderColor: "var(--border-faint)", color: "var(--text-faint)" }}
      >
        <Meta icon={<Zap size={12} style={{ color: "var(--warning)" }} />} label={`${challenge.xp} XP`} />
        <Meta icon={<Clock size={12} />} label={`~${challenge.estimatedMinutes} min`} />
        <Meta
          icon={<Users size={12} />}
          label={
            challenge.stats.solvedBy > 0
              ? `${challenge.stats.solvedBy} solved`
              : "Be the first to solve it"
          }
        />
        {challenge.stats.acceptance !== null && (
          <Meta icon={<TrendingUp size={12} />} label={`${challenge.stats.acceptance}% acceptance`} />
        )}
      </div>

      <div className="prose-doc mt-4 min-w-0 max-w-full overflow-x-auto">
        <Markdown remarkPlugins={[remarkGfm]}>{challenge.prompt}</Markdown>
      </div>
    </section>
  );
}

function Meta({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      {icon}
      <span className="num">{label}</span>
    </span>
  );
}

/* ------------------------------------------------------------------- editor */

function Editor({
  code,
  onChange,
  onTab,
  language,
  expanded,
  onToggleExpand,
  onReset,
}: {
  code: string;
  onChange: (v: string) => void;
  onTab: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  language: string;
  expanded: boolean;
  onToggleExpand: () => void;
  onReset: () => void;
}) {
  const gutter = useRef<HTMLDivElement>(null);
  const lineCount = code.split("\n").length;

  return (
    <section
      className={`card flex min-w-0 flex-col overflow-hidden ${expanded ? "min-h-0 flex-1" : ""}`}
    >
      <header
        className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2.5"
        style={{ borderColor: "var(--border)" }}
      >
        <span className="eyebrow">Code editor</span>
        <div className="flex items-center gap-1.5">
          {/* Only JavaScript executes today (see runner.ts), so this reports
              the language rather than pretending to switch it. */}
          <span
            className="flex items-center gap-1 rounded-[var(--radius-pill)] px-2 py-1 text-[12px] capitalize"
            style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
          >
            {language}
            <ChevronDown size={11} style={{ opacity: 0.4 }} />
          </span>
          <button className="btn-icon-sm" onClick={onReset} aria-label="Reset to starter code">
            <RotateCcw size={13} />
          </button>
          <button
            className="btn-icon-sm"
            onClick={onToggleExpand}
            aria-label={expanded ? "Exit full screen" : "Expand editor"}
          >
            {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </header>

      <div className={`flex min-h-0 min-w-0 ${expanded ? "flex-1" : ""}`}>
        {/* The gutter is a plain column scrolled in lockstep with the textarea.
            It shares the textarea's line-height, which is the only thing that
            keeps the numbers aligned with the code. */}
        <div
          ref={gutter}
          aria-hidden
          className="scrollbar-none shrink-0 select-none overflow-hidden py-4 pl-4 pr-3 text-right font-[family-name:var(--font-mono)] text-[13px] leading-relaxed"
          style={{ color: "var(--text-faint)", background: "var(--surface-2)" }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* whitespace-pre + overflow-auto: the code scrolls inside its own box
            rather than stretching the page. */}
        <textarea
          className="block min-w-0 flex-1 resize-none overflow-auto whitespace-pre bg-transparent p-4 font-[family-name:var(--font-mono)] text-[13px] leading-relaxed outline-none"
          style={{ minHeight: expanded ? 0 : 340, height: expanded ? "100%" : undefined, color: "var(--text)" }}
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onTab}
          onScroll={(e) => {
            if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop;
          }}
          spellCheck={false}
          wrap="off"
          aria-label="Code editor"
        />
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- testcases */

function TestcasePanel({
  visibleTests,
  hiddenCount,
  results,
  outcome,
  active,
  onSelect,
  showConsole,
  onSelectConsole,
}: {
  visibleTests: ChallengeData["visibleTests"];
  hiddenCount: number;
  results: TestResult[];
  outcome: RunOutcome | null;
  active: number;
  onSelect: (i: number) => void;
  showConsole: boolean;
  onSelectConsole: () => void;
}) {
  const hasConsole = Boolean(outcome && (outcome.logs.length > 0 || outcome.error));
  const test = visibleTests[active];
  const result = results[active];

  return (
    <section className="card min-w-0 overflow-hidden">
      <header
        className="flex items-center gap-1.5 overflow-x-auto border-b px-3 py-2.5"
        style={{ borderColor: "var(--border)" }}
      >
        {visibleTests.map((_, i) => {
          const r = results[i];
          const state = !r ? "idle" : r.passed ? "pass" : "fail";
          const on = !showConsole && active === i;
          return (
            <button
              key={i}
              onClick={() => onSelect(i)}
              aria-current={on ? "true" : undefined}
              className={`chip chip-sm shrink-0 ${on ? "chip-on" : ""}`}
              style={
                state === "idle"
                  ? undefined
                  : {
                      color: state === "pass" ? "var(--success)" : "var(--danger)",
                      borderColor: `color-mix(in srgb, ${
                        state === "pass" ? "var(--success)" : "var(--danger)"
                      } 40%, transparent)`,
                    }
              }
            >
              {state === "pass" && <Check size={11} strokeWidth={3} />}
              {state === "fail" && <X size={11} strokeWidth={3} />}
              Case {i + 1}
            </button>
          );
        })}

        {/* Locked cases exist so the count is honest — you can see there is
            more to satisfy than what is on screen, but not what. */}
        {Array.from({ length: hiddenCount }, (_, i) => (
          <span
            key={`h${i}`}
            className="chip chip-sm shrink-0"
            style={{ color: "var(--text-faint)", opacity: 0.7 }}
            title="Hidden test — revealed only as a pass or fail on submit"
          >
            <Lock size={10} />
          </span>
        ))}

        {hasConsole && (
          <button
            onClick={onSelectConsole}
            className={`chip chip-sm ml-auto shrink-0 ${showConsole ? "chip-on" : ""}`}
          >
            <Terminal size={11} /> Console
          </button>
        )}
      </header>

      <div className="min-w-0 p-4">
        {showConsole ? (
          <Console outcome={outcome} />
        ) : !test ? (
          <p className="text-[13px]" style={{ color: "var(--text-faint)" }}>
            This challenge grades on hidden tests only. Submit when you are ready.
          </p>
        ) : (
          <dl className="flex flex-col gap-3 text-[13px]">
            <Field label="Input" value={test.call} />
            <Field label="Expected" value={test.expected} tone="var(--success)" />
            {result && !result.passed && <Field label="Got" value={result.got} tone="var(--danger)" />}
            {result?.passed && (
              <p className="flex items-center gap-1.5" style={{ color: "var(--success)" }}>
                <Check size={13} strokeWidth={2.8} /> Passing
              </p>
            )}
            {!result && (
              <p style={{ color: "var(--text-faint)" }}>Run your code to grade this case.</p>
            )}
          </dl>
        )}
      </div>
    </section>
  );
}

function Field({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <dt className="eyebrow">{label}</dt>
      <dd
        className="well mt-1.5 min-w-0 overflow-x-auto whitespace-pre p-2.5 font-[family-name:var(--font-mono)] text-[12px]"
        style={tone ? { color: tone } : undefined}
      >
        {value}
      </dd>
    </div>
  );
}

function Console({ outcome }: { outcome: RunOutcome | null }) {
  if (!outcome) return null;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {outcome.error && (
        <div className="min-w-0">
          <p className="eyebrow" style={{ color: "var(--danger)" }}>
            Error
          </p>
          <pre
            className="mt-1.5 max-w-full overflow-x-auto whitespace-pre-wrap break-words text-[12px]"
            style={{ color: "var(--danger)" }}
          >
            <code>{outcome.error}</code>
          </pre>
        </div>
      )}
      {outcome.logs.length > 0 && (
        <div className="min-w-0">
          <p className="eyebrow">Output</p>
          <pre
            className="well mt-1.5 max-w-full overflow-x-auto p-2.5 text-[12px]"
            style={{ color: "var(--text-muted)" }}
          >
            <code>{outcome.logs.join("\n")}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- reference */

function Examples({ tests }: { tests: ChallengeData["visibleTests"] }) {
  if (tests.length === 0) return null;
  return (
    <section className="card min-w-0 p-4">
      <h2 className="eyebrow">Examples</h2>
      <ol className="mt-3 flex flex-col gap-3">
        {tests.slice(0, 3).map((t, i) => (
          <li key={i} className="min-w-0">
            <p className="text-[12px] font-medium" style={{ color: "var(--text-muted)" }}>
              {t.label ?? `Example ${i + 1}`}
            </p>
            <div
              className="well mt-1.5 min-w-0 overflow-x-auto p-2.5 font-[family-name:var(--font-mono)] text-[12px] leading-relaxed"
            >
              <div className="whitespace-pre">{t.call}</div>
              <div className="mt-1 whitespace-pre" style={{ color: "var(--success)" }}>
                → {t.expected}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Hints({ hints }: { hints: string[] }) {
  const [shown, setShown] = useState(0);
  if (hints.length === 0) return null;

  return (
    <section className="card min-w-0 p-4">
      <div className="flex items-center gap-2">
        <Lightbulb size={14} style={{ color: "var(--warning)" }} />
        <h2 className="eyebrow flex-1">Hints</h2>
        <span className="num text-[12px]" style={{ color: "var(--text-faint)" }}>
          {shown}/{hints.length}
        </span>
      </div>

      <ol className="mt-3 flex flex-col gap-2">
        {hints.map((h, i) => (
          <li key={i} className="flex gap-2 text-[13px]">
            <span className="num shrink-0" style={{ color: "var(--text-faint)" }}>
              {i + 1}.
            </span>
            {i < shown ? (
              <span style={{ color: "var(--text-muted)" }}>{h}</span>
            ) : (
              <span className="flex items-center gap-1.5" style={{ color: "var(--text-faint)" }}>
                <Lock size={11} /> Locked
              </span>
            )}
          </li>
        ))}
      </ol>

      {shown < hints.length && (
        <button className="btn btn-ghost btn-sm mt-3 w-full" onClick={() => setShown((n) => n + 1)}>
          Reveal a hint
        </button>
      )}
    </section>
  );
}

function Stats({ challenge }: { challenge: ChallengeData }) {
  const { stats } = challenge;
  const rows: { label: string; value: string }[] = [
    { label: "Solved by", value: stats.solvedBy > 0 ? String(stats.solvedBy) : "—" },
    { label: "Attempted by", value: stats.attemptedBy > 0 ? String(stats.attemptedBy) : "—" },
    { label: "Solve rate", value: stats.solveRate !== null ? `${stats.solveRate}%` : "—" },
    { label: "Acceptance", value: stats.acceptance !== null ? `${stats.acceptance}%` : "—" },
    { label: "Your attempts", value: String(challenge.attempts) },
  ];

  return (
    <section className="card min-w-0 p-4">
      <h2 className="eyebrow">Problem stats</h2>
      <dl className="mt-3 flex flex-col gap-2.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-3">
            <dt className="text-[13px]" style={{ color: "var(--text-muted)" }}>
              {r.label}
            </dt>
            <dd className="num text-[13px] font-medium">{r.value}</dd>
          </div>
        ))}
      </dl>
      {stats.attemptedBy === 0 && (
        <p className="mt-3 text-[12px]" style={{ color: "var(--text-faint)" }}>
          Nobody has attempted this one yet.
        </p>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ actions */

function SubmitBanner({ passed, firstSolve, xp }: { passed: boolean; firstSolve: boolean; xp: number }) {
  const colour = passed ? "var(--success)" : "var(--danger)";
  return (
    <div
      className="card scale-in flex items-center gap-2.5 p-4 text-[14px] font-medium"
      style={{
        borderColor: `color-mix(in srgb, ${colour} 45%, transparent)`,
        background: `color-mix(in srgb, ${colour} 8%, transparent)`,
        color: colour,
      }}
    >
      {passed ? <Check size={16} strokeWidth={2.8} /> : <X size={16} strokeWidth={2.8} />}
      {passed
        ? firstSolve
          ? `Solved. +${xp} XP`
          : "Solved — already credited."
        : "Not yet. Some tests still fail."}
    </div>
  );
}

function ActionBar({
  pending,
  solved,
  onRun,
  onSubmit,
  summary,
}: {
  pending: boolean;
  solved: boolean;
  onRun: () => void;
  onSubmit: () => void;
  summary: string;
}) {
  return (
    <div
      className="sticky bottom-0 z-20 -mx-1 flex flex-wrap items-center gap-2 px-1 py-3"
      style={{
        background:
          "linear-gradient(to top, var(--bg) 55%, color-mix(in srgb, var(--bg) 0%, transparent))",
      }}
    >
      <button className="btn btn-secondary" onClick={onRun} disabled={pending}>
        <Play size={15} /> Run code
      </button>
      <button className="btn btn-primary" onClick={onSubmit} disabled={pending}>
        <Send size={15} /> {solved ? "Submit again" : "Submit solution"}
      </button>
      <span className="num ml-auto text-[12px]" style={{ color: "var(--text-faint)" }}>
        {pending ? "Running…" : summary}
      </span>
    </div>
  );
}
