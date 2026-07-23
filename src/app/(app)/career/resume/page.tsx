import Link from "next/link";
import { FileText } from "lucide-react";
import { requireUser } from "@/lib/user";
import { getResumes } from "@/lib/queries";
import { EmptyState } from "@/components/ui";
import { NewResumeButton } from "@/components/new-resume-button";

export const dynamic = "force-dynamic";

export default async function ResumeListPage() {
  const user = await requireUser();
  const resumes = await getResumes(user._id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Build an ATS-friendly resume. The score updates as you write.</p>
        <NewResumeButton />
      </div>

      {resumes.length === 0 ? (
        <EmptyState icon={<FileText size={30} />} title="No resume yet" body="Start one — it pre-fills your name and email, and pulls your projects in." action={<NewResumeButton />} />
      ) : (
        <ul className="flex flex-col gap-2">
          {resumes.map((r) => (
            <li key={r.id}>
              <Link href={`/career/resume/${r.id}`} className="card flex items-center justify-between p-4 transition-colors hover:border-[var(--border-strong)]">
                <div>
                  <p className="font-medium">{r.title}{r.isDefault ? " · default" : ""}</p>
                  <p className="text-xs" style={{ color: "var(--text-faint)" }}>{r.template} template</p>
                </div>
                <span className="text-sm font-semibold tabular-nums" style={{ color: r.atsScore >= 70 ? "var(--success)" : "var(--warning)" }}>{r.atsScore}%</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
