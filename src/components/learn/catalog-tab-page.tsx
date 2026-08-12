import { requireUser } from "@/lib/user";
import { getCatalogProgressMap, getRoadmap, listRoadmaps } from "@/lib/queries";
import { COURSES } from "@/lib/catalog";
import { ROADMAP_META } from "@/lib/learn-content";
import { LearnMobile } from "@/components/learn/learn-mobile";

export const CATALOG_TABS = ["Roadmaps", "Courses", "Projects", "Certifications"] as const;
export type CatalogTab = (typeof CATALOG_TABS)[number];

export async function CatalogTabPage({ tab = "Roadmaps" }: { tab?: CatalogTab }) {
  const user = await requireUser();

  const [roadmap, roadmaps, catalogProgress] = await Promise.all([
    getRoadmap(user._id).catch(() => null),
    listRoadmaps(user._id).catch(() => []),
    getCatalogProgressMap(
      user._id,
      COURSES.map((c) => c.slug),
    ).catch(() => ({}) as Record<string, number>),
  ]);

  const activePct =
    roadmap && roadmap.totalLessons > 0
      ? Math.round((roadmap.masteredLessons / roadmap.totalLessons) * 100)
      : 0;

  const rows = roadmaps.map((r) => ({ ...r, pct: r.active ? activePct : 0 }));

  return (
    <div className="page-body pb-8">
      <LearnMobile
        roadmaps={rows}
        metaFor={ROADMAP_META}
        courseProgress={catalogProgress}
        initialTab={tab}
      />
    </div>
  );
}
