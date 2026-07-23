import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { connectDB } from "./db";
import { dayKey, dayKeyOffset } from "./day";
import { StudySession, User } from "./models";

export const today = () => dayKey();
const yesterday = () => dayKeyOffset(-1);

/**
 * Resolve the Clerk session to a local user document, creating it on first
 * sight. Every server component and route handler goes through this.
 *
 * The create is an atomic upsert rather than find-then-insert, and that is not
 * a micro-optimisation. On a first sign-in the layout and every server
 * component on the page resolve in parallel; with find-then-insert they all
 * miss, all insert, and every one but the winner gets a duplicate-key error on
 * the unique clerkId index — so the very first page load after signing up
 * crashes. `findOneAndUpdate` with upsert lets the database settle the race.
 */
export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;

  await connectDB();

  const existing = await User.findOne({ clerkId: userId });
  if (existing) return existing;

  const clerk = await currentUser();
  // Bootstrap: the very first account to sign up owns the instance, so it is
  // the admin. Everyone after is a normal user until an admin promotes them.
  const isFirst = (await User.estimatedDocumentCount()) === 0;

  return User.findOneAndUpdate(
    { clerkId: userId },
    {
      // Only ever applied when this call is the one that inserts, so a
      // concurrent loser reads the winner's document instead of clobbering it.
      $setOnInsert: {
        clerkId: userId,
        name: clerk?.firstName ?? clerk?.username ?? "Developer",
        email: clerk?.emailAddresses?.[0]?.emailAddress,
        role: isFirst ? "admin" : "user",
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

/**
 * For any page that cannot render signed out. Redirects rather than throwing:
 * an expired session is an ordinary thing that should land you on the sign-in
 * screen, not an exception that renders the error boundary.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

/** For everything under /admin. Sends a non-admin back to their dashboard. */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}

/** The counters on StudySession. Every module that produces work adds one. */
type ActivityDelta = Partial<{
  minutes: number;
  focusMinutes: number;
  lessonsCompleted: number;
  notesWritten: number;
  reviewsDone: number;
  challengesSolved: number;
  tasksCompleted: number;
}>;

/**
 * Record activity for today and roll the streak forward.
 *
 * The streak only advances the first time a user does something on a given
 * day, which is why lastActiveDay is compared before it is written.
 */
export async function recordActivity(userId: unknown, delta: ActivityDelta) {
  const day = today();

  await StudySession.updateOne(
    { user: userId, day },
    { $inc: { ...delta } },
    { upsert: true }
  );

  const user = await User.findById(userId);
  if (!user) return;

  if (user.lastActiveDay !== day) {
    user.currentStreak = user.lastActiveDay === yesterday() ? user.currentStreak + 1 : 1;
    user.longestStreak = Math.max(user.longestStreak ?? 0, user.currentStreak);
    user.lastActiveDay = day;
    await user.save();
  }
}

export async function addXp(userId: unknown, amount: number) {
  await User.updateOne({ _id: userId }, { $inc: { xp: amount } });
}

/** Level curve: each level costs 200 XP more than the last. */
export function levelFromXp(xp: number) {
  let level = 1;
  let need = 200;
  let spent = 0;
  while (xp - spent >= need) {
    spent += need;
    level += 1;
    need += 200;
  }
  return { level, into: xp - spent, need, title: levelTitle(level) };
}

function levelTitle(level: number) {
  if (level >= 50) return "Architect";
  if (level >= 20) return "Engineer";
  if (level >= 10) return "Developer";
  if (level >= 5) return "Builder";
  return "Explorer";
}
