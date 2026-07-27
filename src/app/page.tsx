import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Cloud,
  Code2,
  Compass,
  Cpu,
  FolderKanban,
  Github,
  LayoutDashboard,
  Map,
  Rocket,
  Server,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Twitter,
} from "lucide-react";
import { LogoTile, Wordmark } from "@/components/brand";
import { Reveal } from "@/components/reveal";

/**
 * The public landing page.
 *
 * Not a course-site splash, the pitch is a developer operating system: choose
 * who you want to become, follow structured missions, build real projects and
 * ship. The hero pairs that promise with a faithful, static preview of the
 * product's own dashboard, so the page shows the thing rather than only
 * describing it. Everything reads a design token, so it matches the app shell
 * exactly and flips to light mode with it.
 */

const NAV = [
  { label: "Roadmaps", href: "/sign-in" },
  { label: "Projects", href: "/sign-in" },
  { label: "Pricing", href: "/sign-in" },
  { label: "Docs", href: "/sign-in" },
  { label: "About", href: "/sign-in" },
];

const STATS = [
  { value: "15+", label: "Learning Journeys" },
  { value: "200+", label: "Projects" },
  { value: "50+", label: "Achievements" },
  { value: "100%", label: "Project Based" },
];

const STEPS = [
  { icon: Map, title: "Choose a roadmap", body: "Pick a path that matches your goals." },
  { icon: Code2, title: "Complete missions", body: "Learn by building real skills step by step." },
  { icon: FolderKanban, title: "Build projects", body: "Practice with hands-on projects that matter." },
  { icon: Trophy, title: "Earn achievements", body: "Unlock achievements as you progress." },
  { icon: Rocket, title: "Ship to the world", body: "Deploy production-ready applications." },
];

const JOURNEYS = [
  {
    icon: BrainCircuit,
    title: "AI Engineer",
    body: "Master AI, machine learning and build intelligent applications.",
    stats: [
      ["28", "Missions"],
      ["15", "Projects"],
      ["6", "Achievements"],
    ],
  },
  {
    icon: Code2,
    title: "Fullstack Engineer",
    body: "Become a fullstack engineer and build modern web applications.",
    stats: [
      ["28", "Missions"],
      ["15", "Projects"],
      ["6", "Achievements"],
    ],
  },
  {
    icon: Server,
    title: "Backend Engineer",
    body: "Build scalable APIs, systems and backend services.",
    stats: [
      ["24", "Missions"],
      ["12", "Projects"],
      ["5", "Achievements"],
    ],
  },
  {
    icon: Cloud,
    title: "Cloud Engineer",
    body: "Learn cloud infrastructure, deployment and DevOps from scratch.",
    stats: [
      ["24", "Missions"],
      ["12", "Projects"],
      ["5", "Achievements"],
    ],
  },
];

const PATHS = [
  { icon: BrainCircuit, label: "AI Engineer" },
  { icon: Cpu, label: "Machine Learning" },
  { icon: Code2, label: "Fullstack Engineer" },
  { icon: Server, label: "Backend Engineer" },
  { icon: Cloud, label: "Cloud Engineer" },
  { icon: ShieldCheck, label: "Cyber Security" },
  { icon: Rocket, label: "Startup Founder" },
];

const SHOWCASE = [
  { icon: Target, title: "Current Mission", body: "See exactly what you need to focus on." },
  { icon: Compass, title: "Next Milestone", body: "Know what's coming next." },
  { icon: Trophy, title: "Final Goal", body: "Stay focused on your ultimate objective." },
  { icon: BarChart3, title: "Track Progress", body: "Visualize your progress and stay motivated." },
];

