import { connectDB } from "@/lib/db";
import { SchemaDesign } from "@/lib/models";
import { requireUser } from "@/lib/user";
import { SchemaDesigner, type SchemaItem } from "@/components/project-design";

export const dynamic = "force-dynamic";

export default async function DatabasePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const user = await requireUser();
  await connectDB();

  const rows = await SchemaDesign.find({ project: projectId, user: user._id }).sort({ order: 1 }).lean();
  const items: SchemaItem[] = rows.map((s) => ({
    id: String(s._id),
    name: String(s.name),
    description: s.description as string | undefined,
    fields: (s.fields ?? []) as SchemaItem["fields"],
    indexes: (s.indexes ?? []) as string[],
  }));

  return <SchemaDesigner projectId={projectId} schemas={items} />;
}
