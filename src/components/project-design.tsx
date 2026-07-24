"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Copy, Plus, Trash2, X } from "lucide-react";
import { deleteEndpoint, deleteSchemaDesign, saveEndpoint, saveSchemaDesign } from "@/lib/actions";
import { EmptyState } from "./ui";

/**
 * The database and API pages. Both are documentation tools, not generators, 
 * the value is that the design lives next to the project instead of in a
 * drawing you made once and never opened again.
 *
 * The schema page does generate Mongoose from what you typed, because at that
 * point it is a mechanical translation and typing it twice invites drift.
 */

const FIELD_TYPES = ["String", "Number", "Boolean", "Date", "ObjectId", "Array", "Mixed"];
const METHODS = ["GET", "POST", "PATCH", "PUT", "DELETE"];

const METHOD_COLOR: Record<string, string> = {
  GET: "var(--info)",
  POST: "var(--success)",
  PATCH: "var(--warning)",
  PUT: "var(--warning)",
  DELETE: "var(--danger)",
};

type Field = {
  name: string;
  type: string;
  required?: boolean;
  unique?: boolean;
  indexed?: boolean;
  ref?: string;
  note?: string;
};

export type SchemaItem = {
  id: string;
  name: string;
  description?: string;
  fields: Field[];
  indexes: string[];
};

/** Turns the designed fields into the Mongoose that would express them. */
function toMongoose(item: SchemaItem) {
  const lines = item.fields.map((f) => {
    const parts: string[] = [];
    if (f.type === "ObjectId") {
      parts.push(`type: Schema.Types.ObjectId`, `ref: "${f.ref || "Model"}"`);
    } else if (f.type === "Array") {
      return `    ${f.name}: [String],`;
    } else {
      parts.push(`type: ${f.type}`);
    }
    if (f.required) parts.push("required: true");
    if (f.unique) parts.push("unique: true");
    if (f.indexed) parts.push("index: true");
    return `    ${f.name}: { ${parts.join(", ")} },`;
  });

  const indexes = item.indexes
    .filter(Boolean)
    .map((i) => `${item.name}Schema.index({ ${i} });`)
    .join("\n");

  const parts = [
    `const ${item.name}Schema = new Schema(`,
    "  {",
    ...lines,
    "  },",
    "  { timestamps: true }",
    ");",
  ];
  if (indexes) parts.push("", indexes);
  return parts.join("\n");
}

