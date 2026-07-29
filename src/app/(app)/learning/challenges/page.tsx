import { requireUser } from "@/lib/user";
import { getChallenges } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { ChallengeLibrary } from "@/components/practice/challenge-library";

export const dynamic = "force-dynamic";

export default async function ChallengesPage() {
  const user = await requireUser();
  const challenges = await getChallenges(user._id);

  return (
    <div className="page-body">
      <PageHeader
        back={{ href: "/learning", label: "Learning" }}
        eyebrow="Learning"
        title="Challenges"
        description="Sharpen your skills by solving real coding challenges."
      />
      <ChallengeLibrary challenges={challenges} streak={user.currentStreak ?? 0} />
    </div>
  );
}
