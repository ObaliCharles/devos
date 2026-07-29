"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Globe, Search, UserPlus, X } from "lucide-react";
import type { Member, PendingEdge } from "@/lib/queries/collaboration";
import {
  inviteToProject,
  leaveProject,
  removeMember,
  respondToEdge,
  setMemberRole,
  setOpenToContributors,
} from "@/lib/actions";
import { findPeopleAction } from "@/lib/actions/people";
import { ActionButton } from "@/components/action-button";
import { Avatar } from "@/components/community/feed";

/**
 * The team surface.
 *
 * Order is by what needs a decision: the pending queue first (someone is
 * waiting on you), then the roster, then the invite box. A roster is reference
 * material; a request is a task, and tasks go on top.
 *
 * Roles are shown as a select rather than a menu because there are only three
 * assignable ones and a select says so without being opened.
 */

const ROLES = [
  { key: "maintainer", label: "Maintainer", hint: "Everything but deleting the project" },
  { key: "contributor", label: "Contributor", hint: "Writes tasks, bugs and chat" },
  { key: "viewer", label: "Viewer", hint: "Reads only" },
];

export function TeamPanel({
  projectId,
  members,
  pending,
  role,
  openToContributors,
}: {
  projectId: string;
  members: Member[];
  pending: PendingEdge[];
  role: string;
  openToContributors: boolean;
}) {
  const router = useRouter();
  const canManage = role === "owner" || role === "maintainer";
  const [error, setError] = useState("");

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <p className="card p-3 text-[13px]" style={{ color: "var(--danger)" }} role="alert">
          {error}
        </p>
      )}

      {/* --------------------------------------------------------- queue */}
      {canManage && pending.length > 0 && (
        <section className="card overflow-hidden">
          <h2 className="eyebrow border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
            {pending.length} waiting
          </h2>
          <ul>
            {pending.map((p, i) => (
              <li
                key={p.id}
                className={`flex flex-wrap items-center gap-3 px-4 py-3 ${i > 0 ? "border-t" : ""}`}
                style={i > 0 ? { borderColor: "var(--border-faint)" } : undefined}
              >
                <Avatar author={p} size={32} />
                <div className="min-w-0 flex-1">
                  <Link href={`/u/${p.username}`} className="text-[14px] font-medium hover:underline">
                    {p.name}
                  </Link>
                  <p className="text-[12px]" style={{ color: "var(--text-faint)" }}>
                    {p.direction === "request" ? "asked to join" : "invited"} as {p.role}
                    {p.message && ` — ${p.message}`}
                  </p>
                </div>
                {p.direction === "request" && (
                  <div className="flex gap-2">
                    <ActionButton
                      className="btn btn-primary btn-sm"
                      icon={<Check size={13} />}
                      onClick={async () => {
                        const r = await respondToEdge(p.id, true);
                        if (!r.ok) setError(r.error);
                        else router.refresh();
                      }}
                    >
                      Approve
                    </ActionButton>
                    <ActionButton
                      className="btn btn-ghost btn-sm"
                      icon={<X size={13} />}
                      onClick={async () => {
                        await respondToEdge(p.id, false);
                        router.refresh();
                      }}
                    >
                      Decline
                    </ActionButton>
                  </div>
                )}
                {p.direction === "invite" && (
                  <span className="chip chip-sm">Invite sent</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* -------------------------------------------------------- roster */}
      <section className="card overflow-hidden">
        <h2 className="eyebrow border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
          {members.length} {members.length === 1 ? "member" : "members"}
        </h2>
        <ul>
          {members.map((m, i) => (
            <li
              key={m.id}
              className={`flex flex-wrap items-center gap-3 px-4 py-3 ${i > 0 ? "border-t" : ""}`}
              style={i > 0 ? { borderColor: "var(--border-faint)" } : undefined}
            >
              <Avatar author={m} size={32} />
              <div className="min-w-0 flex-1">
                <Link href={`/u/${m.username}`} className="text-[14px] font-medium hover:underline">
                  {m.name}
                </Link>
                <p className="text-[12px] capitalize" style={{ color: "var(--text-faint)" }}>
                  {m.role}
                </p>
              </div>

              {canManage && m.role !== "owner" ? (
                <div className="flex items-center gap-2">
                  <select
                    className="select h-8 text-[13px]"
                    value={m.role}
                    aria-label={`Role for ${m.name}`}
                    onChange={async (e) => {
                      const r = await setMemberRole(projectId, m.id, e.target.value);
                      if (!r.ok) setError(r.error);
                      router.refresh();
                    }}
                  >
                    {ROLES.map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <ActionButton
                    className="btn-icon-sm"
                    aria-label={`Remove ${m.name}`}
                    onClick={async () => {
                      const r = await removeMember(projectId, m.id);
                      if (!r.ok) setError(r.error);
                      router.refresh();
                    }}
                  >
                    <X size={14} />
                  </ActionButton>
                </div>
              ) : (
                <span className="chip chip-sm capitalize">{m.role}</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {canManage && <Invite projectId={projectId} onError={setError} />}

      {/* ------------------------------------------------------ openness */}
      {canManage && (
        <section className="card flex flex-wrap items-center gap-3 p-4">
          <Globe size={16} style={{ color: "var(--text-faint)" }} />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium">Open to contributors</p>
            <p className="text-meta text-[12px]">
              Lists the project in Discover and lets people ask to join.
            </p>
          </div>
          <OpenToggle projectId={projectId} initial={openToContributors} />
        </section>
      )}

      {role !== "owner" && (
        <ActionButton
          className="btn btn-ghost btn-sm self-start"
          style={{ color: "var(--danger)" }}
          onClick={async () => {
            const r = await leaveProject(projectId);
            if (!r.ok) setError(r.error);
            else router.push("/projects");
          }}
        >
          Leave project
        </ActionButton>
      )}
    </div>
  );
}

function OpenToggle({ projectId, initial }: { projectId: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [, start] = useTransition();
  return (
    <ActionButton
      className={`btn btn-sm ${on ? "btn-primary" : "btn-secondary"}`}
      onClick={() => {
        const next = !on;
        setOn(next);
        start(() => void setOpenToContributors(projectId, next));
      }}
    >
      {on ? "On" : "Off"}
    </ActionButton>
  );
}

function Invite({ projectId, onError }: { projectId: string; onError: (m: string) => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("contributor");
  const [results, setResults] = useState<
    { userId: string; name: string; avatarUrl: string; username: string }[]
  >([]);
  const [searching, setSearching] = useState(false);

  async function search(value: string) {
    setQ(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    setResults(await findPeopleAction(value));
    setSearching(false);
  }

  return (
    <section className="card p-4">
      <h2 className="eyebrow">Invite someone</h2>

      <div className="mt-3 flex flex-wrap gap-2">
        <div className="search min-w-0 flex-1">
          <Search size={15} />
          <input
            className="search-input"
            placeholder="Search by name, handle or email"
            value={q}
            onChange={(e) => search(e.target.value)}
            aria-label="Search people"
          />
        </div>
        <select
          className="select"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          aria-label="Invite as"
        >
          {ROLES.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <p className="text-meta mt-1.5 text-[12px]">
        {ROLES.find((r) => r.key === role)?.hint}
      </p>

      {q.trim().length >= 2 && (
        <ul className="mt-3 flex flex-col gap-1">
          {searching && (
            <li className="text-[13px]" style={{ color: "var(--text-faint)" }}>
              Searching…
            </li>
          )}
          {!searching && results.length === 0 && (
            <li className="text-[13px]" style={{ color: "var(--text-faint)" }}>
              Nobody matches that.
            </li>
          )}
          {results.map((p) => (
            <li key={p.userId} className="flex items-center gap-2.5">
              <Avatar author={p} size={28} />
              <span className="min-w-0 flex-1 truncate text-[13px]">{p.name}</span>
              <ActionButton
                className="btn btn-secondary btn-sm"
                icon={<UserPlus size={13} />}
                onClick={async () => {
                  const r = await inviteToProject(projectId, p.userId, role);
                  if (!r.ok) onError(r.error);
                  setQ("");
                  setResults([]);
                  router.refresh();
                }}
              >
                Invite
              </ActionButton>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
