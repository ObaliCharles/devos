import { requireUser } from "@/lib/user";
import { getResources } from "@/lib/queries";
import { ResourceLibrary } from "@/components/platform-panels";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
  const user = await requireUser();
  const resources = await getResources(user._id);
  return (
    <div className="page-body">
      <PageHeader eyebrow="Library" title="Resources" description="Your developer reading list, and a few we ship with." />
      <ResourceLibrary resources={resources} />
    </div>
  );
}
