"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import {
  createApplication,
  createCertificate,
  createClient,
  createIncome,
  createInterview,
  deleteApplication,
  deleteCertificate,
  deleteClient,
  deleteIncome,
  deleteInterview,
  moveApplication,
  savePortfolio,
  updateInterview,
} from "@/lib/actions";
import { EmptyState, formatDate, relativeDate, statusColor } from "./ui";

function useWrite() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return { pending, run: (fn: () => Promise<unknown>) => start(async () => { await fn(); router.refresh(); }) };
}

/* ------------------------------------------------------------ applications */

const APP_STATUSES = ["wishlist", "preparing", "applied", "interview", "technical", "final", "offer", "accepted", "rejected"];

export function ApplicationsBoard({ applications }: { applications: Record<string, unknown>[] }) {
  const { pending, run } = useWrite();
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");

  const byStatus = (s: string) => applications.filter((a) => a.status === s);
  // A compact pipeline: only the columns with something in them, plus the first few.
  const active = APP_STATUSES.filter((s) => byStatus(s).length > 0 || ["wishlist", "applied", "interview", "offer"].includes(s));

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-4">
        <p className="eyebrow">Track an application</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" aria-label="Company" />
          <input className="input" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Position" aria-label="Position" />
          <button
            className="btn btn-primary shrink-0"
            disabled={!company.trim() || !position.trim() || pending}
            onClick={() => { run(() => createApplication({ company, position })); setCompany(""); setPosition(""); }}
          >
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      {applications.length === 0 ? (
        <EmptyState title="No applications tracked" body="Add roles as you find them — even wishlist ones. Watching the pipeline fill is how you keep momentum." />
      ) : (
        <div className="-mx-6 flex gap-3 overflow-x-auto px-5 pb-2">
          {active.map((status) => {
            const items = byStatus(status);
            return (
              <section key={status} className="flex w-[240px] shrink-0 flex-col rounded-[var(--radius-card)] border p-2.5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <p className="px-1.5 py-1 text-[13px] font-semibold capitalize">
                  {status} <span style={{ color: "var(--text-faint)" }}>{items.length}</span>
                </p>
                <div className="mt-1 flex flex-col gap-2">
                  {items.map((a) => (
                    <article key={String(a.id)} className="rounded-[var(--radius-card)] border p-2.5" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                      <p className="text-[13px] font-medium">{String(a.position)}</p>
                      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{String(a.company)}</p>
                      <div className="mt-2 flex items-center gap-1">
                        <select
                          className="input h-7 flex-1 py-0 text-[11px]"
                          value={String(a.status)}
                          onChange={(e) => run(() => moveApplication(String(a.id), e.target.value))}
                          aria-label="Move"
                        >
                          {APP_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button onClick={() => run(() => deleteApplication(String(a.id)))} style={{ color: "var(--danger)" }} aria-label="Delete"><Trash2 size={13} /></button>
                      </div>
                    </article>
                  ))}
                  {items.length === 0 && <p className="px-1.5 py-2 text-[11px]" style={{ color: "var(--text-faint)" }}>Empty</p>}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- interviews */

const INTERVIEW_KINDS = ["screen", "technical", "coding", "system_design", "behavioural", "final", "mock"];

export function InterviewsPanel({ interviews }: { interviews: Record<string, unknown>[] }) {
  const { pending, run } = useWrite();
  const [company, setCompany] = useState("");
  const [kind, setKind] = useState("technical");
  const [scheduledAt, setScheduledAt] = useState("");

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-4">
        <p className="eyebrow">Log an interview</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" aria-label="Company" />
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Kind">
            {INTERVIEW_KINDS.map((k) => <option key={k} value={k}>{k.replace("_", " ")}</option>)}
          </select>
          <input type="datetime-local" className="input" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} aria-label="When" />
          <button className="btn btn-primary" disabled={!company.trim() || pending} onClick={() => { run(() => createInterview({ company, kind, scheduledAt: scheduledAt || undefined })); setCompany(""); setScheduledAt(""); }}>
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      {interviews.length === 0 ? (
        <EmptyState title="No interviews yet" body="Log each one, then write down the questions and where you struggled. That list is your study plan." />
      ) : (
        <ul className="flex flex-col gap-2">
          {interviews.map((i) => (
            <li key={String(i.id)} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{String(i.company)} · <span style={{ color: "var(--text-muted)" }}>{String(i.kind).replace("_", " ")}</span></p>
                  {i.scheduledAt ? <p className="text-xs" style={{ color: "var(--text-faint)" }}>{formatDate(i.scheduledAt as string)} · {relativeDate(i.scheduledAt as string)}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <select className="input h-8 w-28 py-0 text-[12px]" value={String(i.outcome)} onChange={(e) => run(() => updateInterview(String(i.id), { outcome: e.target.value }))} aria-label="Outcome">
                    {["pending", "passed", "failed", "cancelled"].map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <button onClick={() => run(() => deleteInterview(String(i.id)))} style={{ color: "var(--danger)" }} aria-label="Delete"><Trash2 size={14} /></button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ certificates */

export function CertificatesPanel({ certificates }: { certificates: Record<string, unknown>[] }) {
  const { pending, run } = useWrite();
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("");
  const [url, setUrl] = useState("");

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-4">
        <p className="eyebrow">Add a certificate</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" aria-label="Name" />
          <input className="input" value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Provider" aria-label="Provider" />
          <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Credential URL" aria-label="URL" />
          <button className="btn btn-primary" disabled={!name.trim() || pending} onClick={() => { run(() => createCertificate({ name, provider, credentialUrl: url })); setName(""); setProvider(""); setUrl(""); }}>
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      {certificates.length === 0 ? (
        <EmptyState title="No certificates" body="Courses, bootcamps, cloud certs — anything with a credential. They lift your readiness score and your resume." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {certificates.map((c) => (
            <div key={String(c.id)} className="card flex items-start justify-between p-4">
              <div>
                <p className="font-medium">{String(c.name)}</p>
                {c.provider ? <p className="text-xs" style={{ color: "var(--text-muted)" }}>{String(c.provider)}</p> : null}
                {c.credentialUrl ? <a href={String(c.credentialUrl)} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs" style={{ color: "var(--primary)" }}><ExternalLink size={11} /> credential</a> : null}
              </div>
              <button onClick={() => run(() => deleteCertificate(String(c.id)))} style={{ color: "var(--danger)" }} aria-label="Delete"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- freelance */

export function FreelancePanel({ clients, income, totalIncome }: { clients: Record<string, unknown>[]; income: Record<string, unknown>[]; totalIncome: number }) {
  const { pending, run } = useWrite();
  const [clientName, setClientName] = useState("");
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-5">
        <p className="eyebrow">Net income (recent)</p>
        <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: totalIncome >= 0 ? "var(--success)" : "var(--danger)" }}>
          ${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-4">
          <p className="eyebrow">Clients</p>
          <div className="mt-3 flex gap-2">
            <input className="input" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client name" aria-label="Client" />
            <button className="btn btn-ghost shrink-0" disabled={!clientName.trim() || pending} onClick={() => { run(() => createClient({ name: clientName })); setClientName(""); }}><Plus size={15} /></button>
          </div>
          <ul className="mt-3 flex flex-col gap-1.5">
            {clients.map((c) => (
              <li key={String(c.id)} className="flex items-center justify-between text-sm">
                <span>{String(c.name)} <span className="text-[11px]" style={{ color: statusColor(String(c.status)) }}>{String(c.status)}</span></span>
                <button onClick={() => run(() => deleteClient(String(c.id)))} style={{ color: "var(--danger)" }} aria-label="Delete"><Trash2 size={12} /></button>
              </li>
            ))}
            {clients.length === 0 && <li className="text-sm" style={{ color: "var(--text-faint)" }}>No clients yet.</li>}
          </ul>
        </div>

        <div className="card p-4">
          <p className="eyebrow">Income</p>
          <div className="mt-3 flex gap-2">
            <input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" aria-label="Description" />
            <input className="input w-24" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="$" aria-label="Amount" />
            <button className="btn btn-ghost shrink-0" disabled={!amount || pending} onClick={() => { run(() => createIncome({ description: desc, amount: Number(amount), day: new Date().toISOString().slice(0, 10) })); setDesc(""); setAmount(""); }}><Plus size={15} /></button>
          </div>
          <ul className="mt-3 flex flex-col gap-1.5">
            {income.map((e) => (
              <li key={String(e.id)} className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--text-muted)" }}>{String(e.description || e.kind)}</span>
                <span className="flex items-center gap-2">
                  <span className="tabular-nums">${Number(e.amount).toFixed(2)}</span>
                  <button onClick={() => run(() => deleteIncome(String(e.id)))} style={{ color: "var(--danger)" }} aria-label="Delete"><Trash2 size={12} /></button>
                </span>
              </li>
            ))}
            {income.length === 0 && <li className="text-sm" style={{ color: "var(--text-faint)" }}>No income logged.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- portfolio */

export function PortfolioEditor({ portfolio, projects }: { portfolio: Record<string, unknown> | null; projects: Record<string, unknown>[] }) {
  const { pending, run } = useWrite();
  const p = (portfolio ?? {}) as Record<string, unknown>;
  const socials = (p.socials ?? {}) as Record<string, string>;

  const [form, setForm] = useState({
    headline: String(p.headline ?? ""),
    bio: String(p.bio ?? ""),
    location: String(p.location ?? ""),
    theme: String(p.theme ?? "minimal"),
    published: Boolean(p.published),
    availableForWork: p.availableForWork !== false,
    github: socials.github ?? "",
    linkedin: socials.linkedin ?? "",
    website: socials.website ?? "",
  });
  const [saved, setSaved] = useState(false);

  const publicProjects = projects.filter((pr) => pr.visibility === "public");

  function save() {
    run(async () => {
      await savePortfolio({
        headline: form.headline,
        bio: form.bio,
        location: form.location,
        theme: form.theme,
        published: form.published,
        availableForWork: form.availableForWork,
        socials: { github: form.github, linkedin: form.linkedin, website: form.website },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="card p-5">
        <div className="flex items-center justify-between">
          <p className="eyebrow">Portfolio</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.published} onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))} />
            Published
          </label>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          <input className="input" value={form.headline} onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))} placeholder="Headline, e.g. Full-stack developer building learning tools" aria-label="Headline" />
          <textarea className="input min-h-[90px] resize-y" value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} placeholder="A short bio" aria-label="Bio" />
          <div className="grid gap-2 sm:grid-cols-3">
            <input className="input" value={form.github} onChange={(e) => setForm((f) => ({ ...f, github: e.target.value }))} placeholder="GitHub URL" aria-label="GitHub" />
            <input className="input" value={form.linkedin} onChange={(e) => setForm((f) => ({ ...f, linkedin: e.target.value }))} placeholder="LinkedIn URL" aria-label="LinkedIn" />
            <input className="input" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} placeholder="Website" aria-label="Website" />
          </div>
          <div className="flex items-center gap-3">
            <button className="btn btn-primary" onClick={save} disabled={pending}>{saved ? "Saved" : "Save portfolio"}</button>
            <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
              <input type="checkbox" checked={form.availableForWork} onChange={(e) => setForm((f) => ({ ...f, availableForWork: e.target.checked }))} />
              Available for work
            </label>
          </div>
        </div>
      </section>

      <section className="card p-5">
        <p className="eyebrow">Projects on your portfolio</p>
        <p className="mt-1.5 text-sm" style={{ color: "var(--text-muted)" }}>
          Only projects marked <strong>public</strong> appear. {publicProjects.length} of your {projects.length} projects are public.
        </p>
        <ul className="mt-4 flex flex-col gap-2">
          {projects.map((pr) => (
            <li key={String(pr.id)} className="flex items-center justify-between rounded-[var(--radius-card)] border p-3" style={{ borderColor: "var(--border)" }}>
              <div>
                <p className="text-sm font-medium">{String(pr.title)}</p>
                <p className="text-[11px]" style={{ color: "var(--text-faint)" }}>{String(pr.status)}{pr.liveUrl ? " · has live URL" : ""}</p>
              </div>
              <span className="text-[11px]" style={{ color: pr.visibility === "public" ? "var(--success)" : "var(--text-faint)" }}>
                {pr.visibility === "public" ? "shown" : "private"}
              </span>
            </li>
          ))}
          {projects.length === 0 && <li className="text-sm" style={{ color: "var(--text-faint)" }}>No projects yet — build one, mark it public, and it appears here.</li>}
        </ul>
      </section>
    </div>
  );
}
