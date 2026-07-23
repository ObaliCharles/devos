import { requireUser } from "@/lib/user";
import { getHabits } from "@/lib/queries";
import { HabitsPanel } from "@/components/productivity-panels";

export const dynamic = "force-dynamic";

export default async function HabitsPage() {
  const user = await requireUser();
  const habits = await getHabits(user._id);
  return <HabitsPanel habits={habits} />;
}
