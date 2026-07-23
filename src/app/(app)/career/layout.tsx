import { requireUser } from "@/lib/user";
import { ModuleTabs } from "@/components/module-tabs";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CareerLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div className="page-body">
      <PageHeader
        eyebrow="Grow"
        title="Career & portfolio"
        description="Everything a hiring manager will ask for, built out of work that already exists in this workspace."
      />
      <div className="section-stack">
        <ModuleTabs
          base="/career"
          items={[
            { segment: "", label: "Overview" },
            { segment: "resume", label: "Resume" },
            { segment: "portfolio", label: "Portfolio" },
            { segment: "applications", label: "Applications" },
            { segment: "interviews", label: "Interviews" },
            { segment: "certificates", label: "Certificates" },
            { segment: "freelance", label: "Freelance" },
          ]}
        />
        {children}
      </div>
    </div>
  );
}
