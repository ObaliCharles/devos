import Link from "next/link";
import { ArrowRight, Check, Lock } from "lucide-react";

const GATE = [
  "Read the lesson",
  "Write a note in your own words",
  "Do the exercise",
  "Pass the quiz",
  "Review the summary",
];

const MODULES: [string, string][] = [
  ["Learning", "A roadmap gated by real mastery, not checkboxes."],
  ["Practice", "Coding challenges your code actually runs against."],
  ["Knowledge", "Linked notes, backlinks, a graph, spaced-repetition flashcards."],
  ["Projects", "Kanban, milestones, bug tracker, database and API designers."],
  ["AI centre", "An assistant that can see your lessons, projects and notes."],
  ["Career", "ATS resume, portfolio from your projects, application tracker."],
  ["Analytics", "Time, goals, habits, focus timer, achievements."],
  ["Calendar", "Your deadlines from every module in one place."],
  ["Admin", "User, content and roadmap management with an audit trail."],
];

export default function Landing() {
  return (
    <main className="min-h-screen">
      <header
        className="glass sticky top-0 z-30 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div
          className="page-container flex items-center justify-between"
          style={{ height: "var(--topbar-h)", maxWidth: 1120 }}
        >
          <span className="flex items-center gap-2.5 text-[15px] font-semibold tracking-[-0.02em]">
            <span
              className="grid h-[26px] w-[26px] place-items-center rounded-[var(--radius-tile)] text-[13px] font-bold"
              style={{
                background: "var(--primary)",
                color: "var(--primary-ink)",
                boxShadow: "var(--sheen)",
              }}
            >
              D
            </span>
            Developer<span style={{ color: "var(--primary)" }}>OS</span>
          </span>
          <nav className="flex items-center gap-2">
            <Link href="/sign-in" className="btn btn-ghost btn-sm">
              Sign in
            </Link>
            <Link href="/sign-up" className="btn btn-primary btn-sm">
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* ------------------------------------------------------------- Hero */}
      <section
        className="page-container pb-16 pt-16 sm:pt-24"
        style={{ maxWidth: 1120 }}
      >
        <span className="badge badge-lg rise">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--success)" }}
            aria-hidden
          />
          Twelve modules · one workspace
        </span>
        <h1 className="rise mt-5 max-w-3xl text-[40px] font-bold leading-[1.05] tracking-[-0.035em] sm:text-[58px]">
          You cannot mark it done
          <br />
          until you can actually do it.
        </h1>
        <p className="rise text-body mt-6 max-w-[58ch] text-[15.5px]">
          Most learning tools let you tick a box and move on. DeveloperOS doesn&apos;t. Every lesson
          is locked behind five requirements, and the lock is enforced on the server — not by your
          own willpower at 11&nbsp;p.m.
        </p>
        <div className="rise mt-8 flex flex-wrap gap-2.5">
          <Link href="/sign-up" className="btn btn-primary btn-lg">
            Start the roadmap <ArrowRight size={16} />
          </Link>
          <Link href="/sign-in" className="btn btn-secondary btn-lg">
            I already have an account
          </Link>
        </div>
      </section>

      {/* The whole workspace, named. Learning is the reason; the rest is the OS */}
      <section className="page-container pb-20" style={{ maxWidth: 1120 }}>
        <p className="eyebrow eyebrow-accent">One workspace</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map(([title, body]) => (
            <div key={title} className="card p-4">
              <h2 className="title-card">{title}</h2>
              <p className="text-body mt-1.5 text-[13px]">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Signature element: the gate itself, shown rather than described */}
      <section className="page-container pb-24" style={{ maxWidth: 900 }}>
        <div className="panel overflow-hidden">
          <div
            className="flex items-center justify-between gap-4 border-b px-5 py-4"
            style={{ borderColor: "var(--border)" }}
          >
            <div>
              <p className="eyebrow eyebrow-accent">Lesson 3 · FastAPI</p>
              <h2 className="title-section mt-1">Dependency injection with Depends</h2>
            </div>
            <span className="badge badge-primary badge-lg">Practising</span>
          </div>

          <ul>
            {GATE.map((label, i) => {
              const done = i < 3;
              return (
                <li
                  key={label}
                  className="flex items-center gap-3 border-b px-5 py-3"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span className={`icon-tile num h-7 w-7 text-[12px] ${done ? "icon-tile-success" : ""}`}>
                    {done ? <Check size={14} strokeWidth={2.8} /> : i + 1}
                  </span>
                  <span
                    className="text-[13.5px]"
                    style={{ color: done ? "var(--text)" : "var(--text-muted)" }}
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ul>

          <div
            className="flex flex-wrap items-center gap-3 px-5 py-4"
            style={{ background: "var(--surface-2)" }}
          >
            <button className="btn btn-primary" disabled>
              <Lock size={15} /> Mark as mastered
            </button>
            <span className="text-meta">2 requirements still open</span>
          </div>
        </div>
      </section>
    </main>
  );
}
