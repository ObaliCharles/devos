"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Lightbulb, Play, RotateCcw, Send, X } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { runCode, saveDraft, submitCode } from "@/lib/actions";
import type { RunOutcome } from "@/lib/runner";

export type ChallengeData = {
  id: string;
  title: string;
  difficulty: string;
  prompt: string;
  starterCode: string;
  hints: string[];
  xp: number;
  visibleTests: { call: string; expected: string; label?: string }[];
  hiddenCount: number;
  solved: boolean;
  lastCode?: string;
  attempts: number;
};

/**
 * The challenge workspace: prompt on the left, editor and results on the right.
 * The editor is a good textarea, not Monaco, DECISIONS 004 defers Monaco until
 * it earns its place, and a monospace textarea with tab handling runs the same
 * code against the same server executor. Monaco is a later upgrade, not a
 * blocker.
 *
 * "Run" grades the visible tests only; "Submit" runs the hidden ones too and is
 * the one that awards XP. The learner never sees the hidden test bodies, so the
 * grade cannot be gamed by reading them.
 */
export function CodeRunner({ challenge }: { challenge: ChallengeData }) {
  const router = useRouter();
  const [code, setCode] = useState(challenge.lastCode || challenge.starterCode);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);
  const [submitted, setSubmitted] = useState<{ passed: boolean; firstSolve: boolean; xp: number } | null>(null);
  const [hintsShown, setHintsShown] = useState(0);
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

  function run() {
    setSubmitted(null);
    start(async () => {
      const result = await runCode(challenge.id, code);
      setOutcome(result);
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
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = code.slice(0, start) + "  " + code.slice(end);
    setCode(next);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + 2;
    });
  }

  return (
    // min-w-0 on both columns is what stops a long code line from forcing a
    // grid track wider than the viewport and pushing the whole page past the
    // phone's right edge. Without it, grid tracks size to their content.
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ------------------------------------------------------- prompt */}
      <div className="flex min-w-0 flex-col gap-5">
        <div className="prose-doc card min-w-0 max-w-full overflow-x-auto p-5">
          <Markdown remarkPlugins={[remarkGfm]}>{challenge.prompt}</Markdown>
        </div>

        {challenge.hints.length > 0 && (
          <div className="card p-4">
            <div className="flex items-center gap-2">
              <Lightbulb size={15} style={{ color: "var(--warning)" }} />
              <h3 className="text-sm font-semibold">Hints</h3>
              <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                {hintsShown}/{challenge.hints.length} shown
              </span>
            </div>
            <ol className="mt-3 flex flex-col gap-2">
              {challenge.hints.slice(0, hintsShown).map((h, i) => (
                <li key={i} className="flex gap-2 text-[13px]" style={{ color: "var(--text-muted)" }}>
                  <span style={{ color: "var(--text-faint)" }}>{i + 1}.</span> {h}
                </li>
              ))}
            </ol>
            {hintsShown < challenge.hints.length && (
              <button
                className="btn btn-ghost mt-3 h-8 px-3 text-[13px]"
                onClick={() => setHintsShown((n) => n + 1)}
              >
                Reveal a hint
              </button>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------- editor */}
      <div className="flex min-w-0 flex-col gap-4">
        <div className="card min-w-0 overflow-hidden">
          <div className="flex items-center justify-between border-b px-4 py-2.5" style={{ borderColor: "var(--border)" }}>
            <span className="eyebrow">solution.js</span>
            <button
              className="flex items-center gap-1 text-[11px]"
              style={{ color: "var(--text-faint)" }}
              onClick={() => { setCode(challenge.starterCode); setOutcome(null); }}
            >
              <RotateCcw size={11} /> Reset
            </button>
          </div>
          {/* whitespace-pre + overflow-x-auto: the editor scrolls horizontally
              inside its own box rather than stretching the page. */}
          <textarea
            className="block w-full resize-y overflow-auto whitespace-pre bg-transparent p-4 font-[family-name:var(--font-mono)] text-[13px] leading-relaxed outline-none"
            style={{ minHeight: 320, color: "var(--text)" }}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleTab}
            spellCheck={false}
            wrap="off"
            aria-label="Code editor"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-ghost" onClick={run} disabled={pending}>
            <Play size={15} /> Run
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={pending}>
            <Send size={15} /> Submit
          </button>
          <span className="text-xs" style={{ color: "var(--text-faint)" }}>
            {challenge.visibleTests.length} visible · {challenge.hiddenCount} hidden tests
          </span>
        </div>

        {submitted && (
          <div
            className="card p-4"
            style={{ borderColor: submitted.passed ? "var(--success)" : "var(--danger)" }}
          >
            {submitted.passed ? (
              <p className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--success)" }}>
                <Check size={16} />
                {submitted.firstSolve ? `Solved. +${submitted.xp} XP` : "Solved (already credited)"}
              </p>
            ) : (
              <p className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--danger)" }}>
                <X size={16} /> Not yet, some tests still fail.
              </p>
            )}
          </div>
        )}

        {outcome && <TestResults outcome={outcome} />}
      </div>
    </div>
  );
}

function TestResults({ outcome }: { outcome: RunOutcome }) {
  if (outcome.error) {
    return (
      <div className="card min-w-0 p-4">
        <p className="eyebrow" style={{ color: "var(--danger)" }}>Error</p>
        <pre
          className="mt-2 max-w-full overflow-x-auto whitespace-pre-wrap break-words text-[12px]"
          style={{ color: "var(--danger)" }}
        >
          <code>{outcome.error}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className="card min-w-0 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow">Tests</p>
        <span
          className="num text-sm font-medium"
          style={{ color: outcome.ok ? "var(--success)" : "var(--warning)" }}
        >
          {outcome.passedCount}/{outcome.total} passing · {outcome.runtimeMs}ms
        </span>
      </div>

      <ul className="mt-3 flex flex-col gap-1.5">
        {outcome.results.map((r, i) => (
          <li
            key={i}
            className="min-w-0 rounded-[var(--radius-card)] border p-2.5 text-[12px]"
            style={{
              borderColor: r.passed ? "var(--border)" : "var(--danger)",
              background: r.passed ? "transparent" : "color-mix(in srgb, var(--danger) 8%, transparent)",
            }}
          >
            <div className="flex items-start gap-2">
              {r.passed
                ? <Check size={13} className="mt-0.5 shrink-0" style={{ color: "var(--success)" }} />
                : <X size={13} className="mt-0.5 shrink-0" style={{ color: "var(--danger)" }} />}
              <code className="min-w-0 break-all font-[family-name:var(--font-mono)]">
                {r.hidden ? "hidden test" : r.call}
              </code>
            </div>
            {!r.passed && !r.hidden && (
              <div className="mt-1.5 break-all pl-5" style={{ color: "var(--text-muted)" }}>
                expected <code style={{ color: "var(--success)" }}>{r.expected}</code>, got{" "}
                <code style={{ color: "var(--danger)" }}>{r.got}</code>
              </div>
            )}
          </li>
        ))}
      </ul>

      {outcome.logs.length > 0 && (
        <div className="mt-3">
          <p className="eyebrow">console</p>
          <pre
            className="mt-1 max-w-full overflow-x-auto rounded-[var(--radius-card)] border p-2.5 text-[12px]"
            style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-muted)" }}
          >
            <code>{outcome.logs.join("\n")}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
