import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Clock } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getCourse, flatLessons } from "@/lib/catalog";
import { requireUser } from "@/lib/user";
import { getCatalogProgress } from "@/lib/queries";
import { ExplainLesson } from "@/components/learn/explain-lesson";
import { LessonQuiz } from "@/components/learn/lesson-quiz";
import { CompleteLesson } from "@/components/learn/complete-lesson";
import { Challenges } from "@/components/learn/challenges";

// Reads per-user progress, so it renders per request rather than at build time.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; lesson: string }>;
}) {
  const { slug, lesson } = await params;
  const course = getCourse(slug);
  const l = course ? flatLessons(course)[Number(lesson) - 1] : undefined;
  return { title: l ? `${l.title} · ${course?.title}` : "Lesson" };
}

export default async function CourseLessonPage({
  params,
}: {
  params: Promise<{ slug: string; lesson: string }>;
}) {
  const { slug, lesson } = await params;
  const course = getCourse(slug);
  if (!course) notFound();

  const all = flatLessons(course);
  const idx = Number(lesson) - 1; // routes are 1-based for humans
  const current = all[idx];
  if (!current) notFound();

  const user = await requireUser();
  const completed = await getCatalogProgress(user._id, course.slug).catch(() => []);
  const doneSet = new Set(completed);

  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx < all.length - 1 ? all[idx + 1] : null;
  // Course progress by lessons actually completed, not just position reached.
  const progressPct = Math.round((completed.length / all.length) * 100);

  return (
    <div className="page-body measure-reading pb-10">
      {/* Back to the course overview */}
      <Link
        href={`/learning/course/${course.slug}`}
        className="-ml-1 inline-flex w-fit items-center gap-1.5 rounded-[var(--radius-xs)] px-1 py-0.5 text-[13px] font-medium"
        style={{ color: "var(--text-muted)" }}
      >
        <ArrowLeft size={15} /> {course.title}
      </Link>

      {/* Course progress rail — reflects lessons actually completed */}
      <div>
        <div className="flex items-center justify-between text-[12px]">
          <span style={{ color: "var(--text-muted)" }}>
            Lesson {idx + 1} of {all.length} · {completed.length} completed
          </span>
          <span className="num font-medium" style={{ color: "var(--text-muted)" }}>
            {progressPct}%
          </span>
        </div>
        <div className="progress progress-sm mt-1.5">
          <div
            className="progress-bar progress-bar-success"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Header */}
      <header className="rise">
        <p className="eyebrow eyebrow-accent">
          {current.moduleTitle} · {current.minutes} min
        </p>
        <h1 className="title-page mt-2">{current.title}</h1>
        <p className="text-body mt-2 flex items-start gap-2 text-[14px]">
          <span className="shrink-0" style={{ color: "var(--primary)" }} aria-hidden>
            →
          </span>
          {current.objective}
        </p>
      </header>

      {/* Lesson content — stored, loads instantly */}
      <article className="card prose-doc p-5 sm:p-8">
        <Markdown remarkPlugins={[remarkGfm]}>{current.body ?? ""}</Markdown>
      </article>

      {/* Go deeper with the tutor, right here, no navigation */}
      <section className="card p-5">
        <p className="eyebrow">Didn&apos;t fully click?</p>
        <h2 className="title-card mt-1.5">Ask the AI tutor</h2>
        <p className="text-body mt-1 text-[13px]">
          Get a worked example, another angle, or the mistakes to avoid — it has this lesson&apos;s
          context.
        </p>
        <ExplainLesson course={course.title} topic={current.title} objective={current.objective} />
      </section>

      {/* Practice — the tasks come before the quiz on purpose. A multiple
          choice question checks that you followed along; writing the code is
          what actually moves the lesson from read to known. */}
      {current.challenges && current.challenges.length > 0 && (
        <Challenges challenges={current.challenges} />
      )}

      {/* Knowledge check */}
      {current.quiz && current.quiz.length > 0 && (
        <section className="card p-5">
          <p className="eyebrow">Quick check</p>
          <h2 className="title-card mt-1.5">Test yourself</h2>
          <div className="mt-4">
            <LessonQuiz questions={current.quiz} />
          </div>
        </section>
      )}

      {/* Complete this lesson — credits XP, streak and course progress once */}
      <div
        className="card flex flex-wrap items-center justify-between gap-4 p-5"
        style={{ background: "var(--surface-2)" }}
      >
        <div>
          <p className="title-card">Done with this lesson?</p>
          <p className="text-body mt-0.5 text-[13px]">
            Mark it complete to earn XP, keep your streak alive, and track course progress.
          </p>
        </div>
        <CompleteLesson
          course={course.slug}
          lessonIndex={idx}
          nextHref={
            next
              ? `/learning/course/${course.slug}/${next.index + 1}`
              : `/learning/course/${course.slug}`
          }
          alreadyDone={doneSet.has(idx)}
        />
      </div>

      {/* Prev / Next through the course */}
      <nav className="grid gap-3 sm:grid-cols-2" aria-label="Lesson navigation">
        {prev ? (
          <Link
            href={`/learning/course/${course.slug}/${prev.index + 1}`}
            className="card card-link flex items-center gap-3 p-4"
          >
            <ArrowLeft size={16} style={{ color: "var(--text-faint)" }} className="shrink-0" />
            <span className="min-w-0">
              <span className="text-meta block text-[11px]">Previous</span>
              <span className="block truncate text-[13.5px] font-medium">{prev.title}</span>
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/learning/course/${course.slug}/${next.index + 1}`}
            className="card card-link flex items-center justify-end gap-3 p-4 text-right"
          >
            <span className="min-w-0">
              <span className="text-meta block text-[11px]">Next</span>
              <span className="block truncate text-[13.5px] font-medium">{next.title}</span>
            </span>
            <ArrowRight size={16} style={{ color: "var(--primary)" }} className="shrink-0" />
          </Link>
        ) : (
          <Link
            href={`/learning/course/${course.slug}`}
            className="card card-link flex items-center justify-end gap-3 p-4 text-right"
            style={{ background: "var(--success-faint)", borderColor: "var(--success)" }}
          >
            <span className="min-w-0">
              <span className="text-meta block text-[11px]">Course complete</span>
              <span className="block truncate text-[13.5px] font-medium">Back to overview</span>
            </span>
            <Check size={16} style={{ color: "var(--success)" }} className="shrink-0" />
          </Link>
        )}
      </nav>

      <p className="text-meta flex items-center justify-center gap-1.5">
        <Clock size={12} /> About {current.minutes} minutes · {course.title}
      </p>
    </div>
  );
}
