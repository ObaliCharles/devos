import { requireUser } from "@/lib/user";
import { getKnowledgeGraph } from "@/lib/queries";
import { GraphView } from "@/components/graph-view";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function GraphPage() {
  const user = await requireUser();
  const { nodes, edges } = await getKnowledgeGraph(user._id);

  return (
    <div className="page-body">
      <PageHeader
        back={{ href: "/notes", label: "Knowledge" }}
        eyebrow="Second brain"
        title="Graph"
        description="Every [[link]] you have written, drawn as the network it already was."
      />
      <GraphView nodes={nodes} edges={edges} />
    </div>
  );
}
