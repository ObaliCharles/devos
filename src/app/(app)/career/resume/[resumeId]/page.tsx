import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/user";
import { getResume, getProjects } from "@/lib/queries";
import { ResumeEditor, type ResumeData } from "@/components/resume-editor";

export const dynamic = "force-dynamic";

export default async function ResumeEditorPage({ params }: { params: Promise<{ resumeId: string }> }) {
  const { resumeId } = await params;
  const user = await requireUser();
  const [resume, projects] = await Promise.all([getResume(user._id, resumeId), getProjects(user._id)]);
  if (!resume) notFound();

  const data: ResumeData = {
    _id: String(resume._id),
    title: resume.title ?? "My resume",
    template: resume.template ?? "developer",
    personal: resume.personal ?? {},
    summary: resume.summary ?? "",
    skills: resume.skills ?? [],
    experience: resume.experience ?? [],
    education: resume.education ?? [],
    achievements: resume.achievements ?? [],
    atsScore: resume.atsScore,
  };

  return (
    <div className="flex flex-col gap-4">
      <Link href="/career/resume" className="inline-flex items-center gap-1.5 text-sm" style={{ color: "var(--text-muted)" }}>
        <ArrowLeft size={14} /> Resumes
      </Link>
      <ResumeEditor resume={data} projectTitles={projects.map((p) => p.title)} />
    </div>
  );
}
