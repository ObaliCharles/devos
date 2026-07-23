import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { connectDB } from "@/lib/db";
import { Lesson, LessonProgress, Note, Skill } from "@/lib/models";
import { requireUser } from "@/lib/user";
import { MasteryGate, type GateState } from "@/components/mastery-gate";
import { Quiz, type Question } from "@/components/quiz";
import { NoteComposer } from "@/components/note-composer";
import { AiPanel } from "@/components/ai-panel";
import { TimeTracker } from "@/components/time-tracker";
import { IconTile, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

/** A numbered requirement block. The eyebrow states which of the five gates
 *  this satisfies, so the page reads as a checklist rather than a wall. */
function Requirement({ id, eyebrow, title, children }: {
  id: string; eyebrow: string; title: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="card p-4 sm:p-5">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="title-section mt-1.5">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const user = await requireUser();
  await connectDB();

  const lesson = await Lesson.findById(lessonId).lean<{
    _id: unknown;
    title: string;
    order: number;
    skill: unknown;
    objectives?: string[];
    estimatedMinutes?: number;
    body: string;
    exercise?: { brief?: string; acceptance?: string[] };
    quiz?: Question[];
  }>();
  if (!lesson) notFound();

  const [skill, progress, noteCount, nextLesson] = await Promise.all([
    Skill.findById(lesson.skill).lean<{ _id: unknown; title: string }>(),
    LessonProgress.findOne({ user: user._id, lesson: lessonId }).lean<{
      gate?: Partial<GateState>;
      state?: string;
      quizScore?: number;
    } | null>(),
    Note.countDocuments({ user: user._id, lesson: lessonId, trashedAt: null }),
    Lesson.findOne({ skill: lesson.skill, order: { $gt: lesson.order } })
      .sort({ order: 1 })
      .select("title")
      .lean<{ _id: unknown; title: string }>(),
  ]);

  const stored = progress?.gate ?? {};
  const gate: GateState = {
    read: stored.read ?? false,
    exercised: stored.exercised ?? false,
    quizzed: stored.quizzed ?? false,
    reviewed: stored.reviewed ?? false,
    // Read from the notes themselves rather than a flag that could drift.
    noted: noteCount > 0,
  };

  return (
    <div className="page-body">
      {/* Invisible; accrues real time on the lesson while the tab is open. */}
      <TimeTracker lessonId={String(lesson._id)} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_336px]">
        {/* ------------------------------------------------ main column */}
        <div className="flex min-w-0 flex-col gap-6">
          <PageHeader
            back={{ href: `/learning/skill/${String(skill?._id ?? "")}`, label: skill?.title ?? "Skill" }}
            eyebrow={`Lesson ${lesson.order} · ${lesson.estimatedMinutes ?? 30} min`}
            title={lesson.title}
            meta={
              lesson.objectives && lesson.objectives.length > 0 ? (
                <ul className="flex w-full flex-col gap-1.5">
                  {lesson.objectives.map((o) => (
                    <li key={o} className="flex gap-2.5 text-[13.5px] leading-relaxed">
                      <span className="shrink-0" style={{ color: "var(--primary)" }} aria-hidden>→</span>
                      <span style={{ color: "var(--text-muted)" }}>{o}</span>
                    </li>
                  ))}
                </ul>
              ) : undefined
            }
          />

          <article className="card prose-doc p-5 sm:p-8">
            <Markdown remarkPlugins={[remarkGfm]}>{lesson.body}</Markdown>
          </article>

          {lesson.exercise?.brief && (
            <Requirement id="exercise" eyebrow="Requirement 3" title="Exercise">
              <div className="prose-doc">
                <Markdown remarkPlugins={[remarkGfm]}>{lesson.exercise.brief}</Markdown>
              </div>
              {lesson.exercise.acceptance && lesson.exercise.acceptance.length > 0 && (
                <>
                  <p className="overline mt-6">Done when</p>
                  <ul className="well mt-2.5 flex flex-col gap-2 p-4">
                    {lesson.exercise.acceptance.map((a) => (
                      <li key={a} className="flex gap-2.5 text-[13.5px] leading-relaxed">
                        <span className="shrink-0" style={{ color: "var(--text-faint)" }} aria-hidden>□</span>
                        <span style={{ color: "var(--text-muted)" }}>{a}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Requirement>
          )}

          <Requirement id="quiz" eyebrow="Requirement 4" title="Quiz">
            <Quiz lessonId={String(lesson._id)} questions={lesson.quiz ?? []} />
          </Requirement>

          <Requirement id="notes" eyebrow="Requirement 2" title="Your notes">
            <NoteComposer
              lessonId={String(lesson._id)}
              lessonTitle={lesson.title}
              existingCount={noteCount}
            />
          </Requirement>

          {nextLesson && (
            <Link
              href={`/learning/lesson/${String(nextLesson._id)}`}
              className="card card-link flex items-center justify-between gap-4 p-4"
            >
              <div className="min-w-0">
                <p className="eyebrow eyebrow-accent">Next lesson</p>
                <p className="mt-1 truncate text-[15px] font-medium">{nextLesson.title}</p>
              </div>
              <ArrowRight size={17} className="shrink-0" style={{ color: "var(--text-faint)" }} />
            </Link>
          )}
        </div>

        {/* ------------------------------------------------ side column */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-0 lg:self-start">
          <MasteryGate
            lessonId={String(lesson._id)}
            initial={gate}
            mastered={progress?.state === "mastered"}
            quizScore={progress?.quizScore}
          />

          <section className="card p-4">
            <div className="flex items-center gap-3">
              <IconTile tone="primary">
                <Sparkles size={16} />
              </IconTile>
              <div>
                <p className="eyebrow">AI tutor</p>
                <h2 className="title-card mt-0.5">Stuck on something?</h2>
              </div>
            </div>
            <div className="mt-4">
              <AiPanel lessonId={String(lesson._id)} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
