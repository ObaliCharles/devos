import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  Check,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Code2,
  FolderGit2,
  Play,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { ContentIcon } from "./icon";
import { PathRail, type PathStep } from "./path-rail";
import { TechLogo, TECH_WITH_LOGO } from "./tech-logo";
import { Reveal } from "@/components/reveal";
import { AiMark } from "@/components/ai-mark";

/**
 * The Learn page as it reads on a phone.
 *
 * The previous mobile Learn was a catalogue: search, four tabs, a list of
 * everything. That answers "what exists", which is the second question. The
 * first one is "what am I in the middle of", so this opens on your own path —
 * the lesson you left, today's three things, the rail of skills you have
 * cleared — and moves the catalogue one tap away to /learning/browse behind
 * each rail's "See all".
 *
 * The order is the reference's, and every number in it is real: the lesson,
 * the percentages, the counts, the estimates. Where the reference showed
 * something the product does not measure, the element is dropped rather than
 * filled in. Renders only below lg; the desktop hub takes over from there.
 */

type Next = {
  id: string;
  lessonTitle: string;
  skillTitle: string;
  /** Whole-skill remainder, not just this lesson. */
  minutesLeft: number;
  lessonsLeft: number;
  skillPct: number;
  tech: string | null;
  started: boolean;
};

type RoadmapCard = {
  id: string;
  title: string;
  icon: string;
  lessons: number;
  pct: number;
  active: boolean;
};

type ProjectCard = {
  key: string;
  href: string;
  title: string;
  tech?: string;
  icon: string;
  status: string;
  pct: number | null;
};

type CourseCard = {
  slug: string;
  title: string;
  tech?: string;
  icon: string;
  level: string;
  pct: number;
};

type CertCard = {
  slug: string;
  title: string;
  provider: string;
  icon: string;
  earned: boolean;
};

type Progress = {
  completedPct: number;
  lessons: [number, number];
  projects: [number, number];
  certs: number;
  challenges: number;
  badgesEarned: number;
  badgesTotal: number;
};

