"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Bot,
  Check,
  Copy,
  FileText,
  Paperclip,
  Pin,
  Plus,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createConversation, deleteConversation, togglePinConversation } from "@/lib/actions";

type Message = { id: string; role: "user" | "assistant"; content: string; error?: string };
type ConversationSummary = {
  id: string;
  title: string;
  pinned: boolean;
  messageCount: number;
  preview?: string;
};
type ActiveConversation = { id: string; title: string; messages: Message[] } | null;

type Attachment = { name: string; size: number; text: string | null };

/**
 * The chat workspace: the thread holds the centre, the conversation list sits
 * on the right. Both are height-constrained by the page shell, so the thread
 * scrolls its own messages and the rail scrolls its own list, the page itself
 * never moves.
 *
 * Streaming is a plain fetch reading the SSE body, no client SDK, so the API
 * key never leaves the server and the daily cap is always enforced there
 * rather than trusted from the browser.
 */

const SUGGESTIONS = [
  {
    title: "Explain my current lesson",
    prompt: "Explain the lesson I am working on right now, in plain language, with one example.",
  },
  {
    title: "Review my approach",
    prompt:
      "Here is how I am planning to structure my current project. What would you change and why?",
  },
  {
    title: "Quiz me",
    prompt:
      "Ask me five questions on what I have learned this week. Wait for each answer before the next.",
  },
  {
    title: "Unstick me",
    prompt: "I am stuck on a bug. Ask me the questions you need to narrow it down, one at a time.",
  },
];

type Filter = "all" | "pinned" | "history";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pinned", label: "Pinned" },
  { key: "history", label: "History" },
];

// Only inline files we can actually read as text, for a coding tutor, that is
// the useful case. A binary is noted by name so the assistant knows it exists.
const TEXT_EXT =
  /\.(txt|md|markdown|json|jsonc|ya?ml|toml|csv|tsv|log|env|ini|conf|js|jsx|ts|tsx|mjs|cjs|py|rb|go|rs|java|kt|c|h|cpp|cc|hpp|cs|php|swift|sql|sh|bash|zsh|html?|css|scss|less|vue|svelte|xml|graphql|gql|prisma|dockerfile|gitignore)$/i;
const MAX_ATTACH_CHARS = 24_000;

