import { requireUser } from "@/lib/user";
import { getNotifications } from "@/lib/queries";
import { NotificationsList } from "@/components/platform-panels";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await getNotifications(user._id);
  return (
    <div className="page-body">
      <PageHeader eyebrow="System" title="Notifications" />
      <NotificationsList notifications={notifications} />
    </div>
  );
}
