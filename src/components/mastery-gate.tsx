"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Lock, PartyPopper } from "lucide-react";
import { masterLesson, setGateStep } from "@/lib/actions";
import type { GateKey } from "@/lib/models";

export type GateState = Record<GateKey, boolean>;

const STEPS: { key: GateKey; label: string; hint: string; manual: boolean }[] = [
  { key: "read", label: "Read the lesson", hint: "Tick this once you have been through the material end to end.", manual: true },
  { key: "noted", label: "Write a note", hint: "Save at least one note below. In your own words.", manual: false },
  { key: "exercised", label: "Do the exercise", hint: "Tick this when your code meets every line of the acceptance list.", manual: true },
  { key: "quizzed", label: "Pass the quiz", hint: "80% or better. Earned by answering, not by clicking.", manual: false },
  { key: "reviewed", label: "Review the summary", hint: "One last read-through before it enters your revision queue.", manual: true },
];

/**
 * A segmented arc that fills as requirements are met. Five segments, one per
 * requirement — the shape itself tells you how far off you are.
 */
function GateRing({ done }: { done: number }) {
  const size = 72;
  const r = 30;
  const c = 2 * Math.PI * r;
  const seg = c / 5;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <circle
          key={i}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={5}
          strokeLinecap="round"
          stroke={i < done ? "var(--success)" : "var(--border-strong)"}
          strokeDasharray={`${seg - 6} ${c - seg + 6}`}
          strokeDashoffset={-i * seg}
          style={{ transition: "stroke 300ms ease" }}
        />
      ))}
    </svg>
  );
}

export function MasteryGate({
  lessonId,
  initial,
  mastered,
  quizScore,
}: {
  lessonId: string;
  initial: GateState;
  mastered: boolean;
  quizScore?: number;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  /**
   * Only the three self-reported steps are held locally, and only so the tick
   * appears before the round trip finishes. `noted` and `quizzed` are earned
   * elsewhere on the page, so they are read straight from the server on every
   * render — the note composer and the quiz call router.refresh() when they
   * succeed, which is what makes this component light up without a reload.
   */
  const [optimistic, setOptimistic] = useState<Partial<GateState>>({});
  const gate: GateState = { ...initial, ...optimistic };
  const isMastered = mastered;

  const done = STEPS.filter((s) => gate[s.key]).length;
  const canMaster = done === STEPS.length;

  function toggle(key: GateKey, next: boolean) {
    setOptimistic((o) => ({ ...o, [key]: next }));
    start(async () => {
      await setGateStep(lessonId, key, next);
      router.refresh();
    });
  }

  function claim() {
    start(async () => {
      const result = await masterLesson(lessonId);
      setMessage(result.message);
      router.refresh();
    });
  }

  return (
    <section className="card overflow-hidden" id="gate">
      <div className="flex items-center gap-5 px-5 py-5">
        <div className="relative shrink-0">
          <GateRing done={done} />
          <span className="absolute inset-0 grid place-items-center text-sm font-semibold tabular-nums">
            {done}/5
          </span>
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Mastery gate</h2>
          <p className="mt-1 text-[13px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {isMastered
              ? "Mastered. This lesson is now in your revision queue."
              : "Five requirements. The check runs on the server, so there is no way around it — which is the point."}
          </p>
        </div>
      </div>

      <ul className="border-t" style={{ borderColor: "var(--border)" }}>
        {STEPS.map((step) => {
          const checked = gate[step.key];
          return (
            <li
              key={step.key}
              className="flex items-start gap-3 border-b px-5 py-3.5 last:border-b-0"
              style={{ borderColor: "var(--border)" }}
            >
              <button
                type="button"
                disabled={!step.manual || isMastered || pending}
                onClick={() => toggle(step.key, !checked)}
                aria-pressed={checked}
                aria-label={step.label}
                className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors disabled:cursor-not-allowed"
                style={{
                  background: checked ? "var(--success)" : "transparent",
                  borderColor: checked ? "var(--success)" : "var(--border-strong)",
                  color: "#04140d",
                }}
              >
                {checked && <Check size={12} strokeWidth={3} />}
              </button>

              <div className="min-w-0">
                <p className="text-sm font-medium" style={{ color: checked ? "var(--text)" : "var(--text-muted)" }}>
                  {step.label}
                  {step.key === "quizzed" && quizScore !== undefined && (
                    <span className="ml-2 text-xs font-normal" style={{ color: "var(--text-faint)" }}>
                      best {quizScore}%
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed" style={{ color: "var(--text-faint)" }}>
                  {step.hint}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <div
        className="flex flex-wrap items-center gap-3 border-t px-5 py-4"
        style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
      >
        {isMastered ? (
          <span className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--success)" }}>
            <PartyPopper size={16} /> Mastered
          </span>
        ) : (
          <button className="btn btn-primary" disabled={!canMaster || pending} onClick={claim}>
            {canMaster ? <Check size={15} /> : <Lock size={15} />} Mark as mastered
          </button>
        )}
        {!isMastered && !canMaster && (
          <span className="text-xs" style={{ color: "var(--text-faint)" }}>
            {5 - done} {5 - done === 1 ? "requirement" : "requirements"} still open
          </span>
        )}
        {message && (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{message}</span>
        )}
      </div>
    </section>
  );
}
