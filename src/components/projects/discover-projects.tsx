"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Users } from "lucide-react";
import type { OpenProject } from "@/lib/queries/collaboration";
import { requestToJoin, respondToEdge } from "@/lib/actions";
import { ActionButton } from "@/components/action-button";

/**
 * Projects looking for people, and invitations waiting for you.
 *
 * Invitations sit at the top: an invite is someone waiting on your answer,
 * which outranks browsing. Once the queue is empty the section disappears
 * rather than sitting there as an empty box.
 */
export function DiscoverProjects({
  projects,
  invites,
}: {
  projects: OpenProject[];
  invites: { id: string; role: string; message: string; projectId: string; projectTitle: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <p className="card p-3 text-[13px]" style={{ color: "var(--danger)" }} role="alert">
          {error}
        </p>
      )}

      {invites.length > 0 && (
        <section className="card overflow-hidden">
          <h2 className="eyebrow border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
            {invites.length === 1 ? "You have an invitation" : `${invites.length} invitations`}
          </h2>
          <ul>
            {invites.map((inv, i) => (
              <li
                key={inv.id}
                className={`flex flex-wrap items-center gap-3 px-4 py-3 ${i > 0 ? "border-t" : ""}`}
                style={i > 0 ? { borderColor: "var(--border-faint)" } : undefined}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium">{inv.projectTitle}</p>
                  <p className="text-[12px]" style={{ color: "var(--text-faint)" }}>
                    as {inv.role}
                    {inv.message && ` — ${inv.message}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <ActionButton
                    className="btn btn-primary btn-sm"
                    icon={<Check size={13} />}
                    onClick={async () => {
                      const r = await respondToEdge(inv.id, true);
                      if (!r.ok) setError(r.error);
                      else router.push(`/projects/${inv.projectId}`);
                    }}
                  >
                    Accept
                  </ActionButton>
                  <ActionButton
                    className="btn btn-ghost btn-sm"
                    onClick={async () => {
                      await respondToEdge(inv.id, false);
                      router.refresh();
                    }}
                  >
                    Decline
                  </ActionButton>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {projects.length === 0 ? (
        <div className="card grid place-items-center gap-2 p-8 text-center">
          <span className="icon-tile icon-tile-lg">
            <Users size={18} />
          </span>
          <p className="text-[14px] font-medium">No projects are open yet</p>
          <p className="text-body max-w-sm text-[13px]">
            Flip &ldquo;Open to contributors&rdquo; on your own project&rsquo;s Team tab and it
            appears here for everyone else.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <li key={p.id} className="card flex flex-col gap-3 p-4">
              <div className="min-w-0">
                <Link href={`/projects/${p.id}`} className="text-[14px] font-semibold hover:underline">
                  {p.title}
                </Link>
                <p className="text-body mt-1 line-clamp-2 text-[13px]">
                  {p.description || "No description yet."}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <span className="chip chip-sm capitalize">{p.category}</span>
                <span className="chip chip-sm capitalize">{p.difficulty}</span>
                {p.stack.slice(0, 2).map((t) => (
                  <span key={t} className="chip chip-sm">
                    {t}
                  </span>
                ))}
              </div>

              <div className="mt-auto flex items-center gap-2 pt-1">
                <span className="num text-[12px]" style={{ color: "var(--text-faint)" }}>
                  {p.members} {p.members === 1 ? "member" : "members"} · {p.owner}
                </span>
                <span className="ml-auto">
                  {p.joined ? (
                    <span className="chip chip-sm">On the team</span>
                  ) : p.requested ? (
                    <span className="chip chip-sm">Requested</span>
                  ) : (
                    <ActionButton
                      className="btn btn-secondary btn-sm"
                      onClick={async () => {
                        const r = await requestToJoin(p.id);
                        if (!r.ok) setError(r.error);
                        router.refresh();
                      }}
                    >
                      Ask to join
                    </ActionButton>
                  )}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
