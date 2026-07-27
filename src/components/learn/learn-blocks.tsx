import Link from "next/link";
import {
  Award,
  BadgeCheck,
  Briefcase,
  Check,
  ChevronRight,
  CircleDot,
  Flame,
  FolderKanban,
  Lock,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { CERTIFICATIONS, COURSES, lessonCount } from "@/lib/catalog";
import { TechLogo, TECH_WITH_LOGO } from "./tech-logo";

/**
 * The lower bands of the Learn page, built to the reference layout:
 *
 *   Roadmap · Projects · Courses · Certifications   (four columns)
 *   Gamification · AI Mentor · Career Journey       (three columns)
 *
 * Every block is backed by a real query. The reference also carried a
 * Community feed; that is not here, because this product has no discussion
 * model and a fake feed of invented usernames is worse than an absent one.
 */

/* ------------------------------------------------------------------ shared */

function Block({
  title,
  href,
  hrefLabel = "View all",
  children,
}: {
  title: string;
  href?: string;
  hrefLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card flex flex-col p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="title-card">{title}</h2>
        {href && (
          <Link href={href} className="text-[12px] font-medium" style={{ color: "var(--primary)" }}>
            {hrefLabel}
          </Link>
        )}
      </div>
      <div className="mt-3 flex flex-1 flex-col">{children}</div>
    </section>
  );
}

function Row({
  href,
  mark,
  title,
  meta,
  pct,
  trailing,
}: {
  href: string;
  mark: React.ReactNode;
  title: string;
  meta: string;
  pct?: number;
  trailing?: React.ReactNode;
}) {
  return (
    <li>
      <Link href={href} className="row-link -mx-2 flex items-center gap-2.5 px-2 py-2">
        <span className="shrink-0">{mark}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium">{title}</span>
          <span className="text-meta block truncate text-[11.5px]">{meta}</span>
          {pct !== undefined && (
            <span className="progress mt-1.5 block">
              <span className="progress-bar block" style={{ width: `${pct}%` }} />
            </span>
          )}
        </span>
        {trailing ?? <ChevronRight size={14} className="shrink-0" style={{ color: "var(--text-faint)" }} />}
      </Link>
    </li>
  );
}

/* ================================================================ band one */

export type PhaseRow = { id: string; title: string; pct: number; locked: boolean; current: boolean };
export type ProjectRow = {
  id: string;
  title: string;
  status: string;
  tasks: number;
  tasksDone: number;
};

export function LearnBands({
  phases,
  pathTitle,
  pathPct,
  projects,
  courseProgress,
  earnedCertNames,
  level,
  levelTitle,
  xp,
  into,
  need,
  streak,
  badgesEarned,
  badgesTotal,
}: {
  phases: PhaseRow[];
  pathTitle: string;
  pathPct: number;
  projects: ProjectRow[];
  courseProgress: Record<string, number>;
  earnedCertNames: string[];
  level: number;
  levelTitle: string;
  xp: number;
  into: number;
  need: number;
  streak: number;
  badgesEarned: number;
  badgesTotal: number;
}) {
  const earned = new Set(earnedCertNames.map((n) => n.toLowerCase()));

  return (
    <>
      {/* ------------- Roadmap · Projects · Courses · Certifications -------- */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {/* Roadmap — the phases as a vertical stepper */}
        <Block title="Roadmap" href="/learning/roadmap">
          <p className="text-[12px] font-medium" style={{ color: "var(--primary)" }}>
            {pathTitle}{" "}
            <span className="num" style={{ color: "var(--text-faint)" }}>
              {pathPct}% completed
            </span>
          </p>
          <ol className="relative mt-3 flex flex-col gap-3">
            {phases.length > 1 && (
              <span
                className="absolute bottom-3 left-[10px] top-3 w-px"
                style={{ background: "var(--border)" }}
                aria-hidden
              />
            )}
            {phases.slice(0, 5).map((p, i) => (
              <li key={p.id} className="relative flex items-start gap-2.5">
                <span
                  className="relative z-[1] grid h-[21px] w-[21px] shrink-0 place-items-center rounded-full text-[10px] font-medium"
                  style={{
                    background: p.pct === 100 ? "var(--primary)" : "var(--surface-3)",
                    border: `1px solid ${p.current ? "var(--primary)" : "var(--border)"}`,
                    color: p.pct === 100 ? "var(--primary-ink)" : "var(--text-muted)",
                  }}
                >
                  {p.pct === 100 ? <Check size={10} strokeWidth={3} /> : p.locked ? <Lock size={9} /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-medium">{p.title}</span>
                  <span
                    className="block text-[11px]"
                    style={{ color: p.current ? "var(--primary)" : "var(--text-faint)" }}
                  >
                    {p.pct === 100
                      ? "Completed"
                      : p.locked
                        ? "Locked"
                        : p.current
                          ? "In progress"
                          : "Upcoming"}
                  </span>
                </span>
              </li>
            ))}
            {phases.length === 0 && (
              <li className="text-meta text-[12.5px]">No path active yet.</li>
            )}
          </ol>
        </Block>

        {/* Projects — your real ones, with real task completion */}
        <Block title="Projects" href="/projects">
          <ul className="flex flex-col">
            {projects.slice(0, 4).map((p) => {
              const pct = p.tasks > 0 ? Math.round((p.tasksDone / p.tasks) * 100) : 0;
              return (
                <Row
                  key={p.id}
                  href={`/projects/${p.id}`}
                  mark={
                    <span className="icon-tile">
                      <FolderKanban size={14} />
                    </span>
                  }
                  title={p.title}
                  meta={p.status === "complete" ? "Completed" : titleCase(p.status)}
                  pct={pct}
                  trailing={
                    <span className="num shrink-0 text-[11.5px]" style={{ color: "var(--text-faint)" }}>
                      {pct}%
                    </span>
                  }
                />
              );
            })}
            {projects.length === 0 && (
              <li className="text-meta py-1 text-[12.5px]">
                No projects yet. Start one from a brief.
              </li>
            )}
          </ul>
        </Block>

        {/* Courses — the catalog, with your real progress */}
        <Block title="Courses" href="/learning">
          <ul className="flex flex-col">
            {COURSES.slice(0, 4).map((c) => {
              const total = lessonCount(c);
              const done = courseProgress[c.slug] ?? 0;
              return (
                <Row
                  key={c.slug}
                  href={`/learning/course/${c.slug}`}
                  mark={
                    c.tech && TECH_WITH_LOGO.has(c.tech) ? (
                      <TechLogo name={c.tech} mode="plate" size={28} />
                    ) : (
                      <span className="icon-tile">
                        <Sparkles size={14} />
                      </span>
                    )
                  }
                  title={c.title}
                  meta={`${c.modules.length} modules · ${c.level}`}
                  pct={total > 0 && done > 0 ? Math.round((done / total) * 100) : undefined}
                />
              );
            })}
          </ul>
        </Block>

        {/* Certifications — earned ones tick, the rest are targets */}
        <Block title="Certifications" href="/career/certificates">
          <ul className="flex flex-col">
            {CERTIFICATIONS.slice(0, 4).map((c) => {
              const has = earned.has(c.title.toLowerCase());
              return (
                <Row
                  key={c.slug}
                  href="/career/certificates"
                  mark={
                    <span className="icon-tile">
                      <BadgeCheck size={14} />
                    </span>
                  }
                  title={c.title}
                  meta={c.provider}
                  trailing={
                    has ? (
                      <Check size={15} className="shrink-0" style={{ color: "var(--success)" }} />
                    ) : (
                      <CircleDot size={14} className="shrink-0" style={{ color: "var(--text-faint)" }} />
                    )
                  }
                />
              );
            })}
          </ul>
        </Block>
      </section>

      {/* ------------------- Gamification · AI Mentor · Career Journey ------ */}
      <section className="grid gap-3 lg:grid-cols-3">
        {/* Gamification */}
        <Block title="Progress" href="/analytics">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[13px] font-medium">
              Level {level} · {levelTitle}
            </p>
            <p className="num text-[12.5px]" style={{ color: "var(--text-muted)" }}>
              {xp.toLocaleString()} XP
            </p>
          </div>
          <div className="mt-2 flex items-center gap-2.5">
            <div className="progress flex-1">
              <div className="progress-bar" style={{ width: `${Math.round((into / need) * 100)}%` }} />
            </div>
            <span className="num text-[11.5px]" style={{ color: "var(--text-faint)" }}>
              {Math.round((into / need) * 100)}%
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2.5">
              <span className="icon-tile shrink-0">
                <Flame size={14} />
              </span>
              <span className="min-w-0">
                <span className="num block text-[15px] font-semibold leading-none">{streak}</span>
                <span className="text-meta block text-[11px]">
                  day{streak === 1 ? "" : "s"} streak
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="icon-tile shrink-0">
                <Trophy size={14} />
              </span>
              <span className="min-w-0">
                <span className="num block text-[15px] font-semibold leading-none">
                  {badgesEarned}
                  <span style={{ color: "var(--text-faint)" }}>/{badgesTotal}</span>
                </span>
                <span className="text-meta block text-[11px]">badges</span>
              </span>
            </div>
          </div>
        </Block>

        {/* AI Mentor — the chips are real prefilled prompts */}
        <Block title="AI mentor" href="/ai/chat" hrefLabel="Open">
          <p className="text-meta text-[12px]">Ask anything about what you are learning.</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[
              "Explain this topic",
              "Give me an example",
              "Create a quiz",
              "Review my code",
              "Help me fix an error",
            ].map((p) => (
              <Link key={p} href={`/ai/chat?q=${encodeURIComponent(p)}`} className="chip chip-sm">
                {p}
              </Link>
            ))}
          </div>
          <Link
            href="/ai/chat"
            className="mt-auto flex items-center gap-2 pt-4"
            aria-label="Ask the AI mentor"
          >
            <span className="search flex-1">
              <Sparkles size={14} style={{ color: "var(--text-faint)" }} />
              <span className="flex-1 truncate text-[13px]">Ask anything…</span>
            </span>
            <span className="btn btn-primary btn-sm shrink-0" aria-hidden>
              <ChevronRight size={14} />
            </span>
          </Link>
        </Block>

        {/* Career journey — the product's actual arc, each step a real route */}
        <Block title="Career journey" href="/career">
          <ol className="flex flex-col">
            {[
              { label: "Learn", href: "/learning", icon: Sparkles },
              { label: "Practice", href: "/practice", icon: Zap },
              { label: "Build projects", href: "/projects", icon: FolderKanban },
              { label: "Get certified", href: "/career/certificates", icon: Award },
              { label: "Build a portfolio", href: "/career/portfolio", icon: Briefcase },
              { label: "Prepare interviews", href: "/career/interviews", icon: Trophy },
              { label: "Apply for jobs", href: "/career/applications", icon: BadgeCheck },
            ].map(({ label, href, icon: Icon }, i) => (
              <li key={href}>
                <Link href={href} className="row-link -mx-2 flex items-center gap-2.5 px-2 py-[7px]">
                  <span
                    className="num grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full text-[10px]"
                    style={{ background: "var(--neutral-faint)", color: "var(--text-faint)" }}
                  >
                    {i + 1}
                  </span>
                  <Icon size={13} style={{ color: "var(--text-faint)" }} className="shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-[12.5px]">{label}</span>
                  <ChevronRight size={13} style={{ color: "var(--text-faint)" }} className="shrink-0" />
                </Link>
              </li>
            ))}
          </ol>
        </Block>
      </section>
    </>
  );
}

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ");
}
