"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FolderGit2,
  RotateCcw,
  Save,
  Sparkles,
  Wand2,
} from "lucide-react";
import { planForGoal, type CurriculumMonth } from "@/lib/learn-content";

/**
 * The AI Curriculum Builder and its generated result, side by side on desktop
 * and stacked on phones.
 *
 * The builder is conversational: who you want to become, how long you have,
 * your level, and whether to include projects and certifications. Pressing
 * generate resolves a role plan instantly, then trims or pads it to the chosen
 * duration, so the result appears the moment you ask for it, the right feel for
 * a tool that should never make you wait to see a plan.
 */

const DURATIONS = [
  { label: "1 Month", months: 1 },
  { label: "3 Months", months: 3 },
  { label: "6 Months", months: 6 },
  { label: "1 Year", months: 12 },
];
const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;

type Level = (typeof LEVELS)[number];

type Generated = {
  role: string;
  outcome: string;
  duration: string;
  months: CurriculumMonth[];
  lessons: number;
  projects: number;
  certifications: number;
  assessments: number;
  includeProjects: boolean;
  includeCerts: boolean;
};

/** Fit a six-month plan to the requested number of months by sampling evenly,
 *  so a 3-month plan still spans foundations to a final project. */
function fitToDuration(months: CurriculumMonth[], target: number): CurriculumMonth[] {
  if (target >= months.length) {
    // Pad by repeating the "build" cadence toward the end for longer plans.
    const out = [...months];
    let i = months.length - 2;
    while (out.length < target) {
      out.splice(out.length - 1, 0, {
        title: "Deepen & Build",
        focus: months[Math.max(1, i)].focus,
        project: months[Math.max(1, i)].project,
      });
      i = i > 1 ? i - 1 : months.length - 2;
    }
    return out.slice(0, target);
  }
  // Always keep the first (foundations) and last (final project) months.
  if (target <= 1) return [months[months.length - 1]];
  const middle = months.slice(1, -1);
  const keep = target - 2;
  const step = middle.length / keep;
  const sampled = Array.from({ length: keep }, (_, i) => middle[Math.floor(i * step)]);
  return [months[0], ...sampled, months[months.length - 1]];
}

