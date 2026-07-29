import { requireUser } from "@/lib/user";
import { getMyInvites, listOpenProjects } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { DiscoverProjects } from "@/components/projects/discover-projects";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const user = await requireUser();
  const [projects, invites] = await Promise.all([
    listOpenProjects(user._id).catch(() => []),
    getMyInvites(user._id).catch(() => []),
  ]);

  return (
    <div className="page-body">
      <PageHeader
        back={{ href: "/projects", label: "Projects" }}
        eyebrow="Build"
        title="Find a project"
        description="Projects looking for contributors. Building with someone else is the fastest way past the parts you would have stalled on alone."
      />
      <DiscoverProjects projects={projects} invites={invites} />
    </div>
  );
}
