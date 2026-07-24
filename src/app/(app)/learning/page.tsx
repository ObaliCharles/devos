import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Flame,
  FolderGit2,
  Play,
  Rocket,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { requireUser } from "@/lib/user";
import { getRoadmap } from "@/lib/queries";
import { isConfigured } from "@/lib/ai";
import { ACHIEVEMENTS, ROADMAPS } from "@/lib/learn-content";
import { ContentIcon } from "@/components/learn/icon";
import { RoadmapSearch } from "@/components/learn/roadmap-search";
import { CurriculumBuilder } from "@/components/learn/curriculum-builder";
import { Discover } from "@/components/learn/discover";
import { Heatmap } from "@/components/heatmap";
import { Ring } from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * The Learn hub.
 *
 * Not a course list, an intelligent operating system for becoming a developer.
 * The order answers one question at every scroll depth: "what do I learn next
 * to become who I want to become?" Continue where you left off, choose how to
 * learn, browse journeys, let AI build a path, see your mission, discover
 * everything, and review your own momentum.
 *
 * Live data (the active roadmap, streak, XP) comes from the user; the curated
 * library, curriculum plans and achievements come from the content module so
 * the page is rich and specific without a dozen round trips.
 */
export default async function LearningPage() {
  const user = await requireUser();
  const roadmap = await getRoadmap(user._id).catch(() => null);

  const streak = user.currentStreak ?? 8;
  const xp = user.xp ?? 14520;

  const active = roadmap
    ? {
        title: roadmap.title,
        pct:
          roadmap.totalLessons > 0
            ? Math.round((roadmap.masteredLessons / roadmap.totalLessons) * 100)
            : 0,
      }
    : { title: "Python Fullstack", pct: 36 };

  return (
    <div className="page-body pb-6">
      {/* =========================================================== 1. Hero */}
      <section className="rise pt-2 text-center sm:pt-6">
        <h1 className="mx-auto max-w-[16ch] text-[34px] font-bold leading-[1.05] tracking-[-0.035em] sm:text-[46px]">
          Become the developer you want.
        </h1>
        <p className="mt-4 flex items-center justify-center gap-2 text-[14px] font-medium sm:text-[15px]">
          {["Learn", "Build", "Master", "Ship"].map((w, i) => (
            <span key={w} className="flex items-center gap-2">
              {i > 0 && (
                <span className="h-1 w-1 rounded-full" style={{ background: "var(--primary)" }} />
              )}
              <span style={{ color: "var(--text-muted)" }}>{w}</span>
            </span>
          ))}
        </p>
        <div className="mt-8">
          <RoadmapSearch />
        </div>
      </section>

      {/* ================================================ 2. Continue + how */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <ContinueLearning title={active.title} pct={active.pct} />
        <HowToLearn />
      </section>

      {/* ========================================== 3. Popular roadmaps */}
      <section className="section-stack">
        <SectionTitle
          title="Popular Roadmaps"
          sub="Curated learning journeys, built by DeveloperOS engineers."
          href="/dashboard"
          hrefLabel="View all"
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ROADMAPS.slice(0, 6).map((r) => (
            <RoadmapCard key={r.slug} roadmap={r} />
          ))}
        </div>
      </section>

      {/* ======================================== 4. AI curriculum builder */}
      <section className="section-stack">
        <SectionTitle
          title="Build your own path"
          sub="Tell AI who you want to become and get a month-by-month curriculum."
        />
        <CurriculumBuilder />
      </section>

      {/* ================================================== 5. Your mission */}
      <Mission streak={streak} />

      {/* ===================================================== 6. Discover */}
      <section id="discover" className="section-stack scroll-mt-4">
        <SectionTitle
          title="Discover"
          sub="Search everything, courses, projects, roadmaps, certifications, assessments."
        />
        <Discover />
      </section>

      {/* =============================== 7. Activity + achievements + progress */}
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1.1fr)]">
        <LearningActivity streak={streak} xp={xp} />
        <Achievements />
        <ProgressOverview />
      </section>
    </div>
  );
}

/* ======================================================== Section heading */

