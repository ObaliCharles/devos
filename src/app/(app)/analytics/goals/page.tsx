import { requireUser } from "@/lib/user";
import { getGoals } from "@/lib/queries";
import { GoalsPanel } from "@/components/productivity-panels";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const user = await requireUser();
  const goals = await getGoals(user._id);
  return <GoalsPanel goals={goals} />;
}
