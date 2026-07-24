import { requireUser } from "@/lib/user";
import { getCalendar } from "@/lib/queries";
import { CalendarView } from "@/components/calendar-view";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const { y, m } = await searchParams;
  const user = await requireUser();

  const now = new Date();
  const year = y ? Number(y) : now.getFullYear();
  const month = m !== undefined ? Number(m) : now.getMonth();

  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0, 23, 59, 59);
  const items = await getCalendar(user._id, from, to);

  return (
    <div className="page-body">
      <PageHeader
        eyebrow="Plan"
        title="Calendar"
        description="Your schedule, plus every deadline already in the app: project milestones, interviews, and reviews coming due."
      />
      <CalendarView items={items} year={year} month={month} />
    </div>
  );
}
