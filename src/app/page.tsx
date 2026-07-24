import Link from "next/link";
import { Check, Lock } from "lucide-react";
import { LogoTile, Wordmark } from "@/components/brand";

const GATE = [
  "Read the lesson",
  "Write a note in your own words",
  "Do the exercise",
  "Pass the quiz",
  "Review the summary",
];

// Names, not sales copy. The grid says what the workspace holds; the product
// itself is where each one earns its keep.
const MODULES = [
  "Learning",
  "Practice",
  "Knowledge",
  "Projects",
  "AI centre",
  "Career",
  "Analytics",
  "Calendar",
];

export default function Landing() {
  return (
    <main className="min-h-screen">
      <header className="glass sticky top-0 z-30 border-b" style={{ borderColor: "var(--border)" }}>
        <div
          className="mx-auto flex w-full items-center justify-between px-5 sm:px-8"
          style={{ height: "var(--topbar-h)", maxWidth: 1080 }}
        >
          <Link href="/" aria-label="DeveloperOS home">
            <Wordmark size="sm" />
          </Link>
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

      {/* ------------------------------------------------------------- Hero
          Centred, so the whitespace reads as composition rather than a column
          shoved to the left of a wide screen. */}
      <section className="mx-auto w-full px-5 pb-16 pt-20 text-center sm:px-8 sm:pt-28" style={{ maxWidth: 760 }}>
        <span className="badge badge-lg rise mx-auto">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--success)" }}
            aria-hidden
          />
          Twelve modules, one workspace
        </span>

        <h1 className="rise mx-auto mt-6 text-[38px] font-bold leading-[1.06] tracking-[-0.038em] sm:text-[56px]">
          You cannot mark it done
          <br className="hidden sm:block" /> until you can actually do it.
        </h1>

        <p className="rise text-body mx-auto mt-6 max-w-[54ch] text-[16px]">
          Most learning tools let you tick a box and move on. DeveloperOS does not. Every lesson is
          locked behind five requirements, enforced on the server rather than on your willpower at
          midnight.
        </p>

        <div className="rise mt-9 flex flex-wrap items-center justify-center gap-2.5">
          <Link href="/sign-up" className="btn btn-primary btn-lg">
            Start the roadmap
          </Link>
          <Link href="/sign-in" className="btn btn-secondary btn-lg">
            I already have an account
          </Link>
        </div>
      </section>

      {/* ------------------------------------------------------- The gate
          The signature idea, shown rather than described. */}
      <section className="mx-auto w-full px-5 pb-20 sm:px-8" style={{ maxWidth: 640 }}>
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
                  <span
                    className={`icon-tile num h-7 w-7 text-[12px] ${done ? "icon-tile-success" : ""}`}
                  >
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

      {/* --------------------------------------------------- The workspace */}
      <section className="mx-auto w-full px-5 pb-24 text-center sm:px-8" style={{ maxWidth: 760 }}>
        <p className="eyebrow eyebrow-accent">Everything in one place</p>
        <h2 className="mx-auto mt-3 max-w-[20ch] text-[26px] font-bold tracking-[-0.03em] sm:text-[32px]">
          Learning is the reason. The rest is the operating system.
        </h2>
        <div className="mx-auto mt-8 flex flex-wrap justify-center gap-2">
          {MODULES.map((name) => (
            <span
              key={name}
              className="rounded-[var(--radius-control)] border px-3.5 py-2 text-[13.5px] font-medium"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              {name}
            </span>
          ))}
        </div>

        <div className="mt-12">
          <Link href="/sign-up" className="btn btn-primary btn-lg">
            Start the roadmap
          </Link>
        </div>
      </section>

      <footer className="border-t" style={{ borderColor: "var(--border)" }}>
        <div
          className="mx-auto flex w-full flex-wrap items-center justify-between gap-3 px-5 py-6 sm:px-8"
          style={{ maxWidth: 1080 }}
        >
          <span className="flex items-center gap-2 text-[13px]" style={{ color: "var(--text-faint)" }}>
            <LogoTile size={20} radius="var(--radius-xs)" /> DeveloperOS
          </span>
          <span className="text-[13px]" style={{ color: "var(--text-faint)" }}>
            Built to ship.
          </span>
        </div>
      </footer>
    </main>
  );
}
