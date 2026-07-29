import { requireUser } from "@/lib/user";
import { listGroups } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { GroupsIndex } from "@/components/community/groups-index";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const user = await requireUser();
  const groups = await listGroups(user._id, 60).catch(() => []);

  return (
    <div className="page-body">
      <PageHeader
        back={{ href: "/community", label: "Community" }}
        eyebrow="Community"
        title="Groups"
        description="Each group is the home for one topic — its own feed, its own members."
      />
      <GroupsIndex groups={groups} />
    </div>
  );
}
