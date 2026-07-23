import { requireUser } from "@/lib/user";
import { getTickets } from "@/lib/queries";
import { HelpCenter } from "@/components/platform-panels";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function HelpPage() {
  const user = await requireUser();
  const tickets = await getTickets(user._id);
  return (
    <div className="page-body">
      <PageHeader eyebrow="Support" title="Help centre" />
      <HelpCenter tickets={tickets} />
    </div>
  );
}
