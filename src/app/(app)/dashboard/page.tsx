import Link from "next/link";
import {
  ArrowRight,
  Award,
  Bookmark,
  Check,
  ChevronRight,
  Clock,
  Download,
  Flame,
  Lock,
  Play,
  Target,
  Zap,
} from "lucide-react";
import { requireUser, levelFromXp } from "@/lib/user";
import {
  countDueReviews,
  findNextLesson,
  getAchievements,
  getActivityStrip,
  getCatalogProgressMap,
  getCertificates,
  getRoadmap,
  getUserCounts,
} from "@/lib/queries";
import { COURSES, lessonCount } from "@/lib/catalog";
import { TechLogo, inferTech } from "@/components/learn/tech-logo";
import { DashboardMobile } from "@/components/dashboard-mobile";
import { EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * The dashboard.
 *
 * Structured to answer "what should I do next" above the fold and nothing
 * else. The layout follows the reference: a greeting, a four-up signal row,
 * then a three-column band of Continue / Path / Today, then analytics,
 * achievements and the certificate.
 *
 * The one rule applied throughout: every number is real. Where the reference
 * showed something this product has no data for — a course star rating, an
 * invented weekly hours goal — the block is either computed from data that
 * does exist or left out. A dashboard of plausible-looking fake numbers is the
 * single fastest way to make a product untrustworthy.
 */

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export default async function DashboardPage() {
  const user = await requireUser();
  const xp = user.xp ?? 0;
  const streak = user.currentStreak ?? 0;

  const [roadmap, dueCount, strip, counts, achievements, certs, catalogProgress] = await Promise.all([
    getRoadmap(user._id).catch(() => null),
    countDueReviews(user._id).catch(() => 0),
    getActivityStrip(user._id, 14).catch(() => []),
    getUserCounts(user._id, xp, streak).catch(() => null),
    getAchievements(user._id, xp, streak).catch(() => []),
    getCertificates(user._id).catch(() => []),
    getCatalogProgressMap(user._id, COURSES.map((c) => c.slug)).catch(
      () => ({}) as Record<string, number>,
    ),
  ]);

  const next = findNextLesson(roadmap);
  const level = levelFromXp(xp);
  const tech = next ? inferTech(next.skill.title, next.phase.title, next.lesson.title) : null;

  /* ---- Real week-over-week, from the 14-day strip ------------------------
     The reference showed "+2.5 hrs vs last week". That is computable here
     because the strip is exactly two weeks long, so it is the one delta on
     this page that is not invented. */
  const thisWeek = strip.slice(7).reduce((n, d) => n + d.minutes, 0);
  const lastWeek = strip.slice(0, 7).reduce((n, d) => n + d.minutes, 0);
  const deltaMin = thisWeek - lastWeek;
  const hrs = (m: number) => Math.round(m / 6) / 10;

  const lessonsMastered = counts?.lessonsMastered ?? roadmap?.masteredLessons ?? 0;
  const totalLessons = roadmap?.totalLessons ?? 0;
  const pathPct = totalLessons > 0 ? Math.round((lessonsMastered / totalLessons) * 100) : 0;

  const lessonIndex = next ? next.skill.lessons.findIndex((l) => l.id === next.lesson.id) + 1 : 0;
  const lessonTotal = next?.skill.lessons.length ?? 0;
  const skillPct =
    next && lessonTotal > 0
      ? Math.round((next.skill.lessons.filter((l) => l.state === "mastered").length / lessonTotal) * 100)
      : 0;

  /* ---- The path as a vertical stepper, exactly as the reference shows it -- */
  const phases =
    roadmap?.phases.map((p) => {
      const total = p.skills.reduce((n, s) => n + s.lessons.length, 0);
      const done = p.skills.reduce(
        (n, s) => n + s.lessons.filter((l) => l.state === "mastered").length,
        0,
      );
      return {
        id: p.id,
        title: p.title,
        locked: p.locked,
        pct: total > 0 ? Math.round((done / total) * 100) : 0,
        current: next ? p.skills.some((s) => s.id === next.skill.id) : false,
      };
    }) ?? [];

  /* ---- Mobile-only derivations -------------------------------------------
     The phone dashboard shows "courses completed" and "time left in this
     skill", neither of which the desktop band needs. Both are computed from
     data already loaded, so the mobile view costs exactly one extra query. */
  const coursesCompleted = COURSES.filter((c) => {
    const total = lessonCount(c);
    return total > 0 && (catalogProgress[c.slug] ?? 0) >= total;
  }).length;

  const skillMinutesLeft = next
    ? next.skill.lessons
        .filter((l) => l.state !== "mastered")
        .reduce((n, l) => n + l.estimatedMinutes, 0)
    : 0;

  /* Phase nodes, restated as the rail states the mobile stepper draws. */
  const mobileSteps = phases.map((p) => ({
    id: p.id,
    title: p.title,
    pct: p.pct,
    state: (p.pct === 100
      ? "done"
      : p.locked
        ? "locked"
        : p.current
          ? "current"
          : "todo") as "done" | "locked" | "current" | "todo",
  }));

  /* ---- Today: only rows the app can actually check off ------------------- */
  const today = [
    next && {
      href: `/learning/lesson/${next.lesson.id}`,
      label: next.lesson.title,
      sub: next.skill.title,
      meta: `${next.lesson.estimatedMinutes} min`,
      icon: Play,
    },
    dueCount > 0 && {
      href: "/review",
      label: `Clear ${dueCount} review${dueCount === 1 ? "" : "s"}`,
      sub: "Spaced repetition queue",
      meta: `${dueCount * 3} min`,
      icon: Target,
    },
    {
      href: "/practice",
      label: "Solve a challenge",
      sub: "Practice",
      meta: "15 min",
      icon: Zap,
    },
  ].filter(Boolean) as {
    href: string;
    label: string;
    sub: string;
    meta: string;
    icon: typeof Play;
  }[];

  const earned = achievements.filter((a) => a.unlocked).slice(0, 4);
  const nearest = achievements
    .filter((a) => !a.unlocked)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 4 - earned.length);
  const badges = [...earned, ...nearest];

  const latestCert = certs[0];
  const week = strip.slice(7);
  const maxMin = Math.max(30, ...strip.map((d) => d.minutes));
  const recommended = COURSES.filter((c) => c.tech).slice(0, 4);

  return (
    <>
      {/* ============================================================== MOBILE
          The same information, re-authored for a phone. Renders only below lg;
          the desktop band below takes over from there. */}
      <div className="lg:hidden">
        <DashboardMobile
          name={user.name?.split(" ")[0] || "Developer"}
          streak={streak}
          hoursThisWeek={hrs(thisWeek)}
          coursesCompleted={coursesCompleted}
          xp={xp}
          next={
            next
              ? {
                  lessonId: next.lesson.id,
                  lessonTitle: next.lesson.title,
                  skillTitle: next.skill.title,
                  minutesLeft: skillMinutesLeft,
                  skillPct,
                  tech,
                  started: next.lesson.gateDone > 0,
                }
              : null
          }
          path={roadmap ? { title: roadmap.title, origin: roadmap.origin } : null}
          steps={mobileSteps}
          pathPct={pathPct}
          tasks={today.map((t) => ({ href: t.href, label: t.label, sub: t.sub, meta: t.meta }))}
          level={level}
          recommended={recommended.map((c) => ({
            slug: c.slug,
            title: c.title,
            tech: c.tech,
            level: c.level,
            hours: c.hours,
          }))}
          achievementsEarned={achievements.filter((a) => a.unlocked).length}
        />
      </div>

      {/* ============================================================= DESKTOP */}
      <div className="page-body hidden lg:flex">
      {/* ============================================================ Greeting */}
      <header className="rise">
        <h1 className="title-page">{greeting()}, {user.name?.split(" ")[0] || "Developer"}</h1>
        <p className="text-body mt-1 text-[14px]">
          {next
            ? `You're ${lessonTotal - lessonIndex + 1} lesson${lessonTotal - lessonIndex + 1 === 1 ? "" : "s"} from finishing ${next.skill.title}.`
            : "Nothing queued. Pick a path to get started."}
        </p>
      </header>

      {/* ========================================================= Signal row */}
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4" aria-label="This week">
        <Signal
          icon={<Flame size={15} />}
          label="Learning streak"
          value={`${streak}`}
          unit={streak === 1 ? "day" : "days"}
          foot={streak > 0 ? "Keep it going" : "Start today"}
        />
        <Signal
          icon={<Clock size={15} />}
          label="Hours this week"
          value={`${hrs(thisWeek)}`}
          unit="hrs"
          foot={
            lastWeek > 0
              ? `${deltaMin >= 0 ? "+" : ""}${hrs(deltaMin)} hrs vs last week`
              : "First week tracked"
          }
        />
        <Signal
          icon={<Target size={15} />}
          label="Path progress"
          value={`${pathPct}%`}
          foot={`${lessonsMastered} of ${totalLessons} lessons`}
          bar={pathPct}
        />
        <Signal
          icon={<Zap size={15} />}
          label="Experience"
          value={xp.toLocaleString()}
          unit="XP"
          foot={`Level ${level.level} · ${level.need - level.into} to next`}
          bar={Math.round((level.into / level.need) * 100)}
        />
      </section>

      {/* ============================ Continue · Path · Today (the main band) */}
      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)_minmax(0,0.95fr)]">
        {/* ------------------------------------------------ Continue learning */}
        <div className="card flex flex-col p-5">
          <h2 className="title-card">Continue learning</h2>

          {next ? (
            <>
              <div className="mt-4 flex items-start gap-3">
                {tech ? (
                  <TechLogo name={tech} mode="plate" size={52} />
                ) : (
                  <span className="icon-tile icon-tile-lg h-[52px] w-[52px]">
                    <Play size={18} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium leading-snug">{next.skill.title}</p>
                  <p className="text-meta mt-1 truncate text-[12px]">
                    {next.phase.title} · Lesson {lessonIndex} of {lessonTotal}
                  </p>
                </div>
              </div>

              <p className="mt-4 truncate text-[14px] font-medium">{next.lesson.title}</p>

              <div className="mt-2.5 flex items-center gap-2.5">
                <div className="progress flex-1">
                  <div className="progress-bar" style={{ width: `${skillPct}%` }} />
                </div>
                <span className="num text-[12px]" style={{ color: "var(--text-faint)" }}>
                  {skillPct}%
                </span>
              </div>

              <p className="text-meta mt-2 flex items-center gap-1.5 text-[12px]">
                <Clock size={12} /> {next.lesson.estimatedMinutes} min left
              </p>

              <div className="mt-auto flex items-center gap-2 pt-4">
                <Link
                  href={`/learning/lesson/${next.lesson.id}`}
                  className="btn btn-primary flex-1"
                >
                  {next.lesson.gateDone > 0 ? "Resume" : "Start"} <ArrowRight size={15} />
                </Link>
                <Link href="/learning/roadmap" className="btn-icon" aria-label="View full path">
                  <Bookmark size={16} />
                </Link>
              </div>
            </>
          ) : (
            <p className="text-body mt-4 text-[14px]">
              No lesson queued. Pick a path from Learning to start.
            </p>
          )}
        </div>

        {/* ------------------------------------------------------- The path */}
        <div className="card flex flex-col p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="title-card">Your learning path</h2>
            <Link href="/learning/roadmap" className="text-[12px] font-medium" style={{ color: "var(--primary)" }}>
              View full path
            </Link>
          </div>

          {phases.length > 0 ? (
            <div className="mt-4 grid flex-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,150px)]">
              {/* Vertical stepper — a rail with a node per phase */}
              <ol className="relative flex flex-col gap-5">
                <span
                  className="absolute bottom-3 left-[11px] top-3 w-px"
                  style={{ background: "var(--border)" }}
                  aria-hidden
                />
                {phases.map((p) => (
                  <li key={p.id} className="relative flex items-start gap-3">
                    <span
                      className="relative z-[1] grid h-[23px] w-[23px] shrink-0 place-items-center rounded-full text-[12px] font-medium"
                      style={{
                        background: p.pct === 100 ? "var(--primary)" : "var(--surface-3)",
                        border: `1px solid ${p.current ? "var(--primary)" : "var(--border)"}`,
                        color: p.pct === 100 ? "var(--primary-ink)" : "var(--text-muted)",
                      }}
                    >
                      {p.pct === 100 ? <Check size={11} strokeWidth={3} /> : p.locked ? <Lock size={10} /> : null}
                    </span>
                    <span className="min-w-0 flex-1 pt-0.5">
                      <span className="block truncate text-[14px] font-medium">{p.title}</span>
                      <span className="text-meta block text-[12px]">
                        {p.pct === 100
                          ? "Completed"
                          : p.locked
                            ? "Locked"
                            : p.current
                              ? `In progress · ${p.pct}%`
                              : "Upcoming"}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>

              {/* Next up, the reference's side panel */}
              {next && (
                <div
                  // self-start: this panel holds four short lines, so letting
                  // the grid stretch it to the stepper's full height left it
                  // mostly empty box.
                  className="self-start rounded-[var(--radius-tile)] p-3"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border-faint)" }}
                >
                  <p className="group-heading">Next up</p>
                  <p className="mt-2 text-[14px] font-medium leading-snug">{next.lesson.title}</p>
                  <p className="text-meta mt-1.5 flex items-center gap-1.5 text-[12px]">
                    <Clock size={11} /> {next.lesson.estimatedMinutes} min
                  </p>
                  {next.lesson.gateDone > 0 && (
                    <p className="text-meta mt-2 text-[12px]">
                      {next.lesson.gateDone} of 5 requirements done
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-body mt-4 text-[14px]">No path loaded yet.</p>
          )}
        </div>

        {/* --------------------------------------------------- Today's tasks */}
        <div className="card flex flex-col p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="title-card">Today</h2>
            <span className="text-meta num text-[12px]">{today.length} left</span>
          </div>

          <ul className="-mx-1.5 mt-3 flex flex-col">
            {today.map((t) => (
              <li key={t.href}>
                <Link href={t.href} className="row-link flex items-start gap-2.5 px-1.5 py-2">
                  <span
                    className="mt-[1px] grid h-[17px] w-[17px] shrink-0 place-items-center rounded-[5px]"
                    style={{ border: "1px solid var(--border-strong)" }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium">{t.label}</span>
                    <span className="text-meta block truncate text-[12px]">{t.sub}</span>
                  </span>
                  <span className="num shrink-0 pt-0.5 text-[12px]" style={{ color: "var(--text-faint)" }}>
                    {t.meta}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {/* The reference's week strip. Dots are days you actually studied. */}
          <div className="mt-auto pt-4">
            <p className="group-heading mb-2">This week</p>
            <ol className="flex justify-between gap-1">
              {week.map((d, i) => {
                const isToday = i === week.length - 1;
                return (
                  <li key={d.day} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="text-[12px]" style={{ color: "var(--text-faint)" }}>
                      {DAY_LABELS[i]}
                    </span>
                    <span
                      className="num grid h-[26px] w-full place-items-center rounded-[7px] text-[12px]"
                      style={{
                        background: isToday ? "var(--primary)" : "transparent",
                        color: isToday ? "var(--primary-ink)" : "var(--text-muted)",
                      }}
                    >
                      {Number(d.day.slice(-2))}
                    </span>
                    <span
                      className="h-[3px] w-[3px] rounded-full"
                      style={{ background: d.minutes > 0 ? "var(--primary)" : "transparent" }}
                      aria-hidden
                    />
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>

      {/* ================================ Analytics · Achievements · Certificate */}
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* ---------------------------------------------------- Analytics */}
        <div className="card flex flex-col p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="title-card">Learning analytics</h2>
            <Link href="/analytics" className="text-[12px] font-medium" style={{ color: "var(--primary)" }}>
              Details
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Mini value={hrs(counts?.focusMinutes ?? 0)} unit="hrs" label="Total focus" />
            <Mini value={lessonsMastered} label="Lessons mastered" />
            <Mini value={counts?.challengesSolved ?? 0} label="Challenges solved" />
            <Mini value={counts?.notesWritten ?? 0} label="Notes written" />
          </div>

          {/* 14 days of real minutes. Bars, because the data is discrete daily
              totals and a line between them implies values never measured.

              The chart grows into whatever height this card inherits from the
              taller column beside it, rather than sitting at a fixed 96px and
              leaving the bottom third of the card empty. Bar heights are
              percentages of the plot area for the same reason. */}
          <div className="chart mt-5 min-h-[96px] flex-1">
            <div className="chart-grid" aria-hidden>
              <span /><span /><span /><span />
            </div>
            {strip.map((d, i) => {
              const empty = d.minutes === 0;
              return (
                <div
                  key={d.day}
                  className="chart-col tooltip"
                  data-tip={`${d.minutes} min · ${d.day.slice(5)}`}
                >
                  <div
                    className={`bar ${empty ? "bar-empty" : i === strip.length - 1 ? "bar-today" : ""}`}
                    style={
                      empty
                        ? { height: 2 }
                        : { height: `${Math.max(3, (d.minutes / maxMin) * 96)}%` }
                    }
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[12px]" style={{ color: "var(--text-faint)" }}>
            <span>{strip[0]?.day.slice(5)}</span>
            <span>Today</span>
          </div>
        </div>

        {/* ------------------------------------- Achievements + certificate */}
        <div className="flex flex-col gap-5">
          <div className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="title-card">Achievements</h2>
              <Link
                href="/analytics/achievements"
                className="text-[12px] font-medium"
                style={{ color: "var(--primary)" }}
              >
                View all
              </Link>
            </div>
            {badges.length > 0 ? (
              <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
                {badges.map((b) => (
                  <li
                    key={b.key}
                    className="flex flex-col items-center gap-1.5 rounded-[var(--radius-tile)] p-2.5 text-center"
                    style={{ background: "var(--surface-2)" }}
                  >
                    <span
                      className="grid h-8 w-8 place-items-center rounded-full"
                      style={{
                        background: b.unlocked ? "var(--primary-faint)" : "var(--neutral-faint)",
                        color: b.unlocked ? "var(--primary)" : "var(--text-faint)",
                      }}
                    >
                      <Award size={15} />
                    </span>
                    <span className="line-clamp-2 text-[12px] font-medium leading-tight">{b.title}</span>
                    <span className="text-meta text-[12px]">
                      {b.unlocked ? "Earned" : `${b.progress}%`}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-body mt-3 text-[14px]">
                Master a lesson to earn your first one.
              </p>
            )}
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="title-card">Latest certificate</h2>
              <Link
                href="/career/certificates"
                className="text-[12px] font-medium"
                style={{ color: "var(--primary)" }}
              >
                View all
              </Link>
            </div>
            {latestCert ? (
              <div className="mt-3 flex items-center gap-3">
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-tile)]"
                  style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
                >
                  <Award size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium">{latestCert.name}</p>
                  <p className="text-meta truncate text-[12px]">
                    {latestCert.issuedAt ? `Issued ${formatDate(latestCert.issuedAt)}` : latestCert.provider}
                  </p>
                </div>
                {latestCert.credentialUrl && (
                  <a
                    href={latestCert.credentialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-icon"
                    aria-label="Open credential"
                  >
                    <Download size={15} />
                  </a>
                )}
              </div>
            ) : (
              <p className="text-body mt-3 text-[14px]">
                Finish a course and one is issued with a code anyone can verify.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ==================================================== Recommended */}
      <section className="section-stack">
        <div className="flex items-center justify-between gap-3">
          <h2 className="title-section">Recommended for you</h2>
          <Link href="/learning" className="text-[12px] font-medium" style={{ color: "var(--primary)" }}>
            View all
          </Link>
        </div>
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {recommended.map((c) => (
            <li key={c.slug}>
              <Link href={`/learning/course/${c.slug}`} className="card card-link flex h-full flex-col p-5">
                <TechLogo name={c.tech!} mode="plate" size={34} />
                <p className="mt-3 text-[14px] font-medium leading-snug">{c.title}</p>
                <p className="text-meta mt-1 line-clamp-2 text-[12px]">{c.tagline}</p>
                <p className="text-meta mt-auto flex items-center gap-2 pt-3 text-[12px]">
                  <span>{c.level}</span>
                  <span aria-hidden>·</span>
                  <span>{c.hours}h</span>
                  <ChevronRight size={13} className="ml-auto" />
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {!roadmap && (
        <EmptyState
          compact
          icon={<Target size={20} />}
          title="No roadmap loaded"
          body="Run the seed script to load the starter curriculum, or generate a path from Learning."
          action={
            <Link href="/learning" className="btn btn-primary">
              Browse paths
            </Link>
          }
        />
      )}
      </div>
    </>
  );
}

/** Server-side clock, so the greeting matches the server's day, not a stale render. */
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * One signal tile. Icon left in a near-invisible circle, label, value, and a
 * foot line that is either a real delta or a real remainder — never a target
 * nobody set.
 */
function Signal({
  icon,
  label,
  value,
  unit,
  foot,
  bar,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  foot: string;
  bar?: number;
}) {
  return (
    <div className="card flex items-start gap-3 p-5">
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
        style={{ background: "var(--neutral-faint)", color: "var(--text-muted)" }}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
          {label}
        </p>
        <p className="mt-1 flex items-baseline gap-1">
          <span className="num text-[22px] font-semibold leading-none">{value}</span>
          {unit && (
            <span className="text-[12px]" style={{ color: "var(--text-faint)" }}>
              {unit}
            </span>
          )}
        </p>
        {bar !== undefined && (
          <div className="progress mt-2">
            <div className="progress-bar" style={{ width: `${bar}%` }} />
          </div>
        )}
        <p className="text-meta mt-1.5 truncate text-[12px]">{foot}</p>
      </div>
    </div>
  );
}

function Mini({ value, unit, label }: { value: number | string; unit?: string; label: string }) {
  return (
    <div>
      <p className="flex items-baseline gap-1">
        <span className="num text-[16px] font-semibold leading-none">{value}</span>
        {unit && (
          <span className="text-[12px]" style={{ color: "var(--text-faint)" }}>
            {unit}
          </span>
        )}
      </p>
      <p className="text-meta mt-1 truncate text-[12px]">{label}</p>
    </div>
  );
}
