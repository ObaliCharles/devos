"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, CheckCheck, Eye, X } from "lucide-react";
import { gradeReview } from "@/lib/actions";
import { intervalLabel } from "@/lib/srs";

export type ReviewCard = {
  id: string;
  lessonId: string;
  lessonTitle: string;
  objectives: string[];
  step: number;
};

/**
 * Active recall, one card at a time. The interaction is deliberately two-step
 * — try to answer, then reveal — because grading yourself before attempting
 * the recall is the one way to make spaced repetition useless.
 */
export function ReviewSession({ cards }: { cards: ReviewCard[] }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [pending, start] = useTransition();

  const card = cards[index];

  if (!card) {
    const finished = cards.length > 0;
    return (
      <div className="card scale-in flex flex-col items-center px-5 py-16 text-center sm:py-20">
        <div className="relative mb-6 grid h-16 w-16 place-items-center">
          <span
            className="absolute inset-0 rounded-[var(--radius-dialog)]"
            style={{
              background:
                "radial-gradient(circle at 50% 40%, var(--success-faint), transparent 70%)",
            }}
            aria-hidden
          />
          <span
            className="relative grid h-14 w-14 place-items-center rounded-[var(--radius-panel)]"
            style={{
              background: "var(--success-faint)",
              color: "var(--success)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <CheckCheck size={24} strokeWidth={2.2} />
          </span>
        </div>
        <p className="text-[18px] font-semibold tracking-tight">
          {finished ? "Session complete" : "Queue clear"}
        </p>
        <p className="text-body mt-2 max-w-sm text-[13.5px]">
          {finished
            ? `You worked through ${cards.length} ${cards.length === 1 ? "card" : "cards"}. Each one you remembered comes back later than the last.`
            : "Nothing is due right now. Master a lesson and it comes back tomorrow."}
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
          <Link href="/dashboard" className="btn btn-primary">
            Back to dashboard <ArrowRight size={15} />
          </Link>
          <Link href="/learning" className="btn btn-ghost">
            <BookOpen size={15} /> Learn something new
          </Link>
        </div>
      </div>
    );
  }

  function answer(remembered: boolean) {
    start(async () => {
      await gradeReview(card.id, remembered);
      setRevealed(false);
      setIndex((i) => i + 1);
    });
  }

  return (
    <div>
      {/* Position in the session — always visible, never in the way */}
      <div className="mb-4 flex items-center gap-3">
        <div className="progress progress-sm">
          <div
            className="progress-bar"
            style={{ width: `${(index / cards.length) * 100}%` }}
          />
        </div>
        <span className="num shrink-0 text-[12px]" style={{ color: "var(--text-faint)" }}>
          {index + 1}/{cards.length}
        </span>
      </div>

      <div className="card p-5 sm:p-8">
        <p className="eyebrow eyebrow-accent">Can you still explain this?</p>
        <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.028em]">{card.lessonTitle}</h2>

        {!revealed ? (
          <div className="mt-8">
            <p className="text-body text-[13.5px]">
              Say the answer out loud first. Then check yourself — recalling before you look is
              the part that makes this work.
            </p>
            <button className="btn btn-secondary mt-5" onClick={() => setRevealed(true)}>
              <Eye size={15} /> Show what you should have said
            </button>
          </div>
        ) : (
          <div className="fade-in mt-6">
            <ul className="well flex flex-col gap-2.5 p-4">
              {card.objectives.map((o) => (
                <li key={o} className="flex gap-2.5 text-[13.5px] leading-relaxed">
                  <span className="shrink-0" style={{ color: "var(--primary)" }} aria-hidden>
                    →
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>{o}</span>
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-wrap gap-2">
              <button className="btn btn-primary" disabled={pending} onClick={() => answer(true)}>
                <Check size={15} /> I had it
              </button>
              <button className="btn btn-secondary" disabled={pending} onClick={() => answer(false)}>
                <X size={15} /> I didn&apos;t
              </button>
              <Link href={`/learning/lesson/${card.lessonId}`} className="btn btn-ghost">
                <BookOpen size={15} /> Reread the lesson
              </Link>
            </div>
            <p className="text-meta mt-3">
              Get it right and this comes back {intervalLabel(card.step + 1)}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
