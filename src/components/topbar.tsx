"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Bell, Flame, Moon, Search, Sun, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { CommandPalette } from "./command-palette";
import { MobileDrawer } from "./mobile-drawer";
import type { SidebarUser } from "./nav-config";

/**
 * The top bar is deliberately thin: 56px, one row, no page title. The page
 * owns its own header, so repeating it here would only cost vertical space.
 * What lives here is everything that is true on every route, search, the two
 * streak signals, notifications, theme, account, and on phones the menu
 * trigger for the navigation drawer.
 */
export function Topbar({
  streak,
  xp,
  unread = 0,
  dueCount = 0,
  isAdmin = false,
  navUser,
}: {
  streak: number;
  xp: number;
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
        <span className="flex-1 truncate text-[13.5px]">Search anything…</span>
        <kbd className="hidden sm:inline-flex">⌘K</kbd>
      </button>

      {/* -------------------------------------------------- Right cluster */}
      <div className="ml-auto flex items-center gap-1">
        {/* Streak and XP read as one status group, separated from the controls.
            Both are neutral. They are readouts, not alerts, and a lit-up flame
            in the corner of every screen is the fastest way to make a tool feel
            like a game. */}
        <div className="mr-1.5 hidden items-center gap-0.5 sm:flex">
          <span
            className="tooltip flex h-8 items-center gap-1.5 rounded-[var(--radius-control)] px-2.5 text-[12.5px] font-medium"
            data-tip={streak > 0 ? `${streak} day streak` : "No streak yet"}
            style={{ color: streak > 0 ? "var(--text-muted)" : "var(--text-faint)" }}
          >
            <Flame size={14} />
            <span className="num">{streak}</span>
          </span>

          <Link
            href="/analytics"
            className="tooltip row-link flex h-8 items-center gap-1.5 px-2.5 text-[12.5px] font-medium"
            data-tip="Experience earned"
            style={{ color: "var(--text-muted)" }}
          >
            <Zap size={14} />
            <span className="num">{xp.toLocaleString()}</span>
            <span className="hidden lg:inline" style={{ color: "var(--text-faint)" }}>
              XP
            </span>
          </Link>
        </div>

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
