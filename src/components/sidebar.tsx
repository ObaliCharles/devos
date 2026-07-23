"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Calendar,
  ChevronsUpDown,
  Dumbbell,
  FolderKanban,
  LayoutDashboard,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Settings,
  Shield,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavGroup = { heading?: string; items: NavItem[] };

/**
 * Navigation is grouped by intent — what you are trying to do — not by which
 * database table the page reads. Learn / Build / Grow is the mental model the
 * whole product is organised around, so the sidebar states it plainly, and a
 * hairline between groups keeps that structure legible even when collapsed to
 * an icon rail where the headings cannot be shown.
 */
const GROUPS: NavGroup[] = [
  { items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    heading: "Learn",
    items: [
      { href: "/learning", label: "Learning", icon: BookOpen },
      { href: "/review", label: "Review", icon: RotateCcw },
      { href: "/practice", label: "Practice", icon: Dumbbell },
      { href: "/notes", label: "Knowledge", icon: NotebookPen },
    ],
  },
  {
    heading: "Build",
    items: [
      { href: "/projects", label: "Projects", icon: FolderKanban },
      { href: "/ai", label: "AI Centre", icon: Sparkles },
    ],
  },
  {
    heading: "Grow",
    items: [
      { href: "/career", label: "Career", icon: Briefcase },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/calendar", label: "Calendar", icon: Calendar },
    ],
  },
];

export const MOBILE_NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/learning", label: "Learn", icon: BookOpen },
  { href: "/review", label: "Review", icon: RotateCcw },
  { href: "/projects", label: "Build", icon: FolderKanban },
  { href: "/ai", label: "AI", icon: Sparkles },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

const STORAGE_KEY = "dos-sidebar-collapsed";

export type SidebarUser = {
  name: string;
  plan: string;
  level: number;
  title: string;
  into: number;
  need: number;
};

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

  const groups: NavGroup[] = [
    ...GROUPS,
    {
      heading: "System",
      items: [
        { href: "/settings", label: "Settings", icon: Settings },
        ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
      ],
    },
  ];

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
          // Collapsed, the logo tile and the expand control share one 28px
          // square: the mark by default, the control on hover or keyboard
          // focus. A permanent second button in a 68px rail is one control too
          // many, and a rail with no way out of it is a trap.
          <span className="relative grid h-[28px] w-[28px] place-items-center">
            <Link
              href="/dashboard"
              aria-label="DeveloperOS home"
              className="grid h-[28px] w-[28px] place-items-center rounded-[var(--radius-tile)] text-[13px] font-bold transition-opacity duration-150 group-hover/brand:pointer-events-none group-hover/brand:opacity-0"
              style={{
                background: "var(--primary)",
                color: "var(--primary-ink)",
                boxShadow: "var(--sheen)",
              }}
            >
              D
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
            <Link
              href="/dashboard"
              className="flex min-w-0 items-center gap-2.5"
              aria-label="DeveloperOS home"
            >
              <span
                className="grid h-[28px] w-[28px] shrink-0 place-items-center rounded-[var(--radius-tile)] text-[13px] font-bold"
                style={{
                  background: "var(--primary)",
                  color: "var(--primary-ink)",
                  boxShadow: "var(--sheen)",
                }}
              >
                D
              </span>
              <span className="truncate text-[15px] font-bold tracking-[-0.022em]">
                Developer<span style={{ color: "var(--primary)" }}>OS</span>
              </span>
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
                      // container, so collapsed labels use the native one —
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
              {/* Presence dot — you are, by definition, online right now */}
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

/**
 * Phone navigation. Five destinations, thumb-reachable, with a safe-area inset
 * so it clears the home indicator on modern handsets.
 */
export function MobileNav({ dueCount = 0 }: { dueCount?: number }) {
  const pathname = usePathname();

  return (
    <nav
      className="glass fixed inset-x-0 bottom-0 z-40 flex border-t md:hidden"
      style={{
        borderColor: "var(--border)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      aria-label="Main"
    >
      {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className="relative flex flex-1 flex-col items-center gap-1 pb-2 pt-2.5 text-[10px] font-medium"
            style={{
              color: active ? "var(--primary)" : "var(--text-faint)",
              transition: "color var(--dur-fast) var(--ease)",
            }}
          >
            <span
              className="absolute top-0 h-[2px] w-7 rounded-b-full"
              style={{
                background: "var(--primary)",
                opacity: active ? 1 : 0,
                transition: "opacity var(--dur-fast) var(--ease)",
              }}
              aria-hidden
            />
            <span className="relative">
              <Icon size={18} strokeWidth={active ? 2.2 : 1.9} />
              {href === "/review" && dueCount > 0 && (
                <span
                  className="absolute -right-1.5 -top-1 grid h-[15px] min-w-[15px] place-items-center rounded-full px-1 text-[9px] font-bold"
                  style={{ background: "var(--warning)", color: "#211502" }}
                >
                  {dueCount > 9 ? "9+" : dueCount}
                </span>
              )}
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
