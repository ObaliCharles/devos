import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/user";
import { getRoadmap, findNextLesson } from "@/lib/queries";
import { Badge, EmptyState, ProgressBar } from "@/components/ui";
import { CourseCatalog } from "@/components/course-catalog";
import { BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * The active roadmap, in full: its phases and the skills inside them, each with
 * real progress and a way in. This is the "view the roadmap" page that the hub
 * and the roadmap cards point at — activating a path lands you here, where you
 * can actually see and open it, rather than back on the hub list.
 */
export default async function RoadmapPage() {
  const user = await requireUser();
  const roadmap = await getRoadmap(user._id).catch(() => null);

  if (!roadmap) {
    return (
      <div className="page-body">
        <Link
          href="/learning"
          className="-ml-1 inline-flex w-fit items-center gap-1.5 rounded-[var(--radius-xs)] px-1 py-0.5 text-[13px] font-medium"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft size={15} /> Learn
        </Link>
        <EmptyState
          icon={<BookOpen size={22} />}
          title="No active roadmap yet"
          body="Follow a roadmap from Learn, or generate one with AI, and it will appear here in full."
          action={
            <Link href="/learning" className="btn btn-primary">
              Browse roadmaps
            </Link>
          }
        />
      </div>
    );
  }

  const next = findNextLesson(roadmap);
  const pct =
    roadmap.totalLessons > 0
      ? Math.round((roadmap.masteredLessons / roadmap.totalLessons) * 100)
      : 0;

  return (
    <div className="page-body">
      <Link
        href="/learning"
        className="-ml-1 inline-flex w-fit items-center gap-1.5 rounded-[var(--radius-xs)] px-1 py-0.5 text-[13px] font-medium"
        style={{ color: "var(--text-muted)" }}
      >
        <ArrowLeft size={15} /> Learn
      </Link>

      {/* Header with real progress */}
      <header className="rise">
        <div className="flex flex-wrap items-center gap-2">
          <p className="eyebrow eyebrow-accent">Your roadmap</p>
          {roadmap.origin === "ai" && (
            <Badge tone="primary">
              <Sparkles size={10} /> AI generated
            </Badge>
          )}
        </div>
        <h1 className="title-page mt-2">{roadmap.title}</h1>
        {roadmap.summary && <p className="text-body mt-2 max-w-[70ch]">{roadmap.summary}</p>}

        <div className="mt-4 flex w-full max-w-md items-center gap-3">
          <ProgressBar
            value={roadmap.masteredLessons}
            total={roadmap.totalLessons}
            tone={pct === 100 ? "success" : "primary"}
            label={`${roadmap.masteredLessons} of ${roadmap.totalLessons} lessons mastered`}
          />
          <span className="num shrink-0 text-[13px] font-medium" style={{ color: "var(--text-muted)" }}>
            {roadmap.masteredLessons}/{roadmap.totalLessons} · {pct}%
          </span>
        </div>

        {next && (
          <div className="mt-4">
            <Link href={`/learning/lesson/${next.lesson.id}`} className="btn btn-primary">
              Continue: {next.lesson.title}
            </Link>
          </div>
        )}
      </header>

      {/* The full phase → skill tree, each linking into its lessons */}
      <CourseCatalog phases={roadmap.phases} />
    </div>
  );
}
