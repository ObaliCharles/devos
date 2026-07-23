import { requireUser } from "@/lib/user";
import { getPrompts } from "@/lib/queries";
import { AiPromptLibrary } from "@/components/ai-prompt-library";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PromptsPage() {
  const user = await requireUser();
  const prompts = await getPrompts(user._id);

  return (
    <div className="page-body">
      <PageHeader
        back={{ href: "/ai", label: "AI centre" }}
        eyebrow="AI centre"
        title="Prompt library"
        description="Prompts worth keeping, so a good question does not have to be rewritten every time."
      />
      <AiPromptLibrary prompts={prompts} />
    </div>
  );
}
