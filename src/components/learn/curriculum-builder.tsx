"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FolderGit2,
  Loader2,
  Pencil,
  RotateCcw,
  Save,
  Sparkles,
  Wand2,
} from "lucide-react";
import { generateRoadmapAction } from "@/lib/actions";
import { planForGoal, type CurriculumMonth } from "@/lib/learn-content";

/**
 * The AI Curriculum Builder.
 *
 * The form is conversational: who you want to become, how long you have, your
 * level, and whether to include projects and certifications. While you tweak
 * it, the right panel shows a live preview drawn from an example role plan, so
 * the section is never empty and you can see the chronological shape (month 1 →
 * final project) before committing.
 *
 * Pressing Generate is real: it sends the topic, goal and level to
 * generateRoadmapAction, which has the AI write a full phase → skill → lesson →
 * quiz tree, persists it, makes it your active path, and lands you on /learning
 * to start it. The preview is a preview; the generated path is the product.
 */

const DURATIONS = [
  { label: "1 Month", months: 1 },
  { label: "3 Months", months: 3 },
  { label: "6 Months", months: 6 },
  { label: "1 Year", months: 12 },
];
const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
type Level = (typeof LEVELS)[number];

/** Fit an example six-month plan to the requested duration for the preview. */
function fitToDuration(months: CurriculumMonth[], target: number): CurriculumMonth[] {
  if (target >= months.length) {
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
  if (target <= 1) return [months[months.length - 1]];
  const middle = months.slice(1, -1);
  const keep = target - 2;
  const step = middle.length / keep;
  const sampled = Array.from({ length: keep }, (_, i) => middle[Math.floor(i * step)]);
  return [months[0], ...sampled, months[months.length - 1]];
}

export function CurriculumBuilder({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [pending, startGen] = useTransition();

  const [goal, setGoal] = useState("I want to become an AI engineer");
  const [durationIdx, setDurationIdx] = useState(2); // 6 months
  const [level, setLevel] = useState<Level>("Beginner");
  const [includeProjects, setIncludeProjects] = useState(true);
  const [includeCerts, setIncludeCerts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Two-phase flow: configure the request, then review (and edit the title)
  // before anything is written. Nothing is saved or made active until you press
  // Accept & save — so a generated path is never committed behind your back.
  const [phase, setPhase] = useState<"configure" | "review">("configure");
  const [title, setTitle] = useState("");

  // The live preview: an example plan, fit to the chosen duration. This is
  // illustrative; the real path is written server-side when you accept it.
  const preview = useMemo(() => {
    const plan = planForGoal(goal);
    const target = DURATIONS[durationIdx].months;
    const months = fitToDuration(plan.months, target);
    return {
      role: plan.role,
      months,
      lessons: months.length * (level === "Advanced" ? 4 : 3) + 2,
      projects: includeProjects ? months.filter((m) => m.project).length : 0,
      certifications: includeCerts ? Math.max(2, Math.round(months.length / 2)) : 0,
      assessments: Math.max(3, months.length - 1),
    };
  }, [goal, durationIdx, level, includeProjects, includeCerts]);

  // Step 1: review — no write happens here, just move to the editable review.
  function review() {
    setError(null);
    setTitle((t) => t || `${preview.role} Path`);
    setPhase("review");
  }

  // Step 2: accept & save — the only place that writes and activates the path.
  // The learner's own words drive the generation: their goal becomes the topic,
  // so "I want to become a game developer" builds a game-dev path, not the
  // default. The role plan only informs the example preview, never the request.
  function acceptAndSave() {
    setError(null);
    // Strip the conversational lead-in to get the actual subject.
    const subject = goal
      .replace(/^\s*(i\s+want\s+to\s+become|i\s+want\s+to\s+learn|become|learn|master)\s+/i, "")
      .replace(/^(a|an)\s+/i, "")
      .trim();
    const topic = subject || goal.trim();
    startGen(async () => {
      const res = await generateRoadmapAction({
        topic,
        goal: `Become a capable ${topic}.`,
        level: level.toLowerCase() as "beginner" | "intermediate" | "advanced",
        context:
          `Preferred path title: ${title.trim() || `${topic} Path`}. ` +
          `Target duration: ${DURATIONS[durationIdx].label}. ` +
          `${includeProjects ? "Include a hands-on project in each phase. " : ""}` +
          `${includeCerts ? "Call out relevant certifications along the way." : ""}`.trim(),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
      router.push("/learning");
    });
  }

  return (
    <div id="build" className="grid scroll-mt-4 gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      {/* ------------------------------------------------------- The builder */}
      <div className="panel p-5">
        <div className="flex items-center gap-2.5">
          <span className="icon-tile">
            <Wand2 size={16} />
          </span>
          <div className="min-w-0">
            <h3 className="title-card">AI Curriculum Builder</h3>
            <p className="text-meta">Let AI build a real path for you.</p>
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

          <button
            onClick={review}
            disabled={pending || goal.trim().length < 3}
            className="btn btn-primary btn-lg btn-block mt-1"
          >
            <Sparkles size={15} /> Review path
          </button>
          <p className="text-meta text-center text-[12px]">
            You&apos;ll review and can rename it before anything is saved.
          </p>
        </div>
      </div>

      {/* --------------------------------------------------- Generated preview */}
      <div className="panel flex flex-col overflow-hidden">
        <div className="border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
          <p className="eyebrow eyebrow-accent">
            {phase === "review" ? "Review your path" : "Curriculum Preview"}
          </p>
          {phase === "review" ? (
            <div className="mt-2">
              <label className="label" htmlFor="cb-title">
                Path name — edit before saving
              </label>
              <input
                id="cb-title"
                className="input text-[14px] font-semibold"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`${preview.role} Path`}
              />
            </div>
          ) : (
            <>
              <h3 className="mt-1.5 text-[22px] font-bold tracking-[-0.02em]">
                Become {article(preview.role)} {preview.role}
              </h3>
              <p className="text-meta mt-0.5">
                An example of the shape. Review to name and save your own.
              </p>
            </>
          )}
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-2 gap-px sm:grid-cols-4" style={{ background: "var(--border)" }}>
          <Stat icon={<RotateCcw size={13} />} value={DURATIONS[durationIdx].label} label="Duration" />
          <Stat icon={<BookOpen size={13} />} value={preview.lessons} label="Lessons" />
          <Stat icon={<FolderGit2 size={13} />} value={preview.projects} label="Projects" />
          <Stat icon={<Award size={13} />} value={preview.certifications} label="Certifications" />
        </div>

        {/* Month timeline, chronological foundations → final project */}
        <ol className="flex flex-col p-4 sm:p-5">
          {preview.months.map((m, i) => {
            const first = i === 0;
            const last = i === preview.months.length - 1;
            return (
              <li key={i} className="relative flex gap-4 pb-5 last:pb-0">
                <div className="flex flex-col items-center">
                  <span
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold"
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
                    <span className="text-[14px] font-semibold">{m.title}</span>
                  </div>
                  <p className="text-body mt-0.5 text-[14px]">{m.focus}</p>
                  {includeProjects && m.project && (
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
          {phase === "review" ? (
            <>
              <button
                onClick={acceptAndSave}
                disabled={pending || !configured}
                className="btn btn-primary"
              >
                {pending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {pending ? "Saving your path…" : "Accept & save"}
              </button>
              <button onClick={() => setPhase("configure")} disabled={pending} className="btn btn-secondary">
                <Pencil size={15} /> Edit
              </button>
              <button onClick={review} disabled={pending} className="btn btn-ghost">
                <RotateCcw size={15} /> Regenerate
              </button>
              {!configured && (
                <span className="text-meta w-full text-[12px]" style={{ color: "var(--warning)" }}>
                  Add an AI key in .env.local to write and save the path.
                </span>
              )}
              {pending && (
                <span className="text-meta w-full text-[12px]">
                  Writing every lesson and quiz — 20–60s — then opening your path.
                </span>
              )}
            </>
          ) : (
            <>
              <button onClick={review} disabled={goal.trim().length < 3} className="btn btn-primary">
                <ArrowRight size={15} /> Review &amp; save
              </button>
              <span className="text-meta ml-auto hidden items-center gap-1.5 sm:flex">
                <ClipboardCheck size={13} /> {preview.assessments} assessments included
              </span>
            </>
          )}
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
      <span className="text-meta mt-0.5 block text-[12px]">{label}</span>
    </div>
  );
}

function article(word: string) {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}
