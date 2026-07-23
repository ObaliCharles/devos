import { Suspense } from "react";
import { redirect } from "next/navigation";
import { MobileNav, Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { RouteProgress } from "@/components/route-progress";
import { getCurrentUser, levelFromXp } from "@/lib/user";
import { countDueReviews, countUnreadNotifications } from "@/lib/queries";

/**
 * The app shell. This is the only place in the product that decides how wide a
 * page is and how much gutter it gets — pages render their content and nothing
 * else. Before this, two dozen pages each set their own `max-w-*` and padding
 * inside a container that already had padding, which is why nothing lined up
 * from one route to the next.
 *
 * Every route runs to the same width. Narrowing individual pages bought a
 * comfortable line length and cost the thing that matters more: a left edge
 * that never moves as you navigate.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const [dueCount, unread] = await Promise.all([
    countDueReviews(user._id),
    countUnreadNotifications(user._id),
  ]);

  const level = levelFromXp(user.xp ?? 0);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* useSearchParams inside the progress bar needs a Suspense boundary,
          or every route under this layout opts out of static rendering. */}
      <Suspense fallback={null}>
        <RouteProgress />
      </Suspense>

      <Sidebar
        dueCount={dueCount}
        isAdmin={user.role === "admin"}
        user={{
          name: user.name || "Developer",
          plan: user.role === "admin" ? "Admin" : "Free plan",
          level: level.level,
          title: level.title,
          into: level.into,
          need: level.need,
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar streak={user.currentStreak ?? 0} xp={user.xp ?? 0} unread={unread} />

        {/* Symmetric vertical padding (page-top top and bottom) is what lets a
            full-height route size itself to the viewport exactly. Mobile-nav
            clearance is a phone-only concern, so it lives in a class that
            disappears at md rather than a fixed inset every page pays for. */}
        <main id="main" className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div
            className="page-container"
            style={{ paddingTop: "var(--page-top)", paddingBottom: "var(--page-top)" }}
          >
            {children}
          </div>
        </main>
      </div>

      <MobileNav dueCount={dueCount} />
    </div>
  );
}
