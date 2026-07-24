"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

/**
 * A small, self-contained knowledge check on the lesson page. Pick an answer,
 * get immediate right/wrong feedback, retry freely. No navigation, no server —
 * so it never disturbs the page or the lesson you're reading.
 */
type Question = { prompt: string; choices: string[]; answer: number };

export function LessonQuiz({ questions }: { questions: Question[] }) {
  return (
    <div className="flex flex-col gap-5">
      {questions.map((q, i) => (
        <Item key={i} q={q} number={questions.length > 1 ? i + 1 : undefined} />
      ))}
    </div>
  );
}

function Item({ q, number }: { q: Question; number?: number }) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correct = picked === q.answer;

  return (
    <div>
      <p className="text-[14px] font-medium">
        {number ? `${number}. ` : ""}
        {q.prompt}
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {q.choices.map((choice, ci) => {
          const isPicked = picked === ci;
          const isAnswer = ci === q.answer;
          // Colour only after answering: the chosen wrong one red, the right one green.
          let bg = "var(--surface-2)";
          let border = "var(--border)";
          let color = "var(--text)";
          if (answered && isAnswer) {
            bg = "var(--success-faint)";
            border = "var(--success)";
            color = "var(--success)";
          } else if (answered && isPicked && !isAnswer) {
            bg = "var(--danger-faint)";
            border = "var(--danger)";
            color = "var(--danger)";
          }
          return (
            <button
              key={ci}
              onClick={() => setPicked(ci)}
              disabled={answered && correct}
              className="flex items-center gap-2.5 rounded-[var(--radius-tile)] border px-3.5 py-2.5 text-left text-[13.5px] transition-colors"
              style={{ background: bg, borderColor: border, color }}
            >
              <span className="flex-1">{choice}</span>
              {answered && isAnswer && <Check size={15} className="shrink-0" />}
              {answered && isPicked && !isAnswer && <X size={15} className="shrink-0" />}
            </button>
          );
        })}
      </div>
      {answered && (
        <p className="mt-2 text-[12.5px] font-medium" style={{ color: correct ? "var(--success)" : "var(--danger)" }}>
          {correct ? "Correct — nicely done." : "Not quite. Try again, or ask the AI tutor above."}
        </p>
      )}
    </div>
  );
}