export function LearnMobileHome({
  next,
  dueCount,
  openProjects,
  path,
  steps,
  roadmaps,
  projects,
  courses,
  certifications,
  progress,
}: {
  next: Next | null;
  dueCount: number;
  openProjects: number;
  path: { title: string; pct: number } | null;
  steps: PathStep[];
  roadmaps: RoadmapCard[];
  projects: ProjectCard[];
  courses: CourseCard[];
  certifications: CertCard[];
  progress: Progress;
}) {
  return (
    <div className="flex flex-col gap-6">
      {/* ============================================================== Heading
          No greeting here. The dashboard already greets you by name, and a
          second "Good morning" one tap later is noise — this page's job is to
          get you back into the lesson, so it says what the page is and stops. */}
      <header className="rise">
        <h1 className="text-[24px] font-bold leading-tight tracking-[-0.03em]">Learn</h1>
        <p className="text-body mt-1 text-[14px]">Pick up where you left off.</p>
      </header>

      {/* =================================================== Continue learning */}
      <Reveal>
        {next ? (
          <Link href={`/learning/lesson/${next.id}`} className="card card-link block p-3.5">
            {/* Stacked rather than the reference's single row: at 390px a logo,
                a title, a bar and a button on one line leaves the title about
                three words. */}
            <span className="flex items-center gap-3">
              {next.tech && TECH_WITH_LOGO.has(next.tech) ? (
                <TechLogo name={next.tech} mode="plate" size={60} />
              ) : (
                <span className="icon-tile h-[60px] w-[60px]">
                  <Code2 size={22} />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-semibold" style={{ color: "var(--primary)" }}>
                  Continue learning
                </span>
                <span className="mt-0.5 block truncate text-[16px] font-bold tracking-[-0.02em]">
                  {next.skillTitle}
                </span>
                <span className="text-meta mt-0.5 block truncate text-[12px]">
                  {next.lessonTitle}
                </span>
              </span>
            </span>

            <span className="mt-3 flex items-center gap-2.5">
              <span className="progress flex-1">
                <span className="progress-bar" style={{ width: `${next.skillPct}%` }} />
              </span>
              <span className="num text-[12px] font-medium" style={{ color: "var(--text-muted)" }}>
                {next.skillPct}%
              </span>
            </span>

            <span className="mt-3 flex items-center justify-between gap-3">
              <span
                className="flex items-center gap-1.5 text-[12px]"
                style={{ color: "var(--text-faint)" }}
              >
                <Clock size={12} /> {fmtDuration(next.minutesLeft)} left
              </span>
              {/* The card is the link; this is the affordance, not a second target. */}
              <span className="btn btn-primary btn-sm shrink-0" aria-hidden>
                <Play size={14} /> {next.started ? "Resume" : "Start"}
              </span>
            </span>
          </Link>
        ) : (
          <div className="card p-4">
            <p className="text-[14px] font-medium">Nothing in progress</p>
            <p className="text-body mt-1 text-[14px]">
              Follow a path and your next lesson opens from here.
            </p>
            <Link href="/learning/browse" className="btn btn-primary btn-sm mt-3">
              Browse paths
            </Link>
          </div>
        )}
      </Reveal>

      {/* ======================================================= Today's goal
          Three columns, each a real thing the app can check off. The reference
          shows "1 Quiz"; the product's equivalent is the spaced-repetition
          queue, so it says Reviews and counts the real ones. */}
      <Reveal>
        <div className="card p-4" style={{ background: "var(--surface-2)" }}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[16px] font-bold tracking-[-0.02em]">Today&apos;s goal</h2>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-0.5 text-[12px] font-medium"
              style={{ color: "var(--primary)" }}
            >
              View all <ChevronRight size={13} />
            </Link>
          </div>
          <p className="text-meta mt-0.5 text-[12px]">Keep the momentum going.</p>

          <div className="mt-3.5 grid grid-cols-3">
            <Goal
              icon={<BookOpen size={15} />}
              value={next ? next.lessonsLeft : 0}
              label={next && next.lessonsLeft === 1 ? "Lesson left" : "Lessons left"}
              meta={next ? `~${fmtDuration(next.minutesLeft)}` : "—"}
            />
            <Goal
              icon={<ClipboardCheck size={15} />}
              value={dueCount}
              label={dueCount === 1 ? "Review" : "Reviews"}
              meta={dueCount > 0 ? `~${fmtDuration(dueCount * 3)}` : "All clear"}
              divided
            />
            <Goal
              icon={<Code2 size={15} />}
              value={openProjects}
              label={openProjects === 1 ? "Project" : "Projects"}
              meta={openProjects > 0 ? "In progress" : "None open"}
              divided
            />
          </div>
        </div>
      </Reveal>

      {/* ==================================================== Your learning path */}
      {path && steps.length > 0 && (
        <Reveal>
          <div className="card p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[16px] font-bold tracking-[-0.02em]">Your learning path</h2>
              <Link
                href="/learning/roadmap"
                className="inline-flex items-center gap-0.5 text-[12px] font-medium"
                style={{ color: "var(--primary)" }}
              >
                Full path <ChevronRight size={13} />
              </Link>
            </div>

            <p className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-[14px] font-semibold" style={{ color: "var(--primary)" }}>
                {path.title}
              </span>
              <span className="text-meta num text-[12px]">{path.pct}% completed</span>
            </p>

            {/* The rail scrolls rather than wraps: a sequence that breaks to a
                second row stops reading as a sequence. It opens centred on the
                step you are on — see PathRail. */}
            <PathRail steps={steps} />
          </div>
        </Reveal>
      )}

      {/* ========================================================= Next step
          The reference paints this amber. This product has one accent and this
          is the most interactive thing on the page, so it gets it — a warning
          colour on an encouragement would be signage pointing at nothing. */}
      {next && (
        <Reveal>
          <div
            className="card p-4"
            style={{ background: "var(--primary-faint)", borderColor: "var(--primary-muted)" }}
          >
            <div className="flex items-start gap-3">
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
                style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
              >
                <Target size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold" style={{ color: "var(--primary)" }}>
                  Your next step
                </p>
                <p className="mt-1 text-[14px] leading-snug">
                  You&apos;re <strong className="font-semibold">{next.lessonsLeft}</strong>{" "}
                  {next.lessonsLeft === 1 ? "lesson" : "lessons"} from finishing{" "}
                  <strong className="font-semibold">{next.skillTitle}</strong>.
                </p>
                <p className="text-meta mt-1 text-[12px]">
                  Estimated time: {fmtDuration(next.minutesLeft)}.
                </p>
              </div>
            </div>
            <Link href={`/learning/lesson/${next.id}`} className="btn btn-primary btn-block mt-3">
              {next.started ? "Resume" : "Start"} <ArrowRight size={15} />
            </Link>
          </div>
        </Reveal>
      )}

      {/* ==================================================== Recommended rail */}
      {roadmaps.length > 0 && (
        <section className="flex flex-col gap-3">
          <RailHeader title="Recommended for you" href="/learning/browse?tab=roadmaps" />
          <Rail>
            {roadmaps.map((r, i) => (
              <Reveal as="li" index={i} key={r.id} className="shrink-0">
                <Link
                  href="/learning/browse?tab=roadmaps"
                  className="card card-link flex h-full w-[190px] flex-col p-3.5"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="icon-tile icon-tile-primary">
                      <ContentIcon name={r.icon} size={16} />
                    </span>
                    <span className="badge">{r.active ? "Active" : "Roadmap"}</span>
                  </span>
                  <span className="mt-2.5 line-clamp-2 text-[14px] font-semibold leading-snug">
                    {r.title}
                  </span>
                  <span className="text-meta num mt-1 text-[12px]">{r.lessons} lessons</span>
                  <span className="mt-auto flex items-center gap-2 pt-3">
                    <span className="progress progress-sm flex-1">
                      <span className="progress-bar" style={{ width: `${r.pct}%` }} />
                    </span>
                    <span className="num text-[12px]" style={{ color: "var(--text-faint)" }}>
                      {r.pct}%
                    </span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </Rail>
        </section>
      )}

      {/* ======================================================= Projects rail */}
      {projects.length > 0 && (
        <section className="flex flex-col gap-3">
          <RailHeader title="Projects" href="/learning/browse?tab=projects" />
          <Rail>
            {projects.map((p, i) => (
              <Reveal as="li" index={i} key={p.key} className="shrink-0">
                <Link href={p.href} className="card card-link flex h-full w-[190px] flex-col p-3.5">
                  {p.tech && TECH_WITH_LOGO.has(p.tech) ? (
                    <TechLogo name={p.tech} mode="plate" size={36} />
                  ) : (
                    <span className="icon-tile">
                      <ContentIcon name={p.icon} size={16} />
                    </span>
                  )}
                  <span className="mt-2.5 line-clamp-2 text-[14px] font-semibold leading-snug">
                    {p.title}
                  </span>
                  <span
                    className="mt-1 text-[12px]"
                    style={{
                      color: p.pct === null ? "var(--text-faint)" : "var(--primary)",
                    }}
                  >
                    {p.status}
                  </span>
                  {p.pct !== null && (
                    <span className="mt-auto flex items-center gap-2 pt-3">
                      <span className="progress progress-sm flex-1">
                        <span className="progress-bar" style={{ width: `${p.pct}%` }} />
                      </span>
                      <span className="num text-[12px]" style={{ color: "var(--text-faint)" }}>
                        {p.pct}%
                      </span>
                    </span>
                  )}
                </Link>
              </Reveal>
            ))}
          </Rail>
        </section>
      )}

      {/* ======================================================== Courses rail */}
      <section className="flex flex-col gap-3">
        <RailHeader title="Courses" href="/learning/browse?tab=courses" />
        <Rail>
          {courses.map((c, i) => (
            <Reveal as="li" index={i} key={c.slug} className="shrink-0">
              <Link
                href={`/learning/course/${c.slug}`}
                className="card card-link flex h-full w-[190px] flex-col p-3.5"
              >
                {c.tech && TECH_WITH_LOGO.has(c.tech) ? (
                  <TechLogo name={c.tech} mode="plate" size={36} />
                ) : (
                  <span className="icon-tile">
                    <ContentIcon name={c.icon} size={16} />
                  </span>
                )}
                <span className="mt-2.5 line-clamp-2 text-[14px] font-semibold leading-snug">
                  {c.title}
                </span>
                <span className="text-meta mt-1 text-[12px]">{c.level}</span>
                {c.pct > 0 && (
                  <span className="mt-auto flex items-center gap-2 pt-3">
                    <span className="progress progress-sm flex-1">
                      <span className="progress-bar" style={{ width: `${c.pct}%` }} />
                    </span>
                    <span className="num text-[12px]" style={{ color: "var(--text-faint)" }}>
                      {c.pct}%
                    </span>
                  </span>
                )}
              </Link>
            </Reveal>
          ))}
        </Rail>
      </section>

      {/* ================================================= Certifications rail
          The fourth catalogue the desktop hub carries and the phone did not.
          A cert you have already earned says so rather than inviting you to
          start it again. */}
      {certifications.length > 0 && (
        <section className="flex flex-col gap-3">
          <RailHeader title="Certifications" href="/learning/browse?tab=certifications" />
          <Rail>
            {certifications.map((c, i) => (
              <Reveal as="li" index={i} key={c.slug} className="shrink-0">
                <Link
                  href="/career/certificates"
                  className="card card-link flex h-full w-[190px] flex-col p-3.5"
                >
                  <span className={`icon-tile ${c.earned ? "icon-tile-primary" : ""}`}>
                    <ContentIcon name={c.icon} size={16} />
                  </span>
                  <span className="mt-2.5 line-clamp-2 text-[14px] font-semibold leading-snug">
                    {c.title}
                  </span>
                  <span className="text-meta mt-1 text-[12px]">{c.provider}</span>
                  <span className="mt-auto pt-3">
                    {c.earned ? (
                      <span className="badge badge-primary">
                        <Check size={10} /> Earned
                      </span>
                    ) : (
                      <span className="badge">Not started</span>
                    )}
                  </span>
                </Link>
              </Reveal>
            ))}
          </Rail>
        </section>
      )}

      {/* ======================================================= Your progress
          The desktop hub ends on a progress overview; the phone had nothing
          equivalent, so the page never answered "how far in am I overall".
          Every figure is a real count, not a target nobody set. */}
      <Reveal>
        <div className="card p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[16px] font-bold tracking-[-0.02em]">Your progress</h2>
            <Link
              href="/analytics"
              className="inline-flex items-center gap-0.5 text-[12px] font-medium"
              style={{ color: "var(--primary)" }}
            >
              Details <ChevronRight size={13} />
            </Link>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="progress progress-lg flex-1">
              <div className="progress-bar" style={{ width: `${progress.completedPct}%` }} />
            </div>
            <span className="num text-[12px] font-medium" style={{ color: "var(--text-muted)" }}>
              {progress.completedPct}%
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
            <Stat
              icon={<BookOpen size={14} />}
              value={`${progress.lessons[0]}/${progress.lessons[1]}`}
              label="Lessons mastered"
            />
            <Stat
              icon={<FolderGit2 size={14} />}
              value={`${progress.projects[0]}/${progress.projects[1]}`}
              label="Projects done"
            />
            <Stat icon={<Award size={14} />} value={`${progress.certs}`} label="Certificates" />
            <Stat
              icon={<Zap size={14} />}
              value={`${progress.challenges}`}
              label="Challenges solved"
            />
          </div>

          <Link
            href="/analytics/achievements"
            className="row-link -mx-2 mt-3 flex items-center gap-3 px-2 py-2"
          >
            <span className="icon-tile">
              <Trophy size={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-medium">Achievements</span>
              <span className="text-meta block text-[12px]">
                {progress.badgesEarned} of {progress.badgesTotal} earned
              </span>
            </span>
            <ChevronRight size={16} style={{ color: "var(--text-faint)" }} />
          </Link>
        </div>
      </Reveal>

      {/* ============================================================ AI mentor
          On desktop this is a whole band. On a phone it is one row that opens
          the assistant — the point is that it is reachable from Learn at all. */}
      <Reveal>
        <Link href="/ai/chat" className="card card-link flex items-center gap-3.5 p-4">
          <span className="icon-tile icon-tile-lg icon-tile-primary">
            <AiMark size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold">Ask the AI mentor</span>
            <span className="text-meta mt-0.5 block text-[12px]">
              It can see your lessons, notes and projects.
            </span>
          </span>
          <ChevronRight size={18} style={{ color: "var(--text-faint)" }} />
        </Link>
      </Reveal>

      {/* Browse everything — the catalogue this page used to be. */}
      <Reveal>
        <Link href="/learning/browse" className="card card-link flex items-center gap-3.5 p-4">
          <span className="icon-tile icon-tile-lg">
            <FolderGit2 size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold">Browse everything</span>
            <span className="text-meta mt-0.5 block text-[12px]">
              Roadmaps, courses, projects and certifications.
            </span>
          </span>
          <ChevronRight size={18} style={{ color: "var(--text-faint)" }} />
        </Link>
      </Reveal>
    </div>
  );
}

/* ------------------------------------------------------------------ Pieces */

function RailHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-[18px] font-bold tracking-[-0.02em]">{title}</h2>
      <Link
        href={href}
        className="inline-flex items-center gap-0.5 text-[12px] font-medium"
        style={{ color: "var(--primary)" }}
      >
        See all <ChevronRight size={13} />
      </Link>
    </div>
  );
}

/** A horizontal card rail that bleeds to both page gutters. */
function Rail({ children }: { children: React.ReactNode }) {
  return (
    <ul className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">{children}</ul>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="icon-tile">{icon}</span>
      <span className="min-w-0">
        <span className="num block text-[15px] font-semibold leading-none">{value}</span>
        <span className="text-meta mt-1 block truncate text-[12px]">{label}</span>
      </span>
    </div>
  );
}

function Goal({
  icon,
  value,
  label,
  meta,
  divided,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  meta: string;
  divided?: boolean;
}) {
  return (
    <div className={`min-w-0 px-2.5 ${divided ? "border-l" : ""}`}>
      <span
        className="grid h-8 w-8 place-items-center rounded-full"
        style={{ background: "var(--neutral-faint)", color: "var(--text-muted)" }}
      >
        {icon}
      </span>
      <p className="num mt-2 text-[18px] font-semibold leading-none">{value}</p>
      <p className="mt-1 truncate text-[12px] font-medium">{label}</p>
      <p className="truncate text-[12px]" style={{ color: "var(--text-faint)" }}>
        {meta}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ Format */

/** 270 -> "4h 30m", 32 -> "32 min". The reference's own phrasing. */
function fmtDuration(minutes: number) {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h}h` : `${h}h ${rest}m`;
}

