import type React from "react";
import { COMMUNITY_LINKS } from "@/lib/community-links";
import { DiscordMark } from "@/components/brand-icons";
import {
  BarChart3,
  Calendar,
  LayoutDashboard,
  MessagesSquare,
  Settings,
  Shield,
  Swords,
} from "lucide-react";
import {
  IconCareer,
  IconKnowledge,
  IconLearn,
  IconPractice,
  IconProjects,
  IconReview,
  IconTutor,
} from "@/components/icons";

/**
 * The one navigation model, shared by the desktop sidebar and the mobile
 * drawer so a destination can never exist in one and be missing from the
 * other. Grouped by intent, Learn / Build / Grow, which is how the whole
 * product is organised.
 */
/** Lucide icons satisfy this, and so does a hand-drawn brand mark. */
export type NavIcon = React.ComponentType<{ size?: number; className?: string }>;
export type NavItem = { href: string; label: string; icon: NavIcon };
export type NavGroup = { heading?: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  { items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    heading: "Learn",
    // Ordered the way the loop actually runs: you learn it, you drill it, you
    // are re-tested on it, and what survives ends up in your knowledge base.
    // The concept marks come from components/icons.tsx, not lucide: these five
    // are DeveloperOS ideas rather than generic actions. Dashboard, Calendar,
    // Analytics, Settings and Admin stay on lucide, because a calendar is a
    // calendar everywhere and inventing one would be identity for its own sake.
    items: [
      { href: "/learning", label: "Learning", icon: IconLearn },
      { href: "/practice", label: "Practice", icon: IconPractice },
      { href: "/review", label: "Review", icon: IconReview },
      { href: "/notes", label: "Knowledge", icon: IconKnowledge },
    ],
  },
  {
    heading: "Build",
    items: [
      { href: "/projects", label: "Projects", icon: IconProjects },
      { href: "/ai", label: "AI Workspace", icon: IconTutor },
    ],
  },
  {
    // Community is a section, not a destination. There is no landing page above
    // these two — one would just be a menu of the same links the sidebar is.
    heading: "Community",
    items: [
      // Both leave the app. See lib/community-links.ts for why.
      { href: COMMUNITY_LINKS.discussions, label: "Discussions", icon: MessagesSquare },
      { href: COMMUNITY_LINKS.discord, label: "Chat", icon: DiscordMark },
      { href: "/compete", label: "Arena", icon: Swords },
    ],
  },
  {
    heading: "Grow",
    items: [
      { href: "/career", label: "Career", icon: IconCareer },
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

/* ---------------------------------------------------------------- hierarchy

   Sixteen destinations presented as sixteen equal choices is not navigation,
   it is an index. These five are the ones a learner opens on a normal day; the
   rest are real features that are visited occasionally and reached from the
   drawer, the command palette or a contextual link.

   Nothing is removed by this — the drawer still lists every group. The claim is
   only about *emphasis*, which is the thing a phone has no room to get wrong.
   ------------------------------------------------------------------------ */
export const PRIMARY_HREFS = ["/dashboard", "/learning", "/practice", "/review", "/projects"] as const;

/**
 * The daily five, in loop order, for the mobile bottom bar.
 *
 * Five is the ceiling: a sixth target drops each one below the ~44px that a
 * thumb can hit reliably on a narrow phone, and a nav you miss is worse than a
 * nav you have to open.
 *
 * When the Today engine lands, `/dashboard` becomes `/today` here and in
 * NAV_GROUPS — one edit, because both surfaces read this file.
 */
export function primaryNav(): NavItem[] {
  const all = NAV_GROUPS.flatMap((g) => g.items);
  return PRIMARY_HREFS.map((href) => all.find((i) => i.href === href)).filter(
    (i): i is NavItem => Boolean(i)
  );
}

export type SidebarUser = {
  name: string;
  plan: string;
  level: number;
  title: string;
  into: number;
  need: number;
};
