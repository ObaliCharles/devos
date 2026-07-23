import { requireAdmin } from "@/lib/user";
import { getAdminUsers } from "@/lib/queries";
import { UsersTable } from "@/components/admin-panels";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const me = await requireAdmin();
  const users = await getAdminUsers();
  return <UsersTable users={users} meId={String(me._id)} />;
}
