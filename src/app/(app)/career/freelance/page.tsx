import { requireUser } from "@/lib/user";
import { getFreelance } from "@/lib/queries";
import { FreelancePanel } from "@/components/career-panels";

export const dynamic = "force-dynamic";

export default async function FreelancePage() {
  const user = await requireUser();
  const { clients, income, totalIncome } = await getFreelance(user._id);
  return <FreelancePanel clients={clients} income={income} totalIncome={totalIncome} />;
}
