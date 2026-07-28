"use client";

import { useEffect, useRef } from "react";
import { Check, Lock } from "lucide-react";
import { TechLogo, TECH_WITH_LOGO } from "./tech-logo";

/**
 * The learning path as a horizontal rail of skill marks.
 *
 * On a phone only four nodes fit, and the four that fit are the ones you have
 * already finished — the step you are actually on sits off the right edge,
 * which is the one thing the rail exists to show. So it scrolls itself to the
 * current node on mount. Instant, not smooth: a rail that animates sideways on
 * every page load reads as a glitch rather than as an affordance.
 */

export type PathStep = {
  id: string;
  title: string;
  tech: string | null;
  state: "done" | "current" | "todo" | "locked";
  pct: number;
};

export function PathRail({ steps }: { steps: PathStep[] }) {
  const rail = useRef<HTMLOListElement | null>(null);
  const current = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    const node = current.current;
    const track = rail.current;
    if (!node || !track) return;
    // Measured, not offsetLeft: the li's offsetParent is whichever ancestor
    // happens to be positioned, which is not this rail. Rects are relative to
    // the viewport for both, so their difference is always the real gap.
    // Adjusting scrollLeft rather than calling scrollIntoView keeps the page
    // itself still — this rail sits well down the document.
    const nodeBox = node.getBoundingClientRect();
    const trackBox = track.getBoundingClientRect();
    track.scrollLeft +=
      nodeBox.left - trackBox.left - (trackBox.width - nodeBox.width) / 2;
  }, [steps]);

  return (
    <ol
      ref={rail}
      className="scrollbar-none -mx-1 mt-4 flex gap-1 overflow-x-auto px-1 pb-1"
    >
      {steps.map((s, i) => (
        <li
          key={s.id}
          ref={s.state === "current" ? current : undefined}
          className="relative flex min-w-[80px] flex-1 shrink-0 flex-col items-center gap-2 text-center"
        >
          {/* Connector, drawn behind the node and filled only as far as you
              have actually reached. */}
          {i > 0 && (
            <span
              className="absolute left-[-50%] right-[50%] top-[21px] h-px"
              style={{
                background:
                  s.state === "done" || s.state === "current"
                    ? "var(--primary)"
                    : "var(--border)",
              }}
              aria-hidden
            />
          )}

          <span
            className="relative z-[1] grid h-[42px] w-[42px] place-items-center rounded-full"
            style={{
              background: "var(--surface)",
              border: `1.5px solid ${
                s.state === "current"
                  ? "var(--primary)"
                  : s.state === "done"
                    ? "var(--primary-muted)"
                    : "var(--border)"
              }`,
              opacity: s.state === "locked" ? 0.55 : 1,
            }}
          >
            {s.state === "locked" ? (
              <Lock size={15} style={{ color: "var(--text-faint)" }} />
            ) : s.tech && TECH_WITH_LOGO.has(s.tech) ? (
              <TechLogo name={s.tech} size={21} mode={s.state === "todo" ? "mono" : "brand"} />
            ) : s.state === "done" ? (
              <Check size={16} style={{ color: "var(--primary)" }} />
            ) : (
              <span className="num text-[12px] font-medium" style={{ color: "var(--text-muted)" }}>
                {i + 1}
              </span>
            )}
          </span>

          <span className="w-full">
            <span className="block truncate text-[12px] font-medium">{s.title}</span>
            <span
              className="block truncate text-[12px]"
              style={{ color: s.state === "current" ? "var(--primary)" : "var(--text-faint)" }}
            >
              {s.state === "done"
                ? "Completed"
                : s.state === "current"
                  ? "In progress"
                  : s.state === "locked"
                    ? "Locked"
                    : "Upcoming"}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
