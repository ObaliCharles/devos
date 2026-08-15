"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen, Search, Settings, UserCircle } from "lucide-react";
import { LogoTile, Wordmark } from "./brand";
import {
  PRODUCT_AREAS,
  activeProductArea,
  isActive,
  type DetailItem,
  type SidebarUser,
} from "./nav-config";
import { isExternal } from "@/lib/community-links";

export type { SidebarUser };

const STORAGE_KEY = "dos-sidebar-collapsed";
const softSpring = "var(--ease-smooth)";

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
  const [query, setQuery] = useState("");

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

  const activeArea = activeProductArea(pathname);
  const visibleSections = filterSections(activeArea.sections, query);

  useEffect(() => {
    setQuery("");
  }, [activeArea.href]);

  return (
    <aside
      className="hidden shrink-0 border-r md:flex"
      style={{
        width: collapsed ? "var(--sidebar-w-collapsed)" : "calc(var(--sidebar-w-collapsed) + var(--sidebar-w))",
        background: "var(--bg-elevated)",
        borderColor: "var(--border)",
        boxShadow: "inset -1px 0 0 var(--border-faint)",
        transition: ready ? `width 520ms ${softSpring}` : "none",
      }}
    >
      {/* ======================================================= Icon rail */}
      <div
        className="flex shrink-0 flex-col border-r"
        style={{
          width: "var(--sidebar-w-collapsed)",
          borderColor: "var(--border-faint)",
          background: "var(--bg)",
        }}
      >
        <div
          className="group/brand flex shrink-0 items-center justify-center"
          style={{ height: "var(--topbar-h)" }}
        >
          <span className="relative grid h-[30px] w-[30px] place-items-center">
            <Link
              href="/dashboard"
              aria-label="DeveloperOS home"
              className="grid place-items-center transition-opacity duration-150 group-hover/brand:pointer-events-none group-hover/brand:opacity-0"
            >
              <LogoTile size={30} />
            </Link>
            <button
              onClick={toggle}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="absolute inset-0 grid place-items-center rounded-[var(--radius-tile)] opacity-0 transition-opacity duration-150 focus-visible:opacity-100 group-hover/brand:opacity-100"
              style={{
                background: "var(--surface-hover)",
                color: "var(--text)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
            </button>
          </span>
        </div>

        <nav className="scrollbar-none flex-1 overflow-y-auto px-2 pb-3" aria-label="Product areas">
          <ul className="flex flex-col gap-1">
            {PRODUCT_AREAS.map(({ href, label, icon: Icon }) => {
              const active = activeArea.href === href;
              return (
                <li key={href}>
                  <NavLink
                    href={href}
                    aria-current={active ? "page" : undefined}
                    title={label}
                    className={`nav-row justify-center px-0 transition-all duration-500 ${active ? "nav-row-on icon-strong" : ""}`}
                    style={{ transitionTimingFunction: softSpring }}
                  >
                    <span
                      className="absolute left-[-8px] top-1/2 h-[18px] w-[2px] -translate-y-1/2 rounded-r-full"
                      style={{
                        background: "var(--primary)",
                        opacity: active ? 1 : 0,
                        transition: "opacity var(--dur-fast) var(--ease-out)",
                      }}
                      aria-hidden
                    />
                    <Icon size={17} className="shrink-0" />
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="shrink-0 px-2 pb-3">
          <ul className="flex flex-col gap-1 border-t pt-3" style={{ borderColor: "var(--border-faint)" }}>
            <li>
              <NavLink
                href="/settings"
                title="Settings"
                className={`nav-row justify-center px-0 ${isActive(pathname, "/settings") ? "nav-row-on icon-strong" : ""}`}
              >
                <Settings size={17} />
              </NavLink>
            </li>
            {user && (
              <li>
                <NavLink
                  href="/settings"
                  title={user.name}
                  className="nav-row justify-center px-0"
                >
                  <UserCircle size={17} />
                </NavLink>
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* =================================================== Detail sidebar */}
      {!collapsed && (
        <div
          className="flex min-w-0 flex-1 flex-col"
          style={{ opacity: ready ? 1 : 0, transition: `opacity 360ms ${softSpring}` }}
        >
          <div
            className="flex shrink-0 items-center justify-between gap-3 px-4"
            style={{ height: "var(--topbar-h)" }}
          >
            <Link href={activeArea.href} className="min-w-0">
              <Wordmark size="sm" />
            </Link>
            <button onClick={toggle} className="btn-icon btn-icon-sm" aria-label="Collapse sidebar">
              <PanelLeftClose size={15} />
            </button>
          </div>

          <div className="border-y px-4 py-3" style={{ borderColor: "var(--border-faint)" }}>
            <p className="group-heading">{activeArea.detailTitle}</p>
            <p className="mt-1.5 text-ui leading-snug" style={{ color: "var(--text-muted)" }}>
              {activeArea.purpose}
            </p>
            <div
              className="mt-4 flex h-10 items-center gap-2 rounded-[var(--radius-control)] border px-3"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface-2)",
                boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.025)",
              }}
            >
              <Search size={15} className="shrink-0" style={{ color: "var(--text-faint)" }} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search ${activeArea.detailTitle.toLowerCase()}...`}
                className="min-w-0 flex-1 bg-transparent text-ui outline-none placeholder:text-[var(--text-faint)]"
              />
            </div>
          </div>

          <nav className="scrollbar-none flex-1 overflow-y-auto px-2.5 py-3" aria-label={`${activeArea.detailTitle} navigation`}>
            {visibleSections.map((section, si) => (
              <div key={section.title}>
                {si > 0 && <div style={{ height: "var(--space-6)" }} aria-hidden />}
                <p className="group-heading mb-1.5 px-2.5">{section.title}</p>
                <ul className="flex flex-col gap-[2px]">
                  {section.items.map((item) => (
                    <DetailNavItem
                      key={item.href + item.label}
                      item={item}
                      pathname={pathname}
                      dueCount={dueCount}
                    />
                  ))}
                </ul>
              </div>
            ))}

            {isAdmin && (
              <div>
                <div style={{ height: "var(--space-6)" }} aria-hidden />
                <p className="group-heading mb-1.5 px-2.5">System</p>
                <ul className="flex flex-col gap-[2px]">
                  <DetailNavItem item={{ href: "/admin", label: "Admin" }} pathname={pathname} dueCount={dueCount} />
                  <DetailNavItem item={{ href: "/settings", label: "Settings" }} pathname={pathname} dueCount={dueCount} />
                </ul>
              </div>
            )}
          </nav>

          {/* =========================================================== Footer */}
          {user && (
            <div className="shrink-0 border-t p-2.5" style={{ borderColor: "var(--border)" }}>
              <Link
                href="/analytics"
                className="row-link block px-1.5 py-2"
                aria-label={`Level ${user.level}, ${user.title}. ${user.into} of ${user.need} XP`}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-micro font-medium" style={{ color: "var(--text-muted)" }}>
                    Level {user.level} · {user.title}
                  </span>
                  <span className="num shrink-0 text-micro" style={{ color: "var(--text-faint)" }}>
                    {user.into} / {user.need}
                  </span>
                </span>
                <span className="progress mt-2 block">
                  <span
                    className="progress-bar block"
                    style={{ width: `${Math.min(100, (user.into / user.need) * 100)}%` }}
                  />
                </span>
              </Link>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

function DetailNavItem({
  item,
  pathname,
  dueCount,
}: {
  item: DetailItem;
  pathname: string;
  dueCount: number;
}) {
  const active = !isExternal(item.href) && isActive(pathname, item.href);
  const badge = item.badge === "reviews" && dueCount > 0 ? dueCount : null;
  const Icon = item.icon;

  return (
    <li>
      <NavLink
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`nav-row gap-2.5 ${active ? "nav-row-on icon-strong" : ""}`}
        style={{
          paddingLeft: 10,
          paddingRight: 10,
          transitionTimingFunction: softSpring,
        }}
      >
        <span
          className="absolute left-[-10px] top-1/2 h-[16px] w-[2px] -translate-y-1/2 rounded-r-full"
          style={{
            background: "var(--primary)",
            opacity: active ? 1 : 0,
            transition: `opacity 220ms ${softSpring}`,
          }}
          aria-hidden
        />
        {Icon && <Icon size={15} className="shrink-0" />}
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {badge !== null && (
          <span
            className="count shrink-0"
            style={{ background: "var(--neutral-faint)", color: "var(--text-muted)" }}
          >
            {badge}
          </span>
        )}
      </NavLink>
    </li>
  );
}

function filterSections(sections: { title: string; items: DetailItem[] }[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return sections;

  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.label.toLowerCase().includes(q)),
    }))
    .filter((section) => section.items.length > 0);
}

/**
 * One nav row, rendered as a `Link` inside the app and an `a` when it leaves it.
 * Both navigations use this, so an external destination can never behave one way
 * on desktop and another on a phone.
 */
export function NavLink({
  href,
  children,
  ...rest
}: React.ComponentProps<"a"> & { href: string }) {
  if (isExternal(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} {...rest}>
      {children}
    </Link>
  );
}
