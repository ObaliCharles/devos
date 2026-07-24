"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Plus, X } from "lucide-react";
import { createProject } from "@/lib/actions";

export type SkillOption = { id: string; title: string; phase: string };

const CATEGORIES = ["web", "mobile", "api", "cli", "library", "data", "ai", "game", "other"];
const DIFFICULTIES = ["beginner", "intermediate", "advanced"];

const STACK_GROUPS: { key: string; label: string; options: string[] }[] = [
  { key: "frontend", label: "Frontend", options: ["Next.js", "React", "Vue", "Svelte", "Astro", "React Native", "Flutter"] },
  { key: "backend", label: "Backend", options: ["Next.js API", "FastAPI", "Express", "NestJS", "Django", "Go", "Rails"] },
  { key: "database", label: "Database", options: ["MongoDB", "PostgreSQL", "MySQL", "SQLite", "Redis", "Supabase"] },
  { key: "auth", label: "Auth", options: ["Clerk", "NextAuth", "Auth0", "Supabase Auth", "Custom JWT"] },
  { key: "storage", label: "Storage", options: ["Cloudinary", "S3", "UploadThing", "Local"] },
  { key: "deployment", label: "Deployment", options: ["Vercel", "Railway", "Render", "Fly.io", "AWS", "Docker"] },
  { key: "ai", label: "AI", options: ["Anthropic", "OpenAI", "Local model", "None"] },
];

const FEATURE_IDEAS = [
  "Authentication", "Dashboard", "CRUD", "Search", "File upload", "Payments",
  "Notifications", "Admin panel", "Roles and permissions", "Email", "Analytics",
  "Dark mode", "Responsive layout", "Tests", "CI", "Deployment",
];

const STEPS = ["Basics", "Stack", "Features", "Skills"];

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`chip ${selected ? "chip-on" : ""}`}
    >
      {children}
    </button>
  );
}

