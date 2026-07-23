"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Code2, Copy, Plus, Search, Trash2, X } from "lucide-react";
import { deleteSnippet, saveSnippet } from "@/lib/actions";
import { EmptyState } from "./ui";

export type SnippetItem = {
  id: string;
  title: string;
  description?: string;
  language: string;
  framework?: string;
  code: string;
  tags: string[];
};

const LANGUAGES = ["typescript", "javascript", "python", "sql", "bash", "json", "css", "html", "go", "rust"];

export function SnippetVault({ snippets }: { snippets: SnippetItem[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<SnippetItem | null>(null);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const visible = snippets.filter((s) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return s.title.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.tags.some((t) => t.includes(q));
  });

  function blank(): SnippetItem {
    return { id: "", title: "", description: "", language: "typescript", framework: "", code: "", tags: [] };
  }

  function save() {
    if (!editing?.title.trim()) return;
    const s = editing;
    start(async () => {
      await saveSnippet({
        id: s.id || undefined,
        title: s.title,
        description: s.description,
        language: s.language,
        framework: s.framework,
        code: s.code,
        tags: s.tags,
      });
      setEditing(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-faint)" }} />
          <input className="input pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search snippets" aria-label="Search snippets" />
        </div>
        <button className="btn btn-primary shrink-0" onClick={() => setEditing(blank())}>
          <Plus size={15} /> New snippet
        </button>
      </div>

      {editing && (
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <p className="eyebrow">{editing.id ? "Edit snippet" : "New snippet"}</p>
            <button onClick={() => setEditing(null)} aria-label="Cancel" style={{ color: "var(--text-muted)" }}><X size={16} /></button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input className="input" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Title, e.g. JWT middleware" aria-label="Title" />
            <input className="input" value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="What it does" aria-label="Description" />
            <select className="input" value={editing.language} onChange={(e) => setEditing({ ...editing, language: e.target.value })} aria-label="Language">
              {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <input className="input" value={editing.framework ?? ""} onChange={(e) => setEditing({ ...editing, framework: e.target.value })} placeholder="Framework (optional)" aria-label="Framework" />
          </div>
          <textarea
            className="input mt-2 min-h-[180px] resize-y font-[family-name:var(--font-mono)] text-[13px]"
            value={editing.code}
            onChange={(e) => setEditing({ ...editing, code: e.target.value })}
            placeholder="Paste the code"
            aria-label="Code"
          />
          <input
            className="input mt-2"
            value={editing.tags.join(", ")}
            onChange={(e) => setEditing({ ...editing, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
            placeholder="tags, comma separated"
            aria-label="Tags"
          />
          <div className="mt-4 flex gap-2">
            <button className="btn btn-primary" onClick={save} disabled={pending || !editing.title.trim()}>Save</button>
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}

      {snippets.length === 0 && !editing ? (
        <EmptyState
          icon={<Code2 size={30} />}
          title="No snippets yet"
          body="The bit of code you rewrite from memory every project — the Mongo connection, the auth middleware, the error handler. Save it once."
          action={<button className="btn btn-primary" onClick={() => setEditing(blank())}><Plus size={15} /> New snippet</button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visible.map((s) => (
            <div key={s.id} className="card flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{s.title}</h3>
                  <p className="text-[11px]" style={{ color: "var(--text-faint)" }}>
                    {s.language}{s.framework ? ` · ${s.framework}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button className="btn btn-ghost h-7 px-2 text-[11px]" onClick={() => setEditing(s)}>Edit</button>
                  <button
                    className="grid h-7 w-7 place-items-center rounded-[var(--radius-card)]"
                    style={{ color: "var(--danger)" }}
                    onClick={() => start(async () => { await deleteSnippet(s.id); router.refresh(); })}
                    aria-label={`Delete ${s.title}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {s.description && <p className="mt-1 text-[13px]" style={{ color: "var(--text-muted)" }}>{s.description}</p>}

              <div className="relative mt-3">
                <pre
                  className="max-h-52 overflow-auto rounded-[var(--radius-control)] border p-3 text-[12px]"
                  style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
                >
                  <code>{s.code}</code>
                </pre>
                <button
                  className="btn btn-ghost absolute right-2 top-2 h-7 px-2 text-[11px]"
                  onClick={() => {
                    navigator.clipboard?.writeText(s.code);
                    setCopied(s.id);
                    setTimeout(() => setCopied(null), 1500);
                  }}
                >
                  {copied === s.id ? <Check size={12} /> : <Copy size={12} />} {copied === s.id ? "Copied" : "Copy"}
                </button>
              </div>

              {s.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {s.tags.map((t) => (
                    <span key={t} className="rounded-full px-1.5 py-0.5 text-[10px]" style={{ background: "var(--surface-2)", color: "var(--text-faint)" }}>
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
