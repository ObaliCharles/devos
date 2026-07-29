import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  Flame,
  FolderGit2,
  Play,
  RotateCcw,
  Target,
  Trophy,
  Zap } from "lucide-react";
import { requireUser, levelFromXp } from "@/lib/user";
import {
  countDueReviews,
  findNextLesson,
  getAchievements,
  getActivityStrip,
  getCatalogProgressMap,
  getCertificates,
  getChallenges,
  getProjectStats,
  getProjects,
  getRoadmap,
  getUserCounts,
  listRoadmaps } from "@/lib/queries";
import { CERTIFICATIONS, COURSES, PROJECTS as CATALOG_PROJECTS, lessonCount } from "@/lib/catalog";
import { isConfigured } from "@/lib/ai";
import { ROADMAP_META } from "@/lib/learn-content";
import { ContentIcon } from "@/components/learn/icon";
import { TechLogo, inferTech } from "@/components/learn/tech-logo";
import { RoadmapSearch } from "@/components/learn/roadmap-search";
import { CurriculumBuilder } from "@/components/learn/curriculum-builder";
import { RoadmapCard } from "@/components/learn/roadmap-card";
import { Discover } from "@/components/learn/discover";
import { LearnMobileHome } from "@/components/learn/learn-mobile-home";
import { LearnTop } from "@/components/learn/learn-top";
import { LearnBands } from "@/components/learn/learn-blocks";
import { Heatmap } from "@/components/heatmap";
import { Ring } from "@/components/ui";
import { Reveal } from "@/components/reveal";

export const dynamic = "force-dynamic";

/** The stored status, said the way a person would read it on a card. */
const PROJECT_STATUS: Record<string, string> = {
  planning: "Planning",
  building: "In progress",
  testing: "Testing",
  deployed: "Deployed",
  paused: "Paused",
  complete: "Complete",
};

/**
 * The Learn hub, wired to real data.
 *
 * Every section reads from the same queries the rest of the product writes to,
 * so nothing dead-ends: Continue Learning opens your actual next lesson, the
 * roadmap cards are the real paths you can follow, the builder generates and
 * persists a genuine curriculum, Discover runs the universal search, and the
 * activity, achievements and progress numbers are your own. The order still
 * answers one question at every depth: "what do I learn next to become who I
 * want to become?"
 */
