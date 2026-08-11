"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, primaryNav } from "./nav-config";

/**
 * The mobile navigation bar.
 *
 * Below `md` the sidebar is hidden and, until now, the only way to reach
 * anything was a hamburger opening a drawer that listed all sixteen
 * destinations — the one pattern the design brief names outright. A drawer is a
 * good place to *find* a rarely-used feature and a bad place to put the five
 * screens someone opens every day, because it turns every one of them into two
 * taps and a decision.
 *
 * So: five primary destinations here, permanently visible, and the drawer keeps
 * everything else. Nothing was taken away; the daily path just stopped being
 * hidden behind a menu.
 *
 * Rendered by the app shell, so no route can forget it.
 */
export function BottomNav({ dueCount = 0 }: { dueCount?: number }) {
  const pathname = usePathname();
  const items = primaryNav();

  return (
    <nav
      className="bottom-nav md:hidden"
      aria-label="Primary"
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        // The one count in the bar. "4 due" is information, not an alarm, so it
        // is a dot rather than a red badge with a number — at this size a
        // number is unreadable anyway, and the row itself is the affordance.
        const showDot = href === "/review" && dueCount > 0;

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className="bottom-nav-item"
            data-active={active || undefined}
          >
            <span className="relative">
              <Icon size={20} />
              {showDot && (
                <span
                  className="absolute -right-1 -top-0.5 h-[6px] w-[6px] rounded-full"
                  style={{ background: "var(--primary)" }}
                  aria-hidden
                />
              )}
            </span>
            <span className="bottom-nav-label">{label}</span>
            {showDot && <span className="sr-only">{dueCount} reviews due</span>}
          </Link>
        );
      })}
    </nav>
  );
}
