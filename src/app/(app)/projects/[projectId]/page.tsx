import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, Bug, Database, Flag, Rocket, Server } from "lucide-react";
import { requireUser } from "@/lib/user";
import { getProject, getProjectOverview } from "@/lib/queries";
import { EmptyState, Pill } from "@/components/ui";
import { formatDate, relativeDate, statusColor } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await requireUser();

  const project = await getProject(user._id, projectId);
  if (!project) notFound();
  const overview = await getProjectOverview(user._id, projectId);

  const stack = (project.stack ?? {}) as Record<string, string[]>;
  const stackEntries = Object.entries(stack).filter(([, v]) => Array.isArray(v) && v.length > 0);
  const features = (project.features ?? []) as string[];
  const done = overview.milestones.filter((m) => m.status === "done").length;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div className="flex flex-col gap-6">
        {project.goal && (
          <section className="card p-5">
            <p className="eyebrow">The point of this</p>
            <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {String(project.goal)}
            </p>
          </section>
        )}

        <section className="card p-5">
          <div className="flex items-center gap-2">
            <Flag size={15} style={{ color: "var(--text-muted)" }} />
            <h2 className="text-base font-semibold">Milestones</h2>
            <span className="ml-auto text-xs tabular-nums" style={{ color: "var(--text-faint)" }}>
              {done}/{overview.milestones.length}
            </span>
          </div>

          {overview.milestones.length === 0 ? (
            <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
              No milestones yet.{" "}
              <Link href={`/projects/${projectId}/milestones`} style={{ color: "var(--primary)" }}>
                Add the first one
              </Link>{" "}
              — they are what turn a long project into a sequence of finishable ones.
            </p>
          ) : (
            <ol className="mt-4 flex flex-col gap-2.5">
              {overview.milestones.slice(0, 6).map((m) => (
                <li key={String(m._id)} className="flex items-center gap-3">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{
                      background:
                        m.status === "done" ? "var(--success)"
                        : m.status === "active" ? "var(--primary)"
                        : "var(--border-strong)",
                    }}
                  />
                  <span
                    className="min-w-0 flex-1 truncate text-sm"
                    style={{
                      color: m.status === "done" ? "var(--text-faint)" : "var(--text)",
                      textDecoration: m.status === "done" ? "line-through" : undefined,
                    }}
                  >
                    {String(m.title)}
                  </span>
                  {m.dueAt && (
                    <span className="shrink-0 text-[11px]" style={{ color: "var(--text-faint)" }}>
                      {relativeDate(m.dueAt as Date)}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>

        {features.length > 0 && (
          <section className="card p-5">
            <p className="eyebrow">Scope</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {features.map((f) => <Pill key={f}>{f}</Pill>)}
            </div>
          </section>
        )}

        <section className="card p-5">
          <div className="flex items-center gap-2">
            <Activity size={15} style={{ color: "var(--text-muted)" }} />
            <h2 className="text-base font-semibold">Recent activity</h2>
          </div>
          {overview.activity.length === 0 ? (
            <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
              Nothing logged yet. Finishing a task or shipping a deployment shows up here.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2.5">
              {overview.activity.map((a) => (
                <li key={String(a._id)} className="flex items-baseline justify-between gap-3 text-sm">
                  <span style={{ color: "var(--text-muted)" }}>{String(a.message)}</span>
                  <span className="shrink-0 text-[11px]" style={{ color: "var(--text-faint)" }}>
                    {relativeDate(a.createdAt as Date)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="flex flex-col gap-6">
        {stackEntries.length > 0 && (
          <section className="card p-4">
            <p className="eyebrow">Stack</p>
            <dl className="mt-3 flex flex-col gap-2.5">
              {stackEntries.map(([group, values]) => (
                <div key={group} className="flex gap-3 text-[13px]">
                  <dt className="w-20 shrink-0 capitalize" style={{ color: "var(--text-faint)" }}>{group}</dt>
                  <dd style={{ color: "var(--text-muted)" }}>{values.join(", ")}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <section className="card p-4">
          <p className="eyebrow">Workspace</p>
          <ul className="mt-3 flex flex-col gap-1">
            {[
              { href: "database", icon: Database, label: "Collections", count: overview.schemas },
              { href: "api", icon: Server, label: "Endpoints", count: overview.endpoints },
              { href: "bugs", icon: Bug, label: "Open bugs", count: overview.openBugs },
              { href: "deployments", icon: Rocket, label: "Deployments", count: overview.deployments.length },
            ].map(({ href, icon: Icon, label, count }) => (
              <li key={href}>
                <Link
                  href={`/projects/${projectId}/${href}`}
                  className="flex items-center gap-2.5 rounded-[var(--radius-card)] px-2 py-2 text-sm transition-colors hover:bg-[var(--surface-2)]"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Icon size={15} />
                  <span className="flex-1">{label}</span>
                  <span className="tabular-nums" style={{ color: "var(--text-faint)" }}>{count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {overview.deployments.length > 0 && (
          <section className="card p-4">
            <p className="eyebrow">Latest deployment</p>
            {overview.deployments.slice(0, 1).map((d) => (
              <div key={String(d._id)} className="mt-3">
                <p className="text-sm font-medium" style={{ color: statusColor(String(d.status)) }}>
                  {String(d.status)} · {String(d.platform)}
                </p>
                <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>
                  {String(d.environment)} · {formatDate(d.deployedAt as Date)}
                </p>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
