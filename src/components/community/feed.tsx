"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  CheckCircle2,
  Heart,
  HelpCircle,
  Megaphone,
  MessageSquare,
  Pin,
  Plus,
  Rocket,
  Users,
  X,
} from "lucide-react";
import type { GroupCard, PostCard } from "@/lib/queries/community";
import {
  createPost,
  togglePostBookmark,
  toggleGroupMembership,
  toggleReaction,
} from "@/lib/actions";
import { ActionButton } from "@/components/action-button";

/**
 * The community feed.
 *
 * Composer at the top rather than behind a "New post" route, because the cost
 * of starting a post is the thing that decides whether a community has any. It
 * opens in place, so you never lose the thread you were reading.
 *
 * Reactions and bookmarks update optimistically. They are advisory counters on
 * social content — being briefly wrong costs nothing, and waiting a round trip
 * to see your own tap register costs the interaction.
 */

const KIND_META: Record<string, { label: string; icon: typeof MessageSquare; colour: string }> = {
  discussion: { label: "Discussion", icon: MessageSquare, colour: "var(--text-muted)" },
  question: { label: "Question", icon: HelpCircle, colour: "var(--info)" },
  showcase: { label: "Showcase", icon: Rocket, colour: "var(--primary)" },
  announcement: { label: "Announcement", icon: Megaphone, colour: "var(--warning)" },
};

const SORTS = [
  { key: "active", label: "Active" },
  { key: "new", label: "New" },
  { key: "top", label: "Top" },
] as const;

