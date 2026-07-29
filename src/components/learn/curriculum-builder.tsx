"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Award,
  BookOpen,
  Check,
  ClipboardCheck,
  ExternalLink,
  FolderGit2,
  Globe,
  Loader2,
  Sparkles,
  Trophy,
} from "lucide-react";
import { completionLabel, planShape } from "@/lib/plan-shape";

/**
 * The AI Curriculum Builder.
 *
 * Two halves. On the left you say who you want to become and how much time you
 * actually have; on the right a Journey Preview shows what that buys — and the
 * numbers there are not decoration, they come from the same `planShape` the
 * generator is told to hit, so the preview is a promise the path keeps.
 *
 * Pressing Generate opens a streaming request rather than calling a server
 * action. That is the whole point of this rewrite: generation takes a minute or
 * more across four stages, and the old version showed a spinner for all of it.
 * Now the panel reports the stage it is in, lists the real sources as the
 * research step finds them, and counts lessons as they are written. A learner
 * watching real URLs arrive knows the thing is grounded; a learner watching a
 * spinner is just waiting.
 */

const DURATIONS = [
  { label: "1 Month", months: 1 },
  { label: "3 Months", months: 3 },
  { label: "6 Months", months: 6 },
  { label: "1 Year", months: 12 },
];
const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
const HOURS = [1, 2, 3, 4, 6];
const STYLES = ["Videos", "Reading", "Interactive", "Mixed"] as const;
const ROLES = [
  "AI Engineer",
  "Frontend Developer",
  "Backend Engineer",
  "Full-Stack Developer",
  "Data Scientist",
  "DevOps Engineer",
  "Cyber Security Engineer",
  "Mobile Developer",
];

type Level = (typeof LEVELS)[number];
type Style = (typeof STYLES)[number];

type Source = { title: string; url: string; kind: string; note: string };

/** Mirrors the route's frames. Anything else on the wire is ignored. */
type Frame =
  | { stage: "researching" }
  | { stage: "researched"; resources: Source[] }
  | { stage: "outlining" }
  | { stage: "outlined"; title: string; phases: number; lessons: number }
  | { stage: "writing"; done: number; total: number; skill: string }
  | { stage: "saving" }
  | { stage: "done"; roadmapId: string; lessons: number; grounded: boolean }
  | { stage: "error"; error: string };

type Run = {
  stage: Frame["stage"];
  sources: Source[];
  title: string;
  outlineLessons: number;
  done: number;
  total: number;
  skill: string;
};

const EMPTY_RUN: Run = {
  stage: "researching",
  sources: [],
  title: "",
  outlineLessons: 0,
  done: 0,
  total: 0,
  skill: "",
};

