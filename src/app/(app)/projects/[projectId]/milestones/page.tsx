import { connectDB } from "@/lib/db";
import { Milestone } from "@/lib/models";
import { requireUser } from "@/lib/user";
import { MilestonesPanel, type MilestoneItem } from "@/components/project-panels";

export const dynamic = "force-dynamic";

export default async function MilestonesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const user = await requireUser();
  await connectDB();

  const rows = await Milestone.find({ project: projectId, user: user._id }).sort({ order: 1 }).lean();
  const items: MilestoneItem[] = rows.map((m) => ({
    id: String(m._id),
    title: String(m.title),
    description: m.description as string | undefined,
    status: String(m.status ?? "planned"),
    dueAt: m.dueAt ? new Date(m.dueAt as Date).toISOString() : undefined,
  }));

  return <MilestonesPanel projectId={projectId} milestones={items} />;
}
