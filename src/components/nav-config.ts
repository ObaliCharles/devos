import { COMMUNITY_LINKS } from "@/lib/community-links";
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Calendar,
  Dumbbell,
  FolderKanban,
  Hash,
  LayoutDashboard,
  MessagesSquare,
  NotebookPen,
  RotateCcw,
  Settings,
  Shield,
  Sparkles,
  Swords,
  type LucideIcon,
} from "lucide-react";

/**
 * The one navigation model, shared by the desktop sidebar and the mobile
 * drawer so a destination can never exist in one and be missing from the
 * other. Grouped by intent, Learn / Build / Grow, which is how the whole
 * product is organised.
 */
export type NavItem = { href: string; label: string; icon: LucideIcon };
export type NavGroup = { heading?: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  { items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    heading: "Learn",
    // Ordered the way the loop actually runs: you learn it, you drill it, you
    // are re-tested on it, and what survives ends up in your knowledge base.
    items: [
      { href: "/learning", label: "Learning", icon: BookOpen },
      { href: "/practice", label: "Practice", icon: Dumbbell },
      { href: "/review", label: "Review", icon: RotateCcw },
      { href: "/notes", label: "Knowledge", icon: NotebookPen },
    ],
  },
  {
    heading: "Build",
    items: [
      { href: "/projects", label: "Projects", icon: FolderKanban },
      { href: "/ai", label: "AI Workspace", icon: Sparkles },
    ],
  },
  {
    // Community is a section, not a destination. There is no landing page above
    // these two — one would just be a menu of the same links the sidebar is.
    heading: "Community",
    items: [
      // Both leave the app. See lib/community-links.ts for why.
      { href: COMMUNITY_LINKS.discussions, label: "Discussions", icon: MessagesSquare },
      { href: COMMUNITY_LINKS.discord, label: "Chat", icon: Hash },
      { href: "/compete", label: "Arena", icon: Swords },
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

/** Adds the System group, with Admin only when the user is one. */
export function navGroups(isAdmin: boolean): NavGroup[] {
  return [
    ...NAV_GROUPS,
    {
      heading: "System",
      items: [
        { href: "/settings", label: "Settings", icon: Settings },
        ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
      ],
    },
  ];
}

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export type SidebarUser = {
  name: string;
  plan: string;
  level: number;
  title: string;
  into: number;
  need: number;
};
