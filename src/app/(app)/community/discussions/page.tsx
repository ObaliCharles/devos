import { requireUser } from "@/lib/user";
import {
  getCommunityStats,
  listGroups,
  listPostTags,
  listPosts,
  type FeedSort,
} from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { Feed } from "@/components/community/feed";

export const dynamic = "force-dynamic";

const SORTS = new Set(["active", "new", "top"]);

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; tag?: string }>;
}) {
  const { sort: rawSort, tag } = await searchParams;
  const sort = (SORTS.has(rawSort ?? "") ? rawSort : "active") as FeedSort;

  const user = await requireUser();
  const [posts, groups, tags, stats] = await Promise.all([
    listPosts(user._id, { sort, tag }).catch(() => []),
    listGroups(user._id).catch(() => []),
    listPostTags().catch(() => []),
    getCommunityStats(user._id).catch(() => ({
      posts: 0,
      replies: 0,
      groups: 0,
      myGroups: 0,
      myPosts: 0,
    })),
  ]);

  return (
    <div className="page-body">
      <PageHeader
        eyebrow="Community"
        title="Discussions"
        description="Ask, answer, and show what you are building. Questions can be marked answered, so a good thread stays useful long after it scrolls away."
        meta={
          <>
            <span className="num text-[12px]" style={{ color: "var(--text-faint)" }}>
              {stats.posts} {stats.posts === 1 ? "post" : "posts"}
            </span>
            <span className="num text-[12px]" style={{ color: "var(--text-faint)" }}>
              {stats.replies} {stats.replies === 1 ? "reply" : "replies"}
            </span>
            <span className="num text-[12px]" style={{ color: "var(--text-faint)" }}>
              {stats.groups} {stats.groups === 1 ? "group" : "groups"}
            </span>
          </>
        }
      />

      <Feed posts={posts} groups={groups} tags={tags} sort={sort} tag={tag} basePath="/community/discussions" />
    </div>
  );
}
