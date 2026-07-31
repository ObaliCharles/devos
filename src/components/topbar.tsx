"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Bell, Moon, Search, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { CommandPalette } from "./command-palette";
import { MobileDrawer } from "./mobile-drawer";
import type { SidebarUser } from "./nav-config";

/**
 * The top bar is deliberately thin: one row, no page title. The page owns its
 * own header, so repeating it here would only cost vertical space. What lives
 * here is everything that is true on every route — search, notifications,
 * theme, account, and on phones the menu trigger for the navigation drawer.
 */
export function Topbar({
  unread = 0,
  dueCount = 0,
  isAdmin = false,
  navUser,
}: {
  unread?: number;
  dueCount?: number;
  isAdmin?: boolean;
  navUser?: SidebarUser;
}) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem("dos-theme", next);
      } catch {
        /* private mode, the theme just will not persist */
      }
      return next;
    });
  }, []);

  const openPalette = () => window.dispatchEvent(new Event("open-command-palette"));

  return (
    <header
      className="glass sticky top-0 z-30 flex shrink-0 items-center gap-3 border-b px-4 sm:px-5"
      style={{ height: "var(--topbar-h)", borderColor: "var(--border)" }}
    >
      {/* Phone-only: the menu trigger and drawer hold the full navigation. */}
      <MobileDrawer dueCount={dueCount} isAdmin={isAdmin} user={navUser} />

      {/* ------------------------------------------------------- Search
          Thin, borderless at rest, ⌘K on the right. It should read as a place
          to start typing, not as a control with a frame around it. */}
      <button
        onClick={openPalette}
        className="search max-w-[380px] flex-1 text-left sm:w-[320px] sm:flex-none"
        aria-label="Search anything (Command K)"
      >
        <Search size={14} className="shrink-0" style={{ color: "var(--text-faint)" }} />
        <span className="flex-1 truncate text-[14px]">Search anything…</span>
        <kbd className="hidden sm:inline-flex">⌘K</kbd>
      </button>

      {/* -------------------------------------------------- Right cluster */}
      <div className="ml-auto flex items-center gap-1">
        {/* The streak flame and the XP counter used to live here. They are gone
            from the chrome on purpose: a number that follows you onto every
            route is claiming to be the thing you should be watching, and
            neither of them is. Both still exist — XP drives levels and
            achievements, the streak is on the dashboard next to the work that
            produced it — but they are readouts you go and look at, not a score
            pinned to the corner of the product. */}
        <Link href="/notifications" className="btn-icon relative" aria-label="Notifications">
          <Bell size={16} />
          {/* Accent, not red. Unread mail is not an error. */}
          {unread > 0 && (
            <span
              className="absolute right-[8px] top-[8px] h-[6px] w-[6px] rounded-full"
              style={{
                background: "var(--primary)",
                boxShadow: "0 0 0 2px var(--bg)",
              }}
              aria-hidden
            />
          )}
          {unread > 0 && <span className="sr-only">{unread} unread</span>}
        </Link>

        <button
          onClick={toggle}
          className="btn-icon"
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <div className="ml-1.5 flex items-center">
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "w-[28px] h-[28px] rounded-full",
              },
            }}
          />
        </div>
      </div>

      <CommandPalette />
    </header>
  );
}
