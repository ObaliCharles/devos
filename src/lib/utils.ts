/**
 * Pure utility functions that can be safely used in Server Components.
 * No React hooks, no Framer Motion, no "use client" needed.
 */

const STATUS_COLORS: Record<string, string> = {
  planning: "var(--text-muted)",
  building: "var(--info)",
  testing: "var(--warning)",
  deployed: "var(--success)",
  paused: "var(--text-faint)",
  complete: "var(--success)",
  archived: "var(--text-faint)",
  open: "var(--danger)",
  confirmed: "var(--danger)",
  fixing: "var(--warning)",
  fixed: "var(--success)",
  wontfix: "var(--text-faint)",
  low: "var(--text-faint)",
  medium: "var(--info)",
  high: "var(--warning)",
  critical: "var(--danger)",
};

export function statusColor(status: string) {
  return STATUS_COLORS[status] ?? "var(--text-muted)";
}

export function formatDate(value?: string | Date | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function relativeDate(value?: string | Date | null) {
  if (!value) return null;
  const then = new Date(value).getTime();
  const days = Math.round((then - Date.now()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days > 0) return `in ${days} days`;
  return `${Math.abs(days)} days ago`;
}