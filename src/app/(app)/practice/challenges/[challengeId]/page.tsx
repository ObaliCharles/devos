import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/user";
import { getChallenge } from "@/lib/queries";
import { CodeRunner } from "@/components/code-runner";

export const dynamic = "force-dynamic";

export default async function ChallengePage({ params }: { params: Promise<{ challengeId: string }> }) {
  const { challengeId } = await params;
  const user = await requireUser();
  const challenge = await getChallenge(user._id, challengeId);
  if (!challenge) notFound();

  return (
    <div className="page-body">
      <Link href="/practice/challenges" className="inline-flex items-center gap-1.5 text-sm" style={{ color: "var(--text-muted)" }}>
        <ArrowLeft size={14} /> Challenges
      </Link>
      <div className="mt-4 mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold">{challenge.title}</h1>
        <span className="text-xs" style={{ color: "var(--text-faint)" }}>{challenge.difficulty}</span>
        {challenge.solved && <span className="text-xs" style={{ color: "var(--success)" }}>solved</span>}
      </div>
      <CodeRunner challenge={challenge} />
    </div>
  );
}