export default function Landing() {
  return (
    <main className="min-h-screen">
      {/* ================================================================ Nav */}
      <header className="glass sticky top-0 z-30 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto flex h-16 w-full items-center justify-between px-5 sm:px-8" style={{ maxWidth: 1200 }}>
          <Link href="/" aria-label="DeveloperOS home">
            <Wordmark size="sm" />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.label}
                href={n.href}
                className="rounded-[var(--radius-control)] px-3 py-2 text-[13.5px] font-medium transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/sign-in" className="btn btn-ghost btn-sm">
              Sign in
            </Link>
            <Link href="/sign-up" className="btn btn-primary btn-sm">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ============================================================== Hero */}
      <section className="mx-auto grid w-full items-center gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:py-24" style={{ maxWidth: 1200 }}>
        <div className="rise">
          <span className="badge badge-lg">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--primary)" }} aria-hidden />
            The operating system for developers
          </span>

          <h1 className="mt-6 text-[46px] font-bold leading-[1.02] tracking-[-0.04em] sm:text-[64px]">
            Become who
            <br />
            you build<span style={{ color: "var(--primary)" }}>.</span>
          </h1>

          <p className="mt-5 flex items-center gap-2 text-[13px] font-semibold tracking-wide">
            {["LEARN", "BUILD", "MASTER", "SHIP"].map((w, i) => (
              <span key={w} className="flex items-center gap-2">
                {i > 0 && <span className="h-1 w-1 rounded-full" style={{ background: "var(--primary)" }} />}
                <span style={{ color: "var(--text-faint)" }}>{w}</span>
              </span>
            ))}
          </p>

          <p className="text-body mt-6 max-w-[52ch] text-[15.5px]">
            DeveloperOS guides you from your first line of code to shipping production-ready software
            through missions, projects and structured learning paths.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/sign-up" className="btn btn-primary btn-lg">
              Get Started <ArrowRight size={16} />
            </Link>
            <Link href="/sign-in" className="btn btn-secondary btn-lg">
              Explore Roadmaps
            </Link>
          </div>
        </div>

        <div className="rise">
          <DashboardPreview />
        </div>
      </section>

      {/* ============================================================= Stats */}
      <section className="border-y" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto grid w-full grid-cols-2 gap-px px-0 sm:grid-cols-4" style={{ maxWidth: 1200, background: "var(--border)" }}>
          {STATS.map((s) => (
            <div key={s.label} className="px-6 py-8 text-center" style={{ background: "var(--bg)" }}>
              <p className="num text-[32px] font-bold tracking-[-0.03em] sm:text-[38px]">{s.value}</p>
              <p className="text-meta mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ======================================================= How it works */}
      <section className="mx-auto w-full px-5 py-16 text-center sm:px-8 sm:py-20" style={{ maxWidth: 1200 }}>
        <p className="eyebrow eyebrow-accent">How it works</p>
        <h2 className="mt-3 text-[26px] font-bold tracking-[-0.03em] sm:text-[36px]">
          A better way to become a developer
        </h2>

        {/* Mobile: a clean vertical list of icon + text rows.
            Desktop: a horizontal flow with connectors between steps. */}
        <div className="mt-10 flex flex-col gap-3 sm:mt-12 lg:flex-row lg:items-start lg:gap-2">
          {STEPS.map((step, i) => (
            <Reveal
              key={step.title}
              index={i}
              className="flex items-center gap-4 text-left lg:flex-1 lg:flex-col lg:text-center"
            >
              <span
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full sm:h-14 sm:w-14"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--primary)" }}
              >
                <step.icon size={22} />
              </span>
              <div className="min-w-0 lg:mt-4">
                <h3 className="title-card">{step.title}</h3>
                <p className="text-body mt-1 text-[13px]">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ==================================================== Explore journeys */}
      <section className="mx-auto w-full px-5 py-8 sm:px-8" style={{ maxWidth: 1200 }}>
        <div className="text-center">
          <p className="eyebrow eyebrow-accent">Explore Journeys</p>
          <h2 className="mt-3 text-[26px] font-bold tracking-[-0.03em] sm:text-[36px]">
            Structured paths. Real outcomes.
          </h2>
        </div>

        <div className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4">
          {JOURNEYS.map((j, i) => (
            <Reveal key={j.title} index={i} className="card flex flex-col p-5">
              <span className="icon-tile icon-tile-lg">
                <j.icon size={20} />
              </span>
              <h3 className="title-card mt-4">{j.title}</h3>
              <p className="text-body mt-1.5 flex-1 text-[13px]">{j.body}</p>
              <div className="mt-4 flex gap-4">
                {j.stats.map(([v, l]) => (
                  <div key={l}>
                    <p className="num text-[17px] font-bold">{v}</p>
                    <p className="text-meta text-[11px]">{l}</p>
                  </div>
                ))}
              </div>
              <Link href="/sign-up" className="btn btn-secondary btn-sm btn-block mt-5">
                Start Journey <ArrowRight size={14} />
              </Link>
            </Reveal>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link href="/sign-in" className="btn btn-secondary">
            Explore all roadmaps
          </Link>
        </div>
      </section>

      {/* ====================================================== Choose your path */}
      <section className="mx-auto w-full px-5 py-16 text-center sm:px-8 sm:py-20" style={{ maxWidth: 1200 }}>
        <p className="eyebrow eyebrow-accent">Choose your path</p>
        <h2 className="mt-3 text-[26px] font-bold tracking-[-0.03em] sm:text-[36px]">
          Become who you want to become.
        </h2>

        <div className="mt-10 flex flex-wrap items-start justify-center gap-x-6 gap-y-7 sm:mt-12 sm:gap-x-14">
          {PATHS.map((p, i) => (
            <Reveal key={p.label} index={i} className="w-[84px] sm:w-24">
              <Link href="/sign-up" className="group flex flex-col items-center gap-3">
                <span
                  className="grid h-[52px] w-[52px] place-items-center rounded-[var(--radius-card)] transition-all duration-200 group-hover:-translate-y-1 sm:h-14 sm:w-14"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
                >
                  <p.icon size={22} />
                </span>
                <span className="text-[12px] font-medium leading-tight sm:text-[12.5px]" style={{ color: "var(--text-muted)" }}>
                  {p.label}
                </span>
              </Link>
            </Reveal>
          ))}
        </div>

        <div className="mt-12">
          <Link href="/sign-up" className="btn btn-secondary">
            Explore all paths
          </Link>
        </div>
      </section>

      {/* ==================================================== Dashboard showcase */}
      <section className="mx-auto w-full px-5 py-8 sm:px-8" style={{ maxWidth: 1200 }}>
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <ProgressPreview />
          <div>
            <p className="eyebrow eyebrow-accent">Your journey</p>
            <h2 className="mt-3 text-[26px] font-bold tracking-[-0.03em] sm:text-[36px]">
              All your progress.
              <br />
              One place.
            </h2>
            <ul className="mt-8 flex flex-col gap-5">
              {SHOWCASE.map((s, i) => (
                <Reveal as="li" key={s.title} index={i} className="flex gap-4">
                  <span className="icon-tile shrink-0">
                    <s.icon size={17} />
                  </span>
                  <div>
                    <h3 className="title-card">{s.title}</h3>
                    <p className="text-body mt-0.5 text-[13px]">{s.body}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
            <Link href="/sign-up" className="btn btn-primary mt-8">
              Continue Learning <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* =============================================================== CTA */}
      <section className="mx-auto w-full px-5 py-16 sm:px-8 sm:py-20" style={{ maxWidth: 1200 }}>
        <div
          className="relative overflow-hidden rounded-[var(--radius-dialog)] border px-5 py-14 text-center sm:px-6 sm:py-16"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-64"
            style={{ background: "radial-gradient(60% 100% at 50% 0%, var(--primary-faint), transparent 70%)" }}
            aria-hidden
          />
          <div className="relative">
            <h2 className="mx-auto max-w-[20ch] text-[30px] font-bold tracking-[-0.03em] sm:text-[38px]">
              Ready to start your journey?
            </h2>
            <p className="text-body mx-auto mt-4 max-w-[54ch]">
              Join thousands of developers who are building their future with DeveloperOS.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/sign-up" className="btn btn-primary btn-lg">
                Get Started <ArrowRight size={16} />
              </Link>
              <Link href="/sign-in" className="btn btn-secondary btn-lg">
                Explore Roadmaps
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ Footer */}
      <Footer />
    </main>
  );
}

/* ======================================================= Dashboard preview

   A faithful, purely static rendering of the app's own dashboard chrome. It is
   the product's real surface, sidebar, current mission, milestones, so the
   hero shows the thing rather than a stock illustration. */

function DashboardPreview() {
  return (
    <div
      className="overflow-hidden rounded-[var(--radius-dialog)] border shadow-[var(--shadow-lg)]"
      style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}
    >
      <div className="grid grid-cols-[132px_minmax(0,1fr)]">
        {/* Mini sidebar */}
        <div className="hidden flex-col gap-1 border-r p-3 sm:flex" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="mb-2 flex items-center gap-2">
            <LogoTile size={20} radius="var(--radius-xs)" />
            <span className="text-[11px] font-bold">DeveloperOS</span>
          </div>
          <p className="overline mt-2 mb-1">Current journey</p>
          <div
            className="flex items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5"
            style={{ background: "var(--primary-faint)" }}
          >
            <BrainCircuit size={13} style={{ color: "var(--primary)" }} />
            <span className="text-[11px] font-semibold" style={{ color: "var(--primary)" }}>AI Engineer</span>
          </div>
          <p className="overline mt-3 mb-1">Menu</p>
          {[
            [LayoutDashboard, "Dashboard"],
            [Map, "Roadmaps"],
            [Target, "Missions"],
            [FolderKanban, "Projects"],
            [Trophy, "Achievements"],
          ].map(([Icon, label], i) => {
            const I = Icon as typeof LayoutDashboard;
            return (
              <div key={i as number} className="flex items-center gap-2 px-2 py-1.5">
                <I size={12} style={{ color: "var(--text-faint)" }} />
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{label as string}</span>
              </div>
            );
          })}
        </div>

        {/* Main */}
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-bold">Welcome back, Alex 👋</p>
              <p className="text-meta text-[11.5px]">Let&apos;s continue your journey</p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2.5">
            <MissionRow title="Current Mission" sub="Complete Python Fundamentals" meta="Lesson 12 of 28" pct={30} />
            <MissionRow title="Next Milestone" sub="Build your first API" meta="0/5 tasks completed" />
            <MissionRow title="Final Goal" sub="Build a production-ready AI application" meta="" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MissionRow({
  title,
  sub,
  meta,
  pct,
  tone,
}: {
  title: string;
  sub: string;
  meta: string;
  pct?: number;
  tone?: "primary";
}) {
  return (
    <div className="rounded-[var(--radius-tile)] border p-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <p className="overline">{title}</p>
      <p className="mt-1 text-[12.5px] font-semibold" style={{ color: tone ? "var(--text)" : "var(--text-muted)" }}>
        {sub}
      </p>
      {meta && <p className="text-meta mt-0.5 text-[10.5px]">{meta}</p>}
      {pct !== undefined && (
        <div className="progress progress-sm mt-2">
          <div className="progress-bar" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

/* ===================================================== Progress preview card */

function ProgressPreview() {
  const activity = [
    ["Completed lesson: Lists and Tuples", "2 hours ago"],
    ["Started mission: Build a Weather API", "1 day ago"],
    ["Completed project: Python Calculator", "3 days ago"],
    ["Earned achievement: Python Basics", "5 days ago"],
  ];
  return (
    <div
      className="overflow-hidden rounded-[var(--radius-dialog)] border p-5 shadow-[var(--shadow-md)]"
      style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}
    >
      <p className="title-card">Progress Overview</p>
      <div className="mt-4 flex items-center gap-5">
        <div className="relative grid h-24 w-24 shrink-0 place-items-center">
          <svg width="96" height="96" className="-rotate-90" aria-hidden>
            <circle cx="48" cy="48" r="40" fill="none" stroke="var(--surface-3)" strokeWidth="7" />
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 40}
              strokeDashoffset={2 * Math.PI * 40 * (1 - 0.36)}
            />
          </svg>
          <span className="absolute text-center">
            <span className="num block text-[20px] font-bold">36%</span>
            <span className="text-meta text-[9px]">Overall</span>
          </span>
        </div>
        <div className="grid flex-1 grid-cols-3 gap-2 text-center">
          {[
            ["12", "Completed", "var(--success)"],
            ["8", "In Progress", "var(--primary)"],
            ["8", "Remaining", "var(--text-faint)"],
          ].map(([v, l, c]) => (
            <div key={l} className="rounded-[var(--radius-tile)] p-2" style={{ background: "var(--surface-2)" }}>
              <p className="num text-[18px] font-bold" style={{ color: c }}>{v}</p>
              <p className="text-meta text-[10px]">{l}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="overline mt-5 mb-2">Recent activity</p>
      <ul className="flex flex-col gap-2">
        {activity.map(([label, when]) => (
          <li key={label} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--success)" }} />
              <span className="truncate text-[12px]" style={{ color: "var(--text-muted)" }}>{label}</span>
            </span>
            <span className="text-meta shrink-0 text-[10.5px]">{when}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ============================================================== Footer */

function Footer() {
  const cols = [
    { heading: "Product", links: ["Roadmaps", "Projects", "Achievements", "Pricing"] },
    { heading: "Resources", links: ["Docs", "Blog", "Guides", "Changelog"] },
    { heading: "Company", links: ["About", "Careers", "Contact", "Privacy"] },
  ];
  return (
    <footer className="border-t" style={{ borderColor: "var(--border)" }}>
      <div className="mx-auto grid w-full gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)]" style={{ maxWidth: 1200 }}>
        <div>
          <Wordmark size="sm" />
          <p className="text-body mt-4 max-w-[34ch] text-[13px]">
            The operating system for developers. Learn. Build. Master. Ship.
          </p>
          <div className="mt-5 flex items-center gap-2">
            {[Github, Twitter, Sparkles].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="btn-icon"
                aria-label="Social link"
                style={{ border: "1px solid var(--border)" }}
              >
                <Icon size={15} />
              </a>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {cols.map((col) => (
            <div key={col.heading}>
              <p className="overline mb-3">{col.heading}</p>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <Link href="/sign-in" className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                      {l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto flex w-full flex-wrap items-center justify-between gap-3 px-5 py-6 sm:px-8" style={{ maxWidth: 1200 }}>
          <span className="flex items-center gap-2 text-[12.5px]" style={{ color: "var(--text-faint)" }}>
            <LogoTile size={18} radius="var(--radius-xs)" /> © 2026 DeveloperOS. All rights reserved.
          </span>
          <span className="text-[12.5px]" style={{ color: "var(--text-faint)" }}>
            Built to ship.
          </span>
        </div>
      </div>
    </footer>
  );
}
