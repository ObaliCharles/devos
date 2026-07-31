"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, Code2, Loader2 } from "lucide-react";
import { completeCatalogLesson } from "@/lib/actions";

/**
 * Finishing a lesson, and the handoff that follows it.
 *
 * The handoff is the point. A lesson that ends in a completion tick is a page
 * you finished; a lesson that ends by naming the next step is a loop you are
 * inside. So once the write lands this block stops congratulating and starts
 * pointing: at the practice tasks sitting further down this same page, and at
 * the next lesson by name rather than as "continue".
 *
 * There is no reward flourish here on purpose. The lesson counting for
 * something is the progress rail moving and the next step appearing — a
 * "+50 XP" flash on top of that is a second, weaker claim about the same
 * event, and it is the claim that is about points rather than about capability.
 *
 * The write is idempotent on the server, so pressing again only navigates.
 */
export function CompleteLesson({
  course,
  lessonIndex,
  nextHref,
  nextTitle,
  practiceCount,
  alreadyDone,
}: {
  course: string;
  lessonIndex: number;
  /** Where "continue" goes; the course overview on the last lesson. */
  nextHref: string;
  /** The next lesson's own title, or null on the last one. */
  nextTitle: string | null;
  /** Hands-on tasks attached to this lesson, for the practice handoff. */
  practiceCount: number;
  alreadyDone: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState(alreadyDone);

  function complete(thenNavigate: boolean) {
    start(async () => {
      const res = await completeCatalogLesson(course, lessonIndex);
      if (res.ok) {
        setDone(true);
        router.refresh();
      }
      if (thenNavigate) router.push(nextHref);
    });
  }

  if (done) {
    return (
      <section className="card p-5" style={{ background: "var(--surface-2)" }}>
        <p
          className="inline-flex items-center gap-1.5 text-[14px] font-medium"
          style={{ color: "var(--success)" }}
        >
          <Check size={15} /> Lesson complete
        </p>

        <h2 className="title-card mt-3">What comes next</h2>

        <div className="mt-4 flex flex-col gap-2">
          {/* Practice first. Reading it is not knowing it, and the tasks that
              prove the difference are already on this page. */}
          {practiceCount > 0 && (
            <a href="#practice" className="card card-link flex items-center gap-3 p-3.5">
              <span className="icon-tile">
                <Code2 size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium">Put it into code</span>
                <span className="text-meta block text-[12px]">
                  {practiceCount} practice {practiceCount === 1 ? "task" : "tasks"} on this page
                </span>
              </span>
              <ArrowRight size={15} style={{ color: "var(--text-faint)" }} className="shrink-0" />
            </a>
          )}

          <Link href={nextHref} className="card card-link flex items-center gap-3 p-3.5">
            <span className="icon-tile">
              <ArrowRight size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium">
                {nextTitle ?? "Back to the course overview"}
              </span>
              <span className="text-meta block text-[12px]">
                {nextTitle ? "Next lesson" : "You have reached the end of this course"}
              </span>
            </span>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      className="card flex flex-wrap items-center justify-between gap-4 p-5"
      style={{ background: "var(--surface-2)" }}
    >
      <div>
        <p className="title-card">Done with this lesson?</p>
        <p className="text-body mt-0.5 text-[14px]">
          Marking it complete records your progress through the course and unlocks what comes next.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => complete(false)}
          disabled={pending}
          data-busy={pending || undefined}
          className="btn btn-secondary"
        >
          {pending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          Mark complete
        </button>

        <button
          onClick={() => complete(true)}
          disabled={pending}
          data-busy={pending || undefined}
          className="btn btn-primary"
        >
          {pending ? <Loader2 size={15} className="animate-spin" /> : null}
          Complete &amp; continue <ArrowRight size={15} />
        </button>
      </div>
    </section>
  );
}
