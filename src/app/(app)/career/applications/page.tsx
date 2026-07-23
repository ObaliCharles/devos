import { requireUser } from "@/lib/user";
import { getApplications } from "@/lib/queries";
import { ApplicationsBoard } from "@/components/career-panels";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const user = await requireUser();
  const applications = await getApplications(user._id);
  return <ApplicationsBoard applications={applications} />;
}
