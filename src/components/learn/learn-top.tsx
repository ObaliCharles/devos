import Link from "next/link";
import { ArrowRight, BookOpen, Check, Clock, Code2, ClipboardCheck, Lock, Target } from "lucide-react";
import { TechLogo, TECH_WITH_LOGO, inferTech } from "./tech-logo";

/**
 * The top of the Learn page, built to the reference layout.
 *
 *   Greeting
 *   Continue Learning  |  Today's Goal      (2 : 1)
 *   Your Learning Path                      (horizontal stepper of tech marks)
 *   Your Next Step                          (a single accented call to action)
 *
 * The stepper is the piece worth explaining. The reference shows six circular
 * technology marks on a connecting rail, each labelled Completed / In Progress
 * / Locked. That reads instantly because the *logo* carries the identity — you
 * recognise Python before you read "Python". So the rail is built from real
 * brand marks resolved off the skill titles, and the rail segment behind each
 * node is filled only as far as you have actually got.
 */

type Step = {
  id: string;
  title: string;
  tech: string | null;
  state: "done" | "current" | "todo" | "locked";
  pct: number;
};

type NextLesson = {
  id: string;
  title: string;
  minutes: number;
  skillTitle: string;
  phaseTitle: string;
  lessonIndex: number;
  lessonTotal: number;
  skillPct: number;
  /** Brand mark key, inferred from the skill and phase titles by the page. */
  tech: string | null;
} | null;

