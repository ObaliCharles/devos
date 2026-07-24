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
import { COURSES, getCourse, lessonCount } from "@/lib/catalog";
import { ContentIcon } from "@/components/learn/icon";
import { ExplainLesson } from "@/components/learn/explain-lesson";
import { Reveal } from "@/components/reveal";

/** Pre-render every catalog course, they're static content. */
export function generateStaticParams() {
  return COURSES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = getCourse(slug);
  return { title: course ? `${course.title} · DeveloperOS` : "Course" };
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = getCourse(slug);
  if (!course) notFound();

  const lessons = lessonCount(course);

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
          <span className={`icon-tile icon-tile-lg icon-tile-${course.accent} h-14 w-14`}>
            <ContentIcon name={course.icon} size={26} />
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
      </header>

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
                {mod.lessons.map((lesson, li) => (
                  <li
                    key={li}
                    className="border-b px-5 py-3.5 last:border-b-0"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold"
                        style={{ background: "var(--surface-2)", color: "var(--text-faint)" }}
                      >
                        {li + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                          <span className="text-[14px] font-medium">{lesson.title}</span>
                          <span className="text-meta shrink-0 text-[11.5px]">
                            {lesson.minutes} min
                          </span>
                        </div>
                        <p className="text-body mt-0.5 text-[12.5px]">{lesson.objective}</p>
                        <ExplainLesson
                          course={course.title}
                          topic={lesson.title}
                          objective={lesson.objective}
                        />
                      </div>
                    </div>
                  </li>
                ))}
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
            Add it to your path, or spin up the project you&apos;ll build.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/learning" className="btn btn-secondary">
            <BookOpen size={15} /> Back to Learn
          </Link>
          <Link href="/projects/new" className="btn btn-primary">
            Start the project <ArrowRight size={15} />
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
