"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Sub-navigation for modules whose pages share a header (Career, Analytics,
 * Admin, a project). Underline tabs rather than a segmented control: a
 * segmented control implies "filter this view", an underline implies
 * "different page" — and these are different pages.
 *
 * The active tab is derived from the path, so it works with plain
 * server-rendered navigation and survives a hard refresh.
 */
export function ModuleTabs({
  base,
  items,
}: {
  base: string;
  items: { segment: string; label: string; badge?: number }[];
}) {
  const pathname = usePathname();
  const current = pathname.startsWith(base)
    ? pathname.slice(base.length).replace(/^\//, "").split("/")[0]
    : "";

  return (
    <nav className="underlines" aria-label="Section">
      {items.map((item) => {
        const active = current === item.segment;
        return (
          <Link
            key={item.segment}
            href={item.segment ? `${base}/${item.segment}` : base}
            aria-current={active ? "page" : undefined}
            className={`underline-tab ${active ? "underline-tab-active" : ""}`}
          >
            {item.label}
            {item.badge ? (
              <span
                className="count"
                style={{ background: "var(--neutral-faint)", color: "var(--text-faint)" }}
              >
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
