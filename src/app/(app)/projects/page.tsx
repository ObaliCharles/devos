import Link from "next/link";
import { Bug, Clock, FolderKanban, Pin, Plus, Rocket, Timer } from "lucide-react";
import { requireUser } from "@/lib/user";
import { getProjects, getProjectStats } from "@/lib/queries";
import { Badge, EmptyState, PageHeader, ProgressBar, StatTile, type Tone } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, Tone> = {
  planning: "neutral",
  building: "info",
  testing: "warning",
  deployed: "success",
  complete: "success",
  paused: "neutral",
  archived: "neutral",
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const { archived } = await searchParams;
  const showArchived = archived === "1";

  const user = await requireUser();
  const [projects, stats] = await Promise.all([
    getProjects(user._id, { archived: showArchived }),
    getProjectStats(user._id),
  ]);

  return (
    <div className="page-body">
      <PageHeader
        eyebrow="Build"
        title="Projects"
        description="Learning that never becomes something you can open is a hobby. Every project here links to the skills it practises."
        actions={
          <Link href="/projects/new" className="btn btn-primary">
            <Plus size={15} /> New project
          </Link>
        }
      />

      <section className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Project summary">
        <StatTile
          label="Active"
          value={stats.active}
          sub={`${stats.complete} complete`}
          icon={<FolderKanban size={17} />}
          tone="primary"
        />
        <StatTile
          label="Tasks open"
          value={stats.tasksDue}
          sub="across all projects"
          icon={<Timer size={17} />}
          tone="info"
        />
        <StatTile
          label="Open bugs"
          value={stats.bugs}
          sub={stats.bugs ? "needs attention" : "all clear"}
          icon={<Bug size={17} />}
          tone={stats.bugs ? "danger" : "success"}
        />
        <StatTile
          label="Time logged"
          value={`${stats.hours}h`}
          sub={`${stats.deployments} deployments`}
          icon={<Clock size={17} />}
          tone="warning"
        />
      </section>

      <div className="section-stack">
        <nav className="segmented w-fit" aria-label="Filter projects">
          <Link
            href="/projects"
            aria-current={!showArchived ? "page" : undefined}
            className={`segment ${!showArchived ? "segment-active" : ""}`}
          >
            Active
          </Link>
          <Link
            href="/projects?archived=1"
            aria-current={showArchived ? "page" : undefined}
            className={`segment ${showArchived ? "segment-active" : ""}`}
          >
            Archived
            {stats.archived > 0 && (
              <span className="num text-[11px]" style={{ color: "var(--text-faint)" }}>
                {stats.archived}
              </span>
            )}
          </Link>
        </nav>

        {projects.length === 0 ? (
          <EmptyState
            icon={<FolderKanban size={22} />}
            title={showArchived ? "Nothing archived" : "No projects yet"}
            body={
              showArchived
                ? "Projects you archive stay here, searchable, and out of the way."
                : "Pick something you have just learned and build the smallest version of it that actually runs."
            }
            action={
              showArchived ? (
                <Link href="/projects" className="btn btn-primary">
                  Back to active projects
                </Link>
              ) : (
                <Link href="/projects/new" className="btn btn-primary">
                  <Plus size={15} /> Create your first project
                </Link>
              )
            }
            secondary={
              !showArchived ? (
                <Link href="/learning" className="btn btn-ghost">
                  Find something to build
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="card card-link flex flex-col p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="title-card min-w-0">{p.title}</h2>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {p.pinned && <Pin size={13} style={{ color: "var(--primary)" }} />}
                    <Badge tone={STATUS_TONE[p.status] ?? "neutral"}>{p.status}</Badge>
                  </div>
                </div>

                {p.description && (
                  <p className="text-body mt-2 line-clamp-2 text-[13px]">{p.description}</p>
                )}

                {p.skills.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {p.skills.slice(0, 3).map((s) => (
                      <Badge key={s.id}>{s.title}</Badge>
                    ))}
                    {p.skills.length > 3 && <Badge>+{p.skills.length - 3}</Badge>}
                  </div>
                )}

                <div className="mt-auto pt-5">
                  <div className="flex items-center gap-3">
                    <ProgressBar
                      value={p.tasksDone}
                      total={p.tasks}
                      size="sm"
                      tone={p.tasks > 0 && p.tasksDone === p.tasks ? "success" : "primary"}
                      label={`${p.title}: ${p.tasksDone} of ${p.tasks} tasks done`}
                    />
                    <span
                      className="num shrink-0 text-[12px] font-medium"
                      style={{ color: "var(--text-faint)" }}
                    >
                      {p.tasksDone}/{p.tasks}
                    </span>
                  </div>

                  <div
                    className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]"
                    style={{ color: "var(--text-faint)" }}
                  >
                    {p.bugsOpen > 0 && (
                      <span className="flex items-center gap-1" style={{ color: "var(--danger)" }}>
                        <Bug size={12} /> {p.bugsOpen}
                      </span>
                    )}
                    {p.deadline && (
                      <span className="flex items-center gap-1">
                        <Timer size={12} /> {formatDate(p.deadline)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Rocket size={12} /> {p.category}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
