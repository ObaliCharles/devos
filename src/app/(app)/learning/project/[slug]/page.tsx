import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock, ExternalLink, Target } from "lucide-react";
import { COURSES, PROJECTS } from "@/lib/catalog";
import { ContentIcon } from "@/components/learn/icon";
import { TechLogo, TECH_WITH_LOGO } from "@/components/learn/tech-logo";

/**
 * A project brief.
 *
 * The difference between this and "build a REST API" is the rubric. Every row
 * is a binary you can check against your own work without asking anyone, in
 * the order a reviewer would look at them, weighted so a partial score means
 * something. If you cannot tell whether you have met a criterion, the
 * criterion is badly written — that is the bar the catalog copy is held to.
 *
 * Static: briefs are bundle data, so this prerenders and costs no query.
 */

export function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = PROJECTS.find((p) => p.slug === slug);
  return { title: project ? `${project.title} · DeveloperOS` : "Project" };
}

const KIND_LABEL: Record<string, string> = {
  docs: "Official docs",
  repo: "Repository",
  article: "Guide",
  video: "Video",
  spec: "Specification",
  tool: "Tool",
};

export default async function ProjectBriefPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = PROJECTS.find((p) => p.slug === slug);
  if (!project) notFound();

  const prereqs = (project.prerequisites ?? [])
    .map((s) => COURSES.find((c) => c.slug === s))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  const rubric = project.rubric ?? [];
  // Weights are authored to sum to 100. If they ever do not, say so rather
  // than silently rendering a rubric that cannot be scored.
  const weightTotal = rubric.reduce((n, r) => n + r.weight, 0);

  return (
    <div className="page-body measure-reading pb-10">
      {/* ------------------------------------------------------------- Header */}
      <header className="rise flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          {project.tech && TECH_WITH_LOGO.has(project.tech) ? (
            <TechLogo name={project.tech} mode="plate" size={48} />
          ) : (
            <span className="icon-tile icon-tile-lg">
              <ContentIcon name={project.icon} size={20} />
            </span>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge">{project.level}</span>
              <span className="badge">{project.track}</span>
              <span className="badge">
                <Clock size={11} /> ~{project.hours}h
              </span>
            </div>
            <h1 className="title-page mt-2">{project.title}</h1>
            <p className="text-body mt-1.5 text-[14px]">{project.tagline}</p>
          </div>
        </div>
        <Link href="/projects/new" className="btn btn-primary shrink-0">
          Start this build <ArrowRight size={15} />
        </Link>
      </header>

      {/* ------------------------------------------------------------ Outcome */}
      <section className="panel p-5">
        <div className="flex items-center gap-2">
          <Target size={15} style={{ color: "var(--text-faint)" }} />
          <h2 className="title-card">What you will be able to do</h2>
        </div>
        <p className="text-body mt-2 text-[14px]">{project.outcome}</p>
        {project.skills && project.skills.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {project.skills.map((s) => (
              <span key={s} className="badge">
                {s}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------- Prerequisites */}
      {prereqs.length > 0 && (
        <section className="panel p-5">
          <h2 className="title-card">Do these first</h2>
          <ul className="mt-3 flex flex-col gap-1">
            {prereqs.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/learning/course/${c.slug}`}
                  className="row-link flex items-center gap-3 px-2 py-2"
                >
                  {c.tech && TECH_WITH_LOGO.has(c.tech) ? (
                    <TechLogo name={c.tech} mode="plate" size={26} />
                  ) : (
                    <span className="icon-tile">
                      <ContentIcon name={c.icon} size={13} />
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{c.title}</span>
                  <ArrowRight size={14} style={{ color: "var(--text-faint)" }} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* -------------------------------------------------------------- Rubric */}
      {rubric.length > 0 && (
        <section className="panel p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="title-card">How it will be assessed</h2>
            <span className="text-meta num text-[12px]">
              {weightTotal === 100 ? "100 points" : `${weightTotal} points`}
            </span>
          </div>
          <p className="text-body mt-1.5 text-[13px]">
            Every row is something you can check yourself. If you cannot tell whether you have met
            one, treat that as a bug in the brief and tell us.
          </p>
          <ol className="mt-4 flex flex-col">
            {rubric.map((r, i) => (
              <li
                key={r.criterion}
                className="flex items-baseline gap-3 py-2.5"
                style={{ borderTop: i === 0 ? undefined : "1px solid var(--border)" }}
              >
                <span className="num shrink-0 text-[12px]" style={{ color: "var(--text-faint)" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1 text-[13.5px] leading-relaxed">{r.criterion}</span>
                <span
                  className="num shrink-0 text-[12.5px] font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  {r.weight}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ---------------------------------------------------------- Submission */}
      {project.submission && project.submission.length > 0 && (
        <section className="panel p-5">
          <h2 className="title-card">What to hand in</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {project.submission.map((s) => (
              <li
                key={s}
                className="flex gap-2.5 text-[13.5px] leading-relaxed"
                style={{ color: "var(--text-muted)" }}
              >
                <span className="shrink-0" style={{ color: "var(--text-faint)" }} aria-hidden>
                  □
                </span>
                {s}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ----------------------------------------------------------- Reference */}
      {((project.resources?.length ?? 0) > 0 || project.repo) && (
        <section className="panel p-5">
          <h2 className="title-card">Reference</h2>
          <ul className="mt-3 flex flex-col">
            {project.repo && (
              <li>
                <a
                  href={project.repo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="row-link flex items-center gap-3 px-2 py-2.5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium">Starter repository</span>
                    <span className="text-meta block truncate text-[12px]">
                      {new URL(project.repo).hostname.replace(/^www\./, "")}
                    </span>
                  </span>
                  <ExternalLink size={14} className="shrink-0" style={{ color: "var(--text-faint)" }} />
                </a>
              </li>
            )}
            {(project.resources ?? []).map((r) => (
              <li key={r.url}>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="row-link flex items-center gap-3 px-2 py-2.5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium">{r.label}</span>
                    <span className="text-meta block truncate text-[12px]">
                      {KIND_LABEL[r.kind] ?? r.kind} · {new URL(r.url).hostname.replace(/^www\./, "")}
                    </span>
                  </span>
                  <ExternalLink size={14} className="shrink-0" style={{ color: "var(--text-faint)" }} />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