export function LearnTop({
  name,
  pathTitle,
  pathPct,
  steps,
  next,
  dueCount,
  openProjects,
}: {
  name: string;
  pathTitle: string;
  pathPct: number;
  steps: Step[];
  next: NextLesson;
  dueCount: number;
  openProjects: number;
}) {
  const remainingInSkill = next ? next.lessonTotal - next.lessonIndex + 1 : 0;
  const estimate = next ? remainingInSkill * next.minutes : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* ------------------------------------------------------------ Greeting */}
      <header className="rise">
        <h1 className="title-page">
          {greeting()}, {name}
        </h1>
        <p className="text-body mt-1 text-[13.5px]">Ready to build your future?</p>
      </header>

      {/* ------------------------------- Continue Learning | Today's Goal ---- */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        {/* Continue Learning */}
        <div className="card p-4 sm:p-5">
          <h2 className="title-card">Continue learning</h2>

          {next ? (
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
              {next.tech && TECH_WITH_LOGO.has(next.tech) ? (
                <TechLogo name={next.tech} mode="plate" size={84} className="shrink-0" />
              ) : (
                <span className="icon-tile h-[84px] w-[84px] shrink-0">
                  <Code2 size={28} />
                </span>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold tracking-[-0.014em]">
                  {next.skillTitle}
                </p>
                <p className="text-meta mt-1 truncate text-[12.5px]">{next.title}</p>

                <div className="mt-3 flex items-center gap-2.5">
                  <div className="progress flex-1">
                    <div className="progress-bar" style={{ width: `${next.skillPct}%` }} />
                  </div>
                  <span className="num text-[12px] font-medium" style={{ color: "var(--text-muted)" }}>
                    {next.skillPct}%
                  </span>
                </div>

                <p className="text-meta mt-2 flex items-center gap-1.5 text-[12px]">
                  <Clock size={12} /> {next.minutes} min left
                </p>
              </div>

              <Link
                href={`/learning/lesson/${next.id}`}
                className="btn btn-primary shrink-0 self-start sm:self-auto"
              >
                Resume
              </Link>
            </div>
          ) : (
            <p className="text-body mt-4 text-[13px]">
              Nothing in progress. Pick a path below to start one.
            </p>
          )}
        </div>

        {/* Today's Goal — three rows, each a real thing the app can check off */}
        <div className="card p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="title-card">Today&apos;s goal</h2>
            <Link href="/dashboard" className="text-[12px] font-medium" style={{ color: "var(--primary)" }}>
              View all
            </Link>
          </div>
          <p className="text-meta mt-1 text-[12px]">Keep the momentum going.</p>

          <ul className="mt-4 flex flex-col gap-1">
            <GoalRow
              icon={<BookOpen size={15} />}
              value={next ? `${Math.min(2, remainingInSkill)}` : "0"}
              label={next && remainingInSkill === 1 ? "Lesson" : "Lessons"}
              meta={next ? `~${Math.min(2, remainingInSkill) * next.minutes} min` : "—"}
              href={next ? `/learning/lesson/${next.id}` : "/learning"}
            />
            <GoalRow
              icon={<ClipboardCheck size={15} />}
              value={`${dueCount}`}
              label={dueCount === 1 ? "Review" : "Reviews"}
              meta={dueCount > 0 ? `~${dueCount * 3} min` : "All clear"}
              href="/review"
            />
            <GoalRow
              icon={<Code2 size={15} />}
              value={`${openProjects}`}
              label={openProjects === 1 ? "Project" : "Projects"}
              meta={openProjects > 0 ? "In progress" : "None open"}
              href="/projects"
            />
          </ul>
        </div>
      </section>

      {/* --------------------------------------------------- Your Learning Path */}
      {steps.length > 0 && (
        <section className="card p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <div className="flex flex-wrap items-baseline gap-2.5">
              <h2 className="title-card">Your learning path</h2>
              <span className="text-[12.5px] font-medium" style={{ color: "var(--primary)" }}>
                {pathTitle}
              </span>
              <span className="text-meta num text-[12px]">{pathPct}% completed</span>
            </div>
            <Link
              href="/learning/roadmap"
              className="inline-flex items-center gap-1 text-[12px] font-medium"
              style={{ color: "var(--primary)" }}
            >
              View full path <ArrowRight size={12} />
            </Link>
          </div>

          {/* The rail. Scrolls horizontally rather than wrapping, because a
              path that wraps to two rows stops reading as a sequence. */}
          <ol className="scrollbar-none mt-5 flex gap-1 overflow-x-auto pb-1">
            {steps.map((s, i) => (
              <li
                key={s.id}
                className="relative flex min-w-[104px] flex-1 shrink-0 flex-col items-center gap-2 text-center"
              >
                {/* Connector, drawn behind the node and filled only as far as
                    you have actually reached. */}
                {i > 0 && (
                  <span
                    className="absolute left-[-50%] right-[50%] top-[25px] h-px"
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
                  className="relative z-[1] grid h-[50px] w-[50px] place-items-center rounded-full"
                  style={{
                    background: "var(--surface)",
                    border: `1.5px solid ${
                      s.state === "current"
                        ? "var(--primary)"
                        : s.state === "done"
                          ? "var(--primary-muted)"
                          : "var(--border)"
                    }`,
                    opacity: s.state === "locked" ? 0.55 : 1,
                  }}
                >
                  {s.state === "locked" ? (
                    <Lock size={16} style={{ color: "var(--text-faint)" }} />
                  ) : s.tech && TECH_WITH_LOGO.has(s.tech) ? (
                    <TechLogo name={s.tech} size={24} mode={s.state === "todo" ? "mono" : "brand"} />
                  ) : s.state === "done" ? (
                    <Check size={18} style={{ color: "var(--primary)" }} />
                  ) : (
                    <span className="num text-[13px] font-medium" style={{ color: "var(--text-muted)" }}>
                      {i + 1}
                    </span>
                  )}
                </span>

                <span className="w-full">
                  <span className="block truncate text-[12px] font-medium">{s.title}</span>
                  <span
                    className="block truncate text-[11px]"
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
        </section>
      )}

      {/* -------------------------------------------------------- Your Next Step
          The reference used amber here. This product has one accent, and this
          is the single most interactive thing on the page, so it gets it. */}
      {next && (
        <section
          className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5"
          style={{ background: "var(--primary-faint)", borderColor: "var(--primary-muted)" }}
        >
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full"
            style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
          >
            <Target size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold" style={{ color: "var(--primary)" }}>
              Your next step
            </p>
            <p className="mt-1 text-[14px] leading-snug">
              You&apos;re <strong className="font-semibold">{remainingInSkill}</strong>{" "}
              {remainingInSkill === 1 ? "lesson" : "lessons"} from finishing{" "}
              <strong className="font-semibold">{next.skillTitle}</strong>.
            </p>
            <p className="text-meta mt-1 text-[12.5px]">
              Estimated time: {estimate < 60 ? `${estimate} minutes` : `${Math.round(estimate / 6) / 10} hours`}.
            </p>
          </div>
          <Link href={`/learning/lesson/${next.id}`} className="btn btn-primary shrink-0">
            Resume path <ArrowRight size={15} />
          </Link>
        </section>
      )}
    </div>
  );
}

function GoalRow({
  icon,
  value,
  label,
  meta,
  href,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  meta: string;
  href: string;
}) {
  return (
    <li>
      <Link href={href} className="row-link -mx-2 flex items-center gap-3 px-2 py-2">
        <span className="icon-tile shrink-0">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-1.5">
            <span className="num text-[16px] font-semibold leading-none">{value}</span>
            <span className="truncate text-[13px]">{label}</span>
          </span>
          <span className="text-meta mt-0.5 block truncate text-[11.5px]">{meta}</span>
        </span>
      </Link>
    </li>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** Re-exported so the page can build steps without importing the logo module. */
export { inferTech };
