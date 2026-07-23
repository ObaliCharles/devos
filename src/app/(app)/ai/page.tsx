import Link from "next/link";
import { AlertTriangle, ArrowRight, BookText, Brain, MessageSquare, Sparkles, Wand2 } from "lucide-react";
import { requireUser } from "@/lib/user";
import { findNextLesson, getAiUsage, getConversations, getRoadmap } from "@/lib/queries";
import { isConfigured, providerStatus } from "@/lib/ai";
import { Badge, IconTile, Meter, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

const TOOLS = [
  {
    href: "/ai/chat",
    icon: MessageSquare,
    title: "Chat",
    body: "Ask anything within your workspace context.",
  },
  {
    href: "/ai/memory",
    icon: Brain,
    title: "Memory",
    body: "See and edit what the assistant remembers.",
  },
  {
    href: "/ai/prompts",
    icon: Wand2,
    title: "Prompt library",
    body: "Reusable prompts for common tasks.",
  },
];

export default async function AiPage() {
  const user = await requireUser();
  const [roadmap, conversations, usage] = await Promise.all([
    getRoadmap(user._id),
    getConversations(user._id),
    getAiUsage(user._id),
  ]);
  const next = findNextLesson(roadmap);
  const configured = isConfigured();
  const providers = providerStatus();

  const reqPct = (usage.requests / usage.requestCap) * 100;
  const costPct = (usage.costUsd / usage.costCapUsd) * 100;

  return (
    <div className="page-body">
      <PageHeader
        eyebrow="AI centre"
        title="Your assistant"
        description="Not a chatbot bolted on the side — an assistant that can see what you are learning, building and writing."
        actions={
          <Link href="/ai/chat" className="btn btn-primary">
            <Sparkles size={15} /> New chat
          </Link>
        }
      />

      {!configured && (
        <div
          className="flex items-start gap-3 rounded-[var(--radius-card)] p-4"
          style={{ background: "var(--warning-faint)" }}
          role="status"
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: "var(--warning)" }} />
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--warning)" }}>
            The assistant is not configured. Add <code>ANTHROPIC_API_KEY</code> or{" "}
            <code>GROQ_API_KEY</code> to <code>.env.local</code> and restart the dev server.
            Everything else works without it.
          </p>
        </div>
      )}

      {/* The cap is real, enforced server-side, and therefore worth showing.
          So is which model is actually answering: Anthropic and Groq do not
          write alike, and a reply that suddenly changes voice is confusing
          unless the page has already said failover exists. */}
      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="eyebrow">Today&apos;s usage</p>
          <div className="flex items-center gap-1.5">
            <Badge tone={providers.anthropic ? "success" : "neutral"}>
              Claude {providers.anthropic ? "ready" : "off"}
            </Badge>
            <Badge tone={providers.groq ? "info" : "neutral"}>
              Groq {providers.groq ? "fallback" : "off"}
            </Badge>
            <span className="text-meta">Resets tomorrow</span>
          </div>
        </div>

        {providers.anthropic && providers.groq && (
          <p className="text-meta mt-2">
            Claude answers first. If a request fails before it starts streaming, Groq picks it up
            automatically.
          </p>
        )}
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <Meter
            label="Requests"
            value={`${usage.requests} / ${usage.requestCap}`}
            pct={reqPct}
          />
          <Meter
            label="Cost"
            value={`$${usage.costUsd.toFixed(2)} / $${usage.costCapUsd.toFixed(2)}`}
            pct={costPct}
          />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {TOOLS.map((t) => (
          <Link key={t.href} href={t.href} className="card card-link group flex flex-col p-4">
            <div className="flex items-start justify-between">
              <IconTile tone="primary">
                <t.icon size={17} />
              </IconTile>
              <ArrowRight
                size={15}
                className="mt-2 transition-transform duration-200 group-hover:translate-x-0.5"
                style={{ color: "var(--text-faint)" }}
              />
            </div>
            <h2 className="title-card mt-4">{t.title}</h2>
            <p className="text-body mt-1 text-[13px]">{t.body}</p>
          </Link>
        ))}
      </section>

      {next && (
        <Link
          href={`/learning/lesson/${next.lesson.id}`}
          className="card card-link flex items-center gap-4 p-4"
        >
          <IconTile tone="info">
            <BookText size={17} />
          </IconTile>
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Pick up where you left off</p>
            <p className="mt-1 truncate text-[15px] font-medium">{next.lesson.title}</p>
          </div>
          <ArrowRight size={16} className="shrink-0" style={{ color: "var(--text-faint)" }} />
        </Link>
      )}

      {conversations.length > 0 && (
        <section className="section-stack">
          <h2 className="title-section">Recent conversations</h2>
          <ul className="flex flex-col gap-2">
            {conversations.slice(0, 6).map((c) => (
              <li key={c.id}>
                <Link
                  href={`/ai/chat?c=${c.id}`}
                  className="card card-link flex items-center gap-3 px-4 py-3"
                >
                  <MessageSquare size={15} className="shrink-0" style={{ color: "var(--text-faint)" }} />
                  <span className="min-w-0 flex-1 truncate text-[14px]">{c.title}</span>
                  <span className="text-meta shrink-0">
                    {c.messageCount} {c.messageCount === 1 ? "message" : "messages"}
                  </span>
                  <ArrowRight size={14} className="shrink-0" style={{ color: "var(--text-faint)" }} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
