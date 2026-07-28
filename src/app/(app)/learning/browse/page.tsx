import { requireUser } from "@/lib/user";
import { getCatalogProgressMap, getRoadmap, listRoadmaps } from "@/lib/queries";
import { COURSES } from "@/lib/catalog";
import { ROADMAP_META } from "@/lib/learn-content";
import { LearnMobile } from "@/components/learn/learn-mobile";

export const dynamic = "force-dynamic";

const TABS = ["Roadmaps", "Courses", "Projects", "Certifications"] as const;
type Tab = (typeof TABS)[number];

/**
 * Browse: every roadmap, course, project and certification as one filterable
 * list.
 *
 * This is the tabbed list that used to be the whole mobile Learn page. Learn
 * now opens on your own path — what you are in the middle of — and browsing
 * the full catalogue moved here, one tap away behind each rail's "See all".
 * The `tab` parameter is what makes those links land on the right list.
 */
export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  const { tab } = await searchParams;

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

  // Only the active path has a real number to show; the rest read 0 until
  // followed, exactly as they did when this list lived on /learning.
  const rows = roadmaps.map((r) => ({ ...r, pct: r.active ? activePct : 0 }));

  const requested = TABS.find((t) => t.toLowerCase() === (tab ?? "").toLowerCase());

  return (
    <div className="page-body pb-8">
      <LearnMobile
        roadmaps={rows}
        metaFor={ROADMAP_META}
        courseProgress={catalogProgress}
        initialTab={(requested ?? "Roadmaps") as Tab}
      />
    </div>
  );
}
