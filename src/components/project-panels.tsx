"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Trash2 } from "lucide-react";
import {
  createBug,
  createDeployment,
  createMilestone,
  deleteBug,
  deleteMilestone,
  setBugStatus,
  setMilestoneStatus,
} from "@/lib/actions";
import { EmptyState, formatDate, relativeDate, statusColor } from "./ui";

/**
 * The three list-and-add panels that would otherwise be the same file three
 * times: milestones, bugs, deployments. Each owns its own form state and
 * refreshes the server component after a write.
 */

function useWrite() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return {
    pending,
    run(fn: () => Promise<unknown>) {
      start(async () => {
        await fn();
        router.refresh();
      });
    },
  };
}

/* -------------------------------------------------------------- milestones */

export type MilestoneItem = {
  id: string;
  title: string;
  description?: string;
  status: string;
  dueAt?: string;
};

export function MilestonesPanel({
  projectId,
  milestones,
}: {
  projectId: string;
  milestones: MilestoneItem[];
}) {
  const { pending, run } = useWrite();
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-4">
        <p className="eyebrow">Add a milestone</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Auth works end to end"
            aria-label="Milestone title"
          />
          <input
            type="date"
            className="input sm:w-44"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            aria-label="Due date"
          />
          <button
            className="btn btn-primary shrink-0"
            disabled={!title.trim() || pending}
            onClick={() => {
              run(() => createMilestone({ projectId, title, dueAt: dueAt || undefined }));
              setTitle("");
              setDueAt("");
            }}
          >
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      {milestones.length === 0 ? (
        <EmptyState
          title="No milestones"
          body="A milestone is a point where the project is demonstrably further along than it was. Three or four is usually right."
        />
      ) : (
        <ol className="flex flex-col gap-2">
          {milestones.map((m) => (
            <li key={m.id} className="card flex items-center gap-4 p-4">
              <button
                onClick={() => run(() => setMilestoneStatus(m.id, m.status === "done" ? "active" : "done"))}
                disabled={pending}
                aria-label={m.status === "done" ? `Reopen ${m.title}` : `Complete ${m.title}`}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full border"
                style={{
                  background: m.status === "done" ? "var(--success)" : "transparent",
                  borderColor: m.status === "done" ? "var(--success)" : "var(--border-strong)",
                  color: "#04140d",
                }}
              >
                {m.status === "done" && <Check size={13} strokeWidth={3} />}
              </button>

              <div className="min-w-0 flex-1">
                <p
                  className="truncate font-medium"
                  style={{
                    color: m.status === "done" ? "var(--text-faint)" : "var(--text)",
                    textDecoration: m.status === "done" ? "line-through" : undefined,
                  }}
                >
                  {m.title}
                </p>
                {m.dueAt && (
                  <p className="mt-0.5 text-xs" style={{ color: "var(--text-faint)" }}>
                    due {formatDate(m.dueAt)} · {relativeDate(m.dueAt)}
                  </p>
                )}
              </div>

              <button
                onClick={() => run(() => deleteMilestone(m.id))}
                disabled={pending}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-card)]"
                style={{ color: "var(--danger)" }}
                aria-label={`Delete ${m.title}`}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------- bugs */

export type BugItem = {
  id: string;
  title: string;
  description?: string;
  steps?: string;
  severity: string;
  status: string;
  createdAt: string;
};

const BUG_STATUSES = ["open", "confirmed", "fixing", "fixed", "wontfix"];
const SEVERITIES = ["low", "medium", "high", "critical"];

export function BugsPanel({ projectId, bugs }: { projectId: string; bugs: BugItem[] }) {
  const { pending, run } = useWrite();
  const [title, setTitle] = useState("");
  const [steps, setSteps] = useState("");
  const [severity, setSeverity] = useState("medium");

  const open = bugs.filter((b) => !["fixed", "wontfix"].includes(b.status));
  const closed = bugs.filter((b) => ["fixed", "wontfix"].includes(b.status));

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-4">
        <p className="eyebrow">Report a bug</p>
        <div className="mt-3 flex flex-col gap-2">
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Login redirects to a 404 after signup"
            aria-label="Bug title"
          />
          <textarea
            className="input min-h-[70px] resize-y text-[13px]"
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            placeholder="Steps to reproduce. Write them now while you remember."
            aria-label="Steps to reproduce"
          />
          <div className="flex flex-wrap gap-2">
            <select
              className="input w-32"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              aria-label="Severity"
            >
              {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              className="btn btn-primary"
              disabled={!title.trim() || pending}
              onClick={() => {
                run(() => createBug({ projectId, title, steps, severity }));
                setTitle("");
                setSteps("");
              }}
            >
              <Plus size={15} /> Add bug
            </button>
          </div>
        </div>
      </div>

      {bugs.length === 0 ? (
        <EmptyState title="No bugs logged" body="Either it is early, or you are not looking hard enough." />
      ) : (
        <div className="flex flex-col gap-6">
          {[["Open", open], ["Closed", closed]].map(([label, list]) => {
            const items = list as BugItem[];
            if (items.length === 0) return null;
            return (
              <section key={label as string}>
                <p className="eyebrow mb-2">{label as string} · {items.length}</p>
                <ul className="flex flex-col gap-2">
                  {items.map((b) => (
                    <li key={b.id} className="card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">{b.title}</p>
                          {b.steps && (
                            <p className="mt-1 whitespace-pre-wrap text-[13px]" style={{ color: "var(--text-muted)" }}>
                              {b.steps}
                            </p>
                          )}
                          <p className="mt-2 text-[11px]" style={{ color: "var(--text-faint)" }}>
                            <span style={{ color: statusColor(b.severity) }}>{b.severity}</span>
                            {" · logged "}{relativeDate(b.createdAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <select
                            className="input h-8 w-28 py-0 text-[12px]"
                            value={b.status}
                            disabled={pending}
                            onChange={(e) => run(() => setBugStatus(b.id, e.target.value))}
                            aria-label={`Status of ${b.title}`}
                          >
                            {BUG_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <button
                            onClick={() => run(() => deleteBug(b.id))}
                            disabled={pending}
                            className="grid h-8 w-8 place-items-center rounded-[var(--radius-card)]"
                            style={{ color: "var(--danger)" }}
                            aria-label={`Delete ${b.title}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- deployments */

export type DeploymentItem = {
  id: string;
  environment: string;
  platform: string;
  url?: string;
  version?: string;
  notes?: string;
  status: string;
  deployedAt: string;
};

const PLATFORMS = ["vercel", "railway", "render", "netlify", "fly", "aws", "docker", "digitalocean", "other"];
const ENVIRONMENTS = ["development", "staging", "production"];

export function DeploymentsPanel({
  projectId,
  deployments,
}: {
  projectId: string;
  deployments: DeploymentItem[];
}) {
  const { pending, run } = useWrite();
  const [platform, setPlatform] = useState("vercel");
  const [environment, setEnvironment] = useState("production");
  const [url, setUrl] = useState("");
  const [version, setVersion] = useState("");

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-4">
        <p className="eyebrow">Record a deployment</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <select className="input" value={platform} onChange={(e) => setPlatform(e.target.value)} aria-label="Platform">
            {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select
            className="input"
            value={environment}
            onChange={(e) => setEnvironment(e.target.value)}
            aria-label="Environment"
          >
            {ENVIRONMENTS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <input
            className="input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-project.vercel.app"
            aria-label="Deployment URL"
          />
          <input
            className="input"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="v0.1.0 (optional)"
            aria-label="Version"
          />
        </div>
        <button
          className="btn btn-primary mt-3"
          disabled={pending}
          onClick={() => {
            run(() => createDeployment({ projectId, platform, environment, url, version }));
            setUrl("");
            setVersion("");
          }}
        >
          <Plus size={15} /> Record
        </button>
        <p className="mt-2 text-xs" style={{ color: "var(--text-faint)" }}>
          A production deployment moves the project itself to &ldquo;deployed&rdquo;.
        </p>
      </div>

      {deployments.length === 0 ? (
        <EmptyState
          title="Nothing shipped yet"
          body="A project that has never been deployed is a project you cannot show anyone. Ship the ugly version."
        />
      ) : (
        <ol className="flex flex-col gap-2">
          {deployments.map((d) => (
            <li key={d.id} className="card flex flex-wrap items-center gap-x-4 gap-y-1 p-4">
              <span className="text-sm font-medium" style={{ color: statusColor(d.status) }}>
                {d.status}
              </span>
              <span className="text-sm">{d.platform}</span>
              <span className="text-xs" style={{ color: "var(--text-faint)" }}>{d.environment}</span>
              {d.version && (
                <span className="text-xs" style={{ color: "var(--text-faint)" }}>{d.version}</span>
              )}
              {d.url && (
                <a
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-xs hover:underline"
                  style={{ color: "var(--primary)" }}
                >
                  {d.url.replace(/^https?:\/\//, "")}
                </a>
              )}
              <span className="ml-auto text-[11px]" style={{ color: "var(--text-faint)" }}>
                {formatDate(d.deployedAt)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
