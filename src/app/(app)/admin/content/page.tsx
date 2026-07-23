import { requireAdmin } from "@/lib/user";
import { getAdminContent } from "@/lib/queries";
import { ContentBuilder } from "@/components/admin-panels";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  await requireAdmin();
  const content = await getAdminContent();
  return <ContentBuilder content={content} />;
}
