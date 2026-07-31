"use client";

import { useState } from "react";
import { Check, ChevronDown, Lightbulb } from "lucide-react";
import type { Challenge } from "@/lib/catalog";

/**
 * The practice block at the bottom of a lesson.
 *
 * Three things it deliberately does not do: it does not grade you, it does not
 * show the solution until you ask, and it does not hide the level structure.
 * The levels are the pedagogy — a learner who has done all the level 1 tasks
 * and none of the level 2 tasks knows something real about where they are, and
 * flattening the list into "exercises" throws that away.
 *
 * Ticking a task is local and honest: it is a checklist for you, not a score
 * for anyone else, so it lives in component state rather than the database.
 */

const LEVEL_LABEL: Record<1 | 2 | 3, string> = {
  1: "Recall",
  2: "Apply",
  3: "Solve",
};

export function Challenges({ challenges }: { challenges: Challenge[] }) {
  const [done, setDone] = useState<Set<number>>(new Set());

  function toggle(i: number) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  // Group by level so the ramp is visible, and skip any level with no tasks
  // rather than rendering an empty heading.
  const levels = ([1, 2, 3] as const)
    .map((level) => ({
      level,
      items: challenges.map((c, i) => ({ c, i })).filter((x) => x.c.level === level),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <section id="practice" className="card scroll-mt-24 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="title-section">Practice</h2>
        <p className="text-meta num">
          {done.size} of {challenges.length} done
        </p>
      </div>

      <div className="progress mt-4">
        <div
          className="progress-bar"
          style={{ width: `${(done.size / challenges.length) * 100}%` }}
          role="progressbar"
          aria-valuenow={done.size}
          aria-valuemin={0}
          aria-valuemax={challenges.length}
          aria-label={`${done.size} of ${challenges.length} tasks complete`}
        />
      </div>

      <div className="mt-7 flex flex-col gap-7">
        {levels.map(({ level, items }) => (
          <div key={level}>
            <p className="group-heading mb-3">
              Level {level} · {LEVEL_LABEL[level]}
            </p>
            <ul className="flex flex-col gap-2">
              {items.map(({ c, i }) => (
                <ChallengeRow
                  key={i}
                  challenge={c}
                  done={done.has(i)}
                  onToggle={() => toggle(i)}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function ChallengeRow({
  challenge,
  done,
  onToggle,
}: {
  challenge: Challenge;
  done: boolean;
  onToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const hasReveal = Boolean(challenge.hint || challenge.solution || challenge.starter);

  return (
    <li className="well px-3 py-3">
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          aria-pressed={done}
          aria-label={done ? "Mark as not done" : "Mark as done"}
          className="mt-[1px] grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[6px] transition-colors"
          style={{
            background: done ? "var(--primary)" : "transparent",
            border: `1px solid ${done ? "var(--primary)" : "var(--border-strong)"}`,
            color: "var(--primary-ink)",
          }}
        >
          {done && <Check size={12} strokeWidth={3} />}
        </button>

        <div className="min-w-0 flex-1">
          <p
            className="text-[14px] leading-relaxed"
            style={{
              color: done ? "var(--text-faint)" : "var(--text)",
              textDecoration: done ? "line-through" : undefined,
            }}
          >
            {challenge.prompt}
          </p>

          {hasReveal && (
            <button
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              <ChevronDown
                size={13}
                style={{
                  transform: open ? "rotate(180deg)" : undefined,
                  transition: "transform var(--dur) var(--ease-out)",
                }}
              />
              {open ? "Hide" : challenge.solution ? "Hint & solution" : "Starting point"}
            </button>
          )}

          {open && (
            <div className="mt-3 flex flex-col gap-3">
              {challenge.hint && (
                <p
                  className="flex items-start gap-2 text-[14px] leading-relaxed"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Lightbulb size={14} className="mt-[3px] shrink-0" />
                  {challenge.hint}
                </p>
              )}
              {challenge.starter && <Code label="Start from" source={challenge.starter} />}
              {challenge.solution && <Code label="One solution" source={challenge.solution} />}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function Code({ label, source }: { label: string; source: string }) {
  return (
    <div>
      <p className="group-heading mb-1.5">{label}</p>
      <pre
        className="overflow-x-auto rounded-[var(--radius-tile)] p-3 text-[12px] leading-relaxed"
        style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
      >
        <code>{source}</code>
      </pre>
    </div>
  );
}
