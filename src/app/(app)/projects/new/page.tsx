import { connectDB } from "@/lib/db";
import { Phase, Skill } from "@/lib/models";
import { requireUser } from "@/lib/user";
import { ProjectWizard, type SkillOption } from "@/components/project-wizard";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  await requireUser();
  await connectDB();

  // Two queries, not one per phase — the same rule the roadmap tree follows.
  const [skills, phases] = await Promise.all([
    Skill.find().sort({ order: 1 }).select("title phase").lean(),
    Phase.find().sort({ order: 1 }).select("title").lean(),
  ]);
  const phaseTitle = new Map(phases.map((p) => [String(p._id), String(p.title)]));

  const options: SkillOption[] = skills.map((s) => ({
    id: String(s._id),
    title: String(s.title),
    phase: phaseTitle.get(String(s.phase)) ?? "",
  }));

  return (
    <div className="page-body">
      <PageHeader
        back={{ href: "/projects", label: "Projects" }}
        eyebrow="New project"
        title="Plan it before you open the editor"
        description="Ten minutes of scope now is worth a weekend of rewrites later."
      />
      <ProjectWizard skills={options} />
    </div>
  );
}
