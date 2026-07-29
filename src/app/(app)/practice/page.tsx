import { Check, Dumbbell, Target, Zap } from "lucide-react";
import { requireUser } from "@/lib/user";
import { getChallengePage, getPracticeStats } from "@/lib/queries";
import { parseLibraryParams, toChallengeQuery, type RawParams } from "@/lib/library-params";
import { PageHeader, StatTile } from "@/components/ui";
import { ChallengeLibrary } from "@/components/practice/challenge-library";

export const dynamic = "force-dynamic";

/**
 * The practice centre.
 *
 * Same library as `/learning/challenges`, one component, two doors: Learning
 * reaches it as part of a path, Practice reaches it as a place to grind. The
 * difference is what sits around it — here the four summary tiles and the
 * progress ring, because this is the page you open to answer "how am I doing".
 */
export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  const params = parseLibraryParams(await searchParams);
  const user = await requireUser();
  const [data, stats] = await Promise.all([
    getChallengePage(user._id, toChallengeQuery(params)),
    getPracticeStats(user._id),
  ]);

  return (
    <div className="page-body">
      <PageHeader
        eyebrow="Practice"
        title="Practice"
        description="Sharpen your skills by solving real coding challenges. Every one runs your code against real tests."
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Practice summary">
        <StatTile
          label="Solved"
          value={stats.solved}
          sub={`of ${stats.total} challenges`}
          icon={<Check size={17} />}
        />
        <StatTile label="Attempts" value={stats.attempts} sub="all time" icon={<Target size={17} />} />
        <StatTile
          label="Accuracy"
          value={`${stats.accuracy}%`}
          sub="passed / attempted"
          icon={<Zap size={17} />}
          trend={stats.accuracy >= 60 ? "up" : stats.accuracy > 0 ? "flat" : undefined}
        />
        <StatTile
          label="Remaining"
          value={stats.total - stats.solved}
          sub={stats.total === stats.solved ? "all done" : "to solve"}
          icon={<Dumbbell size={17} />}
        />
      </section>

      <ChallengeLibrary
        data={data}
        params={params}
        basePath="/practice"
        streak={user.currentStreak ?? 0}
        progress={{ solved: stats.solved, total: stats.total, accuracy: stats.accuracy }}
      />
    </div>
  );
}
