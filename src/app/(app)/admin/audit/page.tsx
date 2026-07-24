import { requireAdmin } from "@/lib/user";
import { getAuditLog } from "@/lib/queries";
import { EmptyState } from "@/components/ui";
import { relativeDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  await requireAdmin();
  const log = await getAuditLog();

  if (log.length === 0) {
    return <EmptyState title="Nothing logged yet" body="Admin actions, role changes, content edits, flag toggles, appear here with who did them and when." />;
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {log.map((e) => (
        <li key={e.id} className="card flex items-center justify-between p-3 text-sm">
          <span><strong>{e.actor}</strong> <span style={{ color: "var(--text-muted)" }}>{e.action}</span>{e.target ? <span style={{ color: "var(--text-faint)" }}> · {e.target}</span> : null}</span>
          <span className="shrink-0 text-xs" style={{ color: "var(--text-faint)" }}>{relativeDate(e.at)}</span>
        </li>
      ))}
    </ul>
  );
}
