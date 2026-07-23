"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { segment: "", label: "Overview" },
  { segment: "board", label: "Board" },
  { segment: "milestones", label: "Milestones" },
  { segment: "database", label: "Database" },
  { segment: "api", label: "API" },
  { segment: "bugs", label: "Bugs" },
  { segment: "deployments", label: "Deployments" },
  { segment: "settings", label: "Settings" },
];

/** Same underline tabs as every other module, so a project does not feel like
 *  a different application from the rest of the workspace. */
export function ProjectTabs({ projectId, openBugs }: { projectId: string; openBugs: number }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  // Everything after the project id, or "" on the overview itself.
  const current = pathname.startsWith(base) ? pathname.slice(base.length).replace(/^\//, "") : "";

  return (
    <nav className="underlines" aria-label="Project section">
      {TABS.map((tab) => {
        const active = current === tab.segment;
        return (
          <Link
            key={tab.segment}
            href={tab.segment ? `${base}/${tab.segment}` : base}
            aria-current={active ? "page" : undefined}
            className={`underline-tab ${active ? "underline-tab-active" : ""}`}
          >
            {tab.label}
            {tab.segment === "bugs" && openBugs > 0 && (
              <span
                className="count"
                style={{ background: "var(--danger-faint)", color: "var(--danger)" }}
              >
                {openBugs}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
