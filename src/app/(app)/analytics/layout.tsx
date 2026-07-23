import { requireUser } from "@/lib/user";
import { ModuleTabs } from "@/components/module-tabs";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div className="page-body">
      <PageHeader
        eyebrow="Analytics"
        title="Analytics & productivity"
        description="What you actually did, rather than what you meant to do."
      />
      <div className="section-stack">
        <ModuleTabs
          base="/analytics"
          items={[
            { segment: "", label: "Overview" },
            { segment: "goals", label: "Goals" },
            { segment: "habits", label: "Habits" },
            { segment: "focus", label: "Focus" },
            { segment: "achievements", label: "Achievements" },
          ]}
        />
        {children}
      </div>
    </div>
  );
}
