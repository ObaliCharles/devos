import { requireUser } from "@/lib/user";
import { getDueReviews } from "@/lib/queries";
import { ReviewSession, type ReviewCard } from "@/components/review-session";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const user = await requireUser();
  const due = await getDueReviews(user._id);

  const cards: ReviewCard[] = due
    .filter((r) => r.lesson)
    .map((r) => {
      const lesson = r.lesson as unknown as { _id: unknown; title: string; objectives?: string[] };
      return {
        id: String(r._id),
        lessonId: String(lesson._id),
        lessonTitle: lesson.title,
        objectives: lesson.objectives ?? ["Re-read the lesson to refresh the details."],
        step: r.step ?? 0,
      };
    });

  return (
    <div className="page-body">
      <PageHeader
        eyebrow="Spaced repetition"
        title="Review"
        description={
          cards.length
            ? `${cards.length} ${cards.length === 1 ? "lesson is" : "lessons are"} due. Answer from memory before you reveal.`
            : "Nothing is due right now."
        }
      />
      <ReviewSession cards={cards} />
    </div>
  );
}
