import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The three screens every app needs and this one was missing: something is
 * loading, something broke, nothing is here. They share one layout so a failure
 * still looks like the product rather than a stack trace.
 */
export function StatusScreen({
  eyebrow,
  title,
  body,
  icon,
  tone = "neutral",
  actions,
}: {
  eyebrow: string;
  title: string;
  body: string;
  icon: ReactNode;
  tone?: "neutral" | "danger";
  actions?: ReactNode;
}) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4 py-12">
      <div className="scale-in max-w-md text-center">
        <div className="relative mx-auto mb-5 grid h-16 w-16 place-items-center">
          <span
            className="absolute inset-0 rounded-[var(--radius-dialog)]"
            style={{
              background: `radial-gradient(circle at 50% 40%, ${
                tone === "danger" ? "var(--danger-faint)" : "var(--primary-soft)"
              }, transparent 70%)`,
            }}
            aria-hidden
          />
          <span
            className="relative grid h-14 w-14 place-items-center rounded-[var(--radius-panel)]"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: tone === "danger" ? "var(--danger)" : "var(--primary)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {icon}
          </span>
        </div>

        <p className="eyebrow eyebrow-accent">{eyebrow}</p>
        <h1 className="mt-2 text-[22px] font-bold tracking-[-0.03em]">{title}</h1>
        <p className="text-body mx-auto mt-2 max-w-[44ch] text-[14px]">{body}</p>

        {actions && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  );
}

/* ===========================================================================
   Loading skeletons
   ---------------------------------------------------------------------------
   A family rather than one shape. A skeleton only earns its place if it
   predicts the layout that is about to arrive — a dashboard-shaped skeleton in
   front of a settings form is worse than nothing, because it moves the page
   twice instead of once. Five shapes cover all 55 routes:

     PageSkeleton     header + stat row + split body   (dashboard, analytics)
     ListSkeleton     header + a run of rows           (learning, projects, notes)
     DetailSkeleton   header + sidebar + content       (course, project)
     ArticleSkeleton  prose column                     (lesson, help)
     FormSkeleton     labelled field stack             (settings, admin)

   All are server components with no JS, so they stream immediately.
   ======================================================================== */

/** Shared header block: eyebrow, title, one line of description. */
function SkeletonHeader({ wide = false }: { wide?: boolean }) {
  return (
    <header>
      <div className="skeleton h-2.5 w-20" />
      <div className="skeleton mt-3 h-6 w-[240px] max-w-full" />
      {wide && <div className="skeleton mt-3 h-3 w-[400px] max-w-full" />}
    </header>
  );
}

/** A run of list rows. The default shape for every index route. */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="page-body" aria-busy aria-label="Loading">
      <SkeletonHeader wide />
      <div className="panel">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-3"
            style={{ borderBottom: i === rows - 1 ? undefined : "1px solid var(--border)" }}
          >
            <div className="skeleton h-7 w-7 shrink-0 rounded-[var(--radius-tile)]" />
            <div className="min-w-0 flex-1">
              <div className="skeleton h-3 w-[38%] min-w-[120px]" />
              <div className="skeleton mt-2 h-2.5 w-[24%] min-w-[80px]" />
            </div>
            <div className="skeleton h-2.5 w-12 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Header, a sticky-rail column and a content column. */
export function DetailSkeleton() {
  return (
    <div className="page-body" aria-busy aria-label="Loading">
      <div className="flex items-start gap-4">
        <div className="skeleton h-14 w-14 shrink-0 rounded-[var(--radius-card)]" />
        <div className="min-w-0 flex-1">
          <div className="skeleton h-2.5 w-24" />
          <div className="skeleton mt-3 h-6 w-[300px] max-w-full" />
          <div className="skeleton mt-3 h-3 w-[440px] max-w-full" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-4">
              <div className="skeleton h-3.5 w-32" />
              <div className="skeleton mt-3 h-2.5 w-full" />
              <div className="skeleton mt-2 h-2.5 w-[72%]" />
            </div>
          ))}
        </div>
        <div className="card h-fit p-4">
          <div className="skeleton h-3 w-20" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton mt-3 h-2.5" style={{ width: `${88 - i * 9}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** A reading column. Lesson bodies and help articles. */
export function ArticleSkeleton() {
  const widths = ["100%", "94%", "97%", "62%", "100%", "88%", "91%", "45%"];
  return (
    <div className="page-body measure-reading" aria-busy aria-label="Loading">
      <div className="skeleton h-2.5 w-28" />
      <div className="skeleton h-7 w-[420px] max-w-full" />
      <div className="card p-5 sm:p-8">
        {widths.map((w, i) => (
          <div key={i} className="skeleton mt-3 h-2.5 first:mt-0" style={{ width: w }} />
        ))}
        <div className="skeleton mt-6 h-[120px] w-full rounded-[var(--radius-tile)]" />
        {widths.slice(0, 4).map((w, i) => (
          <div key={i} className="skeleton mt-3 h-2.5" style={{ width: w }} />
        ))}
      </div>
    </div>
  );
}

/** A stack of labelled fields. Settings and admin forms. */
export function FormSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <div className="page-body" aria-busy aria-label="Loading">
      <SkeletonHeader wide />
      <div className="card flex flex-col gap-5 p-5">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i}>
            <div className="skeleton h-2.5 w-24" />
            <div className="skeleton mt-2 h-8 w-full rounded-[var(--radius-control)]" />
          </div>
        ))}
        <div className="skeleton h-8 w-28 rounded-[var(--radius-control)]" />
      </div>
    </div>
  );
}

/**
 * The dashboard shape: header, a row of stat tiles, then a split body. It
 * mirrors the real page so the layout does not jump when content arrives. A
 * centred spinner would tell you less and move more.
 */
export function PageSkeleton() {
  return (
    <div className="page-body" aria-busy aria-label="Loading">
      <header>
        <div className="skeleton h-3 w-24" />
        <div className="skeleton mt-3 h-8 w-[280px] max-w-full" />
        <div className="skeleton mt-3 h-3.5 w-[420px] max-w-full" />
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-4">
            <div className="skeleton h-3 w-20" />
            <div className="skeleton mt-3 h-7 w-16" />
            <div className="skeleton mt-2.5 h-2.5 w-24" />
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="card p-5">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton mt-5 h-[132px] w-full" />
        </div>
        <div className="flex flex-col gap-5">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="card p-4">
              <div className="skeleton h-4 w-28" />
              <div className="skeleton mt-3 h-3 w-full" />
              <div className="skeleton mt-2 h-3 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HomeLink() {
  return (
    <Link href="/dashboard" className="btn btn-primary">
      Back to dashboard
    </Link>
  );
}
