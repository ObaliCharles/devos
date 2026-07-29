import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Users } from "lucide-react";
import { requireUser } from "@/lib/user";
import { getGroupBySlug, listGroups, listPostTags, listPosts, type FeedSort } from "@/lib/queries";
import { Feed, JoinButton } from "@/components/community/feed";

export const dynamic = "force-dynamic";

const SORTS = new Set(["active", "new", "top"]);

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; tag?: string }>;
}) {
  const { slug } = await params;
  const { sort: rawSort, tag } = await searchParams;
  const sort = (SORTS.has(rawSort ?? "") ? rawSort : "active") as FeedSort;

  const user = await requireUser();
  const group = await getGroupBySlug(user._id, slug);
  if (!group) notFound();

  const [posts, groups, tags] = await Promise.all([
    listPosts(user._id, { groupId: group.id, sort, tag }).catch(() => []),
    listGroups(user._id).catch(() => []),
    listPostTags().catch(() => []),
  ]);

  return (
    <div className="page-body">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px]">
        <Link
          href="/community/discussions"
          className="transition-colors hover:text-[var(--text)]"
          style={{ color: "var(--text-faint)" }}
        >
          Community
        </Link>
        <ChevronRight size={13} style={{ color: "var(--text-faint)", opacity: 0.5 }} />
        <span style={{ color: "var(--text-muted)" }}>{group.name}</span>
      </nav>

      <header className="card flex flex-wrap items-center gap-4 p-5">
        <span className="icon-tile icon-tile-lg icon-tile-primary">
          <Users size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="title-page">{group.name}</h1>
          {group.description && <p className="text-body mt-1 text-[14px]">{group.description}</p>}
          <div
            className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]"
            style={{ color: "var(--text-faint)" }}
          >
            <span className="num">
              {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
            </span>
            <span className="num">
              {group.postCount} {group.postCount === 1 ? "post" : "posts"}
            </span>
            <span className="chip chip-sm">#{group.topic}</span>
          </div>
        </div>
        <JoinButton
          group={{
            id: group.id,
            slug: group.slug,
            name: group.name,
            description: group.description,
            topic: group.topic,
            memberCount: group.memberCount,
            postCount: group.postCount,
            joined: group.joined,
          }}
        />
      </header>

      <Feed
        posts={posts}
        groups={groups}
        tags={tags}
        sort={sort}
        tag={tag}
        basePath={`/community/groups/${group.slug}`}
        groupId={group.id}
      />
    </div>
  );
}
