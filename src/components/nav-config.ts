import {
  BarChart3,
  BookOpen,
  Briefcase,
  Calendar,
  Dumbbell,
  FolderKanban,
  LayoutDashboard,
  NotebookPen,
  RotateCcw,
  Settings,
  Shield,
  Sparkles,
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
