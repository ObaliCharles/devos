"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Check, Pencil } from "lucide-react";
import { submitProjectPlan, submitProjectRetro } from "@/lib/actions";
import { Section } from "@/components/ui";

type Plan = {
  building?: string;
  need?: string;
  steps?: string;
  risks?: string;
  aiReview?: string;
  aiGaps?: string[];
  submittedAt?: Date;
  retro?: string;
  retroAt?: Date;
};

const QUESTIONS: { key: keyof Plan; label: string; placeholder: string; required: boolean }[] = [
  { key: "building", label: "What are you building?", placeholder: "One or two sentences.", required: true },
  { key: "need", label: "What do you think you need?", placeholder: "Libraries, services, pieces of knowledge.", required: false },
  { key: "steps", label: "What are the steps?", placeholder: "Roughly in order — this does not need to be exact.", required: true },
  { key: "risks", label: "What could go wrong?", placeholder: "The part you're least sure about.", required: false },
];

/**
 * The planning assistant. One primary action at a time: fill in the plan, get
 * it reviewed, and — later, once building has actually started — compare it
 * against what happened. Three states, never more than one visible at once.
 */
export function ProjectPlanPanel({ projectId, plan: initial }: { projectId: string; plan: Plan }) {
  const [plan, setPlan] = useState<Plan>(initial);
  const [editing, setEditing] = useState(!initial.building);

  if (editing) {
    return <PlanForm projectId={projectId} initial={plan} onDone={(p) => { setPlan(p); setEditing(false); }} />;
  }

  return (
    <div className="page-body">
      <Section major={false}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow eyebrow-accent">The plan</p>
            <p className="text-body mt-1 text-ui">Written before any of this was built.</p>
          </div>
          <button onClick={() => setEditing(true)} className="btn btn-ghost btn-sm">
            <Pencil size={13} /> Edit
          </button>
        </div>

        <dl className="mt-5 flex flex-col gap-4">
          {QUESTIONS.filter((q) => plan[q.key]).map((q) => (
            <div key={q.key}>
              <dt className="group-heading">{q.label}</dt>
              <dd className="text-ui mt-1.5 whitespace-pre-wrap" style={{ color: "var(--text-muted)" }}>
                {String(plan[q.key])}
              </dd>
            </div>
          ))}
        </dl>

        {(plan.aiReview || (plan.aiGaps && plan.aiGaps.length > 0)) && (
          <div className="well mt-5 flex flex-col gap-2.5 p-4">
            <p className="text-micro font-medium" style={{ color: "var(--text-muted)" }}>
              What the review noticed
            </p>
            {plan.aiReview && <p className="text-ui">{plan.aiReview}</p>}
            {plan.aiGaps && plan.aiGaps.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {plan.aiGaps.map((g, i) => (
                  <li key={i} className="text-micro flex gap-2" style={{ color: "var(--text-faint)" }}>
                    <span aria-hidden>·</span>
                    {g}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Section>

      <Section title="What actually happened">
        <RetroForm projectId={projectId} retro={plan.retro} onDone={(retro) => setPlan((p) => ({ ...p, retro }))} />
      </Section>
    </div>
  );
}

function PlanForm({
  projectId,
  initial,
  onDone,
}: {
  projectId: string;
  initial: Plan;
  onDone: (plan: Plan) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({
    building: initial.building ?? "",
    need: initial.need ?? "",
    steps: initial.steps ?? "",
    risks: initial.risks ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const canSubmit = values.building.trim() && values.steps.trim();

  function submit() {
    setError(null);
    start(async () => {
      const res = await submitProjectPlan(projectId, {
        building: values.building,
        need: values.need,
        steps: values.steps,
        risks: values.risks,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      onDone({ ...values, aiReview: res.aiReview, aiGaps: res.aiGaps, submittedAt: new Date() });
    });
  }

  return (
    <Section major={false}>
      <p className="eyebrow eyebrow-accent">Before you start</p>
      <p className="text-body mt-1 text-ui">
        Four questions. The point is not to get them right — it's to notice what you haven't thought
        about yet before the code does it for you.
      </p>

      <div className="mt-5 flex flex-col gap-4">
        {QUESTIONS.map((q) => (
          <div key={q.key}>
            <label className="group-heading" htmlFor={`plan-${q.key}`}>
              {q.label}
              {!q.required && <span style={{ color: "var(--text-faint)", textTransform: "none" }}> · optional</span>}
            </label>
            <textarea
              id={`plan-${q.key}`}
              className="input mt-1.5"
              rows={q.key === "steps" ? 4 : 2}
              placeholder={q.placeholder}
              value={values[q.key]}
              onChange={(e) => setValues((v) => ({ ...v, [q.key]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      {error && (
        <p className="text-micro mt-3" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      <button onClick={submit} disabled={!canSubmit || pending} className="btn btn-primary mt-5">
        {pending ? "Reviewing…" : "Get feedback"} <ArrowRight size={15} />
      </button>
    </Section>
  );
}

function RetroForm({
  projectId,
  retro,
  onDone,
}: {
  projectId: string;
  retro?: string;
  onDone: (retro: string) => void;
}) {
  const [value, setValue] = useState(retro ?? "");
  const [saved, setSaved] = useState(Boolean(retro));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    start(async () => {
      const res = await submitProjectRetro(projectId, value);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setSaved(true);
      onDone(value);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-body text-ui">
        Once you've built some of this, come back and compare. What actually changed from the plan
        above?
      </p>
      <textarea
        className="input"
        rows={3}
        placeholder="What was different from what you planned, and why?"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
      />
      {error && (
        <p className="text-micro" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      <button
        onClick={submit}
        disabled={!value.trim() || pending || saved}
        className="btn btn-secondary btn-sm w-fit"
      >
        {saved ? (
          <>
            <Check size={13} /> Saved
          </>
        ) : pending ? (
          "Saving…"
        ) : (
          "Save"
        )}
      </button>
    </div>
  );
}
