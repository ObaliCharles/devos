"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Users, X } from "lucide-react";
import type { GroupCard } from "@/lib/queries/community";
import { createGroup } from "@/lib/actions";
import { ActionButton } from "@/components/action-button";
import { JoinButton } from "./feed";

/**
 * All groups, with creation in place.
 *
 * Creating a group is one form and no route, for the same reason the composer
 * is inline on the feed: the friction of starting is what decides whether a
 * community has anything in it.
 */
export function GroupsIndex({ groups }: { groups: GroupCard[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    const result = await createGroup({ name, description, topic });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/community/groups/${result.slug}`);
  }

  return (
    <div className="section-stack">
      {open ? (
        <section className="card flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="eyebrow">New group</h2>
            <button className="btn-icon-sm" onClick={() => setOpen(false)} aria-label="Cancel">
              <X size={14} />
            </button>
          </div>
          <input
            className="input"
            placeholder="Name — e.g. React Patterns"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            autoFocus
          />
          <textarea
            className="textarea min-h-20"
            placeholder="What is this group for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <input
            className="input"
            placeholder="Topic — react, career, algorithms"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          {error && (
            <p className="text-[13px]" style={{ color: "var(--danger)" }} role="alert">
              {error}
            </p>
          )}
          <ActionButton
            className="btn btn-primary self-start"
            disabled={!name.trim()}
            onClick={submit}
          >
            Create group
          </ActionButton>
        </section>
      ) : (
        <button className="btn btn-primary w-fit" onClick={() => setOpen(true)}>
          <Plus size={15} /> New group
        </button>
      )}

      {groups.length === 0 ? (
        <div className="card grid place-items-center gap-2 p-8 text-center">
          <span className="icon-tile icon-tile-lg">
            <Users size={18} />
          </span>
          <p className="text-[14px] font-medium">No groups yet</p>
          <p className="text-body max-w-sm text-[13px]">
            A group is the home for one topic — its own feed, its own members.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((g) => (
            <li key={g.id} className="card flex flex-col gap-3 p-4">
              <Link href={`/community/groups/${g.slug}`} className="flex items-start gap-3">
                <span className="icon-tile icon-tile-lg shrink-0">
                  <Users size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">{g.name}</span>
                  <span className="text-meta mt-0.5 block line-clamp-2 text-[12px]">
                    {g.description || "No description yet."}
                  </span>
                </span>
              </Link>
              <div className="mt-auto flex items-center gap-2">
                <span className="num text-[12px]" style={{ color: "var(--text-faint)" }}>
                  {g.memberCount} {g.memberCount === 1 ? "member" : "members"} · {g.postCount}{" "}
                  {g.postCount === 1 ? "post" : "posts"}
                </span>
                <span className="ml-auto">
                  <JoinButton group={g} />
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
