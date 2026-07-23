import { requireUser } from "@/lib/user";
import { getFocusToday } from "@/lib/queries";
import { FocusPanel } from "@/components/productivity-panels";

export const dynamic = "force-dynamic";

export default async function FocusPage() {
  const user = await requireUser();
  const today = await getFocusToday(user._id);
  return <FocusPanel today={today} />;
}
