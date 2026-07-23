import Link from "next/link";
import { GitBranch, Code2, Layers } from "lucide-react";
import { requireUser } from "@/lib/user";
import { getNotesWorkspace } from "@/lib/queries";
import { KnowledgeWorkspace } from "@/components/knowledge-workspace";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const user = await requireUser();
  const { notes, collections, tags } = await getNotesWorkspace(user._id);

  return (
    <div className="page-body">
      <PageHeader
        eyebrow="Second brain"
        title="Knowledge"
        description="Everything you learn, connected. Link notes with [[double brackets]] and the graph builds itself."
        actions={
          <>
            <Link href="/notes/graph" className="btn btn-secondary btn-sm">
              <GitBranch size={14} /> Graph
            </Link>
            <Link href="/notes/snippets" className="btn btn-secondary btn-sm">
              <Code2 size={14} /> Snippets
            </Link>
            <Link href="/notes/flashcards" className="btn btn-secondary btn-sm">
              <Layers size={14} /> Flashcards
            </Link>
          </>
        }
      />
      <KnowledgeWorkspace notes={notes} collections={collections} tags={tags} />
    </div>
  );
}
