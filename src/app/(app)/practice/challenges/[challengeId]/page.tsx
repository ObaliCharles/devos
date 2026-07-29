import { redirect } from "next/navigation";

/** See the note on ../page.tsx — the workspace now lives under Learning. */
export default async function MovedChallengePage({
  params,
}: {
  params: Promise<{ challengeId: string }>;
}) {
  const { challengeId } = await params;
  redirect(`/learning/challenges/${challengeId}`);
}
