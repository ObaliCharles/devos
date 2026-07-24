import Link from "next/link";
import { BookOpen, Check, ChevronRight, Lock, Search, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/user";
import { getRoadmap, listRoadmaps, searchLessons } from "@/lib/queries";
import { isConfigured } from "@/lib/ai";
import { Badge, EmptyState, PageHeader, ProgressBar, SearchField, type Tone } from "@/components/ui";
import { RoadmapModes } from "@/components/roadmap-modes";
import { LearningModePanel } from "@/components/learning-mode-panel";

export const dynamic = "force-dynamic";

const DIFFICULTY: Record<string, { label: string; tone: Tone }> = {
  beginner: { label: "Beginner", tone: "success" },
  intermediate: { label: "Intermediate", tone: "warning" },
  advanced: { label: "Advanced", tone: "danger" },
};

export default async function LearningPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const user = await requireUser();
  const [roadmap, roadmaps, results] = await Promise.all([
    getRoadmap(user._id),
    listRoadmaps(user._id),
    q ? searchLessons(user._id, q) : Promise.resolve([]),
  ]);
  const configured = isConfigured();

  // No path at all: this is the first-run / empty state, and it should offer
  // the two ways forward rather than a dead "run the seed script" message.
  if (!roadmap) {
    return (
      <div className="page-body">
        <PageHeader
          eyebrow="Learning"
          title="Start a learning path"
          description="Follow a ready-made path, or describe what you want to learn and let the assistant build one for you."
        />
        <RoadmapModes roadmaps={roadmaps} configured={configured} />
        {roadmaps.length === 0 && (
          <EmptyState
            compact
            icon={<BookOpen size={22} />}
            title="No curated paths yet"
            body="Run npm run seed to load the starter roadmap, or generate your own path above."
          />
        )}
      </div>
    );
  }

  const progressPct = roadmap.totalLessons
    ? Math.round((roadmap.masteredLessons / roadmap.totalLessons) * 100)
    : 0;

  return (
    <div className="page-body">
      <PageHeader
        eyebrow="Learning path"
        title={roadmap.title}
        description={roadmap.summary}
        meta={
          <div className="flex w-full items-center gap-3 sm:max-w-md">
            <ProgressBar
              value={roadmap.masteredLessons}
              total={roadmap.totalLessons}
              label={`${roadmap.masteredLessons} of ${roadmap.totalLessons} lessons mastered`}
            />
            <span className="num shrink-0 text-[13px] font-medium" style={{ color: "var(--text-muted)" }}>
              {roadmap.masteredLessons}/{roadmap.totalLessons}
            </span>
            {roadmap.origin === "ai" && (
              <Badge tone="primary">
                <Sparkles size={10} /> AI path
              </Badge>
            )}
          </div>
        }
        actions={
          <SearchField
            action="/learning"
            defaultValue={q}
            placeholder="Search lessons…"
            className="w-full sm:w-[220px]"
          />
        }
      />

      {/* The path switcher and AI generator, collapsed by default so the phase
          list below stays the focus once a path is chosen. */}
      <LearningModePanel roadmaps={roadmaps} configured={configured} />

      {/* ------------------------------------------------------- Search results */}
      {q && (
        <section className="section-stack">
          <div className="flex items-center gap-2">
            <Search size={15} style={{ color: "var(--text-faint)" }} />
            <h2 className="title-section">
              {results.length} {results.length === 1 ? "result" : "results"} for “{q}”
            </h2>
            <Link href="/learning" className="btn btn-ghost btn-xs ml-auto">
              Clear
            </Link>
          </div>
          {results.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {results.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/learning/lesson/${r.id}`}
                    className="card card-link flex items-center gap-3 px-4 py-3 text-[13.5px]"
                  >
                    <BookOpen size={15} style={{ color: "var(--text-faint)" }} />
                    <span className="min-w-0 flex-1 truncate">{r.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              compact
              icon={<Search size={20} />}
              title={`Nothing matched “${q}”`}
              body="Try a broader term, or browse the phases below."
              action={
                <Link href="/learning" className="btn btn-secondary">
                  Browse the path
                </Link>
              }
            />
          )}
        </section>
      )}

      {/* -------------------------------------------------------------- Phases */}
      <div className="flex flex-col gap-10">
        {roadmap.phases.map((phase) => (
          <section key={phase.id} aria-labelledby={`phase-${phase.id}`}>
            <div className="flex flex-wrap items-center gap-3">
              <p className={`eyebrow ${phase.locked ? "" : "eyebrow-accent"}`}>Phase {phase.order}</p>
              {phase.locked && (
                <Badge>
                  <Lock size={11} /> Locked
                </Badge>
              )}
            </div>
            <h2 id={`phase-${phase.id}`} className="mt-1.5 text-[20px] font-semibold tracking-[-0.024em]">
              {phase.title}
            </h2>
            {phase.subtitle && <p className="text-meta mt-1">{phase.subtitle}</p>}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {phase.skills.map((skill) => {
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
                      <h3 className="title-card min-w-0">{skill.title}</h3>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge tone={phase.locked ? "neutral" : difficulty.tone}>
                          {difficulty.label}
                        </Badge>
                        {phase.locked ? (
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

                    {skill.why && (
                      <p className="text-body mt-2 line-clamp-2 text-[13px]">{skill.why}</p>
                    )}

                    <div className="mt-auto flex items-center gap-3 pt-5">
                      <ProgressBar
                        value={done}
                        total={total}
                        size="sm"
                        tone={complete ? "success" : "primary"}
                        label={`${skill.title}: ${done} of ${total} lessons mastered`}
                      />
                      <span
                        className="num shrink-0 text-[12px] font-medium"
                        style={{ color: "var(--text-faint)" }}
                      >
                        {done}/{total}
                      </span>
                    </div>
                  </>
                );

                return phase.locked ? (
                  <div
                    key={skill.id}
                    className="card flex flex-col p-4"
                    style={{ opacity: 0.55 }}
                    aria-disabled
                  >
                    {body}
                  </div>
                ) : (
                  <Link
                    key={skill.id}
                    href={`/learning/skill/${skill.id}`}
                    className="card card-link group flex flex-col p-4"
                  >
                    {body}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
