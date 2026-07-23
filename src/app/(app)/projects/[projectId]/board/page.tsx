import { requireUser } from "@/lib/user";
import { getProjectBoard } from "@/lib/queries";
import { Kanban, type KanbanTask } from "@/components/kanban";

export const dynamic = "force-dynamic";

export default async function BoardPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const user = await requireUser();
  const tasks = await getProjectBoard(user._id, projectId);

  const items: KanbanTask[] = tasks.map((t) => {
    const checklist = (t.checklist ?? []) as { done?: boolean }[];
    return {
      id: String(t._id),
      title: String(t.title),
      description: t.description as string | undefined,
      status: String(t.status ?? "todo"),
      priority: String(t.priority ?? "medium"),
      order: Number(t.order ?? 0),
      deadline: t.deadline ? new Date(t.deadline as Date).toISOString() : undefined,
      tags: (t.tags ?? []) as string[],
      checklistDone: checklist.filter((c) => c.done).length,
      checklistTotal: checklist.length,
    };
  });

  return <Kanban projectId={projectId} tasks={items} />;
}
