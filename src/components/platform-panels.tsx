"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ExternalLink, Plus, Trash2 } from "lucide-react";
import { createTicket, deleteResource, markAllNotificationsRead, markNotificationRead, saveResource } from "@/lib/actions";
import { EmptyState, relativeDate } from "./ui";

function useWrite() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return { pending, run: (fn: () => Promise<unknown>) => start(async () => { await fn(); router.refresh(); }) };
}

/* ----------------------------------------------------------- notifications */

export function NotificationsList({ notifications }: { notifications: Record<string, unknown>[] }) {
  const { pending, run } = useWrite();
  const anyUnread = notifications.some((n) => !n.read);

  return (
    <div className="flex flex-col gap-4">
      {anyUnread && (
        <div className="flex justify-end">
          <button className="btn btn-ghost h-8 px-3 text-[13px]" onClick={() => run(() => markAllNotificationsRead())} disabled={pending}>
            <Check size={14} /> Mark all read
          </button>
        </div>
      )}
      {notifications.length === 0 ? (
        <EmptyState title="No notifications" body="Reminders, achievements, and deadlines will show up here as you use the app." />
      ) : (
        <ul className="flex flex-col gap-2">
          {notifications.map((n) => {
            const body = (
              <div
                className="card flex items-start gap-3 p-4"
                style={{ borderColor: n.read ? "var(--border)" : "var(--primary)" }}
              >
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--primary)" }} />}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{String(n.title)}</p>
                  {n.body ? <p className="text-sm" style={{ color: "var(--text-muted)" }}>{String(n.body)}</p> : null}
                  <p className="mt-1 text-[11px]" style={{ color: "var(--text-faint)" }}>{relativeDate(n.at as string)}</p>
                </div>
              </div>
            );
            return (
              <li key={String(n.id)} onClick={() => !n.read && run(() => markNotificationRead(String(n.id)))}>
                {n.href ? <Link href={String(n.href)}>{body}</Link> : body}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- resources */

const RESOURCE_KINDS = ["article", "book", "video", "cheatsheet", "docs", "course", "template"];

export function ResourceLibrary({ resources }: { resources: Record<string, unknown>[] }) {
  const { pending, run } = useWrite();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState("article");

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-4">
        <p className="eyebrow">Save a resource</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_140px_auto]">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" aria-label="Title" />
          <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL" aria-label="URL" />
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Kind">
            {RESOURCE_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <button className="btn btn-primary" disabled={!title.trim() || pending} onClick={() => { run(() => saveResource({ title, url, kind })); setTitle(""); setUrl(""); }}>
            <Plus size={15} />
          </button>
        </div>
      </div>

      {resources.length === 0 ? (
        <EmptyState title="Nothing saved yet" body="A developer's reading list: docs, articles, cheat sheets. Save the things you keep coming back to." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {resources.map((r) => (
            <div key={String(r.id)} className="card flex items-start justify-between p-4">
              <div className="min-w-0">
                <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>{String(r.kind)}</span>
                <p className="font-medium">{String(r.title)}</p>
                {r.url ? <a href={String(r.url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs" style={{ color: "var(--primary)" }}><ExternalLink size={11} /> open</a> : null}
              </div>
              {r.mine ? (
                <button onClick={() => run(() => deleteResource(String(r.id)))} style={{ color: "var(--danger)" }} aria-label="Delete"><Trash2 size={14} /></button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------- help */

export function HelpCenter({ tickets }: { tickets: Record<string, unknown>[] }) {
  const { pending, run } = useWrite();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState("question");

  const faqs = [
    { q: "Why can't I mark a lesson complete?", a: "The mastery gate needs all five requirements, read, note, exercise, quiz at 80%, review. The check is server-side; there is no way around it, by design." },
    { q: "How does the AI know about my work?", a: "The assistant reads your editable memory plus whatever you have open, lesson, project or note. You control the memory on the AI → Memory page." },
    { q: "Is my code execution safe?", a: "Challenges run in a sandboxed VM with a timeout. It is real execution for a single user; a multi-tenant launch would move it to a container." },
    { q: "Where is my data?", a: "In your database. Export all of it from Settings, or delete your account and everything with it." },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section className="card p-5">
        <p className="eyebrow">FAQ</p>
        <div className="mt-4 flex flex-col gap-4">
          {faqs.map((f) => (
            <div key={f.q}>
              <p className="text-sm font-medium">{f.q}</p>
              <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <p className="eyebrow">Contact & feedback</p>
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex gap-2">
            <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" aria-label="Subject" />
            <select className="input w-40" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Kind">
              {["question", "bug", "feature", "feedback"].map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <textarea className="input min-h-[100px] resize-y" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Tell us what's on your mind" aria-label="Message" />
          <button className="btn btn-primary self-start" disabled={!subject.trim() || pending} onClick={() => { run(() => createTicket({ subject, body, kind })); setSubject(""); setBody(""); }}>
            Submit
          </button>
        </div>
      </section>

      {tickets.length > 0 && (
        <section>
          <p className="eyebrow mb-2">Your submissions</p>
          <ul className="flex flex-col gap-2">
            {tickets.map((t) => (
              <li key={String(t.id)} className="card flex items-center justify-between p-3 text-sm">
                <span>{String(t.subject)} <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>· {String(t.kind)}</span></span>
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{String(t.status)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
