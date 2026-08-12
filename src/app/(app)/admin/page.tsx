import { getAdminOverview } from "@/lib/queries";
import { Section, Stat, StatRow } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const o = await getAdminOverview();
  return (
    <div className="page-body">
      {/* Six numbers as two 4-up and 2-up card grids — the same pattern
          already fixed on /analytics, the dashboard, /projects. One reading
          of the same platform, one row. */}
      <Section major={false}>
        <StatRow>
          <Stat label="Users" value={o.users} sub={`${o.admins} admin`} />
          <Stat label="Lessons" value={o.lessons} sub={`${o.roadmaps} roadmap`} />
          <Stat label="Challenges" value={o.challenges} />
          <Stat label="Projects" value={o.projects} sub="across all users" />
          <Stat label="Notes" value={o.notes} />
          <Stat label="AI spend today" value={`$${o.aiSpendUsd.toFixed(2)}`} sub={`${o.aiRequests} requests`} />
        </StatRow>
      </Section>
      <section className="card p-5">
        <p className="eyebrow">About this panel</p>
        <p className="mt-3 text-ui leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Everything here crosses user boundaries, so every change is written to the audit log. The first account to
          sign up is the admin; promote others from the Users tab. Content edited here changes what every learner sees.
        </p>
      </section>
    </div>
  );
}
