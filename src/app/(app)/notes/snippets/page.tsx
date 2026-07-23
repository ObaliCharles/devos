import { requireUser } from "@/lib/user";
import { getSnippets } from "@/lib/queries";
import { SnippetVault, type SnippetItem } from "@/components/snippet-vault";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SnippetsPage() {
  const user = await requireUser();
  const snippets = (await getSnippets(user._id)) as SnippetItem[];

  return (
    <div className="page-body">
      <PageHeader
        back={{ href: "/notes", label: "Knowledge" }}
        eyebrow="Second brain"
        title="Snippet vault"
        description="Code you have written once and will want again. Searchable, tagged, and one click from the clipboard."
      />
      <SnippetVault snippets={snippets} />
    </div>
  );
}
