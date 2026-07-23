import { getAdminOverview } from "@/lib/queries";
import { StatCard } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const o = await getAdminOverview();
  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Users" value={o.users} sub={`${o.admins} admin`} />
        <StatCard label="Lessons" value={o.lessons} sub={`${o.roadmaps} roadmap`} />
        <StatCard label="Challenges" value={o.challenges} />
        <StatCard label="Projects" value={o.projects} sub="across all users" />
      </section>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Notes" value={o.notes} />
        <StatCard label="AI spend today" value={`$${o.aiSpendUsd.toFixed(2)}`} sub={`${o.aiRequests} requests`} />
      </section>
      <section className="card p-5">
        <p className="eyebrow">About this panel</p>
        <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Everything here crosses user boundaries, so every change is written to the audit log. The first account to
          sign up is the admin; promote others from the Users tab. Content edited here changes what every learner sees.
        </p>
      </section>
    </div>
  );
}
