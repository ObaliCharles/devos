"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronsUpDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { LogoTile, Wordmark } from "./brand";
import { isActive, navGroups, type SidebarUser } from "./nav-config";

export type { SidebarUser };

const STORAGE_KEY = "dos-sidebar-collapsed";

export function Sidebar({
  dueCount = 0,
  isAdmin = false,
  user,
}: {
  dueCount?: number;
  isAdmin?: boolean;
  user?: SidebarUser;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  // The collapse choice belongs to the person, not the session.
  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    setReady(true);
  }, []);

  function toggle() {
    setCollapsed((c) => {
      localStorage.setItem(STORAGE_KEY, c ? "0" : "1");
      return !c;
    });
  }

  const groups = navGroups(isAdmin);

  return (
    <aside
      className="hidden shrink-0 flex-col border-r md:flex"
      style={{
        width: collapsed ? "var(--sidebar-w-collapsed)" : "var(--sidebar-w)",
        background: "var(--surface)",
        borderColor: "var(--border)",
        transition: ready ? "width var(--dur-slow) var(--ease)" : "none",
      }}
    >
      {/* ============================================================ Brand */}
      <div
        className={`group/brand flex shrink-0 items-center ${
          collapsed ? "justify-center px-0" : "gap-2.5 px-3"
        }`}
        style={{ height: "var(--topbar-h)" }}
      >
        {collapsed ? (
          // Collapsed, the monogram tile and the expand control share one 28px
          // square: the mark by default, the control on hover or keyboard
          // focus. A permanent second button in a 68px rail is one control too
          // many, and a rail with no way out of it is a trap.
          <span className="relative grid h-[28px] w-[28px] place-items-center">
            <Link
              href="/dashboard"
              aria-label="DeveloperOS home"
              className="grid place-items-center transition-opacity duration-150 group-hover/brand:pointer-events-none group-hover/brand:opacity-0"
            >
              <LogoTile size={28} />
            </Link>
            <button
              onClick={toggle}
              aria-label="Expand sidebar"
              className="absolute inset-0 grid place-items-center rounded-[var(--radius-tile)] opacity-0 transition-opacity duration-150 focus-visible:opacity-100 group-hover/brand:opacity-100"
              style={{ background: "var(--surface-3)", color: "var(--text)" }}
            >
              <PanelLeftOpen size={15} />
            </button>
          </span>
        ) : (
          <>
            <Link href="/dashboard" aria-label="DeveloperOS home" className="min-w-0">
              <Wordmark size="sm" />
            </Link>

            <button
              onClick={toggle}
              className="btn-icon btn-icon-sm ml-auto"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose size={15} />
            </button>
          </>
        )}
      </div>

      {/* ======================================================= Navigation */}
      <nav
        className={`scrollbar-none flex-1 overflow-y-auto pb-3 ${collapsed ? "px-2" : "px-2.5"}`}
        aria-label="Main"
      >
        {groups.map((group, gi) => (
          <div key={group.heading ?? gi}>
            {/* A hairline is the only thing that survives collapse, so the
                grouping still reads as grouping at 68px wide. */}
            {gi > 0 && (
              <hr
                className="my-2.5 border-0"
                style={{ height: 1, background: "var(--border)" }}
              />
            )}

            {group.heading && !collapsed && (
              <p className="overline mb-1 px-2.5 pt-0.5">{group.heading}</p>
            )}

            <ul className="flex flex-col gap-[2px]">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = isActive(pathname, href);
                const badge = href === "/review" && dueCount > 0 ? dueCount : null;

                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      // A CSS tooltip would be clipped by this nav's own scroll
                      // container, so collapsed labels use the native one, 
                      // which also survives keyboard focus.
                      title={collapsed ? label : undefined}
                      className={`relative flex h-[36px] items-center rounded-[var(--radius-control)] text-[13.5px] font-medium ${
                        collapsed ? "justify-center px-0" : "gap-2.5 px-2.5"
                      }`}
                      style={{
                        background: active ? "var(--primary-faint)" : "transparent",
                        color: active ? "var(--primary)" : "var(--text-muted)",
                        transition:
                          "background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease)",
                      }}
                    >
                      {/* The rail marker sits in the gutter. Present on every
                          item so the row never shifts; only opacity changes. */}
                      <span
                        className="absolute top-1/2 h-[18px] w-[3px] -translate-y-1/2 rounded-r-full"
                        style={{
                          left: collapsed ? -8 : -10,
                          background: "var(--primary)",
                          opacity: active ? 1 : 0,
                          transition: "opacity var(--dur-fast) var(--ease)",
                        }}
                        aria-hidden
                      />

                      <Icon size={17} className="shrink-0" strokeWidth={active ? 2.2 : 1.9} />

                      {!collapsed && <span className="flex-1 truncate">{label}</span>}

                      {/* Expanded: a count if there is one, otherwise a dot to
                          confirm where you are. Collapsed: only the count,
                          since the tinted background already says "here". */}
                      {badge !== null ? (
                        collapsed ? (
                          <span
                            className="absolute right-1.5 top-1.5 h-[6px] w-[6px] rounded-full"
                            style={{ background: "var(--warning)" }}
                            aria-hidden
                          />
                        ) : (
                          <span
                            className="count shrink-0"
                            style={{
                              background: "var(--warning-faint)",
                              color: "var(--warning)",
                            }}
                          >
                            {badge}
                          </span>
                        )
                      ) : (
                        active &&
                        !collapsed && (
                          <span
                            className="h-[6px] w-[6px] shrink-0 rounded-full"
                            style={{ background: "var(--primary)" }}
                            aria-hidden
                          />
                        )
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* =========================================================== Footer */}
      {user && (
        <div
          className={`shrink-0 border-t ${collapsed ? "px-2 py-2.5" : "p-2.5"}`}
          style={{ borderColor: "var(--border)" }}
        >
          <Link
            href="/settings"
            title={collapsed ? `${user.name} · ${user.plan}` : undefined}
            className={`row-link flex items-center ${collapsed ? "justify-center py-1" : "gap-2.5 p-1.5"}`}
            aria-label={`${user.name}, ${user.plan}. Open settings`}
          >
            <span className="relative shrink-0">
              <span
                className="grid h-[30px] w-[30px] place-items-center rounded-full text-[12px] font-bold"
                style={{ background: "var(--primary)", color: "var(--primary-ink)" }}
              >
                {user.name.charAt(0).toUpperCase()}
              </span>
              {/* Presence dot, you are, by definition, online right now */}
              <span
                className="absolute -bottom-px -right-px h-[9px] w-[9px] rounded-full"
                style={{ background: "var(--success)", boxShadow: "0 0 0 2px var(--surface)" }}
                aria-hidden
              />
            </span>

            {!collapsed && (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold">{user.name}</span>
                  <span className="block truncate text-[11.5px]" style={{ color: "var(--text-faint)" }}>
                    {user.plan}
                  </span>
                </span>
                <ChevronsUpDown size={14} className="shrink-0" style={{ color: "var(--text-faint)" }} />
              </>
            )}
          </Link>

          {/* Level progress. Real data, and the one number that answers
              "am I getting anywhere" without opening Analytics. */}
          {!collapsed && (
            <Link
              href="/analytics"
              className="row-link mt-1 block px-1.5 py-2"
              aria-label={`Level ${user.level}, ${user.title}. ${user.into} of ${user.need} XP`}
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[11.5px] font-medium" style={{ color: "var(--text-muted)" }}>
                  Level {user.level} · {user.title}
                </span>
                <span className="num shrink-0 text-[10.5px]" style={{ color: "var(--text-faint)" }}>
                  {user.into} / {user.need} XP
                </span>
              </span>
              <span className="progress progress-sm mt-1.5 block">
                <span
                  className="progress-bar block"
                  style={{ width: `${Math.min(100, (user.into / user.need) * 100)}%` }}
                />
              </span>
            </Link>
          )}
        </div>
      )}
    </aside>
  );
}
