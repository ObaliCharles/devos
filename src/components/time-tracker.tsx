"use client";

import { useEffect, useRef } from "react";
import { trackLessonTime } from "@/lib/actions";

/**
 * Invisible. Beats every 30 seconds while the lesson tab is focused, accruing
 * real time on the lesson instead of the flat 30 minutes masterLesson used to
 * assume (BACKLOG Tier 0). Pauses when the tab is hidden, so time spent on
 * other tabs is not counted.
 */
export function TimeTracker({ lessonId }: { lessonId: string }) {
  const lastBeat = useRef(Date.now());

  useEffect(() => {
    let active = !document.hidden;

    const beat = () => {
      if (!active) return;
      const seconds = Math.min(35, (Date.now() - lastBeat.current) / 1000);
      lastBeat.current = Date.now();
      if (seconds > 5) trackLessonTime(lessonId, seconds);
    };

    const interval = setInterval(beat, 30_000);
    const onVisibility = () => {
      active = !document.hidden;
      lastBeat.current = Date.now(); // reset on focus so hidden time is not banked
    };
    document.addEventListener("visibilitychange", onVisibility);

    // A final beat on unmount captures the tail of the session.
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      beat();
    };
  }, [lessonId]);

  return null;
}
