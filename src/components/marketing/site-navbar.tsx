"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Menu, Moon, Sun, X } from "lucide-react";
import { Wordmark } from "@/components/brand";

/**
 * The marketing navbar.
 *
 * Structure follows the reference: brand, a desktop nav where two items open
 * dropdowns, sign-in and a filled call to action, a theme toggle, and a mobile
 * sheet holding all of it. Everything else is this product's own.
 *
 * The reference was written for a shadcn project and painted itself with
 * `bg-background` / `text-foreground` / `bg-muted` / `border-border`. None of
 * those tokens exist here — this design system runs on `--bg`, `--surface`,
 * `--text` and one accent — so a straight copy would have rendered an unstyled
 * navbar. Every surface below reads a real token instead, which is also why it
 * follows the light/dark switch for free.
 *
 * Two things the reference left out and a navbar cannot ship without: a
 * dropdown that closes when you click away or press Escape, and a menu that
 * closes when you navigate. Without them the first dropdown you open stays open
 * over the page until you click it again.
 */

type NavItem = {
  label: string;
  href?: string;
  items?: { label: string; href: string }[];
};

const NAV: NavItem[] = [
  { label: "Features", href: "/#features" },
  {
    label: "Learn",
    items: [
      { label: "Roadmaps", href: "/#paths" },
      { label: "Courses", href: "/#features" },
      { label: "Projects", href: "/#showcase" },
    ],
  },
  { label: "Pricing", href: "/#pricing" },
  {
    label: "Resources",
    items: [
      { label: "Docs", href: "/#features" },
      { label: "Verify a certificate", href: "/verify" },
    ],
  },
];

export function SiteNavbar() {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const root = useRef<HTMLElement>(null);

  // One listener for both dismissals. A dropdown that only closes by clicking
  // its own trigger is the single most common navbar bug.
  useEffect(() => {
    if (!openDropdown && !mobileOpen) return;

    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) {
        setOpenDropdown(null);
        setMobileOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenDropdown(null);
        setMobileOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openDropdown, mobileOpen]);

  const closeAll = useCallback(() => {
    setOpenDropdown(null);
    setMobileOpen(false);
  }, []);

  return (
    <header
      ref={root}
      className="glass sticky top-0 z-30 border-b"
      style={{ borderColor: "var(--border)" }}
    >
      <div
        className="mx-auto flex h-16 w-full items-center justify-between gap-4 px-5 sm:px-8"
        style={{ maxWidth: 1200 }}
      >
        <div className="flex items-center gap-6">
          <Link href="/" aria-label="DeveloperOS home" onClick={closeAll}>
            <Wordmark size="sm" />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {NAV.map((item) =>
              item.items ? (
                <div key={item.label} className="relative">
                  <button
                    onClick={() =>
                      setOpenDropdown(openDropdown === item.label ? null : item.label)
                    }
                    aria-expanded={openDropdown === item.label}
                    aria-haspopup="menu"
                    className="row-link flex items-center gap-1 px-3 py-2 text-[14px] font-medium"
                    style={{
                      color: openDropdown === item.label ? "var(--text)" : "var(--text-muted)",
                    }}
                  >
                    {item.label}
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-[var(--dur-fast)] ${
                        openDropdown === item.label ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {openDropdown === item.label && (
                    <ul
                      role="menu"
                      className="scale-in absolute left-0 top-full z-20 mt-2 w-56 rounded-[var(--radius-card)] border p-1.5"
                      style={{
                        background: "var(--surface)",
                        borderColor: "var(--border)",
                        boxShadow: "var(--shadow-lg)",
                      }}
                    >
                      {item.items.map((sub) => (
                        <li key={sub.label} role="none">
                          <Link
                            role="menuitem"
                            href={sub.href}
                            onClick={closeAll}
                            className="row-link block px-3 py-2 text-[14px]"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {sub.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <Link
                  key={item.label}
                  href={item.href!}
                  onClick={closeAll}
                  className="row-link px-3 py-2 text-[14px] font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 lg:flex">
            <Link href="/sign-in" className="btn btn-ghost btn-sm">
              Sign in
            </Link>
            <Link href="/sign-up" className="btn btn-primary btn-sm">
              Get Started <ArrowRight size={15} />
            </Link>
          </div>

          <ThemeToggle />

          <button
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className="btn-icon lg:hidden"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile sheet. Full-width under the bar rather than a floating card:
          at 390px a 224px dropdown pinned to the right edge is a worse target
          than the row it replaced. */}
      {mobileOpen && (
        <div
          className="border-t lg:hidden"
          style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}
        >
          <ul className="mx-auto flex w-full flex-col gap-0.5 px-5 py-3 sm:px-8" style={{ maxWidth: 1200 }}>
            {NAV.map((item) =>
              item.items ? (
                <li key={item.label}>
                  <button
                    onClick={() =>
                      setOpenDropdown(openDropdown === item.label ? null : item.label)
                    }
                    aria-expanded={openDropdown === item.label}
                    className="row-link flex w-full items-center justify-between px-3 py-2.5 text-[14px] font-medium"
                  >
                    {item.label}
                    <ChevronDown
                      size={15}
                      className={`transition-transform ${
                        openDropdown === item.label ? "rotate-180" : ""
                      }`}
                      style={{ color: "var(--text-faint)" }}
                    />
                  </button>
                  {openDropdown === item.label && (
                    <ul
                      className="ml-3 border-l pl-3"
                      style={{ borderColor: "var(--border)" }}
                    >
                      {item.items.map((sub) => (
                        <li key={sub.label}>
                          <Link
                            href={sub.href}
                            onClick={closeAll}
                            className="row-link block px-3 py-2 text-[14px]"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {sub.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ) : (
                <li key={item.label}>
                  <Link
                    href={item.href!}
                    onClick={closeAll}
                    className="row-link block px-3 py-2.5 text-[14px] font-medium"
                  >
                    {item.label}
                  </Link>
                </li>
              ),
            )}

            <li className="mt-2 flex flex-col gap-2 border-t pt-3" style={{ borderColor: "var(--border)" }}>
              <Link href="/sign-in" onClick={closeAll} className="btn btn-secondary btn-block">
                Sign in
              </Link>
              <Link href="/sign-up" onClick={closeAll} className="btn btn-primary btn-block">
                Get Started <ArrowRight size={15} />
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}

/**
 * The theme toggle, wired to this app's own mechanism rather than next-themes.
 *
 * The reference imported `useTheme` from a package this project does not have.
 * Theme here is a `data-theme` attribute on <html> plus a localStorage key that
 * an inline script in the root layout reads before first paint — so the toggle
 * is three lines and there is no provider to add.
 *
 * It renders a fixed-size placeholder until mounted: reading the DOM during SSR
 * is impossible, and rendering the wrong icon first causes a visible flip.
 */
function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light" | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  if (!theme) return <span className="h-9 w-9" aria-hidden />;

  return (
    <button
      onClick={() => {
        const next = theme === "dark" ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem("dos-theme", next);
        } catch {
          /* private mode, the theme just will not persist */
        }
        setTheme(next);
      }}
      className="btn-icon"
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
