import { requireUser } from "@/lib/user";
import { getDueFlashcards, getFlashcardStats } from "@/lib/queries";
import { FlashcardDeck, type FlashcardItem } from "@/components/flashcard-deck";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function FlashcardsPage() {
  const user = await requireUser();
  const [due, stats] = await Promise.all([
    getDueFlashcards(user._id),
    getFlashcardStats(user._id),
  ]);

  const cards: FlashcardItem[] = due.map((c) => ({
    id: String(c._id),
    front: String(c.front),
    back: String(c.back),
    tags: (c.tags ?? []) as string[],
  }));

  return (
    <div className="page-body">
      <PageHeader
        back={{ href: "/notes", label: "Knowledge" }}
        eyebrow="Second brain"
        title="Flashcards"
        description="Short recall, scheduled. Cards you get right come back later; cards you miss come back sooner."
      />
      <FlashcardDeck due={cards} total={stats.total} dueCount={stats.due} />
    </div>
  );
}