export function CurriculumBuilder({ configured }: { configured: boolean }) {
  const router = useRouter();

  const [role, setRole] = useState("AI Engineer");
  const [durationIdx, setDurationIdx] = useState(2); // 6 months
  const [level, setLevel] = useState<Level>("Beginner");
  const [hours, setHours] = useState(3);
  const [includeProjects, setIncludeProjects] = useState(true);
  const [includeCerts, setIncludeCerts] = useState(true);
  const [style, setStyle] = useState<Style>("Videos");

  const [run, setRun] = useState<Run | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  const months = DURATIONS[durationIdx].months;
  const shape = useMemo(() => planShape(months, hours), [months, hours]);
  const running = run !== null;

  async function generate() {
    setError(null);
    setRun(EMPTY_RUN);

    const controller = new AbortController();
    abort.current = controller;

    // The learner's own words drive generation: their role becomes the topic,
    // so "Cyber Security Engineer" builds a security path, not the default.
    const topic = role.trim();

    let res: Response;
    try {
      res = await fetch("/api/learning/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          topic,
          goal: `Become a capable ${topic}.`,
          level: level.toLowerCase(),
          months,
          hoursPerDay: hours,
          includeProjects,
          includeCertifications: includeCerts,
          style,
        }),
      });
    } catch {
      setRun(null);
      setError("Could not reach the generator. Check your connection and try again.");
      return;
    }

    // Guard failures (daily cap, too many paths) come back as plain JSON before
    // the stream opens, so they read as an error rather than a stalled run.
    if (!res.ok || !res.body) {
      const detail = (await res.json().catch(() => null)) as { error?: string } | null;
      setRun(null);
      setError(detail?.error ?? "Generation could not start.");
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Newline-delimited JSON: keep the trailing partial line for the next chunk.
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        let frame: Frame;
        try {
          frame = JSON.parse(line) as Frame;
        } catch {
          continue;
        }

        if (frame.stage === "error") {
          setRun(null);
          setError(frame.error);
          return;
        }

        if (frame.stage === "done") {
          router.refresh();
          router.push("/learning/roadmap");
          return;
        }

        setRun((prev) => {
          const base = prev ?? EMPTY_RUN;
          switch (frame.stage) {
            case "researched":
              return { ...base, stage: frame.stage, sources: frame.resources };
            case "outlined":
              return {
                ...base,
                stage: frame.stage,
                title: frame.title,
                outlineLessons: frame.lessons,
              };
            case "writing":
              return {
                ...base,
                stage: frame.stage,
                done: frame.done,
                total: frame.total,
                skill: frame.skill,
              };
            default:
              return { ...base, stage: frame.stage };
          }
        });
      }
    }

    // The stream ended without a done frame — the server gave up mid-write.
    setRun(null);
    setError("Generation stopped before the path was finished. Please try again.");
  }

  function cancel() {
    abort.current?.abort();
    abort.current = null;
    setRun(null);
  }

  return (
    <div id="build" className="grid scroll-mt-4 gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      {/* ------------------------------------------------------- The builder */}
      <div className="panel p-5">
        <h3 className="text-[20px] font-bold tracking-[-0.02em]" style={{ color: "var(--primary)" }}>
          AI Curriculum Builder
        </h3>
        <p className="text-meta mt-1 text-[12px]">
          Your personalised learning path, powered by AI.
        </p>

        <div className="mt-5 flex flex-col gap-4">
          <div>
            <label className="label" htmlFor="cb-role">
              Who do you want to become?
            </label>
            {/* Free text with suggestions rather than a fixed list: the whole
                claim of this feature is that it builds the path you asked for,
                and a dropdown can only offer the eight we thought of. */}
            <input
              id="cb-role"
              className="input"
              list="cb-roles"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={running}
              placeholder="e.g. AI Engineer"
            />
            <datalist id="cb-roles">
              {ROLES.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="label" htmlFor="cb-duration">
              How much time do you have?
            </label>
            <select
              id="cb-duration"
              className="select"
              value={durationIdx}
              onChange={(e) => setDurationIdx(Number(e.target.value))}
              disabled={running}
            >
              {DURATIONS.map((d, i) => (
                <option key={d.label} value={i}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="cb-level">
              Your level
            </label>
            <select
              id="cb-level"
              className="select"
              value={level}
              onChange={(e) => setLevel(e.target.value as Level)}
              disabled={running}
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="cb-hours">
              Hours per day
            </label>
            <select
              id="cb-hours"
              className="select"
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              disabled={running}
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {h} {h === 1 ? "Hour" : "Hours"}
                </option>
              ))}
            </select>
          </div>

          <YesNo label="Projects" value={includeProjects} onChange={setIncludeProjects} disabled={running} />
          <YesNo label="Certifications" value={includeCerts} onChange={setIncludeCerts} disabled={running} />

          <div>
            <span className="label">Learning style</span>
            <div className="grid grid-cols-4 gap-1.5">
              {STYLES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStyle(s)}
                  disabled={running}
                  aria-pressed={style === s}
                  className={`chip chip-sm justify-center ${style === s ? "chip-on" : ""}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {!configured && (
            <p
              className="rounded-[var(--radius-tile)] p-2.5 text-[12px]"
              style={{ background: "var(--warning-faint)", color: "var(--warning)" }}
            >
              Add ANTHROPIC_API_KEY or GROQ_API_KEY to .env.local to generate a real path.
            </p>
          )}
          {error && (
            <p
              className="rounded-[var(--radius-tile)] p-2.5 text-[12px]"
              style={{ background: "var(--danger-faint)", color: "var(--danger)" }}
            >
              {error}
            </p>
          )}

          {running ? (
            <button onClick={cancel} className="btn btn-secondary btn-lg btn-block mt-1">
              Cancel
            </button>
          ) : (
            <button
              onClick={generate}
              disabled={role.trim().length < 3}
              className="btn btn-primary btn-lg btn-block mt-1"
            >
              <Sparkles size={15} /> Generate Curriculum
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------- Journey preview / live generation ---- */}
      <div className="panel flex flex-col overflow-hidden">
        {running ? (
          <Progress run={run} shape={shape} />
        ) : (
          <Preview
            role={role.trim() || "developer"}
            months={months}
            shape={shape}
            includeProjects={includeProjects}
            includeCerts={includeCerts}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ The preview */

function Preview({
  role,
  months,
  shape,
  includeProjects,
  includeCerts,
}: {
  role: string;
  months: number;
  shape: ReturnType<typeof planShape>;
  includeProjects: boolean;
  includeCerts: boolean;
}) {
  const stats = [
    { icon: <BookOpen size={14} />, value: `${months}`, label: months === 1 ? "Month" : "Months" },
    { icon: <BookOpen size={14} />, value: `${shape.lessons}`, label: "Lessons" },
    ...(includeProjects
      ? [{ icon: <FolderGit2 size={14} />, value: `${shape.projects}`, label: "Projects" }]
      : []),
    { icon: <ClipboardCheck size={14} />, value: `${shape.assessments}`, label: "Assessments" },
    ...(includeCerts
      ? [{ icon: <Award size={14} />, value: `${shape.certifications}`, label: "Certifications" }]
      : []),
    { icon: <Trophy size={14} />, value: "1", label: "Final project" },
  ];

  return (
    <>
      <div className="border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
        <p className="eyebrow eyebrow-accent">Your journey preview</p>
        <h3 className="mt-1.5 text-[22px] font-bold tracking-[-0.02em]">Become {role}</h3>
        <p className="text-meta mt-1 text-[14px]">
          About {shape.hours} hours of study. Estimated completion:{" "}
          <strong className="font-semibold" style={{ color: "var(--text)" }}>
            {completionLabel(months)}
          </strong>
          .
        </p>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 p-5 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-2.5">
            <span className="icon-tile">{s.icon}</span>
            <span className="min-w-0">
              <span className="num block text-[16px] font-semibold leading-none">{s.value}</span>
              <span className="text-meta mt-1 block truncate text-[12px]">{s.label}</span>
            </span>
          </div>
        ))}
      </div>

      {/* The milestone rail: one node per phase, then the trophy. */}
      <div className="mt-auto border-t px-5 py-5" style={{ borderColor: "var(--border)" }}>
        <ol className="flex items-center">
          {Array.from({ length: shape.phases }).map((_, i) => (
            <li key={i} className="flex flex-1 items-center">
              <span
                className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-[12px] font-medium"
                style={{
                  background: i === 0 ? "var(--primary)" : "var(--surface-3)",
                  color: i === 0 ? "var(--primary-ink)" : "var(--text-faint)",
                }}
              >
                {i + 1}
              </span>
              <span className="h-px flex-1" style={{ background: "var(--border)" }} aria-hidden />
            </li>
          ))}
          <li>
            <span
              className="grid h-[26px] w-[26px] place-items-center rounded-full"
              style={{ background: "var(--warning-faint)", color: "var(--warning)" }}
            >
              <Trophy size={13} />
            </span>
          </li>
        </ol>
        <p className="text-meta mt-3 text-[12px]">
          {shape.phases} phases, fundamentals through to a final build. Nothing is saved until the
          path is generated.
        </p>
      </div>
    </>
  );
}

/* --------------------------------------------------------- Live generation */

const STAGES = [
  { key: "researching", label: "Researching real sources" },
  { key: "outlining", label: "Designing your path" },
  { key: "writing", label: "Writing the lessons" },
  { key: "saving", label: "Saving your curriculum" },
] as const;

/** Which of the four visible stages a frame belongs to. */
function stageIndex(stage: Run["stage"]) {
  if (stage === "researching" || stage === "researched") return 0;
  if (stage === "outlining" || stage === "outlined") return 1;
  if (stage === "writing") return 2;
  return 3;
}

function Progress({ run, shape }: { run: Run; shape: ReturnType<typeof planShape> }) {
  const current = stageIndex(run.stage);
  // Real fractions only. The writing stage knows its own denominator, so the
  // bar tracks skills actually written rather than a timer pretending to.
  const pct =
    run.stage === "writing" && run.total > 0
      ? 25 + Math.round((run.done / run.total) * 65)
      : current === 0
        ? 8
        : current === 1
          ? 22
          : 95;

  return (
    <>
      <div className="border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
        <p className="eyebrow eyebrow-accent">Building your curriculum</p>
        <h3 className="mt-1.5 flex items-center gap-2 text-[22px] font-bold tracking-[-0.02em]">
          <Loader2 size={18} className="animate-spin" style={{ color: "var(--primary)" }} />
          {run.title || "Working…"}
        </h3>
        <div className="progress mt-3">
          <div className="progress-bar" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="flex flex-col gap-3 p-5">
        {STAGES.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <div key={s.key} className="flex items-center gap-3">
              <span
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full"
                style={{
                  background: done
                    ? "var(--primary)"
                    : active
                      ? "var(--primary-faint)"
                      : "var(--surface-2)",
                  color: done
                    ? "var(--primary-ink)"
                    : active
                      ? "var(--primary)"
                      : "var(--text-faint)",
                }}
              >
                {done ? (
                  <Check size={12} strokeWidth={3} />
                ) : active ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <span className="num text-[12px]">{i + 1}</span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className="block text-[14px] font-medium"
                  style={{ color: active || done ? "var(--text)" : "var(--text-faint)" }}
                >
                  {s.label}
                </span>
                {active && s.key === "writing" && run.total > 0 && (
                  <span className="text-meta block truncate text-[12px]">
                    {run.done} of {run.total} skills · {run.skill}
                  </span>
                )}
                {active && s.key === "outlining" && run.outlineLessons > 0 && (
                  <span className="text-meta block text-[12px]">
                    {run.outlineLessons} lessons planned
                  </span>
                )}
              </span>
            </div>
          );
        })}

        {/* The sources, as they are found. This is the evidence that the path
            is grounded — a claim the UI would otherwise just be making. */}
        {run.sources.length > 0 && (
          <div className="well mt-1 p-3.5">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold">
              <Globe size={12} style={{ color: "var(--primary)" }} />
              Grounded in {run.sources.length} real sources
            </p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {run.sources.map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-1.5 text-[12px]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <ExternalLink size={11} className="mt-[3px] shrink-0" />
                    <span className="min-w-0">
                      <span className="font-medium" style={{ color: "var(--text)" }}>
                        {s.title}
                      </span>
                      {s.note && <span className="block truncate">{s.note}</span>}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-meta mt-1 text-[12px]">
          This takes a minute or two — it writes every lesson, not just the titles. Keep this tab
          open; you can leave the page once it lands on your roadmap.
        </p>
        <p className="text-meta text-[12px]">
          Target: {shape.lessons} lessons across {shape.phases} phases.
        </p>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ Pieces */

function YesNo({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[14px] font-medium">{label}</span>
      <div className="flex gap-1">
        {[true, false].map((v) => (
          <button
            key={String(v)}
            onClick={() => onChange(v)}
            disabled={disabled}
            aria-pressed={value === v}
            className={`chip chip-sm justify-center ${value === v ? "chip-on" : ""}`}
          >
            {v ? "Yes" : "No"}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Kept for the arrow used by callers that link into the builder. */
export { ArrowRight };