export function CurriculumBuilder() {
  const [goal, setGoal] = useState("I want to become an AI engineer");
  const [durationIdx, setDurationIdx] = useState(2); // 6 months
  const [level, setLevel] = useState<Level>("Beginner");
  const [includeProjects, setIncludeProjects] = useState(true);
  const [includeCerts, setIncludeCerts] = useState(true);
  const [result, setResult] = useState<Generated | null>(null);

  const generate = () => setResult(build());

  function build(): Generated {
    const plan = planForGoal(goal);
    const target = DURATIONS[durationIdx].months;
    const months = fitToDuration(plan.months, target);
    const projects = includeProjects ? months.filter((m) => m.project).length : 0;
    return {
      role: plan.role,
      outcome: plan.outcome,
      duration: DURATIONS[durationIdx].label,
      months,
      lessons: months.length * (level === "Advanced" ? 4 : level === "Intermediate" ? 3 : 3) + 2,
      projects,
      certifications: includeCerts ? Math.max(2, Math.round(months.length / 2)) : 0,
      assessments: Math.max(3, months.length - 1),
      includeProjects,
      includeCerts,
    };
  }

  // Show a live preview before the user ever presses generate, so the panel is
  // never empty, it defaults to the AI Engineer plan the reference shows.
  const shown = useMemo(() => result ?? build(), [result]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      {/* ------------------------------------------------------- The builder */}
      <div className="panel p-5">
        <div className="flex items-center gap-2.5">
          <span className="icon-tile icon-tile-primary">
            <Wand2 size={16} />
          </span>
          <div className="min-w-0">
            <h3 className="title-card">AI Curriculum Builder</h3>
            <p className="text-meta">Let AI build the perfect path for you.</p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          <div>
            <label className="label" htmlFor="cb-goal">
              Who would you like to become?
            </label>
            <input
              id="cb-goal"
              className="input"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. an AI engineer, a startup founder"
            />
          </div>

          <div>
            <span className="label">How much time can you dedicate?</span>
            <div className="grid grid-cols-4 gap-1.5">
              {DURATIONS.map((d, i) => (
                <button
                  key={d.label}
                  onClick={() => setDurationIdx(i)}
                  aria-pressed={durationIdx === i}
                  className={`chip justify-center ${durationIdx === i ? "chip-on" : ""}`}
                >
                  {d.label.replace(" Months", "M").replace(" Month", "M").replace(" Year", "Y")}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="label">What&apos;s your experience level?</span>
            <div className="grid grid-cols-3 gap-1.5">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  aria-pressed={level === l}
                  className={`chip justify-center ${level === l ? "chip-on" : ""}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Toggle label="Include projects?" value={includeProjects} onChange={setIncludeProjects} />
            <Toggle label="Certifications?" value={includeCerts} onChange={setIncludeCerts} />
          </div>

          <button onClick={generate} className="btn btn-primary btn-lg btn-block mt-1">
            <Sparkles size={15} /> Generate Path
          </button>
        </div>
      </div>

      {/* --------------------------------------------------- Generated result */}
      <div className="panel flex flex-col overflow-hidden">
        <div className="border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
          <p className="eyebrow eyebrow-accent">AI Generated Curriculum</p>
          <h3 className="mt-1.5 text-[20px] font-bold tracking-[-0.02em]">
            Become {article(shown.role)} {shown.role}
          </h3>
        </div>

        {/* Stat strip */}
        <div
          className="grid grid-cols-2 gap-px sm:grid-cols-4"
          style={{ background: "var(--border)" }}
        >
          <Stat icon={<RotateCcw size={13} />} value={shown.duration} label="Duration" />
          <Stat icon={<BookOpen size={13} />} value={shown.lessons} label="Lessons" />
          <Stat icon={<FolderGit2 size={13} />} value={shown.projects} label="Projects" />
          <Stat icon={<Award size={13} />} value={shown.certifications} label="Certifications" />
        </div>

        {/* Month timeline */}
        <ol className="flex flex-col p-4 sm:p-5">
          {shown.months.map((m, i) => {
            const first = i === 0;
            const last = i === shown.months.length - 1;
            return (
              <li key={i} className="relative flex gap-4 pb-5 last:pb-0">
                {/* Rail */}
                <div className="flex flex-col items-center">
                  <span
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold"
                    style={{
                      background: first ? "var(--primary)" : "var(--surface-3)",
                      color: first ? "var(--primary-ink)" : "var(--text-muted)",
                    }}
                  >
                    {last ? <CheckCircle2 size={14} /> : i + 1}
                  </span>
                  {!last && (
                    <span className="mt-1 w-px flex-1" style={{ background: "var(--border)" }} />
                  )}
                </div>

                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-meta">Month {i + 1}</span>
                    <span className="text-[14.5px] font-semibold">{m.title}</span>
                  </div>
                  <p className="text-body mt-0.5 text-[13px]">{m.focus}</p>
                  {shown.includeProjects && m.project && (
                    <p
                      className="mt-1.5 inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] px-2 py-1 text-[12px] font-medium"
                      style={{ background: "var(--primary-faint)", color: "var(--primary)" }}
                    >
                      <FolderGit2 size={11} /> {m.project}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        <div
          className="mt-auto flex flex-wrap items-center gap-2 border-t px-5 py-4"
          style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
        >
          <Link href="/learning" className="btn btn-primary">
            <ArrowRight size={15} /> Start Learning
          </Link>
          <button onClick={generate} className="btn btn-secondary">
            <Save size={15} /> Save Curriculum
          </button>
          <button onClick={generate} className="btn btn-ghost">
            <RotateCcw size={15} /> Regenerate
          </button>
          <span className="text-meta ml-auto hidden items-center gap-1.5 sm:flex">
            <ClipboardCheck size={13} /> {shown.assessments} assessments
          </span>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="grid grid-cols-2 gap-1.5">
        <button
          onClick={() => onChange(true)}
          aria-pressed={value}
          className={`chip justify-center ${value ? "chip-on" : ""}`}
        >
          Yes
        </button>
        <button
          onClick={() => onChange(false)}
          aria-pressed={!value}
          className={`chip justify-center ${!value ? "chip-on" : ""}`}
        >
          No
        </button>
      </div>
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div className="px-4 py-3" style={{ background: "var(--surface)" }}>
      <span className="flex items-center gap-1.5" style={{ color: "var(--text-faint)" }}>
        {icon}
        <span className="num text-[16px] font-semibold" style={{ color: "var(--text)" }}>
          {value}
        </span>
      </span>
      <span className="text-meta mt-0.5 block text-[11.5px]">{label}</span>
    </div>
  );
}

function article(word: string) {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}
