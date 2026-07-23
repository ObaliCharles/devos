"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Layers, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { createFlashcard, deleteFlashcard, gradeFlashcard } from "@/lib/actions";
import { EmptyState } from "./ui";

export type FlashcardItem = {
  id: string;
  front: string;
  back: string;
  tags: string[];
};

/**
 * Flashcards ride the same spaced-repetition ladder as lessons (lib/srs.ts) —
 * the study session pulls only what is due, and grading it right pushes it out,
 * wrong pulls it back. One SRS implementation, two callers.
 */
export function FlashcardDeck({
  due,
  total,
  dueCount,
}: {
  due: FlashcardItem[];
  total: number;
  dueCount: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [adding, setAdding] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  const card = due[index];

  function grade(remembered: boolean) {
    if (!card) return;
    start(async () => {
      await gradeFlashcard(card.id, remembered);
      setFlipped(false);
      setIndex((i) => i + 1);
    });
  }

  function add() {
    if (!front.trim() || !back.trim()) return;
    start(async () => {
      await createFlashcard({ front, back });
      setFront("");
      setBack("");
      setAdding(false);
      router.refresh();
      setIndex(0);
    });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-4 text-sm" style={{ color: "var(--text-muted)" }}>
          <span><strong style={{ color: "var(--text)" }}>{dueCount}</strong> due</span>
          <span><strong style={{ color: "var(--text)" }}>{total}</strong> total</span>
        </div>
        <button className="btn btn-ghost" onClick={() => setAdding((a) => !a)}>
          <Plus size={15} /> New card
        </button>
      </div>

      {adding && (
        <div className="card mb-6 p-4">
          <div className="flex items-center justify-between">
            <p className="eyebrow">New flashcard</p>
            <button onClick={() => setAdding(false)} aria-label="Cancel" style={{ color: "var(--text-muted)" }}><X size={16} /></button>
          </div>
          <textarea className="input mt-3 min-h-[60px] resize-y" value={front} onChange={(e) => setFront(e.target.value)} placeholder="Front — the question or prompt" aria-label="Front" />
          <textarea className="input mt-2 min-h-[60px] resize-y" value={back} onChange={(e) => setBack(e.target.value)} placeholder="Back — the answer" aria-label="Back" />
          <button className="btn btn-primary mt-3" onClick={add} disabled={pending || !front.trim() || !back.trim()}>Add card</button>
        </div>
      )}

      {total === 0 && !adding ? (
        <EmptyState
          icon={<Layers size={30} />}
          title="No flashcards yet"
          body="Turn the facts you keep forgetting into cards. They come back on the same spaced schedule your lessons do."
          action={<button className="btn btn-primary" onClick={() => setAdding(true)}><Plus size={15} /> Add your first card</button>}
        />
      ) : !card ? (
        <div className="card grid place-items-center p-16 text-center">
          <div>
            <Check size={28} style={{ color: "var(--success)" }} className="mx-auto" />
            <p className="mt-3 text-lg font-semibold">Deck clear</p>
            <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
              {dueCount === 0 ? "Nothing is due. Come back tomorrow." : "That's everything due today."}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-3">
            <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: "var(--border)" }}>
              <div className="h-full rounded-full" style={{ width: `${(index / due.length) * 100}%`, background: "var(--primary)" }} />
            </div>
            <span className="text-xs tabular-nums" style={{ color: "var(--text-faint)" }}>{index + 1}/{due.length}</span>
          </div>

          <button
            className="card grid min-h-[240px] w-full place-items-center p-8 text-center"
            onClick={() => setFlipped((f) => !f)}
          >
            <div>
              <p className="eyebrow mb-3">{flipped ? "Answer" : "Prompt"}</p>
              <p className="whitespace-pre-wrap text-lg">{flipped ? card.back : card.front}</p>
              {!flipped && (
                <p className="mt-6 text-xs" style={{ color: "var(--text-faint)" }}>Click to flip</p>
              )}
            </div>
          </button>

          {flipped && (
            <div className="mt-4 flex gap-3">
              <button className="btn btn-ghost flex-1" style={{ color: "var(--danger)" }} disabled={pending} onClick={() => grade(false)}>
                <RotateCcw size={15} /> Forgot
              </button>
              <button className="btn btn-primary flex-1" disabled={pending} onClick={() => grade(true)}>
                <Check size={15} /> Knew it
              </button>
            </div>
          )}

          <div className="mt-4 flex justify-center">
            <button
              className="text-xs"
              style={{ color: "var(--text-faint)" }}
              onClick={() => start(async () => { await deleteFlashcard(card.id); router.refresh(); setIndex(0); setFlipped(false); })}
            >
              <Trash2 size={11} className="mr-1 inline" /> Delete this card
            </button>
          </div>
        </>
      )}
    </div>
  );
}
