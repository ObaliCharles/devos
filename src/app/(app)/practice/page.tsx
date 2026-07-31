import { requireUser } from "@/lib/user";
import {
  getChallengePage,
  getCollections,
  getContinuePractice,
  getDailyChallenge,
  getPracticeActivity,
  getRecentAttempts,
  getWeekProgress,
} from "@/lib/queries";
import { parseLibraryParams, toChallengeQuery, type RawParams } from "@/lib/library-params";
import { PageHeader } from "@/components/ui";
import { PracticeHome } from "@/components/practice/practice-home";
import { ChallengeLibrary } from "@/components/practice/challenge-library";

export const dynamic = "force-dynamic";

/**
 * The practice centre.
 *
 * Two halves. The top answers "what should I solve next" — today's pick, the
 * one you abandoned, the week, your topics. The bottom is the full library, the
 * same component `/learning/challenges` renders: one implementation, two doors.
 *
 * The summary tiles that used to sit here are gone. Solved / attempts /
 * accuracy / remaining is a statistics panel, and putting one above the
 * challenges said the numbers mattered more than the practice. What survived —
 * the week strip, the heatmap — is there because it points at an action.
 */
export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  const params = parseLibraryParams(await searchParams);
  const user = await requireUser();
  const prefs = (user.preferences ?? {}) as Record<string, unknown>;
  const weeklyGoal = Number(prefs.weeklyChallengeGoal ?? 5);

  const [data, daily, continueWith, week, collections, attempts, activity] = await Promise.all([
    getChallengePage(user._id, toChallengeQuery(params)),
    getDailyChallenge(user._id).catch(() => ({
      completed: false,
      challenge: null,
      reason: null as string | null,
    })),
    getContinuePractice(user._id).catch(() => null),
    getWeekProgress(user._id, weeklyGoal).catch(() => ({ solved: 0, goal: weeklyGoal, days: [] })),
    getCollections(user._id).catch(() => []),
    getRecentAttempts(user._id).catch(() => []),
    getPracticeActivity(user._id).catch(() => []),
  ]);

  return (
    <div className="page-body">
      <PageHeader
        eyebrow="Practice"
        title="Practice"
        description="Sharpen your skills by solving real coding challenges. Every one runs your code against real tests."
      />

      <PracticeHome
        daily={daily.challenge}
        dailyDone={daily.completed}
        dailyReason={daily.reason}
        continueWith={continueWith}
        week={week}
        collections={collections}
        attempts={attempts}
        activity={activity}
        streak={user.currentStreak ?? 0}
      />

      <ChallengeLibrary
        data={data}
        params={params}
        basePath="/practice"
        streak={user.currentStreak ?? 0}
      />
    </div>
  );
}
