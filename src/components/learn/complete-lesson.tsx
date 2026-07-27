"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2, Zap } from "lucide-react";
import { completeCatalogLesson } from "@/lib/actions";

/**
 * Marks a catalog lesson complete, then moves on. The write is idempotent on
 * the server (XP and streak are credited once), so this button is safe to press
 * again — it just navigates. It shows a brief "+XP" confirmation, then goes to
 * the next lesson (or back to the course overview on the last one), so finishing
 * a lesson always feels like it counted.
 */
export function CompleteLesson({
  course,
  lessonIndex,
  nextHref,
  alreadyDone,
}: {
  course: string;
  lessonIndex: number;
  /** Where "continue" goes; omit on the last lesson to return to the overview. */
  nextHref: string;
  alreadyDone: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState(alreadyDone);
  const [awarded, setAwarded] = useState<number | null>(null);

  function complete(thenNavigate: boolean) {
    start(async () => {
      const res = await completeCatalogLesson(course, lessonIndex);
      if (res.ok) {
        setDone(true);
        if (res.xp > 0) setAwarded(res.xp);
        router.refresh();
      }
      if (thenNavigate) router.push(nextHref);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {done ? (
        <span
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] px-3 py-2 text-[14px] font-medium"
          style={{ background: "var(--success-faint)", color: "var(--success)" }}
        >
          <Check size={15} /> Completed
        </span>
      ) : (
        <button
          onClick={() => complete(false)}
          disabled={pending}
          className="btn btn-secondary"
        >
          {pending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          Mark complete
        </button>
      )}

      <button onClick={() => complete(true)} disabled={pending} className="btn btn-primary">
        {pending ? <Loader2 size={15} className="animate-spin" /> : null}
        Complete &amp; continue <ArrowRight size={15} />
      </button>

      {awarded !== null && (
        <span
          className="inline-flex items-center gap-1 text-[14px] font-semibold"
          style={{ color: "var(--primary)" }}
        >
          <Zap size={14} /> +{awarded} XP
        </span>
      )}
    </div>
  );
}
