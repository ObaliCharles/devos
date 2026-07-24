import { BookOpen } from "lucide-react";
import { requireUser } from "@/lib/user";
import { getRoadmap, listRoadmaps } from "@/lib/queries";
import { isConfigured } from "@/lib/ai";
import { Badge, EmptyState, PageHeader, ProgressBar } from "@/components/ui";
import { RoadmapModes } from "@/components/roadmap-modes";
import { LearningModePanel } from "@/components/learning-mode-panel";
import { CourseCatalog } from "@/components/course-catalog";
import { Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LearningPage() {
  const user = await requireUser();
  const [roadmap, roadmaps] = await Promise.all([
    getRoadmap(user._id),
    listRoadmaps(user._id),
  ]);
  const configured = isConfigured();

  // No path at all: first run. Offer the two ways forward rather than a dead
  // "run the seed script" message.
  if (!roadmap) {
    return (
      <div className="page-body">
        <PageHeader
          eyebrow="Learning"
          title="Start a learning path"
          description="Follow a ready-made path, or describe what you want to learn and let the assistant build one for you."
        />
        <RoadmapModes roadmaps={roadmaps} configured={configured} />
        {roadmaps.length === 0 && (
          <EmptyState
            compact
            icon={<BookOpen size={22} />}
            title="No curated paths yet"
            body="Run npm run seed to load the starter roadmap, or generate your own path above."
          />
        )}
      </div>
    );
  }

  return (
    <div className="page-body">
      {/* 1, the active path, up top */}
      <PageHeader
        eyebrow="Learning path"
        title={roadmap.title}
        description={roadmap.summary}
        meta={
          <div className="flex w-full items-center gap-3 sm:max-w-md">
            <ProgressBar
              value={roadmap.masteredLessons}
              total={roadmap.totalLessons}
              label={`${roadmap.masteredLessons} of ${roadmap.totalLessons} lessons mastered`}
            />
            <span className="num shrink-0 text-[13px] font-medium" style={{ color: "var(--text-muted)" }}>
              {roadmap.masteredLessons}/{roadmap.totalLessons}
            </span>
            {roadmap.origin === "ai" && (
              <Badge tone="primary">
                <Sparkles size={10} /> AI path
              </Badge>
            )}
          </div>
        }
      />

      {/* 2, switch path or generate a new one with AI */}
      <LearningModePanel roadmaps={roadmaps} configured={configured} />

      {/* 3, the course catalogue: heading, search, categorised course list */}
      <section className="section-stack">
        <div>
          <h2 className="title-page text-[26px]">Courses</h2>
          <p className="text-body mt-1 text-[14px]">
            Every course on this path, grouped by category. Search to jump straight to one.
          </p>
        </div>
        <CourseCatalog phases={roadmap.phases} />
      </section>
    </div>
  );
}
