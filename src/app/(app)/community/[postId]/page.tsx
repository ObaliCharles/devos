import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { requireUser } from "@/lib/user";
import { getPost } from "@/lib/queries";
import { Avatar, ago } from "@/components/community/feed";
import { Thread } from "@/components/community/thread";

export const dynamic = "force-dynamic";

export default async function PostPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const user = await requireUser();
  const post = await getPost(user._id, postId).catch(() => null);
  if (!post) notFound();

  return (
    <div className="page-body">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px]">
        <Link
          href="/community"
          className="transition-colors hover:text-[var(--text)]"
          style={{ color: "var(--text-faint)" }}
        >
          Community
        </Link>
        <ChevronRight size={13} style={{ color: "var(--text-faint)", opacity: 0.5 }} />
        {post.group && (
          <>
            <Link
              href={`/community/groups/${post.group.slug}`}
              className="transition-colors hover:text-[var(--text)]"
              style={{ color: "var(--text-faint)" }}
            >
              {post.group.name}
            </Link>
            <ChevronRight size={13} style={{ color: "var(--text-faint)", opacity: 0.5 }} />
          </>
        )}
        <span className="truncate" style={{ color: "var(--text-muted)" }}>
          {post.title}
        </span>
      </nav>

      <article className="card p-5">
        <div className="flex items-center gap-2.5">
          <Avatar author={post.author} size={32} />
          <div className="min-w-0">
            <p className="text-[13px] font-medium">{post.author.name}</p>
            <p className="text-[12px]" style={{ color: "var(--text-faint)" }}>
              {ago(post.createdAt)}
            </p>
          </div>
          <span className="chip chip-sm ml-auto capitalize">{post.kind}</span>
        </div>

        <h1 className="title-page mt-4">{post.title}</h1>

        {post.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {post.tags.map((t) => (
              <Link key={t} href={`/community?tag=${t}`} className="chip chip-sm">
                #{t}
              </Link>
            ))}
          </div>
        )}

        {post.body && (
          <div className="prose-doc mt-4 min-w-0 max-w-full overflow-x-auto">
            <Markdown remarkPlugins={[remarkGfm]}>{post.body}</Markdown>
          </div>
        )}
      </article>

      <Thread
        postId={post.id}
        replies={post.replies}
        isQuestion={post.kind === "question"}
        isAuthor={post.isAuthor}
        canDelete={post.isAuthor}
      />
    </div>
  );
}