function isTextFile(f: File) {
  return f.type.startsWith("text/") || TEXT_EXT.test(f.name) || f.type === "application/json";
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function AiChat({
  conversations,
  active,
  configured,
}: {
  conversations: ConversationSummary[];
  active: ActiveConversation;
  configured: boolean;
}) {
  const router = useRouter();
  const [, start] = useTransition();

  const [messages, setMessages] = useState<Message[]>(active?.messages ?? []);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamed, setStreamed] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Which conversation the local `messages` belong to, and whether a send is
  // in flight. Together these stop a background server refresh from resetting
  // the thread out from under an answer that is still streaming, the bug that
  // made new conversations look like they never replied.
  const shownId = useRef<string | null>(active?.id ?? null);
  const busy = useRef(false);

  // Adopt server state only when it is a *different* conversation. When the id
  // matches, the local thread is the source of truth (it holds the optimistic
  // message and, after a send, the just-streamed reply), so leave it alone.
  useEffect(() => {
    if (busy.current) return;
    if (active?.id !== shownId.current) {
      shownId.current = active?.id ?? null;
      setMessages(active?.messages ?? []);
      setStreamed("");
      setError(null);
    }
  }, [active?.id, active?.messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamed]);

  function autosize(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }

  /* ------------------------------------------------------------ Attachments */

  async function pickFiles(list: FileList | null) {
    if (!list?.length) return;
    const read = await Promise.all(
      Array.from(list).map(async (f) => ({
        name: f.name,
        size: f.size,
        text: isTextFile(f) ? (await f.text()).slice(0, MAX_ATTACH_CHARS) : null,
      })),
    );
    setAttachments((prev) => [...prev, ...read]);
    if (fileRef.current) fileRef.current.value = "";
  }

  /** The text actually sent to the model: the message, then each readable file
   *  inlined in a fenced block so the assistant can work with it. */
  function composePayload(body: string) {
    if (attachments.length === 0) return body;
    const blocks = attachments.map((a) =>
      a.text !== null
        ? `\n\nAttached file \`${a.name}\`:\n\`\`\`\n${a.text}\n\`\`\``
        : `\n\n[Attached file \`${a.name}\` (${fmtSize(a.size)}), binary, contents not included]`,
    );
    return `${body}${blocks.join("")}`;
  }

  /* ------------------------------------------------------------------- Send */

  async function send(text: string = input) {
    const body = text.trim();
    if ((!body && attachments.length === 0) || streaming) return;

    busy.current = true;

    // Create the conversation if there isn't one, but keep the id local, do
    // NOT navigate yet. Navigating mid-send re-renders the server component,
    // which used to reset the thread and drop the reply.
    let convoId = active?.id ?? shownId.current;
    let created = false;
    if (!convoId) {
      const res = await createConversation({});
      convoId = res.id;
      created = true;
    }
    shownId.current = convoId;

    const payload = composePayload(body);
    const shownText =
      attachments.length > 0
        ? `${body}${body ? "\n\n" : ""}${attachments.map((a) => `📎 ${a.name}`).join("\n")}`
        : body;

    setInput("");
    setAttachments([]);
    autosize(inputRef.current);
    setError(null);
    setMessages((m) => [...m, { id: `local-${Date.now()}`, role: "user", content: shownText }]);
    setStreaming(true);
    setStreamed("");

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: convoId, message: payload }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({ error: "The tutor could not answer." }));
        setError(data.error ?? "Something went wrong.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const evt of events) {
          const line = evt.replace(/^data: /, "").trim();
          if (!line) continue;
          const parsed = JSON.parse(line) as { delta?: string; done?: boolean; error?: string };
          if (parsed.error) setError(parsed.error);
          if (parsed.delta) {
            acc += parsed.delta;
            setStreamed(acc);
          }
        }
      }

      if (acc) {
        setMessages((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", content: acc }]);
      }
      setStreamed("");
    } catch {
      setError("Lost connection to the tutor.");
    } finally {
      setStreaming(false);
      busy.current = false;
      // Now it is safe to sync with the server: put the id in the URL (so a
      // reload lands here) and pull the persisted title/messages. The guard
      // above keeps this from clobbering what we just rendered.
      if (created) router.replace(`/ai/chat?c=${convoId}`);
      router.refresh();
    }
  }

  function newChat() {
    // Optimistically clear to the empty state; the server creates the row.
    shownId.current = null;
    setMessages([]);
    setStreamed("");
    setError(null);
    setInput("");
    setAttachments([]);
    start(async () => {
      const { id } = await createConversation({});
      router.push(`/ai/chat?c=${id}`);
    });
  }

  const visible = useMemo(() => {
    if (filter === "pinned") return conversations.filter((c) => c.pinned);
    if (filter === "history") return conversations.filter((c) => c.messageCount > 0);
    return conversations;
  }, [conversations, filter]);

  const empty = messages.length === 0 && !streaming;

  return (
    <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      {/* ============================================================ Thread */}
      <div className="panel flex min-h-0 flex-col overflow-hidden max-lg:min-h-[560px]">
        {/* Only this region scrolls. */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {empty ? (
            <div className="grid h-full place-items-center py-8 text-center">
              <div className="max-w-md">
                <span className="icon-tile icon-tile-lg icon-tile-primary mx-auto">
                  <Sparkles size={20} />
                </span>
                <p className="mt-4 text-[17px] font-semibold tracking-tight">
                  Ask about anything in your workspace
                </p>
                <p className="text-body mt-2 text-[13.5px]">
                  The difference from a general chatbot is context: this assistant can see your
                  lessons, projects and notes.
                </p>
                <div className="mt-6 grid gap-2 text-left sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.title}
                      onClick={() => send(s.prompt)}
                      disabled={!configured}
                      className="card card-link p-3 text-left disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="block text-[13px] font-medium">{s.title}</span>
                      <span className="text-meta mt-0.5 line-clamp-2 block">{s.prompt}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((m) => (
                <Bubble key={m.id} role={m.role} content={m.content} />
              ))}
              {streaming && <Bubble role="assistant" content={streamed} pending={!streamed} />}
            </div>
          )}

          {error && (
            <div
              className="mt-4 flex items-start gap-2.5 rounded-[var(--radius-tile)] p-3 text-[13px]"
              style={{ background: "var(--danger-faint)", color: "var(--danger)" }}
              role="alert"
            >
              <AlertTriangle size={15} className="mt-px shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* --------------------------------------------- Composer (pinned) */}
        <div className="shrink-0 border-t p-3" style={{ borderColor: "var(--border)" }}>
          {!configured && (
            <p
              className="mb-2.5 flex items-center gap-2 text-[12px]"
              style={{ color: "var(--warning)" }}
            >
              <AlertTriangle size={13} />
              Add ANTHROPIC_API_KEY or GROQ_API_KEY to .env.local to enable the assistant.
            </p>
          )}

          {/* Selected attachments, above the input as removable chips */}
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {attachments.map((a, i) => (
                <span
                  key={`${a.name}-${i}`}
                  className="flex items-center gap-1.5 rounded-[var(--radius-control)] px-2 py-1 text-[12px]"
                  style={{ background: "var(--surface-3)" }}
                >
                  <FileText size={12} style={{ color: "var(--text-faint)" }} />
                  <span className="max-w-[160px] truncate">{a.name}</span>
                  <span style={{ color: "var(--text-faint)" }}>{fmtSize(a.size)}</span>
                  <button
                    onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                    className="opacity-60 transition-opacity hover:opacity-100"
                    aria-label={`Remove ${a.name}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div
            className="flex items-end gap-2 rounded-[var(--radius-tile)] border p-1.5"
            style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
          >
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => pickFiles(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="btn-icon btn-icon-sm mb-0.5 shrink-0"
              title="Attach files"
              aria-label="Attach files"
              disabled={streaming}
            >
              <Paperclip size={15} />
            </button>

            <textarea
              ref={inputRef}
              rows={1}
              className="max-h-[168px] flex-1 resize-none bg-transparent py-2 text-[14px] leading-relaxed outline-none"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                autosize(e.currentTarget);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask anything…"
              aria-label="Message"
              disabled={streaming}
            />

            <button
              className="btn btn-primary btn-icon mb-0.5 h-8 w-8 shrink-0"
              onClick={() => send()}
              disabled={streaming || (!input.trim() && attachments.length === 0)}
              aria-label="Send message"
            >
              <Send size={14} />
            </button>
          </div>

          <p className="text-meta mt-2 text-center text-[11.5px]">
            AI can make mistakes. Consider checking important information.
          </p>
        </div>
      </div>

      {/* ====================================================== Conversations */}
      <aside className="flex min-h-0 flex-col gap-3 max-lg:h-auto">
        <button className="btn btn-primary btn-block shrink-0" onClick={newChat}>
          <Plus size={15} /> New conversation
        </button>

        <nav className="segmented shrink-0" aria-label="Filter conversations">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={`segment flex-1 justify-center ${filter === f.key ? "segment-active" : ""}`}
            >
              {f.label}
            </button>
          ))}
        </nav>

        {/* Only the list scrolls; the button and tabs above stay put. */}
        {visible.length === 0 ? (
          <div className="well px-3 py-7 text-center">
            <p className="text-[13px] font-medium">
              {filter === "pinned" ? "Nothing pinned" : "No conversations yet"}
            </p>
            <p className="text-meta mt-1">
              {filter === "pinned"
                ? "Pin a conversation to keep it at hand."
                : "Your first message starts one."}
            </p>
          </div>
        ) : (
          <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto max-lg:max-h-[420px]">
            {visible.map((c) => {
              const isActive = c.id === (active?.id ?? shownId.current);
              return (
                <li key={c.id} className="group relative shrink-0">
                  <Link
                    href={`/ai/chat?c=${c.id}`}
                    aria-current={isActive ? "page" : undefined}
                    className="block rounded-[var(--radius-card)] border p-3 pr-8"
                    style={{
                      background: isActive ? "var(--primary-faint)" : "var(--surface)",
                      borderColor: isActive ? "var(--primary-muted)" : "var(--border)",
                      transition:
                        "background var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease)",
                    }}
                  >
                    <span className="flex items-center gap-2">
                      {c.pinned && (
                        <Pin
                          size={11}
                          className="shrink-0"
                          style={{ color: "var(--primary)", fill: "var(--primary)" }}
                        />
                      )}
                      <span
                        className="min-w-0 flex-1 truncate text-[13px] font-medium"
                        style={{ color: isActive ? "var(--primary)" : "var(--text)" }}
                      >
                        {c.title}
                      </span>
                      {isActive && (
                        <span
                          className="h-[6px] w-[6px] shrink-0 rounded-full"
                          style={{ background: "var(--primary)" }}
                          aria-hidden
                        />
                      )}
                    </span>
                    <span className="text-meta mt-1 line-clamp-1 block text-[12px]">
                      {c.preview?.trim() ||
                        (c.messageCount
                          ? `${c.messageCount} ${c.messageCount === 1 ? "message" : "messages"}`
                          : "No messages yet")}
                    </span>
                  </Link>

                  <span className="absolute right-1.5 top-1.5 flex flex-col gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                    <button
                      onClick={() => start(() => togglePinConversation(c.id))}
                      className="btn-icon btn-icon-sm h-6 w-6"
                      style={{ color: c.pinned ? "var(--primary)" : undefined }}
                      aria-label={c.pinned ? "Unpin conversation" : "Pin conversation"}
                    >
                      <Pin size={12} />
                    </button>
                    <button
                      onClick={() =>
                        start(async () => {
                          await deleteConversation(c.id);
                          if (c.id === active?.id) router.push("/ai/chat");
                        })
                      }
                      className="btn-icon btn-icon-sm h-6 w-6"
                      style={{ color: "var(--danger)" }}
                      aria-label="Delete conversation"
                    >
                      <Trash2 size={12} />
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {conversations.length > 0 && (
          <Link href="/ai" className="btn btn-secondary btn-block btn-sm shrink-0">
            View all conversations
            </Link>
        )}
      </aside>
    </div>
  );
}

/* --------------------------------------------------------------- Messages */

function Bubble({
  role,
  content,
  pending,
}: {
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
}) {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard?.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[78%] rounded-[var(--radius-panel)] px-3.5 py-2.5 text-[14px] leading-relaxed"
          style={{ background: "var(--primary)", color: "var(--primary-ink)" }}
        >
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex gap-2.5">
      <span
        className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-[var(--radius-tile)]"
        style={{ background: "var(--primary-faint)", color: "var(--primary)" }}
        aria-hidden
      >
        <Bot size={14} />
      </span>

      <div className="min-w-0 flex-1">
        <div
          className="rounded-[var(--radius-panel)] px-3.5 py-2.5"
          style={{ background: "var(--surface-2)" }}
        >
          {pending ? (
            <span className="flex items-center gap-1 py-1" aria-label="Thinking">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background: "var(--text-faint)",
                    animation: "pulse-soft 1.1s ease-in-out infinite",
                    animationDelay: `${i * 160}ms`,
                  }}
                />
              ))}
            </span>
          ) : (
            <div className="prose-doc text-[14px]">
              <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
            </div>
          )}
        </div>

        {!pending && (
          <button
            onClick={copy}
            className="btn btn-ghost btn-xs mt-1.5 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
            aria-label="Copy reply"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
    </div>
  );
}
