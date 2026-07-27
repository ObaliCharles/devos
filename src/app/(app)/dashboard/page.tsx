import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Dumbbell,
  FolderKanban,
  Lock,
  Map,
  NotebookPen,
  RotateCcw,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { requireUser, levelFromXp } from "@/lib/user";
import {
  countDueReviews,
  findNextLesson,
  getActivityStrip,
  getRecentNotes,
  getRoadmap,
} from "@/lib/queries";
import { EmptyState, StatTile } from "@/components/ui";
import { TechLogo, inferTech } from "@/components/learn/tech-logo";
import { COURSES } from "@/lib/catalog";
import { relativeDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const QUICK_ACTIONS = [
  { href: "/practice", label: "Practice", icon: Dumbbell },
  { href: "/notes", label: "New note", icon: NotebookPen },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
];

export default async function DashboardPage() {
  const user = await requireUser();
  const [roadmap, dueCount, notes, strip] = await Promise.all([
    getRoadmap(user._id),
    countDueReviews(user._id),
    getRecentNotes(user._id, 4),
    getActivityStrip(user._id),
  ]);

  const next = findNextLesson(roadmap);
  const level = levelFromXp(user.xp ?? 0);
  const pct =
    roadmap && roadmap.totalLessons > 0
      ? Math.round((roadmap.masteredLessons / roadmap.totalLessons) * 100)
      : 0;

  const lessonIndex = next ? next.skill.lessons.findIndex((l) => l.id === next.lesson.id) + 1 : 0;
  const lessonTotal = next?.skill.lessons.length ?? 0;
  const skillPct = lessonTotal > 0 ? ((lessonIndex - 1) / lessonTotal) * 100 : 0;

  // The mark for the thing you are learning right now. Generated paths carry no
  // technology field, so it is read out of the titles themselves.
  const tech = next ? inferTech(next.skill.title, next.phase.title, next.lesson.title) : null;

  const maxMinutes = Math.max(60, ...strip.map((d) => d.minutes));
  const totalMinutes = strip.reduce((sum, d) => sum + d.minutes, 0);
  const activeDays = strip.filter((d) => d.minutes > 0).length;

  /* ---- The path, flattened to a row of steps ----------------------------
     Every unlocked skill in order, with the one holding the next lesson
     marked current. This is the single most useful thing a learner can see:
     not "35% complete" but "here is the ladder and here is your rung." */
  const steps =
    roadmap?.phases.flatMap((phase) =>
      phase.skills.map((skill) => {
        const total = skill.lessons.length;
        const done = skill.lessons.filter((l) => l.state === "mastered").length;
        return {
          id: skill.id,
          title: skill.title,
          locked: phase.locked,
          done,
          total,
          current: next ? skill.id === next.skill.id : false,
          tech: inferTech(skill.title, phase.title),
        };
      }),
    ) ?? [];

  // Today: the smallest honest to-do list the data can support. No invented
  // targets — every row is something the app can actually check off.
  const today = [
    next && {
      href: `/learning/lesson/${next.lesson.id}`,
      label: next.lesson.title,
      meta: `${next.lesson.estimatedMinutes} min`,
      done: false,
    },
    dueCount > 0 && {
      href: "/review",
      label: `Clear ${dueCount} review${dueCount === 1 ? "" : "s"}`,
      meta: `${dueCount * 3} min`,
      done: false,
    },
    {
      href: "/practice",
      label: "Practice a challenge",
      meta: "15 min",
      done: false,
    },
  ].filter(Boolean) as { href: string; label: string; meta: string; done: boolean }[];

  // Three catalog courses to look at next, skipping anything on the path.
  const recommended = COURSES.filter((c) => c.tech).slice(0, 4);

  return (
    <div className="page-body">
      {/* =============================================================== Hero */}
      <section className="rise flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h1 className="title-page">{roadmap?.title ?? "No roadmap loaded"}</h1>
        <p className="text-meta">
          {next ? "Continue where you left off." : "Nothing queued on this path."}
        </p>
      </section>

      {/* ------------------------------------------------------ Continue card
          The one decision this page exists to make. The technology's own mark
          sits on the left because it is the fastest possible answer to "what
          am I even working on" — faster than reading the title. */}
      {next ? (
        <section className="card rise p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
            {tech ? (
              <TechLogo name={tech} mode="plate" size={56} className="hidden sm:grid" />
            ) : null}

            <div className="min-w-0 flex-1">
              <p className="eyebrow">Continue learning</p>
              <h2 className="mt-1.5 text-[19px] font-semibold leading-tight tracking-[-0.02em] sm:text-[21px]">
                {next.lesson.title}
              </h2>

              <p className="text-meta mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>{next.skill.title}</span>
                <Dot />
                <span>{next.lesson.estimatedMinutes} min remaining</span>
                {lessonTotal > 0 && (
                  <>
                    <Dot />
                    <span>
                      Lesson {lessonIndex} of {lessonTotal}
                    </span>
                  </>
                )}
              </p>

              <div className="mt-4 flex max-w-md items-center gap-3">
                <div className="progress flex-1">
                  <div
                    className="progress-bar"
                    style={{ width: `${skillPct}%` }}
                    role="progressbar"
                    aria-valuenow={Math.round(skillPct)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${next.skill.title}, lesson ${lessonIndex} of ${lessonTotal}`}
                  />
                </div>
                <span className="num text-[12px]" style={{ color: "var(--text-faint)" }}>
                  {Math.round(skillPct)}%
                </span>
              </div>
            </div>

            <Link
              href={`/learning/lesson/${next.lesson.id}`}
              className="btn btn-primary shrink-0 self-start lg:self-auto"
            >
              {next.lesson.gateDone > 0 ? "Resume" : "Start"}
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      ) : (
        <EmptyState
          compact
          icon={<Map size={20} />}
          title={roadmap ? "Every lesson mastered" : "No roadmap loaded"}
          body={
            roadmap
              ? "There is nothing left on the path. Add more content, or put the hours into shipping something."
              : "Run the seed script to load the starter roadmap, then refresh this page."
          }
          action={
            roadmap ? (
              <Link href="/projects/new" className="btn btn-primary">
                <FolderKanban size={15} /> Start a project
              </Link>
            ) : undefined
          }
        />
      )}

      {/* ------------------------------------------------------------- Path */}
      {steps.length > 1 && (
        <section className="card p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="title-section">Your path</h2>
            <Link href="/learning/roadmap" className="btn btn-ghost btn-sm">
              Full roadmap
            </Link>
          </div>

          {/* Horizontal scroll rather than wrap: a path is a sequence, and
              wrapping it onto a second line breaks the one thing it is for. */}
          <ol className="scrollbar-none mt-5 flex gap-2 overflow-x-auto pb-1">
            {steps.map((step, i) => (
              <PathStep key={step.id} step={step} index={i} last={i === steps.length - 1} />
            ))}
          </ol>
        </section>
      )}

      {/* ---------------------------------------------------------- Signals */}
      <section
        className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Progress summary"
      >
        <StatTile
          href="/learning"
          label="Progress"
          value={`${pct}%`}
          sub={`${roadmap?.masteredLessons ?? 0} of ${roadmap?.totalLessons ?? 0} lessons`}
          icon={<Map size={16} />}
        />
        <StatTile
          href="/analytics"
          label="Current level"
          value={level.title}
          sub={`Level ${level.level} · ${level.need - level.into} XP to next`}
          icon={<TrendingUp size={16} />}
        />
        <StatTile
          label="Streak"
          value={`${user.currentStreak ?? 0} ${(user.currentStreak ?? 0) === 1 ? "day" : "days"}`}
          sub={`Best ${user.longestStreak ?? 0} days`}
          icon={<Sparkles size={16} />}
        />
        <StatTile
          href="/review"
          label="Review queue"
          value={dueCount}
          sub={dueCount ? "waiting on you" : "all clear"}
          icon={<RotateCcw size={16} />}
        />
      </section>

      {/* -------------------------------------------------- Activity + rail */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.62fr)_minmax(0,1fr)]">
        <section className="card flex flex-col p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="title-section">Your progress</h2>
              <p className="text-meta mt-1">
                {totalMinutes > 0
                  ? `${Math.round(totalMinutes / 6) / 10}h across ${activeDays} of the last 14 days`
                  : "Nothing tracked in the last two weeks"}
              </p>
            </div>
            <Link href="/analytics" className="btn btn-ghost btn-sm">
              Details
            </Link>
          </div>

          <div className="chart mt-6 flex-1" style={{ minHeight: 120 }}>
            <div className="chart-grid" aria-hidden>
              <span />
              <span />
              <span />
              <span />
            </div>
            {strip.map((d, i) => {
              const isToday = i === strip.length - 1;
              const empty = d.minutes === 0;
              const height = empty ? 2 : Math.max(3, (d.minutes / maxMinutes) * 116);
              return (
                <div
                  key={d.day}
                  className="chart-col tooltip"
                  data-tip={`${d.minutes} min · ${d.day.slice(5)}`}
                  style={{ height: 120 }}
                >
                  <div
                    className={`bar ${empty ? "bar-empty" : isToday ? "bar-today" : ""}`}
                    style={{ height }}
                  />
                </div>
              );
            })}
          </div>

          <div
            className="mt-3 flex justify-between text-[12px]"
            style={{ color: "var(--text-faint)" }}
          >
            <span>{strip[0]?.day.slice(5)}</span>
            <span>Today</span>
          </div>
        </section>

        {/* ------------------------------------------------------------ Rail */}
        <div className="flex flex-col gap-3">
          <RailCard title="Today">
            <ul className="-mx-2 flex flex-col">
              {today.map((t) => (
                <li key={t.href}>
                  <Link
                    href={t.href}
                    className="row-link flex items-center gap-3 px-2 py-2 text-[13px]"
                  >
                    <span
                      className="grid h-[16px] w-[16px] shrink-0 place-items-center rounded-[5px]"
                      style={{ border: "1px solid var(--border-strong)" }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate">{t.label}</span>
                    <span className="shrink-0 text-[12px]" style={{ color: "var(--text-faint)" }}>
                      {t.meta}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </RailCard>

          <RailCard title="Revision queue" href={dueCount ? "/review" : undefined} cta="Start">
            <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
              {dueCount === 0 ? (
                "Nothing due. Master a lesson and it comes back tomorrow."
              ) : (
                <>
                  <span className="num font-medium" style={{ color: "var(--text)" }}>
                    {dueCount}
                  </span>{" "}
                  {dueCount === 1 ? "lesson is" : "lessons are"} ready to be re-tested.
                </>
              )}
            </p>
          </RailCard>

          <RailCard title="Recent notes" href="/notes" cta="View all">
            {notes.length === 0 ? (
              <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                Nothing captured yet. Notes you write link themselves into a graph.
              </p>
            ) : (
              <ul className="-mx-2 flex flex-col">
                {notes.map((n) => (
                  <li key={String(n._id)}>
                    <Link
                      href="/notes"
                      className="row-link flex items-center gap-3 px-2 py-1.5 text-[13px]"
                    >
                      <span className="min-w-0 flex-1 truncate">{n.title}</span>
                      <span className="shrink-0 text-[12px]" style={{ color: "var(--text-faint)" }}>
                        {relativeDate(n.updatedAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </RailCard>

          <RailCard title="Quick actions">
            <div className="-mx-2 grid grid-cols-2">
              {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="row-link flex items-center gap-2.5 px-2 py-2 text-[13px]"
                >
                  <Icon size={15} style={{ color: "var(--text-faint)" }} />
                  <span className="truncate">{label}</span>
                </Link>
              ))}
            </div>
          </RailCard>
        </div>
      </div>

      {/* ------------------------------------------------------ Recommended */}
      <section>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="title-section">Courses to look at</h2>
          <Link href="/learning" className="btn btn-ghost btn-sm">
            Browse all
          </Link>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {recommended.map((course) => (
            <Link
              key={course.slug}
              href={`/learning/course/${course.slug}`}
              className="card card-link flex h-full flex-col p-3.5"
            >
              <TechLogo name={course.tech!} mode="plate" size={34} />
              <p className="mt-3 text-[13.5px] font-medium leading-snug">{course.title}</p>
              <p className="text-meta mt-1.5 line-clamp-2 text-[12px]">{course.tagline}</p>
              <p className="text-meta mt-auto pt-3 text-[12px]">
                {course.level} · {course.hours}h
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

/* --------------------------------------------------------------- Path step */

/**
 * One rung of the ladder. Four states, and each one is legible without colour:
 * done carries a tick, current carries the accent ring, upcoming is a number,
 * locked is a padlock. Colour only reinforces what the shape already says.
 */
function PathStep({
  step,
  index,
  last,
}: {
  step: {
    title: string;
    locked: boolean;
    done: number;
    total: number;
    current: boolean;
    tech: string | null;
  };
  index: number;
  last: boolean;
}) {
  const complete = step.done >= step.total && step.total > 0;

  return (
    <li className="flex min-w-[118px] flex-1 shrink-0 flex-col items-center gap-2 text-center">
      <div className="flex w-full items-center gap-2">
        {/* The connector before this node, so the line sits between nodes
            rather than hanging off the end of the last one. */}
        <span
          className="h-px flex-1"
          style={{ background: index === 0 ? "transparent" : "var(--border)" }}
          aria-hidden
        />

        <span
          className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full text-[11.5px] font-medium"
          style={{
            background: complete ? "var(--primary)" : "var(--surface-2)",
            border: `1px solid ${step.current ? "var(--primary)" : complete ? "var(--primary)" : "var(--border)"}`,
            boxShadow: step.current ? "0 0 0 3px var(--primary-faint)" : undefined,
            color: complete
              ? "var(--primary-ink)"
              : step.locked
                ? "var(--text-faint)"
                : "var(--text-muted)",
          }}
        >
          {complete ? (
            <Check size={15} strokeWidth={2.5} />
          ) : step.locked ? (
            <Lock size={13} />
          ) : step.tech ? (
            <TechLogo name={step.tech} size={16} mode="mono" />
          ) : (
            index + 1
          )}
        </span>

        <span
          className="h-px flex-1"
          style={{ background: last ? "transparent" : "var(--border)" }}
          aria-hidden
        />
      </div>

      <span className="w-full px-1">
        <span
          className="block truncate text-[12.5px] font-medium"
          style={{ color: step.current || complete ? "var(--text)" : "var(--text-muted)" }}
          title={step.title}
        >
          {step.title}
        </span>
        <span className="mt-0.5 block text-[11.5px]" style={{ color: "var(--text-faint)" }}>
          {step.locked
            ? "Locked"
            : complete
              ? "Complete"
              : step.current
                ? "In progress"
                : `${step.done}/${step.total}`}
        </span>
      </span>
    </li>
  );
}

/* --------------------------------------------------------------- Rail card */

function RailCard({
  title,
  href,
  cta,
  children,
}: {
  title: string;
  href?: string;
  cta?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-3.5">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-medium" style={{ color: "var(--text-muted)" }}>
          {title}
        </h2>
        {href && cta && (
          <Link
            href={href}
            className="shrink-0 text-[12px] font-medium"
            style={{ color: "var(--primary)" }}
          >
            {cta}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Dot() {
  return (
    <span aria-hidden style={{ color: "var(--text-faint)", opacity: 0.6 }}>
      ·
    </span>
  );
}