export function ProjectWizard({ skills }: { skills: SkillOption[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [category, setCategory] = useState("web");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [deadline, setDeadline] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [stack, setStack] = useState<Record<string, string[]>>({});
  const [features, setFeatures] = useState<string[]>([]);
  const [customFeature, setCustomFeature] = useState("");
  const [skillIds, setSkillIds] = useState<string[]>([]);

  function toggle(list: string[], value: string) {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  function toggleStack(group: string, value: string) {
    setStack((s) => ({ ...s, [group]: toggle(s[group] ?? [], value) }));
  }

  function submit() {
    setError(null);
    start(async () => {
      const result = await createProject({
        title, description, goal, category, difficulty,
        stack, features, skillIds,
        deadline: deadline || undefined,
        repoUrl: repoUrl || undefined,
      });
      if (!result.ok) {
        setError(result.message);
        setStep(0);
        return;
      }
      router.push(`/projects/${result.id}`);
    });
  }

  const canAdvance = step > 0 || title.trim().length > 0;

  return (
    <div>
      {/* ------------------------------------------------------- progress */}
      <ol className="mb-8 flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              className="flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] transition-colors disabled:cursor-default"
              style={{
                background: i === step ? "var(--primary-faint)" : "transparent",
                color: i === step ? "var(--primary)" : i < step ? "var(--text)" : "var(--text-faint)",
                fontWeight: i === step ? 600 : 400,
              }}
            >
              <span
                className="grid h-5 w-5 place-items-center rounded-full text-[11px] tabular-nums"
                style={{
                  background: i < step ? "var(--success)" : "var(--surface-2)",
                  color: i < step ? "#04140d" : "inherit",
                }}
              >
                {i < step ? <Check size={11} strokeWidth={3} /> : i + 1}
              </span>
              {label}
            </button>
          </li>
        ))}
      </ol>

      <div className="card p-5">
        {/* ---------------------------------------------------- 1 basics */}
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium" htmlFor="p-title">What are you building?</label>
              <input
                id="p-title"
                className="input mt-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task tracker with JWT auth"
                autoFocus
              />
            </div>

            <div>
              <label className="text-sm font-medium" htmlFor="p-desc">One-line description</label>
              <input
                id="p-desc"
                className="input mt-2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A small board app to practise auth and relational data"
              />
            </div>

            <div>
              <label className="text-sm font-medium" htmlFor="p-goal">
                What problem does it solve, and for whom?
              </label>
              <textarea
                id="p-goal"
                className="input mt-2 min-h-[90px] resize-y"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Write this now. In three weeks it is the only thing that will tell you whether the project is finished."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium">Category</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {CATEGORIES.map((c) => (
                    <Chip key={c} selected={category === c} onClick={() => setCategory(c)}>{c}</Chip>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">Difficulty</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {DIFFICULTIES.map((d) => (
                    <Chip key={d} selected={difficulty === d} onClick={() => setDifficulty(d)}>{d}</Chip>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium" htmlFor="p-deadline">Target date (optional)</label>
                <input
                  id="p-deadline"
                  type="date"
                  className="input mt-2"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="p-repo">Repository (optional)</label>
                <input
                  id="p-repo"
                  className="input mt-2"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/you/project"
                />
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------- 2 stack */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Decide now, in one place. Half-finished projects usually died at a
              stack decision made three weeks in.
            </p>
            {STACK_GROUPS.map((group) => (
              <div key={group.key}>
                <p className="text-sm font-medium">{group.label}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {group.options.map((option) => (
                    <Chip
                      key={option}
                      selected={(stack[group.key] ?? []).includes(option)}
                      onClick={() => toggleStack(group.key, option)}
                    >
                      {option}
                    </Chip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* -------------------------------------------------- 3 features */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Each one becomes a task on your board, so pick the scope you can
              actually finish rather than the scope you wish you could.
            </p>

            <div className="flex flex-wrap gap-1.5">
              {FEATURE_IDEAS.map((f) => (
                <Chip key={f} selected={features.includes(f)} onClick={() => setFeatures((list) => toggle(list, f))}>
                  {f}
                </Chip>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                className="input"
                value={customFeature}
                onChange={(e) => setCustomFeature(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customFeature.trim()) {
                    e.preventDefault();
                    setFeatures((list) => [...list, customFeature.trim()]);
                    setCustomFeature("");
                  }
                }}
                placeholder="Something specific to this project"
                aria-label="Add a feature"
              />
              <button
                type="button"
                className="btn btn-ghost shrink-0 px-3"
                disabled={!customFeature.trim()}
                onClick={() => {
                  setFeatures((list) => [...list, customFeature.trim()]);
                  setCustomFeature("");
                }}
                aria-label="Add feature"
              >
                <Plus size={15} />
              </button>
            </div>

            {features.length > 0 && (
              <div>
                <p className="eyebrow">{features.length} tasks will be created</p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {features.map((f, i) => (
                    <li key={`${f}-${i}`}>
                      <button
                        type="button"
                        onClick={() => setFeatures((list) => list.filter((_, j) => j !== i))}
                        className="chip"
                        aria-label={`Remove ${f}`}
                      >
                        {f} <X size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- 4 skills */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm font-medium">Which skills does this practise?</p>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                This is the part no other tool has. Linking a project to the
                skills it exercises is what lets your roadmap show where the
                theory actually got used, and what fills your portfolio later.
              </p>
            </div>

            {skills.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-faint)" }}>
                No skills in the roadmap yet. You can link them later from the project settings.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {skills.map((s) => (
                  <Chip
                    key={s.id}
                    selected={skillIds.includes(s.id)}
                    onClick={() => setSkillIds((list) => toggle(list, s.id))}
                  >
                    {s.title}
                  </Chip>
                ))}
              </div>
            )}

            {skillIds.length === 0 && skills.length > 0 && (
              <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                You can skip this, but the project will not show up on any skill page.
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm" style={{ color: "var(--danger)" }}>{error}</p>
        )}
      </div>

      {/* ----------------------------------------------------- navigation */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          className="btn btn-ghost"
          disabled={step === 0 || pending}
          onClick={() => setStep((s) => s - 1)}
        >
          <ArrowLeft size={15} /> Back
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canAdvance || pending}
            onClick={() => setStep((s) => s + 1)}
          >
            Next <ArrowRight size={15} />
          </button>
        ) : (
          <button type="button" className="btn btn-primary" disabled={pending} onClick={submit}>
            {pending ? "Creating…" : "Create project"} <Check size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
