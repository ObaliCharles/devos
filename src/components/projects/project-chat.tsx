"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import type { ProjectLine } from "@/lib/queries/collaboration";
import { sendProjectMessage } from "@/lib/actions";
import { ActionButton } from "@/components/action-button";
import { Avatar, ago } from "@/components/community/feed";

/**
 * Project chat. Same interaction model as the community rooms — consecutive
 * lines from one person within five minutes lose their header, Enter sends,
 * Shift+Enter newlines, polling pauses on a hidden tab — because a second chat
 * that behaves differently from the first is a chat people get wrong twice.
 */
export function ProjectChat({
  projectId,
  messages,
  canPost,
}: {
  projectId: string;
  messages: ProjectLine[];
  canPost: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = setInterval(tick, 8000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router]);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [messages.length]);

  async function send() {
    setError("");
    const text = body;
    setBody("");
    const result = await sendProjectMessage(projectId, text);
    if (!result.ok) {
      setBody(text);
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <section className="card flex min-w-0 flex-col overflow-hidden">
      <div ref={log} className="flex min-h-[440px] flex-col gap-0.5 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="text-body m-auto max-w-sm text-center text-[13px]">
            Nothing said yet. This is the place for the decisions that do not
            belong in a task description.
          </p>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1];
            const grouped =
              prev &&
              prev.author.id === m.author.id &&
              new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 300_000;
            return (
              <div key={m.id} className={`flex gap-2.5 ${grouped ? "" : "mt-3 first:mt-0"}`}>
                <span className="w-7 shrink-0">
                  {!grouped && <Avatar author={m.author} size={28} />}
                </span>
                <div className="min-w-0 flex-1">
                  {!grouped && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-[13px] font-medium">{m.author.name}</span>
                      <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>
                        {ago(m.createdAt)}
                      </span>
                    </div>
                  )}
                  <p
                    className="whitespace-pre-wrap break-words text-[13px]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {m.body}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="shrink-0 border-t p-3" style={{ borderColor: "var(--border)" }}>
        {error && (
          <p className="mb-2 text-[12px]" style={{ color: "var(--danger)" }} role="alert">
            {error}
          </p>
        )}
        {canPost ? (
          <div className="flex items-end gap-2">
            <textarea
              className="textarea min-h-10 flex-1 resize-none py-2"
              rows={1}
              placeholder="Message the team"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (body.trim()) void send();
                }
              }}
            />
            <ActionButton
              className="btn btn-primary"
              icon={<Send size={15} />}
              disabled={!body.trim()}
              onClick={send}
            >
              <span className="sr-only">Send</span>
            </ActionButton>
          </div>
        ) : (
          <p className="text-body text-[13px]">
            Viewers can read the channel but not post in it.
          </p>
        )}
      </div>
    </section>
  );
}
