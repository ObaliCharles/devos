import type React from "react";
import { COMMUNITY_LINKS, isExternal } from "@/lib/community-links";
import { DiscordMark } from "@/components/brand-icons";
import {
  BarChart3,
  Bell,
  BookMarked,
  BookOpen,
  Calendar,
  Compass,
  Flag,
  GraduationCap,
  Home,
  Library,
  LineChart,
  MessageCircle,
  MessagesSquare,
  NotebookText,
  Play,
  Settings,
  Shield,
  Sparkles,
  Target,
  Trophy,
  Users,
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

/** Lucide icons satisfy this, and so do the DeveloperOS concept icons. */
export type NavIcon = React.ComponentType<{ size?: number; className?: string }>;
export type NavItem = { href: string; label: string; icon: NavIcon };
export type NavGroup = { heading?: string; items: NavItem[] };

export type DetailItem = {
  href: string;
  label: string;
  icon?: NavIcon;
  badge?: "reviews";
  description?: string;
};
export type DetailSection = { title: string; items: DetailItem[] };
export type ProductArea = NavItem & {
  shortLabel: string;
  detailTitle: string;
  purpose: string;
  sections: DetailSection[];
};

/**
 * Route-first information architecture.
 *
 * The rail answers "which part of the product am I in?".
 * The context sidebar answers "which page in this part should I open?".
 * Actual content belongs to the route on the right, not to nested sidebar trees.
 */
export const PRODUCT_AREAS: ProductArea[] = [
  {
    href: "/dashboard",
    label: "Home",
    shortLabel: "Home",
    icon: Home,
    detailTitle: "Home",
    purpose: "What should I do next?",
    sections: [
      {
        title: "Overview",
        items: [{ href: "/dashboard", label: "Overview", icon: Home }],
      },
      {
        title: "Today",
        items: [
          { href: "/learning", label: "Continue Learning", icon: Play },
          { href: "/analytics/goals", label: "Daily Goal", icon: Target },
          { href: "/review", label: "Review Queue", icon: IconReview, badge: "reviews" },
        ],
      },
      {
        title: "Account",
        items: [
          { href: "/notifications", label: "Notifications", icon: Bell },
          { href: "/settings", label: "Settings", icon: Settings },
        ],
      },
    ],
  },
  {
    href: "/learning",
    label: "Learn",
    shortLabel: "Learn",
    icon: IconLearn,
    detailTitle: "Learn",
    purpose: "What am I currently learning?",
    sections: [
      {
        title: "Learning",
        items: [
          { href: "/learning", label: "Overview", icon: BookOpen },
          { href: "/learning/roadmap", label: "Learning Paths", icon: IconLearn },
        ],
      },
      {
        title: "Explore",
        items: [
          { href: "/learning/browse", label: "Explore Courses", icon: Compass },
          { href: "/learning/courses", label: "Course Library", icon: Library },
          { href: "/learning/challenges", label: "Skill Challenges", icon: Trophy },
          { href: "/learning/projects", label: "Project Briefs", icon: IconProjects },
          { href: "/learning/certifications", label: "Certifications", icon: GraduationCap },
        ],
      },
      {
        title: "Study",
        items: [
          { href: "/review", label: "Review Queue", icon: IconReview, badge: "reviews" },
          { href: "/notes", label: "Notes", icon: NotebookText },
        ],
      },
    ],
  },
  {
    href: "/practice",
    label: "Practice",
    shortLabel: "Practice",
    icon: IconPractice,
    detailTitle: "Practice",
    purpose: "Let me strengthen what I know.",
    sections: [
      {
        title: "Practice",
        items: [
          { href: "/practice", label: "Overview", icon: IconPractice },
          { href: "/practice/challenges", label: "Coding Exercises", icon: Target },
          { href: "/review", label: "Review Queue", icon: IconReview, badge: "reviews" },
        ],
      },
      {
        title: "Memory",
        items: [{ href: "/notes/flashcards", label: "Flashcards", icon: BookMarked }],
      },
    ],
  },
  {
    href: "/projects",
    label: "Projects",
    shortLabel: "Projects",
    icon: IconProjects,
    detailTitle: "Projects",
    purpose: "What am I building?",
    sections: [
      {
        title: "Projects",
        items: [
          { href: "/projects", label: "Overview", icon: IconProjects },
          { href: "/projects/new", label: "New Project", icon: Sparkles },
          { href: "/projects/discover", label: "Discover Projects", icon: Compass },
        ],
      },
    ],
  },
  {
    href: "/calendar",
    label: "Calendar",
    shortLabel: "Calendar",
    icon: Calendar,
    detailTitle: "Calendar",
    purpose: "What is scheduled?",
    sections: [
      {
        title: "Views",
        items: [
          { href: "/calendar", label: "Calendar", icon: Calendar },
          { href: "/analytics/goals", label: "Learning Goals", icon: Target },
        ],
      },
    ],
  },
  {
    href: "/community",
    label: "Community",
    shortLabel: "People",
    icon: Users,
    detailTitle: "Community",
    purpose: "Learn with other people.",
    sections: [
      {
        title: "Community",
        items: [
          { href: "/community", label: "Overview", icon: Users },
          { href: "/community/discussions", label: "Discussions", icon: MessagesSquare },
          { href: "/community/groups", label: "Groups", icon: Users },
          { href: "/community/chat", label: "Chat", icon: MessageCircle },
        ],
      },
      {
        title: "External",
        items: [{ href: COMMUNITY_LINKS.discord, label: "Discord", icon: DiscordMark }],
      },
    ],
  },
  {
    href: "/analytics",
    label: "Progress",
    shortLabel: "Progress",
    icon: BarChart3,
    detailTitle: "Progress",
    purpose: "How am I improving?",
    sections: [
      {
        title: "Progress",
        items: [
          { href: "/analytics", label: "Overview", icon: BarChart3 },
          { href: "/analytics/focus", label: "Focus", icon: Target },
          { href: "/analytics/habits", label: "Habits", icon: LineChart },
          { href: "/analytics/goals", label: "Goals", icon: Flag },
        ],
      },
      {
        title: "Proof",
        items: [
          { href: "/analytics/achievements", label: "Achievements", icon: Trophy },
          { href: "/career/certificates", label: "Certificates", icon: GraduationCap },
          { href: "/career", label: "Career", icon: IconCareer },
        ],
      },
    ],
  },
  {
    href: "/resources",
    label: "Resources",
    shortLabel: "Resources",
    icon: Library,
    detailTitle: "Resources",
    purpose: "Where is my reference material?",
    sections: [
      {
        title: "Library",
        items: [
          { href: "/resources", label: "Overview", icon: Library },
          { href: "/notes", label: "Knowledge Base", icon: IconKnowledge },
          { href: "/notes/snippets", label: "Snippets", icon: NotebookText },
          { href: "/ai/prompts", label: "Prompt Library", icon: IconTutor },
        ],
      },
    ],
  },
  {
    href: "/ai",
    label: "AI Tutor",
    shortLabel: "AI",
    icon: IconTutor,
    detailTitle: "AI Tutor",
    purpose: "Help me understand something.",
    sections: [
      {
        title: "Tutor",
        items: [
          { href: "/ai", label: "Overview", icon: IconTutor },
          { href: "/ai/chat", label: "New Session", icon: MessageCircle },
          { href: "/ai/prompts", label: "Prompt Library", icon: Sparkles },
          { href: "/ai/memory", label: "Memory", icon: BookMarked },
        ],
      },
    ],
  },
];

/** Adds secondary/system items for the mobile drawer. */
export function navGroups(isAdmin: boolean): NavGroup[] {
  return [
    { items: PRODUCT_AREAS.map(({ href, label, icon }) => ({ href, label, icon })) },
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

export function activeProductArea(pathname: string): ProductArea {
  const owner = PRODUCT_AREAS.find((area) => routeOwners[area.href]?.some((href) => isActive(pathname, href)));
  if (owner) return owner;

  const ranked = PRODUCT_AREAS.map((area) => {
    const candidates = [
      area.href,
      ...area.sections.flatMap((section) =>
        section.items.map((item) => (isExternal(item.href) ? "" : item.href)),
      ),
    ];
    const score = Math.max(
      ...candidates.map((href) => {
        if (!href || !isActive(pathname, href)) return 0;
        return href.length;
      }),
    );
    return { area, score };
  });

  return ranked.sort((a, b) => b.score - a.score)[0]?.area ?? PRODUCT_AREAS[0];
}

const routeOwners: Record<string, string[]> = {
  "/dashboard": ["/dashboard", "/notifications", "/settings"],
  "/learning": ["/learning"],
  "/practice": ["/practice", "/review"],
  "/projects": ["/projects"],
  "/calendar": ["/calendar"],
  "/community": ["/community"],
  "/analytics": ["/analytics", "/career"],
  "/resources": ["/resources", "/notes"],
  "/ai": ["/ai"],
};

export const PRIMARY_HREFS = ["/dashboard", "/learning", "/practice", "/projects", "/analytics"] as const;

/** The daily five, in loop order, for the mobile bottom bar. */
export function primaryNav(): NavItem[] {
  const all = PRODUCT_AREAS.map(({ href, label, icon }) => ({ href, label, icon }));
  return PRIMARY_HREFS.map((href) => all.find((i) => i.href === href)).filter(
    (i): i is NavItem => Boolean(i),
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
