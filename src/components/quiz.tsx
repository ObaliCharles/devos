"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, RotateCcw, X } from "lucide-react";
import { submitQuiz } from "@/lib/actions";

export type Question = {
  prompt: string;
  choices: string[];
  answerIndex: number;
  explanation?: string;
};

export function Quiz({ lessonId, questions }: { lessonId: string; questions: Question[] }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<{ passed: boolean; score: number } | null>(null);
  const [pending, start] = useTransition();

  if (questions.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        No quiz for this lesson yet.
      </p>
    );
  }

  const answered = Object.keys(answers).length;

  function submit() {
    const correct = questions.reduce(
      (n, q, i) => n + (answers[i] === q.answerIndex ? 1 : 0),
      0
    );
    start(async () => {
      const r = await submitQuiz(lessonId, correct, questions.length);
      setResult(r);
      // Passing clears a gate requirement the gate component cannot see.
      if (r.passed) router.refresh();
    });
  }

  function retry() {
    setAnswers({});
    setResult(null);
  }

  return (
    <div className="flex flex-col gap-6">
      {questions.map((q, qi) => {
        const chosen = answers[qi];
        return (
          <div key={qi}>
            <p className="text-sm font-medium">
              <span className="mr-2 tabular-nums" style={{ color: "var(--text-faint)" }}>{qi + 1}.</span>
              {q.prompt}
            </p>
            <div className="mt-3 flex flex-col gap-1.5">
              {q.choices.map((choice, ci) => {
                const selected = chosen === ci;
                const revealed = result !== null;
                const isRight = ci === q.answerIndex;

                let border = "var(--border)";
                let bg = "transparent";
                if (revealed && isRight) { border = "var(--success)"; bg = "color-mix(in srgb, var(--success) 10%, transparent)"; }
                else if (revealed && selected) { border = "var(--danger)"; bg = "color-mix(in srgb, var(--danger) 10%, transparent)"; }
                else if (selected) { border = "var(--primary)"; bg = "var(--primary-faint)"; }

                return (
                  <button
                    key={ci}
                    type="button"
                    disabled={revealed}
                    onClick={() => setAnswers((a) => ({ ...a, [qi]: ci }))}
                    className="flex items-center gap-2.5 rounded-[var(--radius-card)] border px-3.5 py-2.5 text-left text-sm transition-colors disabled:cursor-default"
                    style={{ borderColor: border, background: bg, color: "var(--text)" }}
                  >
                    <span className="flex-1">{choice}</span>
                    {revealed && isRight && <Check size={14} style={{ color: "var(--success)" }} />}
                    {revealed && selected && !isRight && <X size={14} style={{ color: "var(--danger)" }} />}
                  </button>
                );
              })}
            </div>
            {result && q.explanation && (
              <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--text-faint)" }}>
                {q.explanation}
              </p>
            )}
          </div>
        );
      })}

      {result ? (
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="text-sm font-medium"
            style={{ color: result.passed ? "var(--success)" : "var(--danger)" }}
          >
            {result.score}% — {result.passed ? "passed" : "you need 80% to clear this gate"}
          </span>
          {!result.passed && (
            <button className="btn btn-ghost" onClick={retry}>
              <RotateCcw size={14} /> Try again
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button
            className="btn btn-primary"
            disabled={answered < questions.length || pending}
            onClick={submit}
          >
            Submit answers
          </button>
          <span className="text-xs" style={{ color: "var(--text-faint)" }}>
            {answered}/{questions.length} answered
          </span>
        </div>
      )}
    </div>
  );
}
