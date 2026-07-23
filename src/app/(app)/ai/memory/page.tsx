import { requireUser } from "@/lib/user";
import { getMemory } from "@/lib/queries";
import { AiMemoryManager } from "@/components/ai-memory-manager";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function MemoryPage() {
  const user = await requireUser();
  const memory = await getMemory(user._id);

  return (
    <div className="page-body">
      <PageHeader
        back={{ href: "/ai", label: "AI centre" }}
        eyebrow="AI centre"
        title="Memory"
        description="What the assistant carries between conversations. Everything here is editable, and deleting it deletes it."
      />
      <AiMemoryManager memory={memory} />
    </div>
  );
}
