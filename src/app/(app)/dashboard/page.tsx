import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Dumbbell,
  FolderKanban,
  Map,
  NotebookPen,
  RotateCcw,
  Sparkles,
  Target,
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
import { EmptyState, IconTile, StatTile, Steps } from "@/components/ui";
import { relativeDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

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

  const maxMinutes = Math.max(60, ...strip.map((d) => d.minutes));
  const totalMinutes = strip.reduce((sum, d) => sum + d.minutes, 0);
  const activeDays = strip.filter((d) => d.minutes > 0).length;

  return (
    <div className="page-body">
      {/* =============================================================== Hero
          One question answered above the fold: what do I do next. Everything
          else on this page is context for that decision, not competition. */}
      <section className="rise">
        <p className="eyebrow eyebrow-accent">{roadmap?.title ?? "No roadmap loaded"}</p>
        <h1 className="title-page mt-2">
          {greeting()}, {user.name}
        </h1>
        <p className="text-body mt-2">
          {dueCount > 0
            ? `${dueCount} lesson${dueCount === 1 ? "" : "s"} ${dueCount === 1 ? "is" : "are"} waiting for review.`
            : "All caught up. Ready for something new?"}
        </p>
      </section>

      {/* ---------------------------------------------------- Continue card */}
      {next ? (
        <Link
          href={`/learning/lesson/${next.lesson.id}`}
          className="card card-link rise group relative block overflow-hidden p-4 sm:p-5"
        >
          {/* A single directional wash marks this as the primary path forward */}
          <span
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(100deg, var(--primary-faint), transparent 46%)",
            }}
            aria-hidden
          />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
            <div className="min-w-0 flex-1">
              <p className="eyebrow eyebrow-accent">Next up</p>
              <h2 className="mt-1.5 truncate text-[21px] font-semibold tracking-[-0.024em]">
                {next.lesson.title}
              </h2>
              <p className="text-meta mt-1.5">
                {next.phase.title} · {next.skill.title} · about {next.lesson.estimatedMinutes} min
              </p>
              <div className="mt-4 flex max-w-sm items-center gap-3">
                <Steps
                  done={next.lesson.gateDone}
                  total={5}
                  label={`${next.lesson.gateDone} of 5 mastery requirements met`}
                />
                <span className="num shrink-0 text-[12px]" style={{ color: "var(--text-faint)" }}>
                  {next.lesson.gateDone}/5
                </span>
              </div>
            </div>
            <span className="btn btn-primary btn-lg shrink-0 self-start sm:self-auto">
              {next.lesson.gateDone > 0 ? "Resume lesson" : "Start lesson"}
              <ArrowRight
                size={16}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </span>
          </div>
        </Link>
      ) : (
        <EmptyState
          compact
          icon={<Map size={22} />}
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

      {/* ---------------------------------------------------------- Signals */}
      <section
        className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Progress summary"
      >
        <StatTile
          href="/learning"
          label="Roadmap progress"
          value={`${pct}%`}
          sub={`${roadmap?.masteredLessons ?? 0} of ${roadmap?.totalLessons ?? 0} lessons`}
          icon={<Map size={17} />}
          tone="primary"
          trend={pct > 0 ? "up" : undefined}
        />
        <StatTile
          href="/analytics"
          label="Current level"
          value={level.level}
          sub={`${level.title} · ${level.need - level.into} XP to next`}
          icon={<TrendingUp size={17} />}
          tone="info"
        />
        <StatTile
          label="Streak"
          value={`${user.currentStreak ?? 0}d`}
          sub={`Best ${user.longestStreak ?? 0} days`}
          icon={<Sparkles size={17} />}
          tone="warning"
          trend={(user.currentStreak ?? 0) > 0 ? "up" : "flat"}
        />
        <StatTile
          href="/review"
          label="Due for review"
          value={dueCount}
          sub={dueCount ? "waiting on you" : "all clear"}
          icon={<RotateCcw size={17} />}
          tone={dueCount ? "warning" : "success"}
        />
      </section>

      {/* -------------------------------------------------- Activity + rail */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* ------------------------------------------------------- Activity */}
        <section className="card flex flex-col p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="title-section">Your progress</h2>
              <p className="text-meta mt-0.5">
                {totalMinutes > 0
                  ? `${Math.round(totalMinutes / 6) / 10}h across ${activeDays} of the last 14 days`
                  : "Nothing tracked in the last two weeks"}
              </p>
            </div>
            <Link href="/analytics" className="btn btn-ghost btn-sm">
              Details <ArrowRight size={13} />
            </Link>
          </div>

          {/* Bars, not a line: the data is discrete daily totals, and a line
              between them would imply values that were never measured. */}
          <div className="mt-6 flex flex-1 items-end gap-1.5" style={{ minHeight: 132 }}>
            {strip.map((d, i) => {
              const isToday = i === strip.length - 1;
              const height = d.minutes > 0 ? Math.max(4, (d.minutes / maxMinutes) * 128) : 3;
              return (
                <div
                  key={d.day}
                  className="tooltip group flex flex-1 flex-col justify-end"
                  data-tip={`${d.minutes} min · ${d.day.slice(5)}`}
                  style={{ height: 132 }}
                >
                  <div
                    className="w-full rounded-[var(--radius-xs)]"
                    style={{
                      height,
                      background:
                        d.minutes > 0
                          ? isToday
                            ? "var(--primary)"
                            : "var(--primary-muted)"
                          : "var(--surface-3)",
                      transition: "background var(--dur) var(--ease)",
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div
            className="mt-2.5 flex justify-between text-[11px]"
            style={{ color: "var(--text-faint)" }}
          >
            <span>{strip[0]?.day.slice(5)}</span>
            <span>Today</span>
          </div>
        </section>

        {/* ----------------------------------------------------------- Rail */}
        <div className="flex flex-col gap-6">
          {/* Review queue */}
          <section className="card p-4">
            <div className="flex items-center gap-3">
              <IconTile tone={dueCount ? "warning" : "success"}>
                <RotateCcw size={16} />
              </IconTile>
              <h2 className="title-card">Revision queue</h2>
            </div>
            {dueCount === 0 ? (
              <p className="text-body mt-3 text-[13px]">
                Nothing due. Master a lesson and it comes back tomorrow.
              </p>
            ) : (
              <>
                <p className="text-body mt-3 text-[13px]">
                  <strong style={{ color: "var(--text)" }}>{dueCount}</strong>{" "}
                  {dueCount === 1 ? "lesson is" : "lessons are"} ready to be re-tested.
                </p>
                <Link href="/review" className="btn btn-secondary btn-block mt-4">
                  <Target size={15} /> Start review
                </Link>
              </>
            )}
          </section>

          {/* Recent notes */}
          <section className="card p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <IconTile tone="info">
                  <NotebookPen size={16} />
                </IconTile>
                <h2 className="title-card">Recent notes</h2>
              </div>
              <Link href="/notes" className="btn-icon btn-icon-sm" aria-label="All notes">
                <ArrowRight size={14} />
              </Link>
            </div>
            {notes.length === 0 ? (
              <p className="text-body mt-3 text-[13px]">
                Nothing captured yet. Notes you write link themselves into a graph.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col">
                {notes.map((n) => (
                  <li key={String(n._id)}>
                    <Link
                      href="/notes"
                      className="row-link flex items-center gap-2.5 px-2 py-2 text-[13px]"
                    >
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: "var(--primary-muted)" }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate">{n.title}</span>
                      <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>
                        {relativeDate(n.updatedAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Quick actions — four places you actually go, not a menu dump */}
          <section className="card p-4">
            <h2 className="title-card">Quick actions</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="well flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium"
                  style={{ transition: "background var(--dur-fast) var(--ease)" }}
                >
                  <Icon size={15} style={{ color: "var(--text-faint)" }} />
                  <span className="truncate">{label}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
