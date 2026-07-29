import { redirect } from "next/navigation";

/**
 * Challenges moved under Learning, where they belong next to lessons and
 * projects. This stub keeps every bookmark and inbound link working rather
 * than 404-ing people who saved the old address.
 */
export default async function MovedChallengesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  redirect(filter ? `/learning/challenges?filter=${filter}` : "/learning/challenges");
}
