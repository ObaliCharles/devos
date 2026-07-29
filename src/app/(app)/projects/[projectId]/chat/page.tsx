import { notFound } from "next/navigation";
import { requireUser } from "@/lib/user";
import { listProjectMessages } from "@/lib/queries";
import { getProjectAccess, can } from "@/lib/project-access";
import { ProjectChat } from "@/components/projects/project-chat";

export const dynamic = "force-dynamic";

export default async function ProjectChatPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await requireUser();
  const access = await getProjectAccess(user._id, projectId);
  if (!access) notFound();

  const messages = await listProjectMessages(user._id, projectId);

  return (
    <ProjectChat projectId={projectId} messages={messages} canPost={can(access, "contributor")} />
  );
}
