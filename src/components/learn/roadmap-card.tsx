"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Check, Loader2, Sparkles } from "lucide-react";
import { activateRoadmap } from "@/lib/actions";
import { ContentIcon } from "./icon";
import type { RoadmapMeta } from "@/lib/learn-content";

/**
 * A real roadmap, as a card. "Start Learning" activates the path with the same
 * server action the path-switcher uses, then lands on /learning where the full
 * phase → skill → lesson tree is waiting, so the card leads somewhere real
 * rather than to a static preview. If the path is already active, the button
 * just opens it.
 */

type RoadmapSummary = {
  id: string;
  title: string;
  summary?: string;
  origin: string;
  active: boolean;
  lessons: number;
};

export function RoadmapCard({
  roadmap: r,
  meta,
}: {
  roadmap: RoadmapSummary;
  meta: RoadmapMeta;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function follow() {
    if (r.active) {
      router.push("/learning/roadmap");
      return;
    }
    start(async () => {
      await activateRoadmap(r.id);
      router.refresh();
      router.push("/learning/roadmap");
    });
  }

  return (
    <div className="card group flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <span className={`icon-tile icon-tile-lg icon-tile-${meta.accent}`}>
          <ContentIcon name={meta.icon} size={20} />
        </span>
        <div className="flex flex-col items-end gap-1.5">
          <span className="badge">{meta.difficulty}</span>
          {r.origin === "ai" && (
            <span className="badge badge-primary">
              <Sparkles size={10} /> AI
            </span>
          )}
        </div>
      </div>

      <h3 className="title-card mt-4">{r.title}</h3>
      <p className="text-body mt-1 line-clamp-2 flex-1 text-[13px]">
        {r.summary || "A structured path with lessons, projects and milestones."}
      </p>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px]" style={{ color: "var(--text-muted)" }}>
        <li className="flex items-center gap-1.5">
          <BookOpen size={13} style={{ color: "var(--text-faint)" }} /> {r.lessons} Lessons
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full" style={{ background: "var(--text-faint)" }} />
          {meta.duration}
        </li>
      </ul>

      <button
        onClick={follow}
        disabled={pending}
        className="mt-4 flex items-center justify-center gap-1.5 rounded-[var(--radius-control)] py-2 text-[13px] font-medium transition-colors disabled:opacity-60"
        style={{
          background: r.active ? "var(--surface-2)" : "var(--primary-faint)",
          color: r.active ? "var(--text)" : "var(--primary)",
        }}
      >
        {pending ? (
          <>
            <Loader2 size={14} className="animate-spin" /> Activating…
          </>
        ) : r.active ? (
          <>
            <Check size={14} /> Following · Open
          </>
        ) : (
          <>
            Start Learning
            <ArrowRight
              size={14}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </>
        )}
      </button>
    </div>
  );
}
