"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Section } from "@/lib/lesson-schema";
import { SECTION_LABELS, respondableActivities } from "@/lib/lesson-schema";
import { ActivityRenderer, isLockedActivity } from "./activity-renderer";

/**
 * The structured lesson body — Chapter 5's replacement for a single markdown
 * card, and design brief §7–9's "premium technical reader" applied to it.
 *
 * Three things this component owns that a markdown card could not:
 *
 * 1. **A table of contents that means something.** The old TOC parsed
 *    headings out of prose after the fact; this one is the actual authored
 *    structure — one entry per section, in `SECTION_LABELS`' vocabulary
 *    (Orientation, Concept, Guided Practice, ...), so it reads as a shape of
 *    the lesson rather than a list of whatever happened to be a heading.
 * 2. **A progress indicator with a real denominator.** "3 of 9 sections" and
 *    "4 of 7 exercises answered" come from counting `respondableActivities`,
 *    not from scroll position — scroll tracks how far you have read, not
 *    what you have done, and this product's whole argument is that those are
 *    different things.
 * 3. **Estimated remaining time**, from the objectives' own
 *    `estimatedMinutes`, split proportionally across the sections that carry
 *    a majority of each objective's activities. Approximate on purpose; a
 *    lesson is not a video with a fixed length.
 */
export function LessonReader({
  lessonId,
  sections,
  totalMinutes,
}: {
  /** Needed by exactly one activity — teach_back, the one exception to
   *  "nothing in the reader writes evidence" (DECISIONS 027/035). Threaded
   *  through rather than read from context, so it stays obvious which
   *  activities are graded server-side and which are not. */
  lessonId: string;
  sections: Section[];
  totalMinutes: number;
}) {
  const refs = useRef<Array<HTMLElement | null>>([]);
  const [active, setActive] = useState(0);
  const [done, setDone] = useState<Set<number>>(new Set());

  const respondableCount = useMemo(
    () => sections.map((s) => respondableActivities([s]).length),
    [sections]
  );
  const totalRespondable = respondableCount.reduce((a, b) => a + b, 0);
  const doneRespondable = [...done].reduce((sum, i) => sum + respondableCount[i], 0);

  const hasLocked = sections.some((s) => s.activities.some((a) => isLockedActivity(a.type)));

  // Which section is nearest the top of the viewport, so both the rail and the
  // remaining-time estimate track where the reader actually is. A plain
  // IntersectionObserver rather than scroll math: cheaper, and it does not
  // fight the browser's own scroll-anchoring.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const idx = Number((entry.target as HTMLElement).dataset.sectionIndex);
          if (!Number.isNaN(idx)) setActive(idx);
        }
      },
      { rootMargin: "-15% 0px -70% 0px" }
    );
    for (const el of refs.current) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [sections.length]);

  function markSectionDone(i: number) {
    setDone((prev) => {
      if (prev.has(i)) return prev;
      const next = new Set(prev);
      next.add(i);
      return next;
    });
  }

  const remainingMinutes = totalRespondable > 0
    ? Math.max(1, Math.round(totalMinutes * (1 - doneRespondable / Math.max(1, totalRespondable))))
    : totalMinutes;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_200px]">
      <div className="measure-reading flex min-w-0 flex-col gap-8">
        {hasLocked && (
          <p className="text-micro" style={{ color: "var(--text-faint)" }}>
            A couple of exercises in this lesson need a code sandbox this product does not have
            yet. They are marked below — everything else works normally.
          </p>
        )}
        {sections.map((section, i) => (
          <LessonSection
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            index={i}
            section={section}
            lessonId={lessonId}
            onEngaged={() => markSectionDone(i)}
          />
        ))}
      </div>

      {/* ------------------------------------------------------- side rail */}
      <aside className="hidden flex-col gap-6 lg:sticky lg:top-6 lg:flex lg:self-start">
        <div>
          <p className="group-heading">On this lesson</p>
          <nav className="mt-2.5 flex flex-col gap-0.5" aria-label="Sections">
            {sections.map((section, i) => (
              <a
                key={i}
                href={`#section-${i}`}
                className="row-link block truncate py-1 pl-2 pr-2 text-micro"
                aria-current={active === i ? "true" : undefined}
                style={{
                  color: active === i ? "var(--text)" : done.has(i) ? "var(--text-muted)" : "var(--text-faint)",
                  borderLeft: `2px solid ${active === i ? "var(--primary)" : "transparent"}`,
                }}
              >
                {section.title || SECTION_LABELS[section.kind]}
              </a>
            ))}
          </nav>
        </div>

        {totalRespondable > 0 && (
          <div>
            <p className="group-heading">Progress</p>
            <div className="mt-2.5 flex items-center gap-2">
              <span className="progress h-[6px] flex-1 rounded-full" style={{ background: "var(--surface-2)" }}>
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${Math.round((doneRespondable / totalRespondable) * 100)}%`,
                    background: "var(--primary)",
                    transition: "width var(--dur) var(--ease-out)",
                  }}
                />
              </span>
              <span className="num text-micro shrink-0" style={{ color: "var(--text-faint)" }}>
                {doneRespondable}/{totalRespondable}
              </span>
            </div>
            <p className="text-micro mt-1.5" style={{ color: "var(--text-faint)" }}>
              ~{remainingMinutes} min left
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}

/**
 * One section: a quiet heading (not a card — see the note above `.section` in
 * globals.css) plus its activities in a vertical run. `onEngaged` fires once,
 * the first time any activity inside is interacted with, so the progress rail
 * reflects real engagement rather than scroll-past.
 */
function LessonSection({
  index,
  section,
  lessonId,
  onEngaged,
  ref,
}: {
  index: number;
  section: Section;
  lessonId: string;
  onEngaged: () => void;
  ref: (el: HTMLElement | null) => void;
}) {
  return (
    <section
      id={`section-${index}`}
      ref={ref}
      data-section-index={index}
      className="section scroll-mt-24"
      onClickCapture={onEngaged}
    >
      <div>
        <p className="eyebrow">{SECTION_LABELS[section.kind]}</p>
        {section.title && <h2 className="title-section mt-1.5">{section.title}</h2>}
      </div>
      <div className="flex flex-col gap-5">
        {section.activities.map((activity, i) => (
          <ActivityRenderer key={i} activity={activity} lessonId={lessonId} />
        ))}
      </div>
    </section>
  );
}

/**
 * The measurable-objectives header, replacing a plain bullet list when a
 * lesson carries `learningObjectives`. Each one shows its dimension tags,
 * which is what makes "Explain the difference between GET and POST" visibly
 * different from a decorative list item — it says what kind of evidence
 * finishing it will produce.
 */
export function ObjectivesList({
  objectives,
}: {
  objectives: { statement: string; dimensions: string[]; cognitiveLevel: string }[];
}) {
  return (
    <ul className="flex w-full flex-col gap-2.5">
      {objectives.map((o, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className="mt-[3px] shrink-0" style={{ color: "var(--primary)" }} aria-hidden>→</span>
          <div className="min-w-0">
            <span className="text-ui" style={{ color: "var(--text-muted)" }}>{o.statement}</span>
            {o.dimensions.length > 0 && (
              <span className="ml-2 inline-flex gap-1 align-middle">
                {o.dimensions.map((d) => (
                  <span key={d} className="badge">
                    {d.replace("_", " ")}
                  </span>
                ))}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