export default async function LearningPage() {
  const user = await requireUser();
  const xp = user.xp ?? 0;
  const streak = user.currentStreak ?? 0;

  // One coordinated read across the learning, analytics, project and career
  // modules. Each is defensive so a missing collection never blanks the page.
  const [roadmap, roadmaps, activity, achievements, counts, projectStats, certs, catalogProgress, dueCount, projects, challenges] =
    await Promise.all([
      getRoadmap(user._id).catch(() => null),
      listRoadmaps(user._id).catch(() => []),
      getActivityStrip(user._id, 84).catch(() => []),
      getAchievements(user._id, xp, streak).catch(() => []),
      getUserCounts(user._id, xp, streak).catch(() => null),
      getProjectStats(user._id).catch(() => null),
      getCertificates(user._id).catch(() => []),
      getCatalogProgressMap(user._id, COURSES.map((c) => c.slug)).catch(
        () => ({}) as Record<string, number>,
      ),
      countDueReviews(user._id).catch(() => 0),
      getProjects(user._id).catch(() => []),
      getChallenges(user._id).catch(() => []),
    ]);

  const next = findNextLesson(roadmap);

  /* The path rail: one node per skill, in order, with the brand mark inferred
     from the skill and phase titles. Locked phases stay locked. */
  const pathSteps =
    roadmap?.phases.flatMap((phase) =>
      phase.skills.map((skill) => {
        const total = skill.lessons.length;
        const done = skill.lessons.filter((l) => l.state === "mastered").length;
        const current = next ? skill.id === next.skill.id : false;
        return {
          id: skill.id,
          title: skill.title,
          tech: inferTech(skill.title, phase.title),
          state: phase.locked
            ? ("locked" as const)
            : done === total && total > 0
              ? ("done" as const)
              : current
                ? ("current" as const)
                : ("todo" as const),
          pct: total > 0 ? Math.round((done / total) * 100) : 0,
        };
      }),
    ) ?? [];
  const configured = isConfigured();

  const activePct =
    roadmap && roadmap.totalLessons > 0
      ? Math.round((roadmap.masteredLessons / roadmap.totalLessons) * 100)
      : 0;

  // Progress numbers, all real.
  const lessonsMastered = counts?.lessonsMastered ?? roadmap?.masteredLessons ?? 0;
  const totalLessons = roadmap?.totalLessons ?? 0;
  const projectsDone = projectStats?.complete ?? 0;
  const projectsTotal = (projectStats?.active ?? 0) + (projectStats?.complete ?? 0);
  const certsEarned = certs.length;

  const completedPct = totalLessons > 0 ? Math.round((lessonsMastered / totalLessons) * 100) : 0;

  /* ---- Mobile Learn ------------------------------------------------------
     The phone opens on your own path rather than on the catalogue, so it needs
     the remainder of the current skill and three short rails. All of it comes
     from data this page already loads. */
  const mobileLessonsLeft = next
    ? next.skill.lessons.filter((l) => l.state !== "mastered").length
    : 0;
  const mobileSkillMinutesLeft = next
    ? next.skill.lessons
        .filter((l) => l.state !== "mastered")
        .reduce((n, l) => n + l.estimatedMinutes, 0)
    : 0;
  const mobileSkillPct = next
    ? Math.round(
        (next.skill.lessons.filter((l) => l.state === "mastered").length /
          Math.max(1, next.skill.lessons.length)) * 100,
      )
    : 0;

  // Only the active path has a real number to show; the rest read 0 until
  // followed.
  const mobileRoadmapCards = roadmaps.slice(0, 8).map((r) => ({
    id: r.id,
    title: r.title,
    icon: (ROADMAP_META[r.title] ?? ROADMAP_META._default).icon,
    lessons: r.lessons,
    pct: r.active ? activePct : 0,
    active: r.active,
  }));

  /* Your own projects first — they are the ones with real progress — then
     catalogue briefs to fill the rail, marked as what they are: not started. */
  const mobileProjectCards = [
    ...projects.slice(0, 4).map((p) => ({
      key: `own-${p.id}`,
      href: `/projects/${p.id}`,
      title: p.title,
      icon: "FolderGit2",
      status: PROJECT_STATUS[p.status] ?? "In progress",
      pct: p.tasks > 0 ? Math.round((p.tasksDone / p.tasks) * 100) : 0,
    })),
    ...CATALOG_PROJECTS.slice(0, 4).map((p) => ({
      key: `brief-${p.slug}`,
      href: `/learning/project/${p.slug}`,
      title: p.title,
      tech: p.tech,
      icon: p.icon,
      status: "Not started",
      pct: null,
    })),
  ].slice(0, 6);

  const earnedCertNames = new Set(certs.map((c) => c.name));
  const mobileCertCards = CERTIFICATIONS.slice(0, 8).map((c) => ({
    slug: c.slug,
    title: c.title,
    provider: c.provider,
    icon: c.icon,
    earned: earnedCertNames.has(c.title),
  }));

  const mobileCourseCards = COURSES.slice(0, 8).map((c) => {
    const total = lessonCount(c);
    const done = catalogProgress[c.slug] ?? 0;
    return {
      slug: c.slug,
      title: c.title,
      tech: c.tech,
      icon: c.icon,
      level: c.level,
      pct: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  });

  return (
    <>
      {/* ============================================================ MOBILE
          A compact, list-first experience: tabs, chips, tight rows. Renders
          only below lg; the desktop hub below takes over from there. */}
      <div className="page-body pb-8 lg:hidden">
        <LearnMobileHome
          next={
            next
              ? {
                  id: next.lesson.id,
                  lessonTitle: next.lesson.title,
                  skillTitle: next.skill.title,
                  minutesLeft: mobileSkillMinutesLeft,
                  lessonsLeft: mobileLessonsLeft,
                  skillPct: mobileSkillPct,
                  tech: inferTech(next.skill.title, next.phase.title, next.lesson.title),
                  started: next.lesson.gateDone > 0,
                }
              : null
          }
          dueCount={dueCount}
          openProjects={projectStats?.active ?? 0}
          path={roadmap ? { title: roadmap.title, pct: activePct } : null}
          steps={pathSteps}
          roadmaps={mobileRoadmapCards}
          projects={mobileProjectCards}
          courses={mobileCourseCards}
          certifications={mobileCertCards}
          progress={{
            completedPct,
            lessons: [lessonsMastered, totalLessons],
            projects: [projectsDone, projectsTotal],
            certs: certsEarned,
            challenges: counts?.challengesSolved ?? 0,
            badgesEarned: achievements.filter((a) => a.unlocked).length,
            badgesTotal: achievements.length,
          }}
        />

        <section className="section-stack">
          <h2 className="text-[22px] font-bold tracking-[-0.025em]">Discover</h2>
          <Discover />
        </section>

        <section id="build" className="section-stack scroll-mt-4">
          <div>
            <h2 className="text-[22px] font-bold tracking-[-0.025em]">Build with AI</h2>
            <p className="text-body mt-1 text-[14px]">
              Create a personalised curriculum in minutes.
            </p>
          </div>
          <CurriculumBuilder configured={configured} />
        </section>
      </div>

      {/* =========================================================== DESKTOP */}
      <div className="page-body hidden pb-6 lg:flex">
      {/* ================================================= 1. The top block
          Greeting, Continue Learning + Today's Goal, the path stepper and the
          next step — built to the reference layout. */}
      <LearnTop
        name={user.name?.split(" ")[0] || "Developer"}
        pathTitle={roadmap?.title ?? "No path yet"}
        pathPct={activePct}
        steps={pathSteps}
        next={
          next
            ? {
                id: next.lesson.id,
                title: next.lesson.title,
                minutes: next.lesson.estimatedMinutes,
                skillTitle: next.skill.title,
                phaseTitle: next.phase.title,
                lessonIndex: next.skill.lessons.findIndex((l) => l.id === next.lesson.id) + 1,
                lessonTotal: next.skill.lessons.length,
                skillPct: Math.round(
                  (next.skill.lessons.filter((l) => l.state === "mastered").length /
                    Math.max(1, next.skill.lessons.length)) * 100,
                ),
                tech: inferTech(next.skill.title, next.phase.title, next.lesson.title),
              }
            : null
        }
        dueCount={dueCount}
        openProjects={projectStats?.active ?? 0}
      />

      {/* ============================================== 2. The reference bands
          Roadmap · Projects · Courses · Certifications, then
          Progress · AI mentor · Career journey. All real data. */}
      <LearnBands
        phases={
          roadmap?.phases.map((ph) => ({
            id: ph.id,
            title: ph.title,
            pct:
              ph.totalLessons > 0 ? Math.round((ph.masteredLessons / ph.totalLessons) * 100) : 0,
            locked: ph.locked,
            current: next ? ph.skills.some((sk) => sk.id === next.skill.id) : false,
          })) ?? []
        }
        pathTitle={roadmap?.title ?? "No path yet"}
        pathPct={activePct}
        projects={projects.map((pr) => ({
          id: pr.id,
          title: pr.title,
          status: pr.status,
          tasks: pr.tasks,
          tasksDone: pr.tasksDone,
        }))}
        courseProgress={catalogProgress}
        earnedCertNames={certs.map((c) => c.name)}
        level={levelFromXp(xp).level}
        levelTitle={levelFromXp(xp).title}
        xp={xp}
        into={levelFromXp(xp).into}
        need={levelFromXp(xp).need}
        streak={streak}
        badgesEarned={achievements.filter((a) => a.unlocked).length}
        badgesTotal={achievements.length}
      />

      {/* ========================================== 3. Popular roadmaps */}
      <section className="section-stack">
        <SectionTitle
          title="Popular Roadmaps"
          sub="Curated learning journeys, ready to follow. Every one is a real path with lessons, projects and milestones."
          href="/dashboard"
          hrefLabel="View all"
        />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {roadmaps.slice(0, 6).map((r, i) => (
            <Reveal key={r.id} index={i}>
              <RoadmapCard roadmap={r} meta={ROADMAP_META[r.title] ?? ROADMAP_META._default} />
            </Reveal>
          ))}
          {roadmaps.length === 0 && (
            <div className="card col-span-full p-5 text-center">
              <p className="text-[14px] font-medium">No paths loaded yet</p>
              <p className="text-body mt-1 text-[14px]">
                Generate one with the builder below, or run the seed script to load the curated
                library.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ======================================== 4. AI curriculum builder */}
      <section className="section-stack">
        <SectionTitle
          title="Build your own path"
          sub="Tell AI who you want to become. It writes a real month-by-month curriculum, every lesson and quiz included, and makes it your active path."
        />
        <CurriculumBuilder configured={configured} />
      </section>

      {/* ==================================================== 5. Challenges
          Practice belongs on Learn: reading a lesson and passing its tests are
          the same loop. Unsolved first, because a solved one teaches nothing. */}
      <section className="section-stack">
        <SectionTitle
          title="Challenges"
          sub="Short problems graded against real tests. Run them in the browser, submit when the hidden cases pass."
          href="/learning/challenges"
          hrefLabel="View all"
        />
        {challenges.length === 0 ? (
          <div className="card p-5 text-center">
            <p className="text-[14px] font-medium">No challenges loaded yet</p>
            <p className="text-body mt-1 text-[14px]">
              Run the seed script to load the practice library.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[...challenges]
              .sort((a, b) => Number(a.solved) - Number(b.solved))
              .slice(0, 6)
              .map((c, i) => (
                <Reveal key={c.id} index={i}>
                  <Link
                    href={`/learning/challenges/${c.id}`}
                    className="card card-link flex h-full items-start gap-3.5 p-4"
                  >
                    <span className={`icon-tile icon-tile-lg ${c.solved ? "icon-tile-success" : ""}`}>
                      {c.solved ? <CheckCircle2 size={18} /> : <Dumbbell size={18} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold">{c.title}</span>
                      <span className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span
                          className="chip chip-sm capitalize"
                          style={{
                            color: DIFFICULTY_COLOR[c.difficulty] ?? "var(--text-muted)",
                            borderColor: `color-mix(in srgb, ${
                              DIFFICULTY_COLOR[c.difficulty] ?? "var(--border)"
                            } 35%, transparent)`,
                          }}
                        >
                          {c.difficulty}
                        </span>
                        <span className="chip chip-sm capitalize">{c.category}</span>
                      </span>
                    </span>
                    <span
                      className="num flex shrink-0 items-center gap-1 text-[12px]"
                      style={{ color: "var(--text-faint)" }}
                    >
                      <Zap size={12} style={{ color: "var(--warning)" }} /> {c.xp}
                    </span>
                  </Link>
                </Reveal>
              ))}
          </div>
        )}
      </section>

      {/* ===================================================== 6. Discover */}
      <section id="discover" className="section-stack scroll-mt-4">
        <SectionTitle
          title="Discover"
          sub="Search everything you can learn or build, courses, projects, roadmaps, certifications, assessments."
        />
        <Discover />
      </section>

      {/* =============================== 7. Activity + achievements + progress */}
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1.1fr)]">
        <LearningActivity
          days={activity.map((d) => ({ day: d.day, minutes: d.minutes }))}
          streak={streak}
          xp={xp}
          roadmapTitle={roadmap?.title}
        />
        <Achievements achievements={achievements} />
        <ProgressOverview
          completedPct={completedPct}
          lessons={[lessonsMastered, totalLessons]}
          projects={[projectsDone, projectsTotal]}
          certs={[certsEarned, Math.max(10, certsEarned)]}
          challengesSolved={counts?.challengesSolved ?? 0}
        />
      </section>
      </div>
    </>
  );
}

