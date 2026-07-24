"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Sparkles, Trash2 } from "lucide-react";
import { activateRoadmap, deleteRoadmap, generateRoadmapAction } from "@/lib/actions";

export type RoadmapSummary = {
  id: string;
  title: string;
  summary?: string;
  origin: string;
  mine: boolean;
  active: boolean;
  lessons: number;
};

type Mode = "browse" | "generate";

/**
 * The two ways into learning, as a segmented control over one panel:
 *
 *   Browse  , pick a ready-made path (the curated Project Z, or any you have
 *              generated before) and follow it.
 *   Generate, describe a topic and a goal and let the assistant build a path,
 *              lessons and quizzes included, then follow that.
 *
 * Switching the active path or generating a new one refreshes the server
 * component below, so the phases the page renders always match the choice here.
 */
export function RoadmapModes({
  roadmaps,
  configured,
}: {
  roadmaps: RoadmapSummary[];
  configured: boolean;
}) {
  const [mode, setMode] = useState<Mode>("browse");

  return (
    <div className="panel overflow-hidden">
      <nav className="segmented m-3 w-fit" aria-label="Learning mode">
        <button
          onClick={() => setMode("browse")}
          aria-pressed={mode === "browse"}
          className={`segment ${mode === "browse" ? "segment-active" : ""}`}
        >
          Choose a path
        </button>
        <button
          onClick={() => setMode("generate")}
          aria-pressed={mode === "generate"}
          className={`segment ${mode === "generate" ? "segment-active" : ""}`}
        >
          <Sparkles size={14} /> Generate with AI
        </button>
      </nav>

      <div className="border-t p-4" style={{ borderColor: "var(--border)" }}>
        {mode === "browse" ? (
          <BrowseMode roadmaps={roadmaps} />
        ) : (
          <GenerateMode configured={configured} />
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- Browse */

function BrowseMode({ roadmaps }: { roadmaps: RoadmapSummary[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  function activate(id: string) {
    setBusyId(id);
    start(async () => {
      await activateRoadmap(id);
      router.refresh();
      setBusyId(null);
    });
  }

  function remove(id: string, title: string) {
    if (!confirm(`Delete "${title}" and your progress on it? This cannot be undone.`)) return;
    setBusyId(id);
    start(async () => {
      await deleteRoadmap(id);
      router.refresh();
      setBusyId(null);
    });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {roadmaps.map((r) => (
        <div
          key={r.id}
          className="flex flex-col rounded-[var(--radius-card)] border p-4"
          style={{
            borderColor: r.active ? "var(--primary-muted)" : "var(--border)",
            background: r.active ? "var(--primary-faint)" : "var(--surface)",
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="title-card truncate">{r.title}</h3>
                {r.origin === "ai" && (
                  <span className="badge badge-primary shrink-0">
                    <Sparkles size={10} /> AI
                  </span>
                )}
              </div>
              <p className="text-meta mt-0.5">{r.lessons} lessons</p>
            </div>
            {r.mine && (
              <button
                onClick={() => remove(r.id, r.title)}
                disabled={pending}
                className="btn-icon btn-icon-sm shrink-0"
                style={{ color: "var(--danger)" }}
                aria-label={`Delete ${r.title}`}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>

          {r.summary && <p className="text-body mt-2 line-clamp-2 text-[13px]">{r.summary}</p>}

          <div className="mt-auto pt-4">
            {r.active ? (
              <span
                className="flex items-center gap-1.5 text-[13px] font-medium"
                style={{ color: "var(--primary)" }}
              >
                <Check size={14} /> Following this path
              </span>
            ) : (
              <button
                onClick={() => activate(r.id)}
                disabled={pending}
                className="btn btn-secondary btn-sm"
              >
                {busyId === r.id ? <Loader2 size={14} className="animate-spin" /> : null}
                Follow this path
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- Generate */

function GenerateMode({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [topic, setTopic] = useState("");
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [context, setContext] = useState("");
  const [error, setError] = useState<string | null>(null);

  const ready = topic.trim().length > 1 && goal.trim().length > 1;

  function generate() {
    setError(null);
    start(async () => {
      const res = await generateRoadmapAction({ topic, goal, level, context });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // The new path is now active; land on the roadmap it built.
      router.refresh();
      router.push("/learning");
    });
  }

  if (!configured) {
    return (
      <p
        className="rounded-[var(--radius-tile)] p-3 text-[13px]"
        style={{ background: "var(--warning-faint)", color: "var(--warning)" }}
      >
        Generating a path needs an AI provider. Add ANTHROPIC_API_KEY or GROQ_API_KEY to .env.local
        and restart the dev server.
      </p>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        <div>
          <label className="label" htmlFor="rg-topic">
            What do you want to learn?
          </label>
          <input
            id="rg-topic"
            className="input"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. React and TypeScript, Rust, system design"
          />
        </div>

        <div>
          <label className="label" htmlFor="rg-goal">
            What should you be able to do by the end?
          </label>
          <input
            id="rg-goal"
            className="input"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. build and ship a full-stack app, pass an interview"
          />
        </div>

        <div>
          <label className="label" htmlFor="rg-level">
            Your current level
          </label>
          <select
            id="rg-level"
            className="select"
            value={level}
            onChange={(e) => setLevel(e.target.value as typeof level)}
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex-1">
          <label className="label" htmlFor="rg-context">
            Anything to follow? (optional)
          </label>
          <textarea
            id="rg-context"
            className="textarea h-full min-h-[140px]"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Paste a syllabus, a job description, or notes. The path will follow it closely."
          />
        </div>
      </div>

      <div className="lg:col-span-2">
        {error && (
          <p
            className="mb-3 rounded-[var(--radius-tile)] p-3 text-[13px]"
            style={{ background: "var(--danger-faint)", color: "var(--danger)" }}
          >
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={generate} disabled={!ready || pending} className="btn btn-primary">
            {pending ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Building your path…
              </>
            ) : (
              <>
                <Sparkles size={15} /> Generate path
              </>
            )}
          </button>
          {pending && (
            <span className="text-meta">
              This takes 20 to 60 seconds. It writes every lesson and quiz.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

