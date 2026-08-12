"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";
import { submitDiagnostic } from "@/lib/actions";
import type { DiagnosticAnswer, DiagnosticQuestion, GradedQuestion } from "@/lib/diagnostic";
import { DIMENSION_LABELS, type Dimension } from "@/lib/competency";
import { Ring } from "@/components/ui";

/**
 * The diagnostic, taken one question at a time.
 *
 * One question on screen, one action ("Next" or "Finish"), matching the
 * "one primary action per screen" rule everywhere else in the product — a
 * diagnostic that shows all nine questions at once and asks the learner to
 * scroll and self-pace is not really diagnosing anything, since nothing stops
 * them answering out of order after seeing what is coming.
 *
 * State is local and ephemeral until the single final submission — there is
 * no save-as-you-go, on purpose, see the note on `submitDiagnostic`.
 */
export function DiagnosticFlow({
  questions,
  explanationPrompt,
}: {
  questions: DiagnosticQuestion[];
  explanationPrompt: { id: string; prompt: string };
}) {
  const total = questions.length + 1; // +1 for the free-response step
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, DiagnosticAnswer>>({});
  const [explanation, setExplanation] = useState("");
  const [pending, start] = useTransition();
  const [result, setResult] = useState<Awaited<ReturnType<typeof submitDiagnostic>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFinalStep = step === questions.length;
  const current = onFinalStep ? null : questions[step];
  const answered = current ? Boolean(answers[current.id]) : explanation.trim().length > 0;

  function setAnswer(a: DiagnosticAnswer) {
    setAnswers((prev) => ({ ...prev, [a.id]: a }));
  }

  function next() {
    if (!onFinalStep) {
      setStep((s) => s + 1);
      return;
    }
    setError(null);
    start(async () => {
      try {
        const res = await submitDiagnostic(Object.values(answers), explanation);
        setResult(res);
      } catch {
        setError("Something went wrong grading the diagnostic. Nothing was lost — you can try submitting again.");
      }
    });
  }

  if (result) return <DiagnosticResults result={result} />;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow">
            Question {step + 1} of {total}
          </p>
        </div>
        <div className="progress mt-2">
          <div className="progress-bar" style={{ width: `${((step + 1) / total) * 100}%` }} />
        </div>
      </div>

      {current ? (
        <QuestionCard question={current} answer={answers[current.id]} onAnswer={setAnswer} />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="eyebrow eyebrow-accent">Last one</p>
          <p className="text-ui font-medium">{explanationPrompt.prompt}</p>
          <textarea
            className="input"
            rows={4}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="A couple of sentences is plenty."
          />
          <p className="text-micro" style={{ color: "var(--text-faint)" }}>
            This one is not graded — it just gives your tutor a sense of how you explain things.
          </p>
        </div>
      )}

      {error && (
        <p className="text-micro" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={next}
        disabled={!answered || pending}
        className="btn btn-primary w-fit"
      >
        {pending ? "Grading…" : onFinalStep ? "Finish" : "Next"} <ArrowRight size={15} />
      </button>
    </div>
  );
}

function QuestionCard({
  question,
  answer,
  onAnswer,
}: {
  question: DiagnosticQuestion;
  answer: DiagnosticAnswer | undefined;
  onAnswer: (a: DiagnosticAnswer) => void;
}) {
  if (question.kind === "multiple_choice") {
    return (
      <div className="flex flex-col gap-3">
        <p className="prose-doc text-ui whitespace-pre-wrap">{question.prompt}</p>
        <div className="flex flex-col gap-2">
          {question.choices.map((choice, i) => {
            const selected = answer?.kind === "multiple_choice" && answer.choiceIndex === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onAnswer({ id: question.id, kind: "multiple_choice", choiceIndex: i })}
                className="row-link rounded-[var(--radius-control)] border px-3 py-2.5 text-left text-ui"
                style={{
                  borderColor: selected ? "var(--primary)" : "var(--border-faint)",
                  background: selected ? "var(--primary-faint)" : undefined,
                }}
              >
                {choice}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (question.kind === "code_tracing") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-ui">{question.prompt}</p>
        <pre className="prose-doc">
          <code>{question.code}</code>
        </pre>
        <input
          className="input"
          value={answer?.kind === "code_tracing" ? answer.text : ""}
          onChange={(e) => onAnswer({ id: question.id, kind: "code_tracing", text: e.target.value })}
          placeholder="What does it print?"
        />
      </div>
    );
  }

  // fill_in_code
  const parts = question.template.split(`___${question.blankId}___`);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-ui">Fill in the blank.</p>
      <pre className="prose-doc whitespace-pre-wrap">
        <code>
          {parts[0]}
          <input
            className="num mx-0.5 inline-block rounded-[4px] border px-1.5 py-0.5"
            style={{ width: "8ch", borderColor: "var(--border-strong)", background: "var(--surface-2)", color: "var(--text)" }}
            value={answer?.kind === "fill_in_code" ? answer.text : ""}
            onChange={(e) => onAnswer({ id: question.id, kind: "fill_in_code", text: e.target.value })}
          />
          {parts[1]}
        </code>
      </pre>
    </div>
  );
}

const DIMENSION_ORDER: Dimension[] = ["knowledge", "problem_solving", "implementation", "debugging"];

function DiagnosticResults({ result }: { result: Awaited<ReturnType<typeof submitDiagnostic>> }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <p className="eyebrow eyebrow-accent">Your starting point</p>
        <h2 className="title-section mt-1.5">
          {result.score} of {result.total}
        </h2>
        <p className="text-body mt-2 text-ui">
          Not a pass or fail — this is the baseline everything else measures you against from here.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        {DIMENSION_ORDER.map((d) => {
          const bucket = result.perDimension[d];
          const pct = bucket ? Math.round((bucket.correct / Math.max(1, bucket.total)) * 100) : 0;
          return (
            <div key={d} className="flex flex-col items-center gap-2">
              <Ring value={pct} size={64} />
              <p className="text-micro text-center" style={{ color: "var(--text-muted)" }}>
                {DIMENSION_LABELS[d].label}
              </p>
            </div>
          );
        })}
      </div>

      <div className="well flex flex-col gap-2 p-4">
        <p className="text-micro font-medium" style={{ color: "var(--text-muted)" }}>
          What you got right
        </p>
        <ul className="flex flex-col gap-1.5">
          {result.graded.map((g: GradedQuestion) => (
            <li key={g.id} className="flex items-center gap-2 text-micro">
              {g.correct ? (
                <Check size={13} style={{ color: "var(--success)" }} />
              ) : (
                <X size={13} style={{ color: "var(--danger)" }} />
              )}
              <span style={{ color: "var(--text-faint)" }}>
                {DIMENSION_LABELS[g.dimension].label}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <Link href="/learning" className="btn btn-primary w-fit">
        Pick your path <ArrowRight size={15} />
      </Link>
    </div>
  );
}
