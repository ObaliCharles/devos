import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/user";
import { ModuleTabs } from "@/components/module-tabs";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * The admin shell. The guard is here, once — every page under it is protected
 * because it cannot render without passing this layout. A non-admin is sent to
 * the dashboard rather than shown a 403, because the existence of the page is
 * not a secret, only its contents.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "admin") redirect("/dashboard");

  return (
    <div className="page-body">
      <PageHeader eyebrow="System" title="Administration" />
      <div className="section-stack">
        <ModuleTabs
          base="/admin"
          items={[
            { segment: "", label: "Overview" },
            { segment: "users", label: "Users" },
            { segment: "content", label: "Content" },
            { segment: "flags", label: "Feature flags" },
            { segment: "audit", label: "Audit log" },
          ]}
        />
        {children}
      </div>
    </div>
  );
}
