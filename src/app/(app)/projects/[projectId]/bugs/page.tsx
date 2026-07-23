import { connectDB } from "@/lib/db";
import { Bug } from "@/lib/models";
import { requireUser } from "@/lib/user";
import { BugsPanel, type BugItem } from "@/components/project-panels";

export const dynamic = "force-dynamic";

export default async function BugsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const user = await requireUser();
  await connectDB();

  const rows = await Bug.find({ project: projectId, user: user._id }).sort({ createdAt: -1 }).lean();
  const items: BugItem[] = rows.map((b) => ({
    id: String(b._id),
    title: String(b.title),
    description: b.description as string | undefined,
    steps: b.steps as string | undefined,
    severity: String(b.severity ?? "medium"),
    status: String(b.status ?? "open"),
    createdAt: new Date(b.createdAt as Date).toISOString(),
  }));

  return <BugsPanel projectId={projectId} bugs={items} />;
}
