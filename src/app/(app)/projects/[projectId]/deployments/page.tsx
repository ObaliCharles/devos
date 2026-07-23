import { connectDB } from "@/lib/db";
import { Deployment } from "@/lib/models";
import { requireUser } from "@/lib/user";
import { DeploymentsPanel, type DeploymentItem } from "@/components/project-panels";

export const dynamic = "force-dynamic";

export default async function DeploymentsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const user = await requireUser();
  await connectDB();

  const rows = await Deployment.find({ project: projectId, user: user._id }).sort({ deployedAt: -1 }).lean();
  const items: DeploymentItem[] = rows.map((d) => ({
    id: String(d._id),
    environment: String(d.environment ?? "production"),
    platform: String(d.platform ?? "vercel"),
    url: d.url as string | undefined,
    version: d.version as string | undefined,
    notes: d.notes as string | undefined,
    status: String(d.status ?? "live"),
    deployedAt: new Date((d.deployedAt ?? d.createdAt) as Date).toISOString(),
  }));

  return <DeploymentsPanel projectId={projectId} deployments={items} />;
}
