import { requireUser } from "@/lib/user";
import { getProject } from "@/lib/queries";
import { notFound } from "next/navigation";
import { ProjectPlanPanel } from "@/components/projects/project-plan";

export const dynamic = "force-dynamic";

/**
 * The planning assistant (learning-upgrade spec §13), attached to the one
 * status every project already starts in. See lib/models/projects.ts's note
 * on `ProjectPlanSchema` for why this is a field on Project, not a new
 * collection or an Evidence-shaped one.
 */
export default async function ProjectPlanPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const user = await requireUser();

  const project = await getProject(user._id, projectId);
  if (!project) notFound();

  return <ProjectPlanPanel projectId={projectId} plan={project.plan ?? {}} />;
}
