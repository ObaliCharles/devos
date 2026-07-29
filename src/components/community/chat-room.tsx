"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Hash, Send, Users } from "lucide-react";
import type { ChatLine, GroupCard } from "@/lib/queries/community";
import { sendMessage } from "@/lib/actions";
import { ActionButton } from "@/components/action-button";
import { JoinButton, Avatar, ago } from "./feed";

/**
 * Room chat.
 *
 * Messages are grouped by author: consecutive lines from the same person within
 * a few minutes drop the avatar and name, which is what makes a log readable
 * rather than a wall of repeated headers.
 *
 * There is no socket yet. The log refreshes on a timer while the tab is
 * visible, and stops when it is not — polling a hidden tab is the kind of thing
 * that quietly drains a laptop battery. Sending is immediate; only receiving is
 * on the interval, so your own message never lags behind your keystroke.
 */
export function ChatRoom({
  rooms,
  room,
  messages,
}: {
  rooms: GroupCard[];
  room: GroupCard | null;
  messages: ChatLine[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!room) return;
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = setInterval(tick, 8000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [room, router]);

  // Pin to the bottom on new messages — a chat log that holds its scroll
  // position is a chat log you have to chase.
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [messages.length]);

  async function send() {
    setError("");
    if (!room) return;
    const text = body;
    setBody("");
    const result = await sendMessage(room.id, text);
    if (!result.ok) {
      setBody(text);
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
      {/* Room list. Horizontal on a phone, where a 220px rail would eat the
          screen the conversation needs. */}
      <nav
        className="card flex gap-1 overflow-x-auto p-2 lg:sticky lg:top-5 lg:flex-col lg:overflow-visible"
        aria-label="Rooms"
      >
        {rooms.length === 0 ? (
          <p className="text-body p-2 text-[13px]">
            No rooms yet.{" "}
            <Link href="/community/groups" style={{ color: "var(--primary)" }}>
              Create a group
            </Link>{" "}
            and it becomes one.
          </p>
        ) : (
          rooms.map((g) => (
            <Link
              key={g.id}
              href={`/community/chat?room=${g.slug}`}
              aria-current={room?.id === g.id ? "page" : undefined}
              className={`row-link flex shrink-0 items-center gap-2 px-2.5 py-2 text-[13px] ${
                room?.id === g.id ? "nav-row-on" : ""
              }`}
            >
              <Hash size={13} style={{ color: "var(--text-faint)" }} />
              <span className="truncate">{g.name}</span>
            </Link>
          ))
        )}
      </nav>

      {!room ? (
        <div className="card grid place-items-center gap-2 p-10 text-center">
          <span className="icon-tile icon-tile-lg">
            <Hash size={18} />
          </span>
          <p className="text-[14px] font-medium">Pick a room</p>
          <p className="text-body max-w-sm text-[13px]">
            Every group has a room. Chat is for the conversation that is not worth
            keeping — anything that is belongs in Discussions.
          </p>
        </div>
      ) : (
        <section className="card flex min-w-0 flex-col overflow-hidden">
          <header
            className="flex shrink-0 items-center gap-2.5 border-b px-4 py-3"
            style={{ borderColor: "var(--border)" }}
          >
            <Hash size={15} style={{ color: "var(--text-faint)" }} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium">{room.name}</span>
              <span className="num text-[12px]" style={{ color: "var(--text-faint)" }}>
                {room.memberCount} {room.memberCount === 1 ? "member" : "members"}
              </span>
            </span>
            <Link href={`/community/groups/${room.slug}`} className="btn-icon-sm" aria-label="Group">
              <Users size={14} />
            </Link>
          </header>

          <div ref={log} className="flex min-h-[420px] flex-col gap-0.5 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <p className="text-body m-auto text-[13px]">
                Nothing said yet. Say the first thing.
              </p>
            ) : (
              messages.map((m, i) => {
                const prev = messages[i - 1];
                const grouped =
                  prev &&
                  prev.author.id === m.author.id &&
                  new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 300_000;
                return <Line key={m.id} line={m} grouped={Boolean(grouped)} />;
              })
            )}
          </div>

          <div
            className="shrink-0 border-t p-3"
            style={{ borderColor: "var(--border)" }}
          >
            {error && (
              <p className="mb-2 text-[12px]" style={{ color: "var(--danger)" }} role="alert">
                {error}
              </p>
            )}
            {room.joined ? (
              <div className="flex items-end gap-2">
                <textarea
                  className="textarea min-h-10 flex-1 resize-none py-2"
                  rows={1}
                  placeholder={`Message #${room.slug}`}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  // Enter sends, Shift+Enter is a newline — the convention every
                  // chat client shares, and breaking it costs people messages.
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
              <div className="flex items-center gap-3">
                <p className="text-body flex-1 text-[13px]">Join the group to chat in it.</p>
                <JoinButton group={room} />
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function Line({ line, grouped }: { line: ChatLine; grouped: boolean }) {
  return (
    <div className={`flex gap-2.5 ${grouped ? "" : "mt-3 first:mt-0"}`}>
      <span className="w-7 shrink-0">
        {!grouped && <Avatar author={line.author} size={28} />}
      </span>
      <div className="min-w-0 flex-1">
        {!grouped && (
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] font-medium">{line.author.name}</span>
            <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>
              {ago(line.createdAt)}
            </span>
          </div>
        )}
        <p className="whitespace-pre-wrap break-words text-[13px]" style={{ color: "var(--text-muted)" }}>
          {line.body}
        </p>
      </div>
    </div>
  );
}