export function SchemaDesigner({ projectId, schemas }: { projectId: string; schemas: SchemaItem[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<SchemaItem | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function blank(): SchemaItem {
    return { id: "", name: "", description: "", fields: [{ name: "", type: "String" }], indexes: [] };
  }

  function save() {
    if (!editing?.name.trim()) return;
    const payload = editing;
    start(async () => {
      await saveSchemaDesign({
        projectId,
        schemaId: payload.id || undefined,
        name: payload.name,
        description: payload.description,
        fields: payload.fields.filter((f) => f.name.trim()),
        indexes: payload.indexes.filter(Boolean),
      });
      setEditing(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Design the collections before you write them. ARCHITECTURE.md is right
          that the model is step one, the pages are step four.
        </p>
        <button className="btn btn-primary shrink-0" onClick={() => setEditing(blank())}>
          <Plus size={15} /> Collection
        </button>
      </div>

      {editing && (
        <div className="card p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow">{editing.id ? "Edit collection" : "New collection"}</p>
            <button onClick={() => setEditing(null)} aria-label="Cancel" style={{ color: "var(--text-muted)" }}>
              <X size={16} />
            </button>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input
              className="input"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              placeholder="Collection name, e.g. Task"
              aria-label="Collection name"
            />
            <input
              className="input"
              value={editing.description ?? ""}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              placeholder="What it holds"
              aria-label="Description"
            />
          </div>

          <p className="eyebrow mt-5">Fields</p>
          <div className="mt-2 flex flex-col gap-2">
            {editing.fields.map((field, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <input
                  className="input w-40"
                  value={field.name}
                  onChange={(e) => {
                    const fields = [...editing.fields];
                    fields[i] = { ...field, name: e.target.value };
                    setEditing({ ...editing, fields });
                  }}
                  placeholder="fieldName"
                  aria-label={`Field ${i + 1} name`}
                />
                <select
                  className="input w-28"
                  value={field.type}
                  onChange={(e) => {
                    const fields = [...editing.fields];
                    fields[i] = { ...field, type: e.target.value };
                    setEditing({ ...editing, fields });
                  }}
                  aria-label={`Field ${i + 1} type`}
                >
                  {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                {field.type === "ObjectId" && (
                  <input
                    className="input w-32"
                    value={field.ref ?? ""}
                    onChange={(e) => {
                      const fields = [...editing.fields];
                      fields[i] = { ...field, ref: e.target.value };
                      setEditing({ ...editing, fields });
                    }}
                    placeholder="ref → Model"
                    aria-label={`Field ${i + 1} reference`}
                  />
                )}
                {(["required", "unique", "indexed"] as const).map((flag) => (
                  <label key={flag} className="flex items-center gap-1 text-[12px]" style={{ color: "var(--text-muted)" }}>
                    <input
                      type="checkbox"
                      checked={Boolean(field[flag])}
                      onChange={(e) => {
                        const fields = [...editing.fields];
                        fields[i] = { ...field, [flag]: e.target.checked };
                        setEditing({ ...editing, fields });
                      }}
                    />
                    {flag}
                  </label>
                ))}
                <button
                  onClick={() => setEditing({ ...editing, fields: editing.fields.filter((_, j) => j !== i) })}
                  className="ml-auto grid h-8 w-8 place-items-center rounded-[var(--radius-card)]"
                  style={{ color: "var(--danger)" }}
                  aria-label={`Remove field ${i + 1}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <button
            className="btn btn-ghost mt-2 h-8 px-2.5 text-[12px]"
            onClick={() => setEditing({ ...editing, fields: [...editing.fields, { name: "", type: "String" }] })}
          >
            <Plus size={13} /> Field
          </button>

          <div className="mt-5">
            <label className="eyebrow" htmlFor="s-indexes">Indexes (one per line, e.g. `user: 1, day: -1`)</label>
            <textarea
              id="s-indexes"
              className="input mt-2 min-h-[60px] resize-y font-[family-name:var(--font-mono)] text-[12px]"
              value={editing.indexes.join("\n")}
              onChange={(e) => setEditing({ ...editing, indexes: e.target.value.split("\n") })}
            />
          </div>

          <div className="mt-5 flex gap-2">
            <button className="btn btn-primary" onClick={save} disabled={pending || !editing.name.trim()}>
              Save collection
            </button>
            <button className="btn btn-ghost" onClick={() => setEditing(null)} disabled={pending}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {schemas.length === 0 && !editing ? (
        <EmptyState
          title="No collections designed"
          body="Model the data first. Every structural mistake in a project is cheaper here than after there are rows in it."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {schemas.map((s) => {
            const code = toMongoose(s);
            const isOpen = expanded === s.id;
            return (
              <div key={s.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold">{s.name}</h3>
                    {s.description && (
                      <p className="mt-0.5 text-[13px]" style={{ color: "var(--text-muted)" }}>{s.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      className="btn btn-ghost h-8 px-2.5 text-[12px]"
                      onClick={() => setEditing(s)}
                    >
                      Edit
                    </button>
                    <button
                      className="grid h-8 w-8 place-items-center rounded-[var(--radius-card)]"
                      style={{ color: "var(--danger)" }}
                      onClick={() => start(async () => { await deleteSchemaDesign(s.id); router.refresh(); })}
                      aria-label={`Delete ${s.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <table className="mt-4 w-full text-[13px]">
                  <tbody>
                    {s.fields.map((f) => (
                      <tr key={f.name} style={{ borderTop: "1px solid var(--border)" }}>
                        <td className="py-1.5 pr-3 font-[family-name:var(--font-mono)]">{f.name}</td>
                        <td className="py-1.5 pr-3" style={{ color: "var(--text-muted)" }}>
                          {f.type}{f.ref ? ` → ${f.ref}` : ""}
                        </td>
                        <td className="py-1.5 text-[11px]" style={{ color: "var(--text-faint)" }}>
                          {[f.required && "required", f.unique && "unique", f.indexed && "index"]
                            .filter(Boolean)
                            .join(" · ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <button
                  className="mt-3 flex items-center gap-1.5 text-[12px]"
                  style={{ color: "var(--text-muted)" }}
                  onClick={() => setExpanded(isOpen ? null : s.id)}
                >
                  <ChevronDown size={13} style={{ transform: isOpen ? "rotate(180deg)" : undefined }} />
                  Mongoose
                </button>

                {isOpen && (
                  <div className="relative mt-2">
                    <pre
                      className="overflow-x-auto rounded-[var(--radius-control)] border p-3 text-[12px]"
                      style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
                    >
                      <code>{code}</code>
                    </pre>
                    <button
                      className="btn btn-ghost absolute right-2 top-2 h-7 px-2 text-[11px]"
                      onClick={() => {
                        navigator.clipboard?.writeText(code);
                        setCopied(s.id);
                        setTimeout(() => setCopied(null), 1500);
                      }}
                    >
                      <Copy size={12} /> {copied === s.id ? "Copied" : "Copy"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- API */

export type EndpointItem = {
  id: string;
  method: string;
  path: string;
  group?: string;
  description?: string;
  auth: boolean;
  requestBody?: string;
  responseBody?: string;
};

export function ApiDesigner({ projectId, endpoints }: { projectId: string; endpoints: EndpointItem[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<EndpointItem | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  function blank(): EndpointItem {
    return { id: "", method: "GET", path: "", group: "", description: "", auth: true };
  }

  function save() {
    if (!editing?.path.trim()) return;
    const payload = editing;
    start(async () => {
      await saveEndpoint({
        projectId,
        endpointId: payload.id || undefined,
        method: payload.method,
        path: payload.path,
        group: payload.group,
        description: payload.description,
        auth: payload.auth,
        requestBody: payload.requestBody,
        responseBody: payload.responseBody,
      });
      setEditing(null);
      router.refresh();
    });
  }

  const groups = Array.from(new Set(endpoints.map((e) => e.group || "Ungrouped")));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          The contract, written down. Cheaper than reading the route handler
          every time you forget the response shape.
        </p>
        <button className="btn btn-primary shrink-0" onClick={() => setEditing(blank())}>
          <Plus size={15} /> Endpoint
        </button>
      </div>

      {editing && (
        <div className="card p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow">{editing.id ? "Edit endpoint" : "New endpoint"}</p>
            <button onClick={() => setEditing(null)} aria-label="Cancel" style={{ color: "var(--text-muted)" }}>
              <X size={16} />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <select
              className="input w-28"
              value={editing.method}
              onChange={(e) => setEditing({ ...editing, method: e.target.value })}
              aria-label="Method"
            >
              {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <input
              className="input flex-1"
              value={editing.path}
              onChange={(e) => setEditing({ ...editing, path: e.target.value })}
              placeholder="/api/projects/:id"
              aria-label="Path"
            />
            <input
              className="input w-36"
              value={editing.group ?? ""}
              onChange={(e) => setEditing({ ...editing, group: e.target.value })}
              placeholder="Group"
              aria-label="Group"
            />
          </div>

          <input
            className="input mt-2"
            value={editing.description ?? ""}
            onChange={(e) => setEditing({ ...editing, description: e.target.value })}
            placeholder="What it does"
            aria-label="Description"
          />

          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <textarea
              className="input min-h-[100px] resize-y font-[family-name:var(--font-mono)] text-[12px]"
              value={editing.requestBody ?? ""}
              onChange={(e) => setEditing({ ...editing, requestBody: e.target.value })}
              placeholder='Request body&#10;{ "title": "string" }'
              aria-label="Request body"
            />
            <textarea
              className="input min-h-[100px] resize-y font-[family-name:var(--font-mono)] text-[12px]"
              value={editing.responseBody ?? ""}
              onChange={(e) => setEditing({ ...editing, responseBody: e.target.value })}
              placeholder='Response&#10;{ "id": "string" }'
              aria-label="Response body"
            />
          </div>

          <label className="mt-3 flex items-center gap-2 text-[13px]" style={{ color: "var(--text-muted)" }}>
            <input
              type="checkbox"
              checked={editing.auth}
              onChange={(e) => setEditing({ ...editing, auth: e.target.checked })}
            />
            Requires authentication
          </label>

          <div className="mt-5 flex gap-2">
            <button className="btn btn-primary" onClick={save} disabled={pending || !editing.path.trim()}>
              Save endpoint
            </button>
            <button className="btn btn-ghost" onClick={() => setEditing(null)} disabled={pending}>Cancel</button>
          </div>
        </div>
      )}

      {endpoints.length === 0 && !editing ? (
        <EmptyState title="No endpoints documented" body="Write the contract before the handler. It is faster, and the handler comes out better." />
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <section key={group}>
              <p className="eyebrow mb-2">{group}</p>
              <ul className="flex flex-col gap-2">
                {endpoints
                  .filter((e) => (e.group || "Ungrouped") === group)
                  .map((e) => (
                    <li key={e.id} className="card p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className="w-16 shrink-0 font-[family-name:var(--font-mono)] text-[12px] font-semibold"
                          style={{ color: METHOD_COLOR[e.method] }}
                        >
                          {e.method}
                        </span>
                        <button
                          className="min-w-0 flex-1 truncate text-left font-[family-name:var(--font-mono)] text-[13px]"
                          onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                        >
                          {e.path}
                        </button>
                        {!e.auth && (
                          <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>public</span>
                        )}
                        <button
                          className="btn btn-ghost h-7 px-2 text-[11px]"
                          onClick={() => setEditing(e)}
                        >
                          Edit
                        </button>
                        <button
                          className="grid h-7 w-7 place-items-center rounded-[var(--radius-card)]"
                          style={{ color: "var(--danger)" }}
                          onClick={() => start(async () => { await deleteEndpoint(e.id); router.refresh(); })}
                          aria-label={`Delete ${e.method} ${e.path}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {e.description && (
                        <p className="mt-1.5 text-[13px]" style={{ color: "var(--text-muted)" }}>{e.description}</p>
                      )}

                      {expanded === e.id && (e.requestBody || e.responseBody) && (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {[["Request", e.requestBody], ["Response", e.responseBody]].map(([label, body]) =>
                            body ? (
                              <div key={label as string}>
                                <p className="eyebrow mb-1">{label as string}</p>
                                <pre
                                  className="overflow-x-auto rounded-[var(--radius-control)] border p-2.5 text-[12px]"
                                  style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
                                >
                                  <code>{body as string}</code>
                                </pre>
                              </div>
                            ) : null
                          )}
                        </div>
                      )}
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
