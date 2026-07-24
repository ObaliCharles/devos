"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Plus, Trash2, Wand2, X } from "lucide-react";
import { deletePrompt, savePrompt } from "@/lib/actions";
import { EmptyState } from "./ui";

type PromptItem = { id: string; title: string; category: string; body: string; description?: string; mine: boolean };

const CATEGORIES = ["explain", "review", "generate", "improve", "debug", "summarise", "document", "architecture", "interview", "career"];

export function AiPromptLibrary({ prompts }: { prompts: PromptItem[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<PromptItem | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("");

  const visible = filter ? prompts.filter((p) => p.category === filter) : prompts;
  const categories = Array.from(new Set(prompts.map((p) => p.category)));

  function blank(): PromptItem {
    return { id: "", title: "", category: "explain", body: "", mine: true };
  }

  function save() {
    if (!editing?.title.trim() || !editing.body.trim()) return;
    const p = editing;
    start(async () => {
      await savePrompt({ id: p.id || undefined, title: p.title, category: p.category, body: p.body, description: p.description });
      setEditing(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilter("")}
            className={`chip chip-sm ${!filter ? "chip-on" : ""}`}
            aria-pressed={!filter}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`chip chip-sm ${filter === c ? "chip-on" : ""}`}
              aria-pressed={filter === c}
            >
              {c}
            </button>
          ))}
        </div>
        <button className="btn btn-primary shrink-0" onClick={() => setEditing(blank())}>
          <Plus size={15} /> New prompt
        </button>
      </div>

      {editing && (
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <p className="eyebrow">{editing.id ? "Edit prompt" : "New prompt"}</p>
            <button onClick={() => setEditing(null)} aria-label="Cancel" style={{ color: "var(--text-muted)" }}><X size={16} /></button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_160px]">
            <input className="input" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Title" aria-label="Title" />
            <select className="input" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} aria-label="Category">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <textarea className="input mt-2 min-h-[120px] resize-y text-[13px]" value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} placeholder="The prompt text" aria-label="Prompt body" />
          <div className="mt-3 flex gap-2">
            <button className="btn btn-primary" onClick={save} disabled={pending || !editing.title.trim() || !editing.body.trim()}>Save</button>
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}

      {prompts.length === 0 && !editing ? (
        <EmptyState
          icon={<Wand2 size={30} />}
          title="No prompts yet"
          body="Save the prompts you reach for again and again, a code review checklist, a way of asking for an explanation. Copy one into any chat."
          action={<button className="btn btn-primary" onClick={() => setEditing(blank())}><Plus size={15} /> New prompt</button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visible.map((p) => (
            <div key={p.id} className="card flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{p.title}</h3>
                  <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>{p.category}{p.mine ? "" : " · built-in"}</span>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    className="btn btn-ghost h-7 px-2 text-[11px]"
                    onClick={() => { navigator.clipboard?.writeText(p.body); setCopied(p.id); setTimeout(() => setCopied(null), 1500); }}
                  >
                    <Copy size={12} /> {copied === p.id ? "Copied" : "Copy"}
                  </button>
                  {p.mine && (
                    <>
                      <button className="btn btn-ghost h-7 px-2 text-[11px]" onClick={() => setEditing(p)}>Edit</button>
                      <button
                        className="grid h-7 w-7 place-items-center rounded-[var(--radius-card)]"
                        style={{ color: "var(--danger)" }}
                        onClick={() => start(async () => { await deletePrompt(p.id); router.refresh(); })}
                        aria-label={`Delete ${p.title}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <p className="mt-2 line-clamp-4 text-[13px]" style={{ color: "var(--text-muted)" }}>{p.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
