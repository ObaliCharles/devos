import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Skill } from "@/lib/models";
import { requireUser } from "@/lib/user";
import { getProject } from "@/lib/queries";
import { ProjectSettingsForm, type ProjectSettings } from "@/components/project-settings";

export const dynamic = "force-dynamic";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await requireUser();

  const [project, skills] = await Promise.all([
    getProject(user._id, projectId),
    connectDB().then(() => Skill.find().sort({ order: 1 }).select("title").lean()),
  ]);
  if (!project) notFound();

  const linkedSkills = (project.skills ?? []) as { _id: unknown }[];

  const settings: ProjectSettings = {
    id: String(project._id),
    title: String(project.title),
    description: String(project.description ?? ""),
    goal: String(project.goal ?? ""),
    status: String(project.status ?? "planning"),
    category: String(project.category ?? "web"),
    difficulty: String(project.difficulty ?? "intermediate"),
    visibility: String(project.visibility ?? "private"),
    repoUrl: String(project.repoUrl ?? ""),
    liveUrl: String(project.liveUrl ?? ""),
    figmaUrl: String(project.figmaUrl ?? ""),
    deadline: project.deadline ? new Date(project.deadline as Date).toISOString().slice(0, 10) : "",
    archived: Boolean(project.archived),
    skillIds: linkedSkills.map((s) => String(s._id)),
  };

  return (
    <ProjectSettingsForm
      project={settings}
      skills={skills.map((s) => ({ id: String(s._id), title: String(s.title) }))}
    />
  );
}
