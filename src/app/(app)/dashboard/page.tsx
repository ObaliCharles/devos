import Link from "next/link";
import {
  ArrowRight,
  Award,
  Bookmark,
  Check,
  ChevronRight,
  Clock,
  Download,
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
import { EmptyState, IconTile } from "@/components/ui";
import { Greeting } from "@/components/greeting";
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

  /* ---- Today's mission ----------------------------------------------------
     The same three real signals as before — next lesson, due reviews, a
     practice suggestion — restated as a single sequenced list rather than
     buried as one of three equal-weight cards. `minutes` is now a number, not
     a pre-formatted string: the mission needs a real total, and parsing
     "15 min" back out of its own display text is the kind of thing that
     breaks quietly the day someone changes the format. */
  const today = [
    next && {
      href: `/learning/lesson/${next.lesson.id}`,
      label: next.lesson.title,
      sub: next.skill.title,
      minutes: next.lesson.estimatedMinutes,
      icon: Play,
    },
    dueCount > 0 && {
      href: "/review",
      label: `Clear ${dueCount} review${dueCount === 1 ? "" : "s"}`,
      sub: "Spaced repetition queue",
      minutes: dueCount * 3,
      icon: Target,
    },
    {
      href: "/practice",
      label: "Solve a challenge",
      sub: "Practice",
      minutes: 15,
      icon: Zap,
    },
  ].filter(Boolean) as {
    href: string;
    label: string;
    sub: string;
    minutes: number;
    icon: typeof Play;
  }[];
  const missionMinutes = today.reduce((sum, t) => sum + t.minutes, 0);

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
          tasks={today.map((t) => ({ href: t.href, label: t.label, sub: t.sub, meta: `${t.minutes} min` }))}
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

      <div className="page-body hidden lg:flex">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_272px]">
          <div className="min-w-0 space-y-6">
            <header className="rise flex min-h-[76px] items-end justify-between gap-6">
              <div>
                <Greeting name={user.name?.split(" ")[0] || "Developer"} className="title-page" />
                <p className="text-body mt-1.5 text-ui">
                  {next
                    ? `Keep building your skills. ${next.skill.title} is ready when you are.`
                    : "Keep building your skills. Pick a path to get moving."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/review" className="btn btn-secondary">
                  {dueCount > 0 ? `${dueCount} reviews` : "Review"}
                </Link>
                <Link href="/analytics" className="btn btn-secondary">
                  {streak > 0 ? `${streak} day streak` : "Progress"}
                </Link>
              </div>
            </header>

            <section className="panel overflow-hidden p-6">
              <div className="grid min-h-[230px] gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
                <div className="flex min-w-0 flex-col">
                  <p className="eyebrow eyebrow-accent">Continue Learning</p>
                  {next ? (
                    <>
                      <div className="mt-8 flex items-start gap-5">
                        {tech ? (
                          <TechLogo name={tech} mode="plate" size={86} />
                        ) : (
                          <span className="icon-tile icon-tile-lg h-[86px] w-[86px]">
                            <Play size={28} />
                          </span>
                        )}
                        <div className="min-w-0 flex-1 pt-2">
                          <h2 className="truncate text-[22px] font-semibold leading-tight">
                            {next.skill.title}
                          </h2>
                          <p className="text-meta mt-2 truncate text-ui">
                            Lesson {lessonIndex} of {lessonTotal} · {next.lesson.title}
                          </p>
                          <div className="mt-5 flex items-center gap-3">
                            <div className="progress flex-1">
                              <div className="progress-bar" style={{ width: `${skillPct}%` }} />
                            </div>
                            <span className="num text-ui" style={{ color: "var(--primary)" }}>
                              {skillPct}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto flex items-center justify-between gap-4 pt-8">
                        <span
                          className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border px-3 py-2 text-ui"
                          style={{
                            borderColor: "var(--border-faint)",
                            background: "var(--surface-2)",
                            color: "var(--text-muted)",
                          }}
                        >
                          <span className="h-2 w-2 rounded-full" style={{ background: "var(--primary)" }} />
                          {next.lesson.gateDone > 0 ? "In progress" : "Ready to start"}
                        </span>
                        <Link href={`/learning/lesson/${next.lesson.id}`} className="btn btn-primary">
                          Continue Learning <ChevronRight size={16} />
                        </Link>
                      </div>
                    </>
                  ) : (
                    <EmptyState
                      compact
                      icon={<Target size={20} />}
                      title="No lesson queued"
                      body="Choose a roadmap or browse the course library to start learning."
                      action={
                        <Link href="/learning" className="btn btn-primary">
                          Browse paths
                        </Link>
                      }
                    />
                  )}
                </div>

                <div
                  className="hidden min-h-full rounded-[var(--radius-card)] border p-4 lg:block"
                  style={{ borderColor: "var(--border-faint)", background: "var(--surface-2)" }}
                  aria-hidden
                >
                  <div className="grid h-full place-items-center">
                    <div className="relative h-[150px] w-[190px]">
                      <span
                        className="absolute left-10 top-5 h-24 w-32 rotate-[-18deg] rounded-[var(--radius-card)] border"
                        style={{ borderColor: "var(--border)", background: "var(--surface-3)" }}
                      />
                      <span
                        className="absolute left-5 top-14 h-24 w-36 rotate-[10deg] rounded-[var(--radius-card)] border"
                        style={{
                          borderColor: "var(--primary-muted)",
                          background: "var(--primary-faint)",
                          boxShadow: "0 18px 60px rgb(124 107 255 / 0.18)",
                        }}
                      />
                      <span className="absolute left-14 top-20 h-2 w-20 rounded-full" style={{ background: "var(--primary)" }} />
                      <span className="absolute left-14 top-32 h-2 w-28 rounded-full" style={{ background: "var(--border-strong)" }} />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="eyebrow eyebrow-accent">Your Learning Path</p>
                <Link href="/learning/roadmap" className="btn-icon" aria-label="View learning roadmap">
                  <ChevronRight size={16} />
                </Link>
              </div>
              {phases.length > 0 ? (
                <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {phases.slice(0, 4).map((p) => (
                    <li key={p.id}>
                      <Link href="/learning/roadmap" className="card card-link block p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-ui font-semibold">{p.title}</p>
                            <p className="text-meta mt-1 truncate text-micro">
                              {p.pct === 100 ? "Completed" : p.locked ? "Locked" : p.current ? "In progress" : "Upcoming"}
                            </p>
                          </div>
                          <span
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-tile)]"
                            style={{
                              background: p.pct === 100 ? "var(--primary-faint)" : "var(--surface-2)",
                              color: p.pct === 100 ? "var(--primary)" : "var(--text-faint)",
                            }}
                          >
                            {p.pct === 100 ? <Check size={15} /> : p.locked ? <Lock size={14} /> : <Bookmark size={14} />}
                          </span>
                        </div>
                        <div className="mt-5 flex items-center gap-3">
                          <div className="progress flex-1">
                            <div className="progress-bar" style={{ width: `${p.pct}%` }} />
                          </div>
                          <span className="num text-micro" style={{ color: "var(--text-muted)" }}>
                            {p.pct}%
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="card p-5">
                  <p className="text-body text-ui">No path loaded yet.</p>
                </div>
              )}
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
              <div className="card p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="eyebrow eyebrow-accent">Recommended For You</p>
                  <Link href="/learning/browse" className="text-micro font-medium" style={{ color: "var(--primary)" }}>
                    Explore all <ArrowRight size={13} className="inline" />
                  </Link>
                </div>
                <ul className="mt-5 grid gap-4 sm:grid-cols-3">
                  {recommended.slice(0, 3).map((c) => (
                    <li key={c.slug}>
                      <Link href={`/learning/course/${c.slug}`} className="card card-link flex h-full flex-col overflow-hidden">
                        <div className="flex h-[92px] items-center p-4" style={{ background: "var(--primary-faint)" }}>
                          <TechLogo name={c.tech!} mode="plate" size={44} />
                        </div>
                        <div className="flex flex-1 flex-col p-4">
                          <p className="line-clamp-2 text-ui font-medium leading-snug">{c.title}</p>
                          <p className="text-meta mt-auto flex items-center gap-2 pt-4 text-micro">
                            <span>{lessonCount(c)} lessons</span>
                            <span className="ml-auto rounded-full px-2 py-0.5" style={{ background: "var(--neutral-faint)" }}>
                              {c.level}
                            </span>
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="eyebrow eyebrow-accent">Achievements</p>
                  <Link href="/analytics/achievements" className="text-micro font-medium" style={{ color: "var(--primary)" }}>
                    View all
                  </Link>
                </div>
                {badges.length > 0 ? (
                  <ul className="mt-5 divide-y" style={{ borderColor: "var(--border-faint)" }}>
                    {badges.slice(0, 3).map((b) => (
                      <li key={b.key} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <span
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-tile)]"
                          style={{
                            background: b.unlocked ? "var(--primary-faint)" : "var(--surface-2)",
                            color: b.unlocked ? "var(--primary)" : "var(--text-faint)",
                          }}
                        >
                          <Award size={16} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-ui font-medium">{b.title}</span>
                          <span className="text-meta block truncate text-micro">{b.description}</span>
                        </span>
                        <span className="num shrink-0 text-micro" style={{ color: "var(--text-faint)" }}>
                          {b.unlocked ? "Done" : `${b.progress}%`}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-body mt-5 text-ui">Master a lesson to earn your first one.</p>
                )}
              </div>
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

          <aside className="space-y-6">
            <section className="card p-5">
              <p className="eyebrow eyebrow-accent">Upcoming</p>
              <ol className="mt-5 space-y-4">
                {today.map((t, i) => (
                  <li key={t.href}>
                    <Link href={t.href} className="row-link flex items-center gap-3 p-2">
                      <IconTile tone={i === 0 ? "primary" : i === 1 ? "warning" : "success"}>
                        <t.icon size={15} />
                      </IconTile>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-ui font-medium">{t.label}</span>
                        <span className="text-meta block truncate text-micro">
                          {i === 0 ? "Today" : i === 1 ? "Next" : `${t.minutes} min`}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
              <Link href="/calendar" className="mt-5 inline-flex items-center gap-1.5 text-micro font-medium" style={{ color: "var(--primary)" }}>
                View calendar <ArrowRight size={13} />
              </Link>
            </section>

            <section className="panel p-5">
              <p className="eyebrow eyebrow-accent">Daily Goal</p>
              <div className="mt-5 flex items-center justify-between gap-4">
                <div>
                  <p className="num text-[24px] font-semibold leading-none">{pathPct}%</p>
                  <p className="text-meta mt-1 text-micro">Path progress</p>
                </div>
                <ol className="flex items-center gap-2">
                  {week.map((d, i) => (
                    <li key={d.day} className="flex flex-col items-center gap-1">
                      <span className="text-micro" style={{ color: "var(--text-faint)" }}>
                        {DAY_LABELS[i]}
                      </span>
                      <span
                        className="h-[5px] w-[5px] rounded-full"
                        style={{
                          background:
                            i === week.length - 1
                              ? "var(--primary)"
                              : d.minutes > 0
                                ? "var(--text-muted)"
                                : "var(--border-strong)",
                        }}
                        aria-hidden
                      />
                    </li>
                  ))}
                </ol>
              </div>
              <div className="progress mt-5">
                <div className="progress-bar" style={{ width: `${pathPct}%` }} />
              </div>
              <p className="text-meta mt-3 flex items-center gap-1.5 text-micro">
                <Clock size={12} /> {missionMinutes} min queued today
              </p>
            </section>

            {latestCert && (
              <section className="card p-5">
                <p className="eyebrow eyebrow-accent">Latest Certificate</p>
                <div className="mt-4 flex items-center gap-3">
                  <IconTile>
                    <Award size={16} />
                  </IconTile>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-ui font-medium">{latestCert.name}</p>
                    <p className="text-meta truncate text-micro">
                      {latestCert.issuedAt ? `Issued ${formatDate(latestCert.issuedAt)}` : latestCert.provider}
                    </p>
                  </div>
                  {latestCert.credentialUrl && (
                    <a href={latestCert.credentialUrl} target="_blank" rel="noopener noreferrer" className="btn-icon" aria-label="Open credential">
                      <Download size={15} />
                    </a>
                  )}
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
