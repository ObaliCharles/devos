import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * The DeveloperOS primitive library.
 *
 * Two rules keep this file honest:
 *
 *  1. No component here declares "use client" and none of them animate with
 *     JavaScript. Entrances are CSS classes from globals.css, so a page built
 *     out of these primitives stays a Server Component and ships no JS for its
 *     layout. Framer Motion is reserved for things that genuinely need it, 
 *     shared layout transitions in the sidebar, gesture-driven UI.
 *  2. No hex values. Every colour is a token, which is what makes the light
 *     theme a one-line switch rather than an audit.
 */

/* ------------------------------------------------------------------ Layout */

export type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

/**
 * Every page header in the product. Fixed anatomy, eyebrow, title, optional
 * description, optional meta strip, actions pinned right, so the eye lands in
 * the same place on every route. Capped so the hero never eats more than
 * ~150px of vertical space before real content starts.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  compact,
  back,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  /** A row of chips, counts or progress that belongs with the title. */
  meta?: ReactNode;
  /** Drops the description to keep dense pages tight. */
  compact?: boolean;
  /** Sub-pages get one way back, in the same spot every time. */
  back?: { href: string; label: string };
}) {
  return (
    <header className="rise flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
      <div className="min-w-0 flex-1">
        {back && (
          <Link
            href={back.href}
            className="mb-3 -ml-1 inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] px-1 py-0.5 text-[12.5px] font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            <BackGlyph />
            {back.label}
          </Link>
        )}
        {eyebrow && <p className="eyebrow eyebrow-accent">{eyebrow}</p>}
        <h1 className={`title-page ${eyebrow ? "mt-2" : ""}`}>{title}</h1>
        {description && !compact && (
          <p className="text-body mt-2 max-w-[58ch]">{description}</p>
        )}
        {meta && <div className="mt-4 flex flex-wrap items-center gap-3">{meta}</div>}
      </div>
      {actions && (
        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:pt-1">
          {actions}
        </div>
      )}
    </header>
  );
}