function SectionTitle({
  title,
  sub,
  href,
  hrefLabel,
}: {
  title: string;
  sub?: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-[21px] font-bold tracking-[-0.025em] sm:text-[23px]">{title}</h2>
        {sub && <p className="text-body mt-1 text-[13.5px]">{sub}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="flex shrink-0 items-center gap-1 text-[13px] font-medium"
          style={{ color: "var(--primary)" }}
        >
          {hrefLabel ?? "View all"} <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}

/* =========================================================== Continue card */

function ContinueLearning({ title, pct }: { title: string; pct: number }) {
  return (
    <div className="panel flex flex-col p-5">
      <p className="eyebrow eyebrow-accent">Continue Learning</p>
      <div className="mt-4 flex items-center gap-3">
        <span className="icon-tile icon-tile-lg icon-tile-info">
          <ContentIcon name="Code2" size={20} />
        </span>
        <div className="min-w-0">
          <h3 className="title-card truncate">{title}</h3>
          <p className="text-meta">Resume your learning journey.</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-[12.5px]">
          <span style={{ color: "var(--text-muted)" }}>Progress</span>
          <span className="num font-semibold" style={{ color: "var(--text)" }}>
            {pct}%
          </span>
        </div>
        <div className="progress mt-2">
          <div className="progress-bar" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div
        className="mt-4 flex items-center gap-2 rounded-[var(--radius-tile)] p-3"
        style={{ background: "var(--surface-2)" }}
      >
        <Target size={15} style={{ color: "var(--primary)" }} className="shrink-0" />
        <div className="min-w-0">
          <p className="text-meta text-[11px]">Current mission</p>
          <p className="truncate text-[13px] font-medium">Complete Python Essentials</p>
        </div>
      </div>

      <Link href="/learning" className="btn btn-primary btn-block mt-4">
        <Play size={15} /> Continue
      </Link>
    </div>
  );
}

/* ============================================================ How to learn */

function HowToLearn() {
  return (
    <div className="panel p-5">
      <p className="eyebrow">How would you like to learn?</p>
      <div className="mt-4 grid items-stretch gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <LearnOption
          icon={<BookOpen size={18} />}
          tone="primary"
          title="Official Roadmaps"
          body="Curated learning experiences built by DeveloperOS engineers, with projects, certificates and milestones."
          cta="Explore Roadmaps"
          href="/dashboard"
        />
        <div className="flex items-center justify-center">
          <span
            className="grid h-8 w-8 place-items-center rounded-full text-[11px] font-semibold sm:h-9 sm:w-9"
            style={{ background: "var(--surface-2)", color: "var(--text-faint)" }}
          >
            OR
          </span>
        </div>
        <LearnOption
          icon={<Sparkles size={18} />}
          tone="info"
          title="AI Learning Paths"
          body="Tell AI what you want to become and we'll build a personalized curriculum, mapped to real projects."
          cta="Generate Path"
          href="#discover"
        />
      </div>
    </div>
  );
}

function LearnOption({
  icon,
  tone,
  title,
  body,
  cta,
  href,
}: {
  icon: React.ReactNode;
  tone: "primary" | "info";
  title: string;
  body: string;
  cta: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="card card-link group flex flex-col p-4"
      style={{ background: "var(--surface-2)" }}
    >
      <span className={`icon-tile icon-tile-${tone}`}>{icon}</span>
      <h3 className="title-card mt-3">{title}</h3>
      <p className="text-body mt-1.5 flex-1 text-[13px]">{body}</p>
      <span
        className="mt-4 flex items-center gap-1.5 text-[13px] font-medium"
        style={{ color: `var(--${tone})` }}
      >
        {cta}
        <ArrowRight
          size={14}
          className="transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </span>
    </Link>
  );
}

/* ============================================================ Roadmap card */

function RoadmapCard({ roadmap: r }: { roadmap: (typeof ROADMAPS)[number] }) {
  return (
    <Link href="/learning" className="card card-link group flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <span className={`icon-tile icon-tile-lg icon-tile-${r.accent}`}>
          <ContentIcon name={r.icon} size={20} />
        </span>
        <span className="badge">{r.difficulty}</span>
      </div>

      <h3 className="title-card mt-4">{r.title}</h3>
      <p className="text-body mt-1 line-clamp-2 flex-1 text-[13px]">{r.blurb}</p>

      <ul className="mt-4 flex flex-col gap-1.5 text-[12.5px]" style={{ color: "var(--text-muted)" }}>
        <li className="flex items-center gap-2">
          <BookOpen size={13} style={{ color: "var(--text-faint)" }} /> {r.lessons} Lessons
        </li>
        <li className="flex items-center gap-2">
          <FolderGit2 size={13} style={{ color: "var(--text-faint)" }} /> {r.projects} Projects
        </li>
        <li className="flex items-center gap-2">
          {r.certificate ? (
            <>
              <Award size={13} style={{ color: "var(--text-faint)" }} /> Certificate
            </>
          ) : (
            <>
              <Rocket size={13} style={{ color: "var(--text-faint)" }} /> Build production apps
            </>
          )}
        </li>
      </ul>

      <span
        className="mt-4 flex items-center justify-center gap-1.5 rounded-[var(--radius-control)] py-2 text-[13px] font-medium transition-colors"
        style={{ background: "var(--primary-faint)", color: "var(--primary)" }}
      >
        Start Learning
        <ArrowRight
          size={14}
          className="transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </span>
    </Link>
  );
}

/* ================================================================ Mission */

function Mission({ streak }: { streak: number }) {
  const upcoming = ["Git and GitHub", "Linux Fundamentals", "CLI Project"];
  return (
    <section className="panel overflow-hidden">
      <div className="grid gap-px md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)]" style={{ background: "var(--border)" }}>
        {/* Mission */}
        <div className="p-5" style={{ background: "var(--surface)" }}>
          <div className="flex items-center justify-between">
            <p className="eyebrow eyebrow-accent">Your Mission</p>
            <span className="num text-[12.5px] font-semibold" style={{ color: "var(--primary)" }}>
              12%
            </span>
          </div>
          <h3 className="mt-2 text-[19px] font-bold tracking-[-0.02em]">AI Engineer</h3>
          <div className="progress mt-3">
            <div className="progress-bar" style={{ width: "12%" }} />
          </div>

          <div
            className="mt-4 rounded-[var(--radius-tile)] border p-3"
            style={{ borderColor: "var(--warning-faint)", background: "var(--warning-faint)" }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--warning)" }}>
              Current mission
            </p>
            <p className="mt-1 flex items-center justify-between gap-2 text-[14px] font-semibold">
              Complete Python Essentials
              <ChevronRight size={15} style={{ color: "var(--text-faint)" }} />
            </p>
            <p className="text-meta mt-0.5">Lesson 3 of 12</p>
          </div>
        </div>

        {/* Rewards + upcoming */}
        <div className="p-5" style={{ background: "var(--surface)" }}>
          <p className="text-meta text-[11px] font-semibold uppercase tracking-wide">Rewards</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Reward icon={<Zap size={15} />} tone="primary" label="+100 XP" />
            <Reward icon={<Award size={15} />} tone="danger" label="Badge" />
            <Reward icon={<Trophy size={15} />} tone="warning" label="+5%" />
          </div>

          <p className="text-meta mt-5 text-[11px] font-semibold uppercase tracking-wide">Upcoming</p>
          <ul className="mt-2.5 flex flex-col gap-2">
            {upcoming.map((u) => (
              <li key={u} className="flex items-center gap-2.5 text-[13px]">
                <span
                  className="h-3.5 w-3.5 rounded-full border-2"
                  style={{ borderColor: "var(--border-strong)" }}
                />
                <span style={{ color: "var(--text-muted)" }}>{u}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Streak + continue */}
        <div className="flex flex-col p-5" style={{ background: "var(--surface)" }}>
          <div
            className="flex items-center gap-3 rounded-[var(--radius-tile)] p-3"
            style={{ background: "var(--warning-faint)" }}
          >
            <Flame size={20} style={{ color: "var(--warning)" }} />
            <div>
              <p className="text-meta text-[11px]">Learning streak</p>
              <p className="num text-[15px] font-bold" style={{ color: "var(--warning)" }}>
                {streak} Days
              </p>
            </div>
          </div>
          <div
            className="mt-3 flex items-center gap-3 rounded-[var(--radius-tile)] p-3"
            style={{ background: "var(--surface-2)" }}
          >
            <CheckCircle2 size={18} style={{ color: "var(--success)" }} />
            <div>
              <p className="text-meta text-[11px]">Estimated completion</p>
              <p className="text-[13px] font-semibold">4 months remaining</p>
            </div>
          </div>
          <Link href="/learning" className="btn btn-primary btn-block mt-auto">
            <Play size={15} /> Continue Learning
          </Link>
        </div>
      </div>
    </section>
  );
}

function Reward({
  icon,
  tone,
  label,
}: {
  icon: React.ReactNode;
  tone: "primary" | "danger" | "warning";
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-[var(--radius-tile)] p-2" style={{ background: "var(--surface-2)" }}>
      <span className={`icon-tile icon-tile-${tone} h-9 w-9`}>{icon}</span>
      <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
    </div>
  );
}

/* ======================================================= Learning activity */

function LearningActivity({ streak, xp }: { streak: number; xp: number }) {
  // 84 days of synthetic-but-plausible activity, weighted toward recent days,
  // so the heatmap reads like a real, still-warm contribution graph.
  const days = Array.from({ length: 84 }, (_, i) => {
    const recency = i / 84;
    const seed = (i * 928371 + 13) % 97;
    const base = seed / 97;
    const active = base > 0.42 - recency * 0.2;
    return {
      day: `d${i}`,
      minutes: active ? Math.round((base + recency) * 55) : 0,
    };
  });

  return (
    <div className="panel flex flex-col p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="title-card">Learning Activity</h3>
          <p className="text-meta">Last 84 days</p>
        </div>
        <span className="badge badge-primary">
          <ContentIcon name="Code2" size={11} /> AI Engineer
        </span>
      </div>

      <div className="mt-4 flex-1">
        <Heatmap days={days} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div
          className="flex items-center gap-2.5 rounded-[var(--radius-tile)] p-3"
          style={{ background: "var(--warning-faint)" }}
        >
          <Flame size={17} style={{ color: "var(--warning)" }} />
          <div>
            <p className="num text-[15px] font-bold">{streak}</p>
            <p className="text-meta text-[11px]">Day streak</p>
          </div>
        </div>
        <div
          className="flex items-center gap-2.5 rounded-[var(--radius-tile)] p-3"
          style={{ background: "var(--primary-faint)" }}
        >
          <Zap size={17} style={{ color: "var(--primary)" }} />
          <div>
            <p className="num text-[15px] font-bold">{xp.toLocaleString()}</p>
            <p className="text-meta text-[11px]">Total XP</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================== Achievements */

function Achievements() {
  return (
    <div className="panel flex flex-col p-5">
      <div className="flex items-center justify-between">
        <h3 className="title-card">Achievements</h3>
        <Link href="/analytics/achievements" className="text-[13px] font-medium" style={{ color: "var(--primary)" }}>
          View all
        </Link>
      </div>

      <div className="mt-4 grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
        {ACHIEVEMENTS.map((a) => (
          <div
            key={a.title}
            className="flex flex-col items-center gap-2 rounded-[var(--radius-tile)] p-3 text-center"
            style={{
              background: a.earned ? "var(--surface-2)" : "transparent",
              border: `1px solid ${a.earned ? "var(--border)" : "var(--border-faint)"}`,
              opacity: a.earned ? 1 : 0.5,
            }}
          >
            <span className={`icon-tile icon-tile-lg ${a.earned ? `icon-tile-${a.accent}` : ""}`}>
              <ContentIcon name={a.icon} size={18} />
            </span>
            <div>
              <p className="text-[12px] font-semibold leading-tight">{a.title}</p>
              <p className="text-meta text-[10.5px]">{a.caption}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ========================================================= Progress overview */

function ProgressOverview() {
  const segments = [
    { label: "Completed", pct: 38, color: "var(--success)" },
    { label: "In Progress", pct: 42, color: "var(--primary)" },
    { label: "Not Started", pct: 20, color: "var(--surface-4)" },
  ];
  return (
    <div className="panel flex flex-col p-5">
      <h3 className="title-card">Progress Overview</h3>

      <div className="mt-4 flex items-center gap-5">
        <Ring value={38} label="" size={92} tone="var(--primary)" />
        <ul className="flex flex-1 flex-col gap-2.5">
          {segments.map((s) => (
            <li key={s.label} className="flex items-center justify-between text-[13px]">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                <span style={{ color: "var(--text-muted)" }}>{s.label}</span>
              </span>
              <span className="num font-semibold">{s.pct}%</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <Metric icon={<BookOpen size={14} />} value="76 / 200" label="Lessons" />
        <Metric icon={<FolderGit2 size={14} />} value="9 / 25" label="Projects" />
        <Metric icon={<Award size={14} />} value="2 / 10" label="Certificates" />
      </div>
    </div>
  );
}

function Metric({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div
      className="flex flex-col items-center gap-1 rounded-[var(--radius-tile)] p-3 text-center"
      style={{ background: "var(--surface-2)" }}
    >
      <span style={{ color: "var(--primary)" }}>{icon}</span>
      <span className="num text-[13px] font-bold">{value}</span>
      <span className="text-meta text-[10.5px]">{label}</span>
    </div>
  );
}
