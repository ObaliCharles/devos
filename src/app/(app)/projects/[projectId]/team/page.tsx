import { notFound } from "next/navigation";
import { requireUser } from "@/lib/user";
import { getTeam } from "@/lib/queries";
import { TeamPanel } from "@/components/projects/team-panel";

export const dynamic = "force-dynamic";

export default async function TeamPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const user = await requireUser();
  const team = await getTeam(user._id, projectId);
  if (!team) notFound();

  return (
    <TeamPanel
      projectId={projectId}
      members={team.members}
      pending={team.pending}
      role={team.access?.role ?? "viewer"}
      openToContributors={team.openToContributors}
    />
  );
}
