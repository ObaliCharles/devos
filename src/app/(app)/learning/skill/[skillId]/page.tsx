import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, FolderKanban, Plus } from "lucide-react";
import { requireUser } from "@/lib/user";
import { connectDB } from "@/lib/db";
import { Lesson, LessonProgress, Phase, Skill } from "@/lib/models";
import { getProjectsForSkill } from "@/lib/queries";
import { Badge, PageHeader, ProgressBar, Steps, type Tone } from "@/components/ui";

export const dynamic = "force-dynamic";

const GATE_KEYS = ["read", "noted", "exercised", "quizzed", "reviewed"] as const;

const STATE_LABEL: Record<string, { text: string; tone: Tone }> = {
  not_started: { text: "Not started", tone: "neutral" },
  learning: { text: "Learning", tone: "info" },
  practicing: { text: "Practising", tone: "primary" },
  confident: { text: "Confident", tone: "warning" },
  mastered: { text: "Mastered", tone: "success" },
  needs_revision: { text: "Needs revision", tone: "danger" },
};

const DIFFICULTY_TONE: Record<string, Tone> = {
  beginner: "success",
  intermediate: "warning",
  advanced: "danger",
};

const PROJECT_TONE: Record<string, Tone> = {
  planning: "neutral",
  building: "info",
  testing: "warning",
  deployed: "success",
  complete: "success",
  paused: "neutral",
  archived: "neutral",
};

export default async function SkillPage({ params }: { params: Promise<{ skillId: string }> }) {
  const { skillId } = await params;
  const user = await requireUser();
  await connectDB();

  const skill = await Skill.findById(skillId).lean<{
    _id: unknown;
    title: string;
    why?: string;
    difficulty: string;
    estimatedHours?: number;
    phase: unknown;
  }>();
  if (!skill) notFound();

  const [phase, lessons, progress, projects] = await Promise.all([
    Phase.findById(skill.phase).lean<{ title: string; order: number }>(),
    Lesson.find({ skill: skillId }).sort({ order: 1 }).select("-body").lean(),
    LessonProgress.find({ user: user._id, skill: skillId }).lean(),
    getProjectsForSkill(user._id, skillId),
  ]);

  const byLesson = new Map(progress.map((p) => [String(p.lesson), p]));
  const mastered = progress.filter((p) => p.state === "mastered").length;

  return (
    <div className="page-body">
      <PageHeader
        back={{ href: "/learning", label: "Roadmap" }}
        eyebrow={`Phase ${phase?.order} · ${phase?.title}`}
        title={skill.title}
        description={skill.why}
        meta={
          <>
            <Badge tone={DIFFICULTY_TONE[skill.difficulty] ?? "neutral"}>{skill.difficulty}</Badge>
            {skill.estimatedHours ? <Badge>~{skill.estimatedHours} hours</Badge> : null}
            <div className="flex min-w-[180px] flex-1 items-center gap-2.5">
              <ProgressBar
                value={mastered}
                total={lessons.length}
                size="sm"
                tone={mastered === lessons.length && lessons.length > 0 ? "success" : "primary"}
                label={`${mastered} of ${lessons.length} lessons mastered`}
              />
              <span className="num text-[12px]" style={{ color: "var(--text-faint)" }}>
                {mastered}/{lessons.length}
              </span>
            </div>
          </>
        }
      />

      {/* ------------------------------------------------------------ Lessons */}
      <ol className="flex flex-col gap-1.5">
        {lessons.map((lesson, i) => {
          const p = byLesson.get(String(lesson._id));
          const gate = (p?.gate ?? {}) as Record<string, boolean>;
          const done = GATE_KEYS.filter((k) => gate[k]).length;
          const state = STATE_LABEL[p?.state ?? "not_started"];
          const isMastered = p?.state === "mastered";

          return (
            <li key={String(lesson._id)}>
              <Link
                href={`/learning/lesson/${String(lesson._id)}`}
                className="card card-link flex items-center gap-3.5 p-3.5"
              >
                <span
                  className={`icon-tile num h-8 w-8 text-[12px] font-semibold ${
                    isMastered ? "icon-tile-success" : ""
                  }`}
                >
                  {isMastered ? <Check size={15} strokeWidth={2.8} /> : i + 1}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">{lesson.title}</span>
                  <span className="text-meta mt-0.5 flex items-center gap-2">
                    {lesson.estimatedMinutes ?? 30} min
                    <Badge tone={state.tone}>{state.text}</Badge>
                  </span>
                </span>

                <span className="hidden w-[92px] shrink-0 sm:block">
                  <Steps done={done} total={5} label={`${done} of 5 requirements met`} />
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      {/* The link that makes learning and building one product rather than two.
          A skill is not finished when the lessons are mastered, it is finished
          when you have built something with it. */}
      <section className="section-stack">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <FolderKanban size={16} style={{ color: "var(--text-muted)" }} />
            <h2 className="title-section">Where you have used this</h2>
          </div>
          <Link href="/projects/new" className="btn btn-ghost btn-sm">
            <Plus size={14} /> New project
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="well p-4">
            <p className="text-body text-[13.5px]">
              Nothing yet. Mastering the lessons proves you can follow along, building a project
              proves you can do it without one. Start a project and link it to this skill.
            </p>
            <Link href="/projects/new" className="btn btn-secondary btn-sm mt-4">
              <Plus size={14} /> Start a project
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {projects.map((p) => (
              <li key={String(p._id)}>
                <Link
                  href={`/projects/${String(p._id)}`}
                  className="card card-link flex items-center justify-between gap-3 p-3.5"
                >
                  <span className="truncate text-[14px] font-medium">{String(p.title)}</span>
                  <Badge tone={PROJECT_TONE[String(p.status)] ?? "neutral"}>
                    {String(p.status)}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
