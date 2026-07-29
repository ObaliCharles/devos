"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2, Heart, MessageSquare, Trash2 } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ReplyNode } from "@/lib/queries/community";
import { acceptAnswer, deletePost, replyToPost, toggleReaction } from "@/lib/actions";
import { ActionButton } from "@/components/action-button";
import { Avatar, ago } from "./feed";

/**
 * One thread.
 *
 * Replies nest exactly one level. Deeper threads stop being readable on a phone
 * and nobody has ever wanted the fourth level — so the reply box on a reply
 * attaches to its top-level parent rather than growing the tree.
 *
 * On a question, the author can accept an answer. That is the only moderation
 * power here, and it is the one that makes a question thread worth reading
 * later: the accepted reply sorts to the top and carries a mark, so the answer
 * is never buried under the conversation that followed it.
 */
export function Thread({
  postId,
  replies,
  isQuestion,
  isAuthor,
  canDelete,
}: {
  postId: string;
  replies: ReplyNode[];
  isQuestion: boolean;
  isAuthor: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [error, setError] = useState("");

  const roots = replies.filter((r) => !r.parent);
  const childrenOf = (id: string) => replies.filter((r) => r.parent === id);

  async function send(parentId?: string) {
    setError("");
    const result = await replyToPost(postId, body, parentId);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setBody("");
    setReplyingTo(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      {/* The composer sits above the replies on a thread you are answering, so
          it is reachable without scrolling past everything first. */}
      <section className="card flex flex-col gap-3 p-4">
        <h2 className="eyebrow">
          {isQuestion ? "Answer this" : "Reply"}
        </h2>
        <textarea
          className="textarea min-h-24"
          placeholder="Markdown works here. Code fences too."
          value={replyingTo === null ? body : ""}
          onChange={(e) => {
            setReplyingTo(null);
            setBody(e.target.value);
          }}
        />
        {error && (
          <p className="text-[13px]" style={{ color: "var(--danger)" }} role="alert">
            {error}
          </p>
        )}
        <ActionButton
          className="btn btn-primary self-start"
          icon={<MessageSquare size={15} />}
          disabled={!body.trim() || replyingTo !== null}
          onClick={() => send()}
        >
          Post reply
        </ActionButton>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow">
          {replies.length} {replies.length === 1 ? "reply" : "replies"}
        </h2>

        {replies.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-[14px] font-medium">No replies yet</p>
            <p className="text-body mt-1 text-[13px]">
              {isQuestion ? "Know the answer? It is worth 3 XP." : "Start the conversation."}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {roots.map((r) => (
              <li key={r.id}>
                <Reply
                  reply={r}
                  postId={postId}
                  canAccept={isQuestion && isAuthor}
                  onReply={() => setReplyingTo(r.id)}
                />
                {childrenOf(r.id).length > 0 && (
                  <ul
                    className="mt-2 flex flex-col gap-2 border-l pl-4"
                    style={{ borderColor: "var(--border)", marginLeft: 18 }}
                  >
                    {childrenOf(r.id).map((c) => (
                      <li key={c.id}>
                        <Reply reply={c} postId={postId} canAccept={false} />
                      </li>
                    ))}
                  </ul>
                )}

                {replyingTo === r.id && (
                  <div className="card mt-2 flex flex-col gap-2 p-3" style={{ marginLeft: 18 }}>
                    <textarea
                      className="textarea min-h-20"
                      placeholder={`Reply to ${r.author.name}…`}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <ActionButton
                        className="btn btn-primary btn-sm"
                        disabled={!body.trim()}
                        onClick={() => send(r.id)}
                      >
                        Reply
                      </ActionButton>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setReplyingTo(null);
                          setBody("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {canDelete && (
        <ActionButton
          className="btn btn-ghost btn-sm self-start"
          icon={<Trash2 size={14} />}
          style={{ color: "var(--danger)" }}
          onClick={async () => {
            await deletePost(postId);
            router.push("/community/discussions");
          }}
        >
          Delete post
        </ActionButton>
      )}
    </div>
  );
}

function Reply({
  reply,
  postId,
  canAccept,
  onReply,
}: {
  reply: ReplyNode;
  postId: string;
  canAccept: boolean;
  onReply?: () => void;
}) {
  const router = useRouter();
  const [reacted, setReacted] = useState(reply.reacted);
  const [count, setCount] = useState(reply.reactionCount);
  const [, start] = useTransition();

  return (
    <article
      className="card p-4"
      style={
        reply.accepted
          ? {
              borderColor: "color-mix(in srgb, var(--success) 45%, transparent)",
              background: "color-mix(in srgb, var(--success) 6%, transparent)",
            }
          : undefined
      }
    >
      <div className="flex items-start gap-3">
        <Avatar author={reply.author} size={32} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <span className="font-medium" style={{ color: "var(--text-muted)" }}>
              {reply.author.name}
            </span>
            <span style={{ color: "var(--text-faint)" }}>{ago(reply.createdAt)}</span>
            {reply.accepted && (
              <span className="flex items-center gap-1" style={{ color: "var(--success)" }}>
                <CheckCircle2 size={12} /> Accepted answer
              </span>
            )}
          </div>

          <div className="prose-doc mt-2 min-w-0 max-w-full overflow-x-auto text-[14px]">
            <Markdown remarkPlugins={[remarkGfm]}>{reply.body}</Markdown>
          </div>

          <div className="mt-2.5 flex items-center gap-1">
            <button
              className="flex items-center gap-1.5 rounded-[var(--radius-pill)] px-2 py-1 text-[12px]"
              aria-pressed={reacted}
              aria-label={reacted ? "Remove reaction" : "React to this reply"}
              style={{ color: reacted ? "var(--danger)" : "var(--text-faint)" }}
              onClick={() => {
                setReacted((v) => !v);
                setCount((n) => n + (reacted ? -1 : 1));
                start(() => void toggleReaction(reply.id, "reply"));
              }}
            >
              <Heart size={13} style={reacted ? { fill: "var(--danger)" } : undefined} />
              <span className="num">{count}</span>
            </button>

            {onReply && (
              <button
                className="rounded-[var(--radius-pill)] px-2 py-1 text-[12px]"
                style={{ color: "var(--text-faint)" }}
                onClick={onReply}
              >
                Reply
              </button>
            )}

            {canAccept && (
              <ActionButton
                className="btn btn-ghost btn-xs ml-auto"
                icon={<Check size={12} />}
                onClick={async () => {
                  await acceptAnswer(postId, reply.id);
                  router.refresh();
                }}
              >
                {reply.accepted ? "Unaccept" : "Accept"}
              </ActionButton>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
