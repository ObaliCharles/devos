import { requireAdmin } from "@/lib/user";
import { getFeatureFlags } from "@/lib/queries";
import { FlagsPanel } from "@/components/admin-panels";

export const dynamic = "force-dynamic";

export default async function AdminFlagsPage() {
  await requireAdmin();
  const flags = await getFeatureFlags();
  return <FlagsPanel flags={flags} />;
}
