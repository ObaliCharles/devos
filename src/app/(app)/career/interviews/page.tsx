import { requireUser } from "@/lib/user";
import { getInterviews } from "@/lib/queries";
import { InterviewsPanel } from "@/components/career-panels";

export const dynamic = "force-dynamic";

export default async function InterviewsPage() {
  const user = await requireUser();
  const interviews = await getInterviews(user._id);
  return <InterviewsPanel interviews={interviews} />;
}
