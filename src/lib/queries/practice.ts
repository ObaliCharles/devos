import { connectDB } from "../db";
import { Challenge, ChallengeAttempt, ChallengeProgress } from "../models";

/**
 * Reads for the Practice module. The challenge list folds each user's solved
 * state in, the same way the roadmap folds in lesson progress, one query for
 * challenges, one for the user's progress, joined in memory.
 */

export type ChallengeCard = {
  id: string;
  slug: string;
  title: string;
  category: string;
  difficulty: string;
  technology: string[];
  xp: number;
  estimatedMinutes: number;
  solved: boolean;
  attempts: number;
  bookmarked: boolean;
};

export async function getChallenges(userId: unknown) {
  await connectDB();
  const [challenges, progress] = await Promise.all([
    Challenge.find().sort({ difficulty: 1, createdAt: 1 }).select("-tests -starterCode").lean(),
    ChallengeProgress.find({ user: userId }).lean(),
  ]);

  const byChallenge = new Map(progress.map((p) => [String(p.challenge), p]));

  const cards: ChallengeCard[] = challenges.map((c) => {
    const p = byChallenge.get(String(c._id));
    return {
      id: String(c._id),
      slug: String(c.slug),
      title: String(c.title),
      category: String(c.category ?? "algorithms"),
      difficulty: String(c.difficulty ?? "easy"),
      technology: (c.technology ?? []) as string[],
      xp: Number(c.xp ?? 30),
      estimatedMinutes: Number(c.estimatedMinutes ?? 20),
      solved: Boolean(p?.solved),
      attempts: Number(p?.attempts ?? 0),
      bookmarked: Boolean(p?.bookmarked),
    };
  });

  return cards;
}

export async function getPracticeStats(userId: unknown) {
  await connectDB();
  const [total, solved, attempts] = await Promise.all([
    Challenge.countDocuments(),
    ChallengeProgress.countDocuments({ user: userId, solved: true }),
    ChallengeAttempt.countDocuments({ user: userId }),
  ]);

  // Accuracy over recorded attempts, as a rough signal not a grade.
  const passed = await ChallengeAttempt.countDocuments({ user: userId, passed: true });
  const accuracy = attempts > 0 ? Math.round((passed / attempts) * 100) : 0;

  return { total, solved, attempts, accuracy };
}

type ChallengeDoc = {
  _id: unknown;
  title: string;
  category?: string;
  difficulty?: string;
  prompt?: string;
  language?: string;
  starterCode?: string;
  hints?: string[];
  xp?: number;
  tests?: { call: string; expected: string; hidden?: boolean; label?: string }[];
};

/** The full challenge, plus this user's saved draft and solved state. */
export async function getChallenge(userId: unknown, challengeId: string) {
  await connectDB();
  const challenge = await Challenge.findById(challengeId).lean<ChallengeDoc | null>();
  if (!challenge) return null;

  const progress = await ChallengeProgress.findOne({ user: userId, challenge: challengeId }).lean<{
    solved?: boolean;
    lastCode?: string;
    bookmarked?: boolean;
    attempts?: number;
  } | null>();

  // Hidden test bodies never leave the server; the client only learns how many
  // there are, so it cannot be gamed by reading them.
  const tests = (challenge.tests ?? []) as { call: string; expected: string; hidden?: boolean; label?: string }[];

  return {
    id: String(challenge._id),
    title: String(challenge.title),
    category: String(challenge.category ?? "algorithms"),
    difficulty: String(challenge.difficulty ?? "easy"),
    prompt: String(challenge.prompt ?? ""),
    language: String(challenge.language ?? "javascript"),
    starterCode: String(challenge.starterCode ?? ""),
    hints: (challenge.hints ?? []) as string[],
    xp: Number(challenge.xp ?? 30),
    visibleTests: tests.filter((t) => !t.hidden).map((t) => ({ call: t.call, expected: t.expected, label: t.label })),
    hiddenCount: tests.filter((t) => t.hidden).length,
    solved: Boolean(progress?.solved),
    lastCode: progress?.lastCode,
    bookmarked: Boolean(progress?.bookmarked),
    attempts: Number(progress?.attempts ?? 0),
  };
}

export async function getAttempts(userId: unknown, limit = 20) {
  await connectDB();
  return ChallengeAttempt.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate({ path: "challenge", select: "title slug difficulty" })
    .lean();
}
