import Link from "next/link";
import {
  Award,
  BarChart3,
  BookOpen,
  Brain,
  Check,
  ChevronRight,
  Clock,
  Flame,
  Lock,
  Play,
  Star,
  Target,
} from "lucide-react";
import { TechLogo, TECH_WITH_LOGO } from "@/components/learn/tech-logo";
import { Ring } from "@/components/ui";
import { Reveal } from "@/components/reveal";

/**
 * The dashboard as it reads on a phone.
 *
 * The desktop dashboard is a three-column band of dense cards; stacked at
 * 390px that becomes a very long column of half-empty boxes. This is the same
 * information re-authored for the small screen, in the order a phone user
 * actually wants it:
 *
 *   Greeting + streak      who you are, and the one number worth protecting
 *   Three-up signal strip  hours this week · courses done · XP
 *   Continue learning      one tap back into the lesson you left
 *   Your learning path     where that lesson sits in the whole plan
 *   Today · Progress       what is left today, and how far you have come
 *   Recommended            what to pick up next
 *   More                   the desktop-only sections, one tap away
 *
 * Every value here is passed in already computed from real collections. Where
 * the product genuinely has no data — a course star rating, a weekly hours
 * target nobody set — the element is dropped rather than filled with a
 * plausible number. This renders only below lg; the desktop layout takes over
 * from there.
 */

type Step = {
  id: string;
  title: string;
  state: "done" | "current" | "locked" | "todo";
  pct: number;
};

type Next = {
  lessonId: string;
  lessonTitle: string;
  skillTitle: string;
  /** Minutes left in the current skill, not just the current lesson. */
  minutesLeft: number;
  skillPct: number;
  tech: string | null;
  started: boolean;
};

type Task = { href: string; label: string; sub: string; meta: string };

type Course = {
  slug: string;
  title: string;
  tech?: string;
  level: string;
  hours: number;
};

