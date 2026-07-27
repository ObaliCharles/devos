"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { NAV_GROUPS } from "./nav-config";
import { COURSES } from "@/lib/catalog";

/**
 * The trail back up.
 *
 * Derived entirely from the pathname, so no page has to opt in and no page can
 * forget. That is the whole design goal: a breadcrumb that 40 of 55 routes
 * remember to pass props to is worse than none, because the ones that forget
 * look broken rather than deliberately plain.
 *
 * Resolving a segment to a human label, in order of preference:
 *
 *   1. A real destination in the nav      /learning  -> "Learning"
 *   2. A known course slug                /python-essentials -> "Python Essentials"
 *   3. A structural word we name properly /course/ -> dropped, it is scaffolding
 *   4. A number in a lesson route         /3 -> "Lesson 3"
 *   5. A database id                      dropped — "68a3f1..." helps nobody
 *   6. Anything else, de-slugged          /new -> "New"
 *
 * Rendered as an ordered list with aria-current on the leaf, which is what a
 * screen reader needs to announce it as a position rather than a menu.
 */

/** href -> label, built once from the single nav model. */
const NAV_LABELS: Record<string, string> = Object.fromEntries(
  NAV_GROUPS.flatMap((g) => g.items).map((i) => [i.href, i.label]),
);

const COURSE_TITLES: Record<string, string> = Object.fromEntries(
  COURSES.map((c) => [c.slug, c.title]),
);

/** Segments that are URL scaffolding rather than places you can stand. */
const STRUCTURAL = new Set(["course", "lesson", "skill", "challenges"]);

/** A Mongo ObjectId, or any other opaque handle we should not show a human. */
function isOpaqueId(segment: string) {
  return /^[0-9a-f]{24}$/i.test(segment) || /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(segment);
}

function deslug(segment: string) {
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bAi\b/g, "AI")
    .replace(/\bApi\b/g, "API");
}

type Crumb = { label: string; href: string; last: boolean };

function buildTrail(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [];
  let href = "";

  segments.forEach((segment, i) => {
    href += `/${segment}`;
    const previous = segments[i - 1];

    // Scaffolding and opaque ids still extend the href — they just do not get
    // a crumb of their own, so /learning/course/python-essentials reads
    // "Learning › Python Essentials" rather than "Learning › Course › …".
    if (STRUCTURAL.has(segment) || isOpaqueId(segment)) return;

    let label: string;
    if (NAV_LABELS[href]) label = NAV_LABELS[href];
    else if (COURSE_TITLES[segment]) label = COURSE_TITLES[segment];
    else if (/^\d+$/.test(segment)) label = `Lesson ${segment}`;
    else if (previous === "lesson" || previous === "skill") label = deslug(previous);
    else label = deslug(segment);

    crumbs.push({ label, href, last: false });
  });

  if (crumbs.length) crumbs[crumbs.length - 1].last = true;
  return crumbs;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const trail = buildTrail(pathname);

  // One crumb is the page title repeated, which is noise. The trail only earns
  // its row once you are actually somewhere nested.
  if (trail.length < 2) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-[12.5px]">
        {trail.map((crumb) => (
          <li key={crumb.href} className="flex items-center gap-1">
            {crumb.last ? (
              <span aria-current="page" style={{ color: "var(--text-muted)" }}>
                {crumb.label}
              </span>
            ) : (
              <>
                <Link
                  href={crumb.href}
                  className="rounded-[var(--radius-xs)] px-1 py-0.5 transition-colors"
                  style={{ color: "var(--text-faint)" }}
                >
                  {crumb.label}
                </Link>
                <ChevronRight
                  size={13}
                  style={{ color: "var(--text-faint)", opacity: 0.5 }}
                  aria-hidden
                />
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
