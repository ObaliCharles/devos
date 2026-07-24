import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Github } from "lucide-react";
import { requireUser } from "@/lib/user";
import { getProject } from "@/lib/queries";
import { Badge, PageHeader, ProgressBar, type Tone } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { ProjectTabs } from "@/components/project-tabs";

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

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await requireUser();
  const project = await getProject(user._id, projectId);
  if (!project) notFound();

  const counts = (project.counts ?? {}) as {
    tasks?: number;
    tasksDone?: number;
    bugsOpen?: number;
  };
  const skills = (project.skills ?? []) as { _id: unknown; title: string }[];
  const status = String(project.status);

  return (
    <div className="page-body">
      <PageHeader
        back={{ href: "/projects", label: "Projects" }}
        eyebrow={String(project.category)}
        title={String(project.title)}
        description={project.description ? String(project.description) : undefined}
        meta={
          <>
            <Badge tone={STATUS_TONE[status] ?? "neutral"}>{status}</Badge>
            {project.deadline && <Badge>Due {formatDate(project.deadline as Date)}</Badge>}
            <div className="flex min-w-[200px] flex-1 items-center gap-2.5">
              <ProgressBar
                value={counts.tasksDone ?? 0}
                total={counts.tasks ?? 0}
                size="sm"
                tone={counts.tasks && counts.tasksDone === counts.tasks ? "success" : "primary"}
                label={`${counts.tasksDone ?? 0} of ${counts.tasks ?? 0} tasks done`}
              />
              <span className="num text-[12px]" style={{ color: "var(--text-faint)" }}>
                {counts.tasksDone ?? 0}/{counts.tasks ?? 0} tasks
              </span>
            </div>
          </>
        }
        actions={
          <>
            {project.repoUrl && (
              <a
                href={String(project.repoUrl)}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
              >
                <Github size={15} /> Repo
              </a>
            )}
            {project.liveUrl && (
              <a
                href={String(project.liveUrl)}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
              >
                <ExternalLink size={15} /> Live
              </a>
            )}
          </>
        }
      />

      {/* The skills a project practises are links back into the roadmap, this
          is what keeps learning and building from becoming two products. */}
      {skills.length > 0 && (
        <div className="-mt-2 flex flex-wrap items-center gap-1.5">
          <span className="overline mr-1">Practising</span>
          {skills.map((s) => (
            <Link
              key={String(s._id)}
              href={`/learning/skill/${String(s._id)}`}
              className="badge transition-colors hover:bg-[var(--primary-faint)] hover:text-[var(--primary)]"
            >
              {s.title}
            </Link>
          ))}
        </div>
      )}

      <div className="section-stack">
        <ProjectTabs projectId={projectId} openBugs={counts.bugsOpen ?? 0} />
        {children}
      </div>
    </div>
  );
}
