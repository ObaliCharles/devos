import { connectDB } from "@/lib/db";
import { ApiEndpoint } from "@/lib/models";
import { requireUser } from "@/lib/user";
import { ApiDesigner, type EndpointItem } from "@/components/project-design";

export const dynamic = "force-dynamic";

export default async function ApiPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const user = await requireUser();
  await connectDB();

  const rows = await ApiEndpoint.find({ project: projectId, user: user._id }).sort({ group: 1, order: 1 }).lean();
  const items: EndpointItem[] = rows.map((e) => ({
    id: String(e._id),
    method: String(e.method ?? "GET"),
    path: String(e.path),
    group: e.group as string | undefined,
    description: e.description as string | undefined,
    auth: Boolean(e.auth),
    requestBody: e.requestBody as string | undefined,
    responseBody: e.responseBody as string | undefined,
  }));

  return <ApiDesigner projectId={projectId} endpoints={items} />;
}
