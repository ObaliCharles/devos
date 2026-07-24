import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { requireUser } from "@/lib/user";
import { getChallenge } from "@/lib/queries";
import { CodeRunner } from "@/components/code-runner";
import { Badge, PageHeader, type Tone } from "@/components/ui";

export const dynamic = "force-dynamic";

const DIFFICULTY_TONE: Record<string, Tone> = {
  easy: "success",
  medium: "warning",
  hard: "danger",
};

export default async function ChallengePage({ params }: { params: Promise<{ challengeId: string }> }) {
  const { challengeId } = await params;
  const user = await requireUser();
  const challenge = await getChallenge(user._id, challengeId);
  if (!challenge) notFound();

  return (
    <div className="page-body">
      <PageHeader
        eyebrow="Practice"
        title={challenge.title}
        back={{ href: "/practice/challenges", label: "Challenges" }}
        meta={
          <>
            <Badge tone={DIFFICULTY_TONE[challenge.difficulty] ?? "neutral"}>
              {challenge.difficulty}
            </Badge>
            {challenge.solved && (
              <Badge tone="success">
                <Check size={11} /> Solved
              </Badge>
            )}
          </>
        }
      />
      <CodeRunner challenge={challenge} />
    </div>
  );
}
