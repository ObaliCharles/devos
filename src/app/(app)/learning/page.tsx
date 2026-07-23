import Link from "next/link";
import { ArrowRight, BookOpen, Check, Lock, Search } from "lucide-react";
import { requireUser } from "@/lib/user";
import { getRoadmap, searchLessons } from "@/lib/queries";
import { Badge, EmptyState, PageHeader, ProgressBar, SearchField, type Tone } from "@/components/ui";

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
  const [roadmap, results] = await Promise.all([
    getRoadmap(user._id),
    q ? searchLessons(q) : Promise.resolve([]),
  ]);

  if (!roadmap) {
    return (
      <EmptyState
        icon={<BookOpen size={22} />}
        title="No roadmap loaded"
        body="Run npm run seed to load the starter roadmap, then refresh this page. Everything else in the workspace works without it."
      />
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
          <div className="flex w-full max-w-xl items-center gap-3">
            <ProgressBar
              value={roadmap.masteredLessons}
              total={roadmap.totalLessons}
              label={`${roadmap.masteredLessons} of ${roadmap.totalLessons} lessons mastered`}
            />
            <span className="num shrink-0 text-[13px] font-medium" style={{ color: "var(--text-muted)" }}>
              {roadmap.masteredLessons}/{roadmap.totalLessons}
            </span>
            <span className="badge badge-primary shrink-0">{progressPct}%</span>
          </div>
        }
        actions={<SearchField action="/learning" defaultValue={q} placeholder="Search lessons…" className="w-[240px]" />}
      />

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
                    <ArrowRight size={14} style={{ color: "var(--text-faint)" }} />
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
                            <ArrowRight size={14} />
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