/** The header for a block inside a page. Smaller, quieter, same anatomy. */
export function SectionHeader({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        {icon && <IconTile>{icon}</IconTile>}
        <div className="min-w-0">
          <h2 className="title-section truncate">{title}</h2>
          {description && <p className="text-meta mt-0.5 truncate">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** A card that is a whole region of the page: header row plus body. */
export function Panel({
  title,
  description,
  icon,
  action,
  footer,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel flex flex-col ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            {icon && <IconTile>{icon}</IconTile>}
            <div className="min-w-0">
              <h2 className="title-card truncate">{title}</h2>
              {description && <p className="text-meta mt-0.5 truncate">{description}</p>}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className="flex-1 p-4">{children}</div>
      {footer && <div className="border-t px-5 py-3">{footer}</div>}
    </section>
  );
}

/* ------------------------------------------------------------------- Atoms */

export function IconTile({
  children,
  tone = "neutral",
  size = "md",
}: {
  children: ReactNode;
  tone?: Tone;
  size?: "md" | "lg";
}) {
  const toneClass = tone === "neutral" ? "" : `icon-tile-${tone}`;
  return (
    <span className={`icon-tile ${size === "lg" ? "icon-tile-lg" : ""} ${toneClass}`}>
      {children}
    </span>
  );
}

export function Badge({
  children,
  tone = "neutral",
  size = "md",
}: {
  children: ReactNode;
  tone?: Tone;
  size?: "md" | "lg";
}) {
  const toneClass = tone === "neutral" ? "" : `badge-${tone}`;
  return <span className={`badge ${toneClass} ${size === "lg" ? "badge-lg" : ""}`}>{children}</span>;
}

/** Kept as the historical name for Badge so older call sites keep working. */
export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return <Badge tone={tone}>{children}</Badge>;
}

export function ProgressBar({
  value,
  total,
  tone = "primary",
  size = "md",
  label,
}: {
  value: number;
  total: number;
  tone?: Extract<Tone, "primary" | "success" | "warning" | "danger">;
  size?: "sm" | "md" | "lg";
  /** Announced to screen readers instead of the bare numbers. */
  label?: string;
}) {
  const pct = total > 0 ? Math.min(100, Math.max(0, (value / total) * 100)) : 0;
  const sizeClass = size === "sm" ? "progress-sm" : size === "lg" ? "progress-lg" : "";
  const toneClass = tone === "primary" ? "" : `progress-bar-${tone}`;
  return (
    <div
      className={`progress ${sizeClass}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `${value} of ${total}`}
    >
      <div className={`progress-bar ${toneClass}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Discrete progress, reads as "3 of 5 done" at a glance, unlike a bar. */
export function Steps({ done, total, label }: { done: number; total: number; label?: string }) {
  return (
    <div
      className="steps"
      role="progressbar"
      aria-valuenow={done}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={label ?? `${done} of ${total} complete`}
    >
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={`step ${i < done ? "step-done" : ""}`} />
      ))}
    </div>
  );
}

/** A labelled horizontal meter, usage caps, budgets, quotas. */
export function Meter({
  label,
  value,
  pct,
  warnAt = 80,
}: {
  label: string;
  value: string;
  pct: number;
  warnAt?: number;
}) {
  const near = pct >= warnAt;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium" style={{ color: "var(--text-muted)" }}>
          {label}
        </span>
        <span
          className="num text-[13px]"
          style={{ color: near ? "var(--warning)" : "var(--text-faint)" }}
        >
          {value}
        </span>
      </div>
      <div className="progress progress-sm mt-2">
        <div
          className={`progress-bar ${near ? "progress-bar-warning" : ""}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </div>
  );
}

/** A circular score. Used for anything expressed out of 100. */
export function Ring({
  value,
  label,
  size = 76,
  tone,
}: {
  value: number;
  label?: string;
  size?: number;
  tone?: string;
}) {
  const stroke = size >= 76 ? 6 : 5;
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const color =
    tone ?? (value >= 70 ? "var(--success)" : value >= 40 ? "var(--warning)" : "var(--danger)");
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--surface-3)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c - (Math.min(100, Math.max(0, value)) / 100) * c}
            style={{ transition: "stroke-dashoffset 700ms var(--ease)" }}
          />
        </svg>
        <span className="num absolute inset-0 grid place-items-center text-[17px] font-semibold">
          {value}
        </span>
      </div>
      {label && (
        <span className="text-[12px] font-medium" style={{ color: "var(--text-muted)" }}>
          {label}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- Stats */

/**
 * The one stat tile for the whole product. An optional href turns it into a
 * navigable card without changing a single visual rule.
 */
export function StatTile({
  label,
  value,
  sub,
  icon,
  tone = "neutral",
  href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ReactNode;
  tone?: Tone;
  /** Accepted for source compatibility; no longer rendered as an arrow. */
  trend?: "up" | "down" | "flat";
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12.5px] font-medium" style={{ color: "var(--text-muted)" }}>
          {label}
        </p>
        {icon && <IconTile tone={tone}>{icon}</IconTile>}
      </div>
      <p className="num mt-3 text-[26px] font-semibold leading-none">{value}</p>
      {sub && <p className="text-meta mt-1.5">{sub}</p>}
    </>
  );

  const className = "card p-4";
  return href ? (
    <Link href={href} className={`${className} card-link block`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/** Historical names, both now the same tile. */
export const StatCard = StatTile;
export const KPICard = StatTile;

/* ------------------------------------------------------------ Empty states */

/**
 * No blank areas anywhere in the product: an empty state always carries an
 * illustrated mark, a headline, a sentence explaining what fills it, and at
 * least one way out.
 */
export function EmptyState({
  icon,
  title,
  body,
  action,
  secondary,
  compact,
}: {
  icon?: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
  secondary?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`card scale-in flex flex-col items-center px-5 text-center ${
        compact ? "py-10" : "py-16 sm:py-20"
      }`}
    >
      <div className="max-w-sm">
        {icon && (
          <div className="relative mx-auto mb-6 grid h-16 w-16 place-items-center">
            {/* A soft halo instead of a flat grey square, the mark should feel
                deliberate, not like a missing image. */}
            <span
              className="absolute inset-0 rounded-[var(--radius-dialog)]"
              style={{
                background:
                  "radial-gradient(circle at 50% 40%, var(--primary-soft), transparent 70%)",
              }}
            />
            <span
              className="relative grid h-14 w-14 place-items-center rounded-[var(--radius-panel)]"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--primary)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              {icon}
            </span>
          </div>
        )}
        <p className="text-[18px] font-semibold tracking-tight">{title}</p>
        <p className="text-body mt-2 text-[13.5px]">{body}</p>
        {(action || secondary) && (
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
            {action}
            {secondary}
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Search box */

/**
 * A GET-form search field. Server-rendered, works without JavaScript, and
 * looks identical to the ⌘K launcher in the topbar.
 */
export function SearchField({
  action,
  name = "q",
  defaultValue,
  placeholder = "Search…",
  className = "",
}: {
  action: string;
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <form action={action} method="get" className={className} role="search">
      <label className="search">
        <SearchGlyph />
        <input
          className="search-input"
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          aria-label={placeholder}
          type="search"
        />
      </label>
    </form>
  );
}

function BackGlyph() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

function SearchGlyph() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      style={{ color: "var(--text-faint)" }}
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

/* ------------------------------------------------------------------ Loading */

export function SkeletonCard({ lines = 2 }: { lines?: number }) {
  const widths = ["82%", "64%", "73%", "55%"];
  return (
    <div className="card space-y-3 p-4">
      <div className="skeleton h-3 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-3.5" style={{ width: widths[i % widths.length] }} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="table-container">
      <div className="space-y-4 p-4">
        {Array.from({ length: rows + 1 }).map((_, r) => (
          <div key={r} className="flex gap-6">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="skeleton h-3 flex-1" style={{ opacity: r === 0 ? 0.6 : 1 }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Buttons */

/** A link styled as a button, the shape used for most primary actions. */
export function ButtonLink({
  href,
  variant = "secondary",
  size,
  children,
  className = "",
  ...rest
}: {
  href: string;
  variant?: "primary" | "secondary" | "ghost" | "tonal";
  size?: "xs" | "sm" | "lg";
  children: ReactNode;
  className?: string;
} & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">) {
  return (
    <Link
      href={href}
      className={`btn btn-${variant} ${size ? `btn-${size}` : ""} ${className}`}
      {...rest}
    >
      {children}
    </Link>
  );
}

export { statusColor, formatDate, relativeDate } from "@/lib/utils";
