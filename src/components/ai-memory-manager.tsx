"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pin, Plus, Trash2, X } from "lucide-react";
import { deleteMemory, saveMemory, toggleMemoryPin } from "@/lib/actions";
import { EmptyState } from "./ui";

type MemoryItem = { id: string; key: string; value: string; kind: string; pinned: boolean; source?: string };

const KINDS = ["fact", "goal", "stack", "preference", "weakness", "project"];

/**
 * The memory page is a plain CRUD, on purpose. Chapter 8 wants the user to see
 * and edit everything the assistant remembers; the honest version of that is
 * editable rows, not an opaque store you have to trust.
 */
export function AiMemoryManager({ memory }: { memory: MemoryItem[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [kind, setKind] = useState("fact");

  function add() {
    if (!key.trim() || !value.trim()) return;
    start(async () => {
      await saveMemory({ key, value, kind });
      setKey(""); setValue(""); setKind("fact"); setAdding(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Everything here is fed to the assistant as context. Pin what matters most; delete anything you would rather it forgot.
        </p>
        <button className="btn btn-primary shrink-0" onClick={() => setAdding((a) => !a)}>
          <Plus size={15} /> Add
        </button>
      </div>

      {adding && (
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <p className="eyebrow">New memory</p>
            <button onClick={() => setAdding(false)} aria-label="Cancel" style={{ color: "var(--text-muted)" }}><X size={16} /></button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-[160px_1fr]">
            <input className="input" value={key} onChange={(e) => setKey(e.target.value)} placeholder="e.g. Current goal" aria-label="Key" />
            <input className="input" value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. Ship the backend of DeveloperOS" aria-label="Value" />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <select className="input w-40" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Kind">
              {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <button className="btn btn-primary" onClick={add} disabled={pending || !key.trim() || !value.trim()}>Save</button>
          </div>
        </div>
      )}

      {memory.length === 0 && !adding ? (
        <EmptyState
          title="Nothing remembered yet"
          body="As you use the assistant it will note things worth keeping — your goal, your stack, what you find hard. You can add facts here directly too."
          action={<button className="btn btn-primary" onClick={() => setAdding(true)}><Plus size={15} /> Add a memory</button>}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {memory.map((m) => (
            <li key={m.id} className="card flex items-start gap-3 p-4">
              <button
                onClick={() => start(async () => { await toggleMemoryPin(m.id); router.refresh(); })}
                style={{ color: m.pinned ? "var(--primary)" : "var(--text-faint)" }}
                aria-label="Pin"
                className="mt-0.5"
              >
                <Pin size={14} style={m.pinned ? { fill: "var(--primary)" } : undefined} />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{m.key}</p>
                  <span className="rounded-full px-1.5 py-0.5 text-[10px]" style={{ background: "var(--surface-2)", color: "var(--text-faint)" }}>
                    {m.kind}
                  </span>
                </div>
                <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>{m.value}</p>
              </div>
              <button
                onClick={() => start(async () => { await deleteMemory(m.id); router.refresh(); })}
                style={{ color: "var(--danger)" }}
                aria-label={`Forget ${m.key}`}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
