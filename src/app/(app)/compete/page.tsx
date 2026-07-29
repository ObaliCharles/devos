import { requireUser } from "@/lib/user";
import { getLeaderboard, getMyMatches, getOpenMatches, getStanding } from "@/lib/queries";
import { settleExpiredMatches } from "@/lib/actions";
import { PageHeader } from "@/components/ui";
import { Arena } from "@/components/compete/arena";

export const dynamic = "force-dynamic";

/**
 * Loading the arena settles anything past its window first. A cron would be
 * tidier, but a duel that stays "active" forever because nobody triggered the
 * scorer is worse than one extra query on a page you only open to compete.
 */
export default async function CompetePage() {
  const user = await requireUser();
  await settleExpiredMatches().catch(() => null);

  const [standing, mine, open, leaders] = await Promise.all([
    getStanding(user._id),
    getMyMatches(user._id).catch(() => ({ active: [], history: [] })),
    getOpenMatches(user._id).catch(() => []),
    getLeaderboard(user._id).catch(() => []),
  ]);

  return (
    <div className="page-body">
      <PageHeader
        eyebrow="Compete"
        title="Arena"
        description="Ranked duels over real challenges. Same problem, same clock, first to pass takes the rating."
      />
      <Arena
        standing={standing}
        active={mine.active}
        history={mine.history}
        open={open}
        leaders={leaders}
      />
    </div>
  );
}
