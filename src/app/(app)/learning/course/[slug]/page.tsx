import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock,
  FolderGit2,
  Layers,
  Lightbulb,
  Target,
} from "lucide-react";
import { Check } from "lucide-react";
import { getCourse, lessonCount, flatLessons } from "@/lib/catalog";
import { requireUser } from "@/lib/user";
import { getCatalogProgress } from "@/lib/queries";
import { ContentIcon } from "@/components/learn/icon";
import { TechLogo, TECH_WITH_LOGO } from "@/components/learn/tech-logo";
import { Reveal } from "@/components/reveal";

// Reads per-user progress, so it renders per request.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = getCourse(slug);
  return { title: course ? `${course.title} · DeveloperOS` : "Course" };
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = getCourse(slug);
  if (!course) notFound();

  const user = await requireUser();
  const completed = await getCatalogProgress(user._id, course.slug).catch(() => []);
  const doneSet = new Set(completed);

  const lessons = lessonCount(course);
  const flat = flatLessons(course);
  const pct = lessons > 0 ? Math.round((completed.length / lessons) * 100) : 0;
  // First lesson not yet completed — where "Start"/"Resume" should land.
  const resumeIdx = (flat.find((f) => !doneSet.has(f.index))?.index ?? 0) + 1;
  // Map (moduleIndex, lessonInModule) -> flat lesson for route + completed state.
  const flatAt = (mi: number, li: number) =>
    flat.find((f) => f.moduleIndex === mi && f.lessonInModule === li)!;

  return (
    <div className="page-body measure-reading pb-10">
      {/* Back */}
      <Link
        href="/learning"
        className="-ml-1 inline-flex w-fit items-center gap-1.5 rounded-[var(--radius-xs)] px-1 py-0.5 text-[13px] font-medium"
        style={{ color: "var(--text-muted)" }}
      >
        <ArrowLeft size={15} /> Learn
      </Link>

      {/* ------------------------------------------------------------- Header */}
      <header className="rise flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <span className={`icon-tile icon-tile-lg h-14 w-14 ${course.tech && TECH_WITH_LOGO.has(course.tech) ? "" : `icon-tile-${course.accent}`}`}>
            {course.tech && TECH_WITH_LOGO.has(course.tech) ? (
              <TechLogo name={course.tech} size={30} />
            ) : (
              <ContentIcon name={course.icon} size={26} />
            )}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge">{course.level}</span>
              <span className="badge badge-primary">{course.track}</span>
            </div>
            <h1 className="title-page mt-2">{course.title}</h1>
            <p className="text-body mt-1.5 text-[14.5px]">{course.tagline}</p>
          </div>
        </div>
        <Link
          href={`/learning/course/${course.slug}/${resumeIdx}`}
          className="btn btn-primary btn-lg shrink-0"
        >
          {completed.length > 0 && completed.length < lessons
            ? "Resume course"
            : completed.length >= lessons && lessons > 0
              ? "Review course"
              : "Start course"}{" "}
          <ArrowRight size={16} />
        </Link>
      </header>

      {/* Progress bar — only once you've started */}
      {completed.length > 0 && (
        <div className="panel p-4">
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-medium">Your progress</span>
            <span className="num" style={{ color: "var(--text-muted)" }}>
              {completed.length} / {lessons} lessons · {pct}%
            </span>
          </div>
          <div className="progress mt-2">
            <div className="progress-bar progress-bar-success" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Stat strip */}
      <div
        className="panel grid grid-cols-2 gap-px overflow-hidden sm:grid-cols-4"
        style={{ background: "var(--border)" }}
      >
        <Stat icon={<Layers size={14} />} value={course.modules.length} label="Modules" />
        <Stat icon={<BookOpen size={14} />} value={lessons} label="Lessons" />
        <Stat icon={<Clock size={14} />} value={`${course.hours}h`} label="Est. time" />
        <Stat icon={<Target size={14} />} value={course.level} label="Level" />
      </div>

      {/* Overview + why + build */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="panel p-5">
          <h2 className="title-card">About this course</h2>
          <p className="text-body mt-2 text-[14px]">{course.description}</p>
        </div>
        <div className="flex flex-col gap-4">
          <div className="panel p-5">
            <div className="flex items-center gap-2">
              <Lightbulb size={16} style={{ color: "var(--warning)" }} />
              <h3 className="title-card">Why it matters</h3>
            </div>
            <p className="text-body mt-2 text-[13.5px]">{course.whyItMatters}</p>
          </div>
          <div
            className="panel p-5"
            style={{ background: "var(--primary-faint)", borderColor: "var(--primary-muted)" }}
          >
            <div className="flex items-center gap-2">
              <FolderGit2 size={16} style={{ color: "var(--primary)" }} />
              <h3 className="title-card">You&apos;ll build</h3>
            </div>
            <p className="mt-2 text-[13.5px] font-medium">{course.youWillBuild}</p>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- Curriculum */}
      <section className="section-stack">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-[21px] font-bold tracking-[-0.025em]">Curriculum</h2>
            <p className="text-body mt-1 text-[13.5px]">
              {course.modules.length} modules · {lessons} lessons. Stuck on any of them? Ask the AI
              tutor right there.
            </p>
          </div>
        </div>

        <ol className="flex flex-col gap-4">
          {course.modules.map((mod, mi) => (
            <Reveal as="li" key={mi} index={mi} className="panel overflow-hidden">
              <div className="border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-3">
                  <span
                    className="num grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-tile)] text-[13px] font-bold"
                    style={{ background: "var(--surface-3)", color: "var(--text-muted)" }}
                  >
                    {mi + 1}
                  </span>
                  <div className="min-w-0">
                    <h3 className="title-card">{mod.title}</h3>
                    <p className="text-meta mt-0.5">{mod.summary}</p>
                  </div>
                </div>
              </div>

              <ul>
                {mod.lessons.map((lesson, li) => {
                  const f = flatAt(mi, li);
                  const isDone = doneSet.has(f.index);
                  return (
                  <li key={li}>
                    <Link
                      href={`/learning/course/${course.slug}/${f.index + 1}`}
                      className="row-link flex items-start gap-3 border-b px-5 py-3.5 last:border-b-0"
                      style={{ borderColor: "var(--border)", borderRadius: 0 }}
                    >
                      <span
                        className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold"
                        style={{
                          background: isDone ? "var(--success-faint)" : "var(--surface-2)",
                          color: isDone ? "var(--success)" : "var(--text-faint)",
                        }}
                      >
                        {isDone ? <Check size={13} /> : li + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                          <span className="text-[14px] font-medium">{lesson.title}</span>
                          <span className="text-meta shrink-0 text-[11.5px]">
                            {lesson.minutes} min
                          </span>
                        </div>
                        <p className="text-body mt-0.5 text-[12.5px]">{lesson.objective}</p>
                      </div>
                      <ArrowRight
                        size={15}
                        className="mt-1 shrink-0"
                        style={{ color: "var(--text-faint)" }}
                      />
                    </Link>
                  </li>
                  );
                })}
              </ul>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* Footer CTA */}
      <div
        className="panel flex flex-wrap items-center justify-between gap-4 p-5"
        style={{ background: "var(--surface-2)" }}
      >
        <div>
          <p className="title-card">Ready to start {course.title}?</p>
          <p className="text-body mt-0.5 text-[13px]">
            Begin at lesson one, or jump to the project you&apos;ll build.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/projects/new" className="btn btn-secondary">
            <FolderGit2 size={15} /> Start the project
          </Link>
          <Link href={`/learning/course/${course.slug}/${resumeIdx}`} className="btn btn-primary">
            {completed.length > 0 ? "Resume course" : "Start course"} <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div className="px-4 py-3.5" style={{ background: "var(--surface)" }}>
      <span className="flex items-center gap-1.5" style={{ color: "var(--text-faint)" }}>
        {icon}
        <span className="num text-[16px] font-semibold" style={{ color: "var(--text)" }}>
          {value}
        </span>
      </span>
      <span className="text-meta mt-0.5 block text-[11.5px]">{label}</span>
    </div>
  );
}
