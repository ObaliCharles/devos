import { requireUser } from "@/lib/user";
import { getChallengePage } from "@/lib/queries";
import { parseLibraryParams, toChallengeQuery, type RawParams } from "@/lib/library-params";
import { PageHeader } from "@/components/ui";
import { ChallengeLibrary } from "@/components/practice/challenge-library";

export const dynamic = "force-dynamic";

export default async function ChallengesPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  const params = parseLibraryParams(await searchParams);
  const user = await requireUser();
  const data = await getChallengePage(user._id, toChallengeQuery(params));

  return (
    <div className="page-body">
      <PageHeader
        back={{ href: "/learning", label: "Learning" }}
        eyebrow="Learning"
        title="Challenges"
        description="Short problems graded against real tests. Run them in the browser, submit when the hidden cases pass."
      />
      <ChallengeLibrary
        data={data}
        params={params}
        basePath="/learning/challenges"
        streak={user.currentStreak ?? 0}
      />
    </div>
  );
}
