import Link from "next/link";
import {
  CalendarDays,
  Dumbbell,
  FolderKanban,
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

  // "Lesson 3 of 8" is a more useful position than a global percentage when
  // you are standing in front of one skill, so it is computed against the
  // skill the next lesson belongs to, not the whole roadmap.
  const lessonIndex = next ? next.skill.lessons.findIndex((l) => l.id === next.lesson.id) + 1 : 0;
  const lessonTotal = next?.skill.lessons.length ?? 0;
  const skillPct = lessonTotal > 0 ? ((lessonIndex - 1) / lessonTotal) * 100 : 0;

  const maxMinutes = Math.max(60, ...strip.map((d) => d.minutes));
  const totalMinutes = strip.reduce((sum, d) => sum + d.minutes, 0);
  const activeDays = strip.filter((d) => d.minutes > 0).length;

  return (
    <div className="page-body">
      {/* =============================================================== Hero
          Two lines. The roadmap you are on, and what this page is for. No
          greeting, no time of day, no name: none of it changes what you do
          next, and all of it competes with the thing that does. */}
      <section className="rise">
        <h1 className="title-display">{roadmap?.title ?? "No roadmap loaded"}</h1>
        <p className="text-body mt-3">
          {next ? "Continue where you left off." : "Nothing queued on this path."}
        </p>
      </section>

      {/* ------------------------------------------------------ Continue card
          The one decision this page exists to make. Lesson title large, three
          pieces of metadata under it, a 3px line for position, one button. */}
      {next ? (
        <section className="card rise p-6 sm:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-[26px] font-semibold leading-tight tracking-[-0.028em] sm:text-[30px]">
                {next.lesson.title}
              </h2>

              {/* Metadata reads as one quiet line, separated by dots rather
                  than stacked, so it stays subordinate to the title. */}
              <p className="text-meta mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
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

              <div className="progress mt-6 max-w-md">
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
            </div>

            <Link
              href={`/learning/lesson/${next.lesson.id}`}
              className="btn btn-primary btn-lg shrink-0 self-start lg:self-auto"
            >
              {next.lesson.gateDone > 0 ? "Resume" : "Start"}
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

      {/* ---------------------------------------------------------- Signals
          Four facts, one height, one type size, one icon treatment. Nothing
          here is coloured, because none of these four is more urgent than the
          others and colour would claim otherwise. */}
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
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.62fr)_minmax(0,1fr)]">
        {/* ------------------------------------------------------- Activity */}
        <section className="card flex flex-col p-6">
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

          {/* Bars, not a line: the data is discrete daily totals, and a line
              between them would imply values that were never measured. */}
          <div className="chart mt-8 flex-1" style={{ minHeight: 148 }}>
            <div className="chart-grid" aria-hidden>
              <span />
              <span />
              <span />
              <span />
            </div>
            {strip.map((d, i) => {
              const isToday = i === strip.length - 1;
              const empty = d.minutes === 0;
              const height = empty ? 2 : Math.max(4, (d.minutes / maxMinutes) * 144);
              return (
                <div
                  key={d.day}
                  className="chart-col tooltip"
                  data-tip={`${d.minutes} min · ${d.day.slice(5)}`}
                  style={{ height: 148 }}
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

        {/* ------------------------------------------------------------ Rail
            Three small utility cards, stacked. Each is a label, a fact, and at
            most one way in. None of them carries an icon tile: at this size a
            tile is 32px of chrome around 16px of content. */}
        <div className="flex flex-col gap-4">
          <RailCard title="Revision queue" href={dueCount ? "/review" : undefined} cta="Start review">
            {dueCount === 0 ? (
              <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                Nothing due. Master a lesson and it comes back tomorrow.
              </p>
            ) : (
              <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                <span className="num font-medium" style={{ color: "var(--text)" }}>
                  {dueCount}
                </span>{" "}
                {dueCount === 1 ? "lesson is" : "lessons are"} ready to be re-tested.
              </p>
            )}
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
    </div>
  );
}

/**
 * A rail card. Deliberately spare: a 13px label, the content, and an optional
 * text link in the header rather than a button in the footer, which keeps the
 * card the height of what is actually in it.
 */
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
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
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

/** The separator between metadata fields. */
function Dot() {
  return (
    <span aria-hidden style={{ color: "var(--text-faint)", opacity: 0.6 }}>
      ·
    </span>
  );
}
