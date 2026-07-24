"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, Lock } from "lucide-react";
import { SearchInput } from "./search-input";
import { Badge, EmptyState, ProgressBar, type Tone } from "./ui";

/**
 * The course catalogue, organised like freeCodeCamp: a search box over a set of
 * categories, each holding the courses that belong to it. Here a "category" is
 * a phase of the active path and a "course" is a skill inside it. Search
 * filters courses live and hides any category left with no matches, so the
 * whole catalogue narrows to what you typed.
 */

type Skill = {
  id: string;
  title: string;
  why?: string;
  difficulty: string;
  lessons: { state: string }[];
  mastered: number;
};

type Phase = {
  id: string;
  order: number;
  title: string;
  subtitle?: string;
  locked: boolean;
  skills: Skill[];
};

const DIFFICULTY: Record<string, { label: string; tone: Tone }> = {
  beginner: { label: "Beginner", tone: "success" },
  intermediate: { label: "Intermediate", tone: "warning" },
  advanced: { label: "Advanced", tone: "danger" },
};

export function CourseCatalog({ phases }: { phases: Phase[] }) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const totalCourses = useMemo(
    () => phases.reduce((n, p) => n + p.skills.length, 0),
    [phases],
  );

  // Filter courses by title / rationale; keep only categories that still have a
  // match so an empty category never shows a bare heading.
  const filtered = useMemo(() => {
    if (!q) return phases;
    return phases
      .map((p) => ({
        ...p,
        skills: p.skills.filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            (s.why ?? "").toLowerCase().includes(q),
        ),
      }))
      .filter((p) => p.skills.length > 0);
  }, [phases, q]);

  const matchCount = filtered.reduce((n, p) => n + p.skills.length, 0);

  return (
    <div className="section-stack">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search courses…"
          className="w-full sm:max-w-sm"
        />
        <span className="text-meta shrink-0">
          {q ? `${matchCount} of ${totalCourses}` : `${totalCourses}`} courses
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          compact
          icon={<Lock size={20} />}
          title={`No course matches “${query}”`}
          body="Try a broader term, or clear the search to browse every category."
          action={
            <button className="btn btn-secondary" onClick={() => setQuery("")}>
              Clear search
            </button>
          }
        />
      ) : (
        <div className="flex flex-col gap-10">
          {filtered.map((phase) => (
            <section key={phase.id} aria-labelledby={`cat-${phase.id}`}>
              {/* ---- category header ---- */}
              <div className="flex flex-wrap items-center gap-3">
                <p className={`eyebrow ${phase.locked ? "" : "eyebrow-accent"}`}>
                  Category {phase.order}
                </p>
                {phase.locked && (
                  <Badge>
                    <Lock size={11} /> Locked
                  </Badge>
                )}
                <span className="text-meta ml-auto">
                  {phase.skills.length} {phase.skills.length === 1 ? "course" : "courses"}
                </span>
              </div>
              <h3
                id={`cat-${phase.id}`}
                className="mt-1.5 text-[20px] font-semibold tracking-[-0.024em]"
              >
                {phase.title}
              </h3>
              {phase.subtitle && <p className="text-meta mt-1">{phase.subtitle}</p>}

              {/* ---- course cards ---- */}
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {phase.skills.map((skill) => (
                  <CourseCard key={skill.id} skill={skill} locked={phase.locked} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function CourseCard({ skill, locked }: { skill: Skill; locked: boolean }) {
  const total = skill.lessons.length;
  const done = skill.mastered;
  const complete = total > 0 && done === total;
  const difficulty = DIFFICULTY[skill.difficulty] ?? {
    label: skill.difficulty,
    tone: "neutral" as Tone,
  };

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <h4 className="title-card min-w-0">{skill.title}</h4>
        <div className="flex shrink-0 items-center gap-2">
          <Badge tone={locked ? "neutral" : difficulty.tone}>{difficulty.label}</Badge>
          {locked ? (
            <span className="icon-tile h-8 w-8">
              <Lock size={14} />
            </span>
          ) : complete ? (
            <span className="icon-tile icon-tile-success h-8 w-8">
              <Check size={15} strokeWidth={2.6} />
            </span>
          ) : (
            <span className="icon-tile h-8 w-8 transition-colors group-hover:bg-[var(--primary-faint)] group-hover:text-[var(--primary)]">
              <ChevronRight size={15} />
            </span>
          )}
        </div>
      </div>

      {skill.why && <p className="text-body mt-2 line-clamp-2 text-[13px]">{skill.why}</p>}

      <div className="mt-auto flex items-center gap-3 pt-5">
        <ProgressBar
          value={done}
          total={total}
          size="sm"
          tone={complete ? "success" : "primary"}
          label={`${skill.title}: ${done} of ${total} lessons mastered`}
        />
        <span className="num shrink-0 text-[12px] font-medium" style={{ color: "var(--text-faint)" }}>
          {done}/{total}
        </span>
      </div>
    </>
  );

  return locked ? (
    <div className="card flex flex-col p-4" style={{ opacity: 0.55 }} aria-disabled>
      {body}
    </div>
  ) : (
    <Link href={`/learning/skill/${skill.id}`} className="card card-link group flex flex-col p-4">
      {body}
    </Link>
  );
}