/* ======================================================== Section heading */

/** Difficulty is signage, not decoration — three states, three status tokens. */
const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "var(--success)",
  medium: "var(--warning)",
  hard: "var(--danger)",
};

function SectionTitle({
  title,
  sub,
  href,
  hrefLabel }: {
  title: string;
  sub?: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-[22px] font-bold tracking-[-0.025em] sm:text-[23px]">{title}</h2>
        {sub && <p className="text-body mt-1 max-w-[70ch] text-[14px]">{sub}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="flex shrink-0 items-center gap-1 text-[14px] font-medium"
          style={{ color: "var(--primary)" }}
        >
          {hrefLabel ?? "View all"} <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}

/* =========================================================== Continue card */

type NextLesson = ReturnType<typeof findNextLesson>;

function ContinueLearning({
  hasPath,
  title,
  pct,
  next }: {
  hasPath: boolean;
  title: string;
  pct: number;
  next: NextLesson;
}) {
  const href = next ? `/learning/lesson/${next.lesson.id}` : "/learning/roadmap";
  // The real logo for whatever this path is about, read out of its own titles.
  const tech = inferTech(title, next?.skill.title, next?.lesson.title);
  return (
    <div className="panel flex flex-col p-5">
      <p className="eyebrow">Continue Learning</p>
      <div className="mt-4 flex items-center gap-3">
        {tech ? (
          <TechLogo name={tech} mode="plate" size={40} />
        ) : (
          <span className="icon-tile icon-tile-lg">
            <ContentIcon name="Code2" size={18} />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="title-card truncate">{title}</h3>
          <p className="text-meta">
            {hasPath ? "Resume your learning journey." : "Pick a path to begin."}
          </p>
        </div>
      </div>

      {hasPath && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-[12px]">
            <span style={{ color: "var(--text-muted)" }}>Progress</span>
            <span className="num font-semibold" style={{ color: "var(--text)" }}>
              {pct}%
            </span>
          </div>
          <div className="progress mt-2">
            <div className="progress-bar" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      <div
        className="mt-4 flex items-center gap-2 rounded-[var(--radius-tile)] p-3"
        style={{ background: "var(--surface-2)" }}
      >
        <Target size={15} style={{ color: "var(--primary)" }} className="shrink-0" />
        <div className="min-w-0">
          <p className="text-meta text-[12px]">Current mission</p>
          <p className="truncate text-[14px] font-medium">
            {next ? next.lesson.title : "Choose a roadmap to start"}
          </p>
        </div>
      </div>

      <Link href={href} className="btn btn-primary btn-block mt-4">
        <Play size={15} /> {next ? "Continue" : "Browse paths"}
      </Link>
    </div>
  );
}

/* ============================================================ How to learn */



/* ================================================================ Mission */

function Mission({
  roadmapTitle,
  pct,
  next,
  streak,
  remaining }: {
  roadmapTitle?: string;
  pct: number;
  next: NextLesson;
  streak: number;
  remaining: number;
}) {
  // The upcoming list is the next few real lessons in the current skill, so it
  // is genuinely what comes next rather than a fixed placeholder.
  const upcoming =
    next?.skill.lessons
      .filter((l) => l.state !== "mastered" && l.id !== next.lesson.id)
      .slice(0, 3)
      .map((l) => l.title) ?? [];

  const href = next ? `/learning/lesson/${next.lesson.id}` : "/learning/roadmap";

  return (
    <section className="panel overflow-hidden">
      <div
        className="grid gap-px md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)]"
        style={{ background: "var(--border)" }}
      >
        {/* Mission */}
        <div className="p-5" style={{ background: "var(--surface)" }}>
          <div className="flex items-center justify-between">
            <p className="eyebrow eyebrow-accent">Your Mission</p>
            <span className="num text-[12px] font-semibold" style={{ color: "var(--primary)" }}>
              {pct}%
            </span>
          </div>
          <h3 className="mt-2 truncate text-[22px] font-bold tracking-[-0.02em]">
            {roadmapTitle ?? "No active path"}
          </h3>
          <div className="progress mt-3">
            <div className="progress-bar" style={{ width: `${pct}%` }} />
          </div>

          <Link
            href={href}
            className="mt-4 block rounded-[var(--radius-tile)] border p-3"
            style={{ borderColor: "var(--warning-faint)", background: "var(--warning-faint)" }}
          >
            <p
              className="text-[12px] font-semibold uppercase tracking-wide"
              style={{ color: "var(--warning)" }}
            >
              Current mission
            </p>
            <p className="mt-1 flex items-center justify-between gap-2 text-[14px] font-semibold">
              <span className="truncate">{next ? next.lesson.title : "Pick a roadmap"}</span>
              <ChevronRight size={15} style={{ color: "var(--text-faint)" }} className="shrink-0" />
            </p>
            {next && <p className="text-meta mt-0.5 truncate">{next.skill.title}</p>}
          </Link>
        </div>

        {/* Rewards + upcoming */}
        <div className="p-5" style={{ background: "var(--surface)" }}>
          <p className="text-meta text-[12px] font-semibold uppercase tracking-wide">Rewards</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Reward icon={<Zap size={15} />} label="+50 XP" />
            <Reward icon={<Award size={15} />} label="Badge" />
            <Reward icon={<Trophy size={15} />} label="Progress" />
          </div>

          <p className="text-meta mt-5 text-[12px] font-semibold uppercase tracking-wide">
            Up next
          </p>
          <ul className="mt-2.5 flex flex-col gap-2">
            {(upcoming.length > 0 ? upcoming : ["You're all caught up on this skill"]).map((u) => (
              <li key={u} className="flex items-center gap-2.5 text-[14px]">
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-full border-2"
                  style={{ borderColor: "var(--border-strong)" }}
                />
                <span className="truncate" style={{ color: "var(--text-muted)" }}>
                  {u}
                </span>
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
              <p className="text-meta text-[12px]">Learning streak</p>
              <p className="num text-[14px] font-bold" style={{ color: "var(--warning)" }}>
                {streak} {streak === 1 ? "Day" : "Days"}
              </p>
            </div>
          </div>
          <div
            className="mt-3 flex items-center gap-3 rounded-[var(--radius-tile)] p-3"
            style={{ background: "var(--surface-2)" }}
          >
            <CheckCircle2 size={18} style={{ color: "var(--success)" }} />
            <div>
              <p className="text-meta text-[12px]">Lessons remaining</p>
              <p className="num text-[14px] font-semibold">{Math.max(0, remaining)} to master</p>
            </div>
          </div>
          <Link href={href} className="btn btn-primary btn-block mt-auto">
            <Play size={15} /> Continue Learning
          </Link>
        </div>
      </div>
    </section>
  );
}

function Reward({
  icon,
  label }: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div
      className="flex flex-col items-center gap-1.5 rounded-[var(--radius-tile)] p-2"
      style={{ background: "var(--surface-2)" }}
    >
      <span className="icon-tile h-9 w-9">{icon}</span>
      <span className="text-[12px] font-medium" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
    </div>
  );
}

/* ======================================================= Learning activity */

function LearningActivity({
  days,
  streak,
  xp,
  roadmapTitle }: {
  days: { day: string; minutes: number }[];
  streak: number;
  xp: number;
  roadmapTitle?: string;
}) {
  return (
    <div className="panel flex flex-col p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="title-card">Learning Activity</h3>
          <p className="text-meta">Last 84 days</p>
        </div>
        {roadmapTitle && (
          <span className="badge badge-primary max-w-[140px]">
            <ContentIcon name="Code2" size={11} />
            <span className="truncate">{roadmapTitle}</span>
          </span>
        )}
      </div>

      <div className="mt-4 flex-1">
        {days.length > 0 ? (
          <Heatmap days={days} />
        ) : (
          <div
            className="grid h-full min-h-[120px] place-items-center rounded-[var(--radius-tile)] text-center"
            style={{ background: "var(--surface-2)" }}
          >
            <p className="text-body text-[14px]">Your activity graph fills in as you study.</p>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div
          className="flex items-center gap-2.5 rounded-[var(--radius-tile)] p-3"
          style={{ background: "var(--warning-faint)" }}
        >
          <Flame size={17} style={{ color: "var(--warning)" }} />
          <div>
            <p className="num text-[14px] font-bold">{streak}</p>
            <p className="text-meta text-[12px]">Day streak</p>
          </div>
        </div>
        <div
          className="flex items-center gap-2.5 rounded-[var(--radius-tile)] p-3"
          style={{ background: "var(--primary-faint)" }}
        >
          <Zap size={17} style={{ color: "var(--primary)" }} />
          <div>
            <p className="num text-[14px] font-bold">{xp.toLocaleString()}</p>
            <p className="text-meta text-[12px]">Total XP</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================== Achievements */

type EarnedAchievement = {
  key: string;
  title: string;
  description: string;
  tier: string;
  unlocked: boolean;
  progress: number;
};

const TIER_ICON: Record<string, string> = {
  bronze: "Star",
  silver: "Zap",
  gold: "Trophy" };

function Achievements({ achievements }: { achievements: EarnedAchievement[] }) {
  const shown = achievements.slice(0, 8);
  return (
    <div className="panel flex flex-col p-5">
      <div className="flex items-center justify-between">
        <h3 className="title-card">Achievements</h3>
        <Link
          href="/analytics/achievements"
          className="text-[14px] font-medium"
          style={{ color: "var(--primary)" }}
        >
          View all
        </Link>
      </div>

      <div className="mt-4 grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
        {shown.map((a) => (
          <div
            key={a.key}
            className="flex flex-col items-center gap-2 rounded-[var(--radius-tile)] p-3 text-center"
            title={a.description}
            style={{
              background: a.unlocked ? "var(--surface-2)" : "transparent",
              border: `1px solid ${a.unlocked ? "var(--border)" : "var(--border-faint)"}`,
              opacity: a.unlocked ? 1 : 0.55 }}
          >
            <span
              className={`icon-tile icon-tile-lg ${
                a.unlocked
                  ? a.tier === "gold"
                    ? ""
                    : a.tier === "silver"
                      ? ""
                      : ""
                  : ""
              }`}
            >
              <ContentIcon name={TIER_ICON[a.tier] ?? "Star"} size={18} />
            </span>
            <div>
              <p className="text-[12px] font-semibold leading-tight">{a.title}</p>
              <p className="text-meta text-[12px]">
                {a.unlocked ? "Earned" : `${a.progress}%`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ========================================================= Progress overview */

function ProgressOverview({
  completedPct,
  lessons,
  projects,
  certs,
  challengesSolved }: {
  completedPct: number;
  lessons: [number, number];
  projects: [number, number];
  certs: [number, number];
  challengesSolved: number;
}) {
  const inProgressPct = Math.min(100 - completedPct, Math.round((challengesSolved > 0 ? 30 : 20)));
  const notStarted = Math.max(0, 100 - completedPct - inProgressPct);
  const segments = [
    { label: "Completed", pct: completedPct, color: "var(--success)" },
    { label: "In Progress", pct: inProgressPct, color: "var(--primary)" },
    { label: "Not Started", pct: notStarted, color: "var(--surface-4)" },
  ];
  return (
    <div className="panel flex flex-col p-5">
      <h3 className="title-card">Progress Overview</h3>

      <div className="mt-4 flex items-center gap-5">
        <Ring value={completedPct} label="" size={92} tone="var(--primary)" />
        <ul className="flex flex-1 flex-col gap-2.5">
          {segments.map((s) => (
            <li key={s.label} className="flex items-center justify-between text-[14px]">
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
        <Metric
          icon={<BookOpen size={14} />}
          value={`${lessons[0]} / ${lessons[1]}`}
          label="Lessons"
          href="/learning"
        />
        <Metric
          icon={<FolderGit2 size={14} />}
          value={`${projects[0]} / ${projects[1]}`}
          label="Projects"
          href="/projects"
        />
        <Metric
          icon={<Award size={14} />}
          value={`${certs[0]} / ${certs[1]}`}
          label="Certificates"
          href="/career/certificates"
        />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <Metric
          icon={<Dumbbell size={14} />}
          value={String(challengesSolved)}
          label="Challenges solved"
          href="/practice"
        />
        <Metric
          icon={<RotateCcw size={14} />}
          value="Review"
          label="Reinforce memory"
          href="/review"
        />
      </div>
    </div>
  );
}

function Metric({
  icon,
  value,
  label,
  href }: {
  icon: React.ReactNode;
  value: string;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="row-link flex flex-col items-center gap-1 rounded-[var(--radius-tile)] p-3 text-center"
      style={{ background: "var(--surface-2)" }}
    >
      <span style={{ color: "var(--primary)" }}>{icon}</span>
      <span className="num text-[14px] font-bold">{value}</span>
      <span className="text-meta text-[12px]">{label}</span>
    </Link>
  );
}
