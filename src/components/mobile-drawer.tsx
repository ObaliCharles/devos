"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { isActive, navGroups, type SidebarUser } from "./nav-config";
import { LogoTile, Wordmark } from "./brand";

/**
 * Mobile navigation. On phones the desktop sidebar is hidden, so this is how
 * every destination is reached, not just the five that would fit a bottom bar.
 * A hamburger in the top bar opens a slide-in drawer holding the full grouped
 * navigation and the account footer.
 *
 * The trigger and the drawer live in one component so the open state has one
 * owner. The drawer closes on route change, on Escape, and on backdrop tap, and
 * it locks body scroll while open.
 */
export function MobileDrawer({
  dueCount = 0,
  isAdmin = false,
  user,
}: {
  dueCount?: number;
  isAdmin?: boolean;
  user?: SidebarUser;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close on navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock scroll and wire Escape while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const groups = navGroups(isAdmin);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-icon md:hidden"
        aria-label="Open menu"
        aria-expanded={open}
      >
        <Menu size={18} />
      </button>

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        className="fixed inset-0 z-50 md:hidden"
        style={{
          background: "rgb(0 0 0 / 0.5)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity var(--dur) var(--ease)",
        }}
        aria-hidden
      />

      {/* Panel */}
      <aside
        className="fixed inset-y-0 left-0 z-50 flex w-[82%] max-w-[300px] flex-col md:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        style={{
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform var(--dur-slow) var(--ease)",
          boxShadow: open ? "var(--shadow-xl)" : "none",
        }}
      >
        <div
          className="flex shrink-0 items-center justify-between px-4"
          style={{ height: "var(--topbar-h)" }}
        >
          <Link href="/dashboard" aria-label="DeveloperOS home" onClick={() => setOpen(false)}>
            <Wordmark size="sm" />
          </Link>
          <button onClick={() => setOpen(false)} className="btn-icon" aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Main">
          {groups.map((group, gi) => (
            <div key={group.heading ?? gi}>
              {gi > 0 && (
                <hr className="my-2.5 border-0" style={{ height: 1, background: "var(--border)" }} />
              )}
              {group.heading && <p className="overline mb-1 px-2.5 pt-0.5">{group.heading}</p>}

              <ul className="flex flex-col gap-[2px]">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active = isActive(pathname, href);
                  const badge = href === "/review" && dueCount > 0 ? dueCount : null;
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        aria-current={active ? "page" : undefined}
                        className="flex h-[42px] items-center gap-3 rounded-[var(--radius-control)] px-2.5 text-[14px] font-medium"
                        style={{
                          background: active ? "var(--primary-faint)" : "transparent",
                          color: active ? "var(--primary)" : "var(--text-muted)",
                        }}
                      >
                        <Icon size={18} strokeWidth={active ? 2.2 : 1.9} />
                        <span className="flex-1">{label}</span>
                        {badge !== null && (
                          <span
                            className="count"
                            style={{ background: "var(--warning-faint)", color: "var(--warning)" }}
                          >
                            {badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {user && (
          <div className="shrink-0 border-t p-3" style={{ borderColor: "var(--border)" }}>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="row-link flex items-center gap-3 p-2"
            >
              <span className="relative shrink-0">
                <LogoTile size={34} radius="var(--radius-pill)" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold">{user.name}</span>
                <span className="block truncate text-[12px]" style={{ color: "var(--text-faint)" }}>
                  Level {user.level} · {user.title}
                </span>
              </span>
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
