"use client";

import { useState, useTransition } from "react";
import { Lock } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { requestExerciseHint } from "@/lib/actions";
import { LADDER_LABELS } from "@/lib/hint-ladder";
import { AiMark } from "@/components/ai-mark";

/**
 * The hint ladder, attached to a lesson's exercise.
 *
 * One button, not a level picker: "Get a hint" always asks for exactly one
 * rung past wherever the ladder currently is, because letting the UI offer a
 * jump to level 6 would make the server-side "one rung at a time" rule
 * (`requestExerciseHint`) a check that never actually fires. The levels
 * already climbed are listed above the button, each with the text it
 * returned — but only for this page load. Nothing here is a conversation the
 * product remembers; refresh the page and the *level reached* is still
 * exactly where you left it (it lives on `LessonProgress`), but the hint text
 * itself is gone, the same way the general tutor's answers already are. That
 * is a deliberate limit, not a bug: persisting every hint's prose is a bigger
 * feature (a real per-exercise conversation) than this one is trying to be.
 */
export function HintLadder({ lessonId, initialLevel }: { lessonId: string; initialLevel: number }) {
  const [level, setLevel] = useState(initialLevel);
  const [history, setHistory] = useState<{ level: number; text: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const next = Math.min(6, level + 1);
  const atTop = level >= 6;

  function ask() {
    setError(null);
    start(async () => {
      const res = await requestExerciseHint(lessonId, next);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setHistory((h) => [...h, { level: res.level, text: res.text }]);
      setLevel(res.level);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {history.length > 0 && (
        <ol className="flex flex-col gap-3">
          {history.map((h, i) => (
            <li key={i} className="well flex flex-col gap-1.5 p-3">
              <p className="text-micro font-medium" style={{ color: "var(--text-faint)" }}>
                Level {h.level} · {LADDER_LABELS[h.level]}
              </p>
              <div className="prose-doc text-ui">
                <Markdown remarkPlugins={[remarkGfm]}>{h.text}</Markdown>
              </div>
            </li>
          ))}
        </ol>
      )}

      {error && (
        <p className="text-micro" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      {atTop ? (
        <p className="flex items-center gap-2 text-micro" style={{ color: "var(--text-faint)" }}>
          <Lock size={12} /> That was the full solution — there is nothing further down the ladder.
        </p>
      ) : (
        <button
          type="button"
          onClick={ask}
          disabled={pending}
          className="btn btn-ghost btn-sm w-fit"
        >
          <AiMark size={14} className={pending ? "animate-pulse" : ""} />
          {pending
            ? "Thinking…"
            : history.length === 0
              ? "Stuck? Get a hint"
              : `Still stuck? Level ${next} — ${LADDER_LABELS[next]}`}
        </button>
      )}
    </div>
  );
}