export function Feed({
  posts,
  groups,
  tags,
  sort,
  tag,
  basePath,
  groupId,
}: {
  posts: PostCard[];
  groups: GroupCard[];
  tags: string[];
  sort: string;
  tag?: string;
  /** Where the sort and tag links point — the feed or one group. */
  basePath: string;
  /** Set inside a group, so new posts land in it. */
  groupId?: string;
}) {
  const [composing, setComposing] = useState(false);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
      <div className="flex min-w-0 flex-col gap-4">
        {composing ? (
          <Composer groupId={groupId} onClose={() => setComposing(false)} />
        ) : (
          <button
            className="card card-link flex w-full items-center gap-3 p-4 text-left"
            onClick={() => setComposing(true)}
          >
            <span className="icon-tile icon-tile-lg icon-tile-primary">
              <Plus size={18} />
            </span>
            <span className="text-[14px]" style={{ color: "var(--text-muted)" }}>
              Ask a question, share what you built, start a discussion…
            </span>
          </button>
        )}

        <div className="flex items-center gap-3">
          <nav className="segmented w-fit" aria-label="Sort posts">
            {SORTS.map((s) => (
              <Link
                key={s.key}
                href={`${basePath}?sort=${s.key}${tag ? `&tag=${tag}` : ""}`}
                aria-current={sort === s.key ? "page" : undefined}
                className={`segment ${sort === s.key ? "segment-active" : ""}`}
              >
                {s.label}
              </Link>
            ))}
          </nav>
          {tag && (
            <Link href={`${basePath}?sort=${sort}`} className="chip chip-sm chip-on">
              #{tag} <X size={11} />
            </Link>
          )}
          <span className="num ml-auto text-[12px]" style={{ color: "var(--text-faint)" }}>
            {posts.length} {posts.length === 1 ? "post" : "posts"}
          </span>
        </div>

        {posts.length === 0 ? (
          <div className="card grid place-items-center gap-2 p-8 text-center">
            <span className="icon-tile icon-tile-lg">
              <MessageSquare size={18} />
            </span>
            <p className="text-[14px] font-medium">Nothing here yet</p>
            <p className="text-body max-w-sm text-[13px]">
              {tag
                ? "No posts carry that tag. Clear it to see everything."
                : "Be the first to post. A question counts — most good threads start as one."}
            </p>
            <button className="btn btn-primary btn-sm mt-1" onClick={() => setComposing(true)}>
              <Plus size={14} /> Write the first post
            </button>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {posts.map((p) => (
              <li key={p.id}>
                <PostRow post={p} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-5">
        <GroupsRail groups={groups} />
        {tags.length > 0 && (
          <section className="card p-4">
            <h2 className="eyebrow">Topics</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <Link
                  key={t}
                  href={`${basePath}?sort=${sort}&tag=${t}`}
                  className={`chip chip-sm ${tag === t ? "chip-on" : ""}`}
                >
                  #{t}
                </Link>
              ))}
            </div>
          </section>
        )}
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ pieces */

function Composer({ groupId, onClose }: { groupId?: string; onClose: () => void }) {
  const router = useRouter();
  const [kind, setKind] = useState("discussion");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    const result = await createPost({ title, body, kind, tags, groupId });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onClose();
    router.push(`/community/${result.id}`);
  }

  return (
    <section className="card flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {Object.entries(KIND_META).map(([key, meta]) => (
          <button
            key={key}
            className={`chip chip-sm ${kind === key ? "chip-on" : ""}`}
            aria-pressed={kind === key}
            onClick={() => setKind(key)}
          >
            <meta.icon size={11} /> {meta.label}
          </button>
        ))}
        <button className="btn-icon-sm ml-auto" onClick={onClose} aria-label="Cancel">
          <X size={14} />
        </button>
      </div>

      <input
        className="input"
        placeholder={kind === "question" ? "What are you stuck on?" : "Give it a title"}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={160}
        autoFocus
      />
      <textarea
        className="textarea min-h-28"
        placeholder="Markdown works here. Code fences too."
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <input
        className="input"
        placeholder="Tags, comma separated — react, typescript"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
      />

      {error && (
        <p className="text-[13px]" style={{ color: "var(--danger)" }} role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <ActionButton className="btn btn-primary" onClick={submit} disabled={!title.trim()}>
          Post
        </ActionButton>
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
      </div>
    </section>
  );
}

function PostRow({ post }: { post: PostCard }) {
  const [reacted, setReacted] = useState(post.reacted);
  const [count, setCount] = useState(post.reactionCount);
  const [saved, setSaved] = useState(post.bookmarked);
  const [, start] = useTransition();
  const meta = KIND_META[post.kind] ?? KIND_META.discussion;

  return (
    <article className="card card-link relative p-4">
      <Link href={`/community/${post.id}`} className="absolute inset-0 rounded-[inherit]">
        <span className="sr-only">{post.title}</span>
      </Link>

      <div className="flex items-start gap-3.5">
        <Avatar author={post.author} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <span className="font-medium" style={{ color: "var(--text-muted)" }}>
              {post.author.name}
            </span>
            <span style={{ color: "var(--text-faint)" }}>{ago(post.lastActivityAt)}</span>
            {post.group && (
              <Link
                href={`/community/groups/${post.group.slug}`}
                className="relative chip chip-sm"
              >
                {post.group.name}
              </Link>
            )}
            {post.pinned && (
              <span className="flex items-center gap-1" style={{ color: "var(--warning)" }}>
                <Pin size={11} /> Pinned
              </span>
            )}
          </div>

          <h3 className="mt-1.5 flex items-center gap-2 text-[15px] font-semibold">
            <meta.icon size={14} style={{ color: meta.colour }} className="shrink-0" />
            <span className="min-w-0">{post.title}</span>
            {post.answered && (
              <span
                className="flex shrink-0 items-center gap-1 text-[12px]"
                style={{ color: "var(--success)" }}
              >
                <CheckCircle2 size={12} /> Answered
              </span>
            )}
          </h3>

          {post.excerpt && <p className="text-body mt-1.5 line-clamp-2 text-[13px]">{post.excerpt}</p>}

          {post.tags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {post.tags.map((t) => (
                <span key={t} className="chip chip-sm">
                  #{t}
                </span>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center gap-1">
            <button
              className="relative flex items-center gap-1.5 rounded-[var(--radius-pill)] px-2 py-1 text-[12px]"
              aria-pressed={reacted}
              aria-label={reacted ? "Remove reaction" : "React to this post"}
              style={{ color: reacted ? "var(--danger)" : "var(--text-faint)" }}
              onClick={() => {
                setReacted((v) => !v);
                setCount((n) => n + (reacted ? -1 : 1));
                start(() => void toggleReaction(post.id, "post"));
              }}
            >
              <Heart size={13} style={reacted ? { fill: "var(--danger)" } : undefined} />
              <span className="num">{count}</span>
            </button>

            <span
              className="flex items-center gap-1.5 px-2 py-1 text-[12px]"
              style={{ color: "var(--text-faint)" }}
            >
              <MessageSquare size={13} />
              <span className="num">{post.replyCount}</span>
            </span>

            <button
              className="relative ml-auto rounded-[var(--radius-pill)] px-2 py-1"
              aria-pressed={saved}
              aria-label={saved ? "Remove bookmark" : "Bookmark this post"}
              onClick={() => {
                setSaved((v) => !v);
                start(() => void togglePostBookmark(post.id));
              }}
            >
              <Bookmark
                size={13}
                style={
                  saved
                    ? { color: "var(--primary)", fill: "var(--primary)" }
                    : { color: "var(--text-faint)" }
                }
              />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function GroupsRail({ groups }: { groups: GroupCard[] }) {
  return (
    <section className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="eyebrow">Groups</h2>
        <Link href="/community/groups" className="text-[12px]" style={{ color: "var(--primary)" }}>
          All
        </Link>
      </div>

      {groups.length === 0 ? (
        <p className="text-body mt-3 text-[13px]">
          No groups yet. Create one and it becomes the home for a topic.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1">
          {groups.slice(0, 6).map((g) => (
            <li key={g.id} className="flex items-center gap-2">
              <Link
                href={`/community/groups/${g.slug}`}
                className="row-link -mx-2 flex min-w-0 flex-1 items-center gap-2.5 rounded-[var(--radius-tile)] px-2 py-1.5"
              >
                <span className="icon-tile h-7 w-7 shrink-0">
                  <Users size={13} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{g.name}</span>
                  <span className="num text-[12px]" style={{ color: "var(--text-faint)" }}>
                    {g.memberCount} {g.memberCount === 1 ? "member" : "members"}
                  </span>
                </span>
              </Link>
              <JoinButton group={g} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function JoinButton({ group }: { group: GroupCard }) {
  const [joined, setJoined] = useState(group.joined);
  const [error, setError] = useState("");

  return (
    <ActionButton
      className={`btn btn-sm shrink-0 ${joined ? "btn-ghost" : "btn-secondary"}`}
      title={error || undefined}
      onClick={async () => {
        const result = await toggleGroupMembership(group.id);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setJoined(result.joined);
      }}
    >
      {joined ? "Joined" : "Join"}
    </ActionButton>
  );
}

export function Avatar({ author, size = 36 }: { author: { name: string; avatarUrl: string }; size?: number }) {
  if (author.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={author.avatarUrl}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="num grid shrink-0 place-items-center rounded-full text-[13px] font-semibold"
      style={{
        width: size,
        height: size,
        background: "var(--primary-faint)",
        color: "var(--primary)",
      }}
      aria-hidden
    >
      {author.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

/** Relative time, coarse on purpose — "3 days ago" is all anyone reads. */
export function ago(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const units: [number, string][] = [
    [60, "min"],
    [3600, "h"],
    [86400, "d"],
    [604800, "w"],
  ];
  for (let i = units.length - 1; i >= 0; i -= 1) {
    const [size, label] = units[i];
    if (seconds >= size) return `${Math.floor(seconds / size)}${label} ago`;
  }
  return "just now";
}
