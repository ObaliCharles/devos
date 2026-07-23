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
        <p className="text-body mx-auto mt-2 max-w-[44ch] text-[13.5px]">{body}</p>

        {actions && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  );
}

/**
 * The skeleton shown while a route's data resolves. It mirrors the real page
 * shape — header, tiles, body — so the layout does not jump when content
 * arrives. A centred spinner would tell you less and move more.
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
