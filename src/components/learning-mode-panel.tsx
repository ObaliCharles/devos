"use client";

import { useState } from "react";
import { ChevronDown, Layers, Sparkles } from "lucide-react";
import { RoadmapModes, type RoadmapSummary } from "./roadmap-modes";

/**
 * A disclosure around the path switcher. Collapsed by default so that once a
 * user is following a path, the phase list is the focus and the "switch or
 * generate" controls stay one click away rather than pushing the lessons down
 * the page every visit.
 */
export function LearningModePanel({
  roadmaps,
  configured,
}: {
  roadmaps: RoadmapSummary[];
  configured: boolean;
}) {
  const [open, setOpen] = useState(false);
  const other = roadmaps.filter((r) => !r.active).length;

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-[var(--radius-card)] border p-3 text-left"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <span className="icon-tile icon-tile-primary">
          <Layers size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-medium">Switch path or generate a new one</span>
          <span className="text-meta block">
            {roadmaps.length} {roadmaps.length === 1 ? "path" : "paths"} available
            {other > 0 ? ` · ${other} other` : ""}
          </span>
        </span>
        <span className="badge badge-primary shrink-0">
          <Sparkles size={10} /> AI
        </span>
        <ChevronDown
          size={16}
          className="shrink-0 transition-transform duration-200"
          style={{ color: "var(--text-faint)", transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>

      {open && (
        <div className="mt-3">
          <RoadmapModes roadmaps={roadmaps} configured={configured} />
        </div>
      )}
    </div>
  );
}