export function DashboardMobile({
  name,
  streak,
  hoursThisWeek,
  coursesCompleted,
  xp,
  next,
  path,
  steps,
  pathPct,
  tasks,
  level,
  recommended,
  achievementsEarned,
}: {
  name: string;
  streak: number;
  hoursThisWeek: number;
  coursesCompleted: number;
  xp: number;
  next: Next | null;
  path: { title: string; origin: string } | null;
  steps: Step[];
  pathPct: number;
  tasks: Task[];
  level: { level: number; into: number; need: number; title: string };
  recommended: Course[];
  achievementsEarned: number;
}) {
  const toNextLevel = Math.max(0, level.need - level.into);

  return (
    <div className="flex flex-col gap-6 pb-4">
      {/* ============================================================ Greeting
          The streak sits beside the greeting rather than in the signal strip
          below, because it is the one number that decays if you skip a day —
          it earns the position the moment you open the app. */}
      <header className="rise flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {/* 24px, not the 28px page title: the streak pill has to sit beside
              this on a 390px screen, and a title that wraps to two lines pushes
              everything below the fold before you have read a single number. */}
          <h1 className="text-[24px] font-bold leading-tight tracking-[-0.03em]">
            {greeting()}, {name}
          </h1>
          <p className="text-body mt-1 text-[14px]">
            {next
              ? `Pick up where you left off in ${next.skillTitle}.`
              : "Nothing queued. Pick a path to get started."}
          </p>
        </div>

        <span
          className="flex shrink-0 items-center gap-2 rounded-[var(--radius-pill)] py-1.5 pl-2.5 pr-3"
          style={{
            background: streak > 0 ? "var(--success-faint)" : "var(--neutral-faint)",
            color: streak > 0 ? "var(--success)" : "var(--text-faint)",
          }}
        >
          <Flame size={15} />
          <span className="leading-tight">
            <span className="num block text-[14px] font-semibold">{streak}</span>
            <span className="block text-[12px]" style={{ color: "var(--text-faint)" }}>
              Day streak
            </span>
          </span>
        </span>
      </header>

      {/* ======================================================= Signal strip
          Three facts in one card, split by hairlines. One card rather than
          three tiles: at this width three separate cards read as a stack of
          boxes, and these three numbers are one glance. */}
      <Reveal>
        <div className="card grid grid-cols-3 p-3.5">
          <Signal icon={<Clock size={15} />} value={fmtHours(hoursThisWeek)} unit="hrs" label="This week" />
          <Signal
            icon={<BookOpen size={15} />}
            value={`${coursesCompleted}`}
            label={coursesCompleted === 1 ? "Course done" : "Courses done"}
            divided
          />
          <Signal icon={<Star size={15} />} value={xp.toLocaleString()} label="XP points" divided />
        </div>
      </Reveal>

      {/* =================================================== Continue learning */}
      <section className="flex flex-col gap-3">
        <Header title="Continue learning" href="/learning" />

        <Reveal>
          {next ? (
            <Link
              href={`/learning/lesson/${next.lessonId}`}
              className="card card-link block p-3.5"
            >
              {/* Stacked rather than one row. The reference puts the logo, the
                  text, the bar and the button on a single line, which works on
                  its 940px artboard and not on a real 390px screen — there the
                  title truncates to three words and the bar collapses to a
                  stub. Same content, given room to be legible. */}
              <span className="flex items-center gap-3">
                {next.tech && TECH_WITH_LOGO.has(next.tech) ? (
                  <TechLogo name={next.tech} mode="plate" size={52} />
                ) : (
                  <span className="icon-tile h-[52px] w-[52px]">
                    <Play size={20} />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">{next.skillTitle}</span>
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
                {/* The whole card is the link, so this is the affordance, not a
                    second target. */}
                <span className="btn btn-primary btn-sm shrink-0" aria-hidden>
                  <Play size={14} /> {next.started ? "Resume" : "Start"}
                </span>
              </span>
            </Link>
          ) : (
            <div className="card p-4">
              <p className="text-[14px] font-medium">No lesson queued</p>
              <p className="text-body mt-1 text-[14px]">
                Follow a path and the next lesson lands here.
              </p>
              <Link href="/learning" className="btn btn-primary btn-sm mt-3">
                Browse paths
              </Link>
            </div>
          )}
        </Reveal>
      </section>

      {/* ====================================================== Learning path */}
      <section className="flex flex-col gap-3">
        <Header title="Your learning path" href="/learning/roadmap" />

        <Reveal>
          {path ? (
            <div className="card p-3.5">
              {/* The header row is the link to the full path — a "View path"
                  button beside a two-line title leaves the title about eleven
                  characters at this width. */}
              <Link href="/learning/roadmap" className="row-link -m-1 flex items-center gap-3 p-1">
                <span className="icon-tile icon-tile-primary h-11 w-11 rounded-full">
                  <Brain size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">
                    {path.origin === "ai" ? "AI generated path for you" : "Your active path"}
                  </span>
                  <span className="text-meta mt-0.5 block truncate text-[12px]">{path.title}</span>
                </span>
                <ChevronRight size={16} className="shrink-0" style={{ color: "var(--text-faint)" }} />
              </Link>

              {/* The rail scrolls rather than wraps: a sequence that breaks to
                  a second row stops reading as a sequence. */}
              {steps.length > 0 && (
                <ol className="scrollbar-none -mx-1 mt-4 flex gap-1 overflow-x-auto px-1 pb-1">
                  {steps.map((s, i) => (
                    <li
                      key={s.id}
                      className="relative flex min-w-[74px] flex-1 shrink-0 flex-col items-center gap-2 text-center"
                    >
                      {i > 0 && (
                        <span
                          className="absolute left-[-50%] right-[50%] top-[13px] h-px"
                          style={{
                            background:
                              s.state === "done" || s.state === "current"
                                ? "var(--primary)"
                                : "var(--border)",
                          }}
                          aria-hidden
                        />
                      )}

                      <span
                        className="num relative z-[1] grid h-[27px] w-[27px] place-items-center rounded-full text-[12px] font-medium"
                        style={{
                          background:
                            s.state === "done"
                              ? "var(--primary)"
                              : s.state === "current"
                                ? "var(--primary-faint)"
                                : "var(--surface-2)",
                          border: `1px solid ${
                            s.state === "current" ? "var(--primary)" : "var(--border)"
                          }`,
                          color:
                            s.state === "done"
                              ? "var(--primary-ink)"
                              : s.state === "current"
                                ? "var(--primary)"
                                : "var(--text-faint)",
                        }}
                      >
                        {s.state === "done" ? (
                          <Check size={12} strokeWidth={3} />
                        ) : s.state === "locked" ? (
                          <Lock size={11} />
                        ) : (
                          i + 1
                        )}
                      </span>

                      <span className="w-full">
                        <span className="block truncate text-[12px] font-medium">{s.title}</span>
                        <span
                          className="block truncate text-[12px]"
                          style={{
                            color: s.state === "current" ? "var(--primary)" : "var(--text-faint)",
                          }}
                        >
                          {s.state === "done"
                            ? "Completed"
                            : s.state === "current"
                              ? "In progress"
                              : s.state === "locked"
                                ? "Locked"
                                : "Upcoming"}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ) : (
            <div className="card p-4">
              <p className="text-[14px] font-medium">No path yet</p>
              <p className="text-body mt-1 text-[14px]">
                Tell the AI who you want to become and it writes a real curriculum.
              </p>
              <Link href="/learning" className="btn btn-primary btn-sm mt-3">
                Build a path
              </Link>
            </div>
          )}
        </Reveal>
      </section>

      {/* ================================================ Today · Your progress
          Two half-width cards, as the reference has them. They pair because
          one is what is left today and the other is what today adds up to. */}
      <section className="grid grid-cols-2 gap-3">
        <Reveal className="min-w-0">
          <div className="card flex h-full flex-col p-3.5">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-[14px] font-semibold tracking-[-0.01em]">Today</h2>
              <Link href="/calendar" className="text-[12px] font-medium" style={{ color: "var(--primary)" }}>
                All
              </Link>
            </div>

            {tasks.length > 0 ? (
              <ul className="-mx-1.5 mt-2 flex flex-col">
                {tasks.map((t) => (
                  <li key={t.href}>
                    <Link href={t.href} className="row-link flex items-start gap-2 px-1.5 py-2">
                      <span
                        className="mt-[2px] h-[15px] w-[15px] shrink-0 rounded-[4px]"
                        style={{ border: "1px solid var(--border-strong)" }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-[12px] font-medium leading-snug">
                          {t.label}
                        </span>
                        <span className="num mt-0.5 block text-[12px]" style={{ color: "var(--text-faint)" }}>
                          {t.meta}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-body mt-2 text-[14px]">All clear.</p>
            )}
          </div>
        </Reveal>

        <Reveal className="min-w-0">
          <div className="card flex h-full flex-col p-3.5">
            <h2 className="text-[14px] font-semibold tracking-[-0.01em]">Your progress</h2>

            <div className="mt-3 flex justify-center">
              {/* Accent, not the traffic-light default: path progress is not a
                  score you can fail. */}
              <Ring value={pathPct} size={88} tone="var(--primary)" label="Path complete" />
            </div>

            <div className="mt-3.5">
              <p className="text-[12px]" style={{ color: "var(--text-faint)" }}>
                Level {level.level}
              </p>
              <p className="text-[14px] font-semibold">{level.title}</p>
              <div className="progress progress-sm mt-2">
                <div
                  className="progress-bar"
                  style={{ width: `${Math.round((level.into / level.need) * 100)}%` }}
                />
              </div>
            </div>

            <div className="mt-3">
              <p className="text-[12px]" style={{ color: "var(--text-faint)" }}>
                Next milestone
              </p>
              <p className="num text-[14px] font-semibold">{toNextLevel.toLocaleString()} XP</p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ======================================================== Recommended
          A rail, not a grid: four course cards stacked vertically on a phone
          is a screen and a half of scrolling for a browse list. */}
      <section className="flex flex-col gap-3">
        <Header title="Recommended for you" href="/learning" />

        <ul className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
          {recommended.map((c, i) => (
            <Reveal as="li" index={i} key={c.slug} className="shrink-0">
              <Link
                href={`/learning/course/${c.slug}`}
                className="card card-link flex h-full w-[152px] flex-col p-3.5"
              >
                {c.tech && TECH_WITH_LOGO.has(c.tech) ? (
                  <TechLogo name={c.tech} mode="plate" size={38} />
                ) : (
                  <span className="icon-tile">
                    <BookOpen size={16} />
                  </span>
                )}
                <p className="mt-2.5 line-clamp-2 text-[14px] font-semibold leading-snug">
                  {c.title}
                </p>
                <p className="text-meta mt-1 text-[12px]">{c.hours}h</p>
                <span className="chip chip-sm mt-2.5 self-start">{c.level}</span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </section>

      {/* ================================================================ More
          The desktop dashboard also carries analytics, achievements and the
          latest certificate. Rather than stack three more cards on a phone,
          they stay one tap away — present, but not in the way. */}
      <section className="flex flex-col gap-3">
        <h2 className="text-[14px] font-semibold tracking-[-0.01em]">More</h2>
        <div className="card divide-y" style={{ borderColor: "var(--border)" }}>
          <MoreRow
            href="/analytics"
            icon={<BarChart3 size={16} />}
            label="Learning analytics"
            meta="Focus time, lessons, challenges"
          />
          <MoreRow
            href="/analytics/achievements"
            icon={<Award size={16} />}
            label="Achievements"
            meta={achievementsEarned > 0 ? `${achievementsEarned} earned` : "None yet"}
          />
          <MoreRow
            href="/career/certificates"
            icon={<Target size={16} />}
            label="Certificates"
            meta="Verifiable, with a public code"
          />
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ Pieces */

function Header({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-[18px] font-bold tracking-[-0.02em]">{title}</h2>
      <Link
        href={href}
        className="inline-flex items-center gap-0.5 text-[12px] font-medium"
        style={{ color: "var(--primary)" }}
      >
        View all <ChevronRight size={13} />
      </Link>
    </div>
  );
}

function Signal({
  icon,
  value,
  unit,
  label,
  divided,
}: {
  icon: React.ReactNode;
  value: string;
  unit?: string;
  label: string;
  divided?: boolean;
}) {
  return (
    <div className={`min-w-0 px-2.5 ${divided ? "border-l" : ""}`}>
      <span className="flex items-center gap-1.5" style={{ color: "var(--text-faint)" }}>
        {icon}
        <span className="num truncate text-[16px] font-semibold" style={{ color: "var(--text)" }}>
          {value}
        </span>
        {unit && <span className="text-[12px]">{unit}</span>}
      </span>
      <span className="mt-1 block truncate text-[12px]" style={{ color: "var(--text-faint)" }}>
        {label}
      </span>
    </div>
  );
}

function MoreRow({
  href,
  icon,
  label,
  meta,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  meta: string;
}) {
  return (
    <Link href={href} className="row-link flex items-center gap-3 p-3.5">
      <span className="icon-tile">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium">{label}</span>
        <span className="text-meta block truncate text-[12px]">{meta}</span>
      </span>
      <ChevronRight size={16} style={{ color: "var(--text-faint)" }} />
    </Link>
  );
}

/* ------------------------------------------------------------------ Format */

/** 135 -> "2h 15m", 45 -> "45m". The reference's own phrasing. */
function fmtDuration(minutes: number) {
  if (minutes < 60) return `${Math.max(0, Math.round(minutes))}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** One decimal, but never "12.0". */
function fmtHours(hours: number) {
  return Number.isInteger(hours) ? `${hours}` : hours.toFixed(1);
}

/** Server-side clock, so the greeting matches the server's day. */
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
