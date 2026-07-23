"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Plus, Trash2, X } from "lucide-react";
import { createTask, deleteTask, moveTask, updateTask } from "@/lib/actions";
import { relativeDate, statusColor } from "./ui";

export type KanbanTask = {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  order: number;
  deadline?: string;
  tags: string[];
  checklistDone: number;
  checklistTotal: number;
};

const COLUMNS = [
  { key: "ideas", label: "Ideas" },
  { key: "backlog", label: "Backlog" },
  { key: "todo", label: "Todo" },
  { key: "doing", label: "Doing" },
  { key: "review", label: "Review" },
  { key: "testing", label: "Testing" },
  { key: "done", label: "Done" },
];

const PRIORITIES = ["low", "medium", "high", "critical"];

/**
 * Drag and drop with the HTML5 API rather than a library. DECISIONS 004 says
 * Framer Motion earns its place at drag-and-drop Kanban — that is true for
 * animated reordering, and this is not that: a card moves between columns and
 * the server decides the order. Adding a 40 kB dependency for a dragstart
 * handler would be the thing that decision warns about.
 */
export function Kanban({ projectId, tasks }: { projectId: string; tasks: KanbanTask[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [open, setOpen] = useState<KanbanTask | null>(null);
  const dragCounter = useRef(0);

  // The board updates the instant you drop; the server confirms behind it.
  const [optimistic, applyOptimistic] = useOptimistic(
    tasks,
    (state: KanbanTask[], move: { id: string; status: string }) =>
      state.map((t) => (t.id === move.id ? { ...t, status: move.status } : t))
  );

  const byColumn = (status: string) =>
    optimistic.filter((t) => t.status === status).sort((a, b) => a.order - b.order);

  function drop(status: string) {
    const id = dragging;
    setDragging(null);
    setOver(null);
    dragCounter.current = 0;
    if (!id) return;

    const task = optimistic.find((t) => t.id === id);
    if (!task || task.status === status) return;

    const column = byColumn(status);
    const topOrder = column[0]?.order;

    start(async () => {
      applyOptimistic({ id, status });
      await moveTask(id, status, undefined, topOrder);
      router.refresh();
    });
  }

  function add(status: string) {
    const title = newTitle.trim();
    if (!title) return;
    setNewTitle("");
    setAdding(null);
    start(async () => {
      await createTask({ projectId, title, status });
      router.refresh();
    });
  }

  return (
    <>
      <div className="-mx-6 flex gap-3 overflow-x-auto px-5 pb-4">
        {COLUMNS.map((column) => {
          const items = byColumn(column.key);
          const isOver = over === column.key;

          return (
            <section
              key={column.key}
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={() => setOver(column.key)}
              onDragLeave={() => setOver((o) => (o === column.key ? null : o))}
              onDrop={() => drop(column.key)}
              className="flex w-[260px] shrink-0 flex-col rounded-[var(--radius-card)] border p-2.5 transition-colors"
              style={{
                borderColor: isOver ? "var(--primary)" : "var(--border)",
                background: isOver ? "var(--primary-faint)" : "var(--surface)",
              }}
            >
              <div className="flex items-center justify-between px-1.5 py-1">
                <h3 className="text-[13px] font-semibold">
                  {column.label}
                  <span className="ml-2 tabular-nums" style={{ color: "var(--text-faint)" }}>
                    {items.length}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => { setAdding(column.key); setNewTitle(""); }}
                  className="grid h-6 w-6 place-items-center rounded-md"
                  style={{ color: "var(--text-faint)" }}
                  aria-label={`Add a task to ${column.label}`}
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className="mt-1 flex flex-col gap-2">
                {adding === column.key && (
                  <div className="rounded-[var(--radius-card)] border p-2" style={{ borderColor: "var(--primary)" }}>
                    <textarea
                      className="input min-h-[56px] resize-none text-[13px]"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); add(column.key); }
                        if (e.key === "Escape") setAdding(null);
                      }}
                      placeholder="What needs doing?"
                      autoFocus
                      aria-label="New task title"
                    />
                    <div className="mt-2 flex gap-2">
                      <button className="btn btn-primary h-7 px-2.5 text-[12px]" onClick={() => add(column.key)}>
                        Add
                      </button>
                      <button className="btn btn-ghost h-7 px-2.5 text-[12px]" onClick={() => setAdding(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {items.map((task) => (
                  <article
                    key={task.id}
                    draggable
                    onDragStart={() => setDragging(task.id)}
                    onDragEnd={() => { setDragging(null); setOver(null); }}
                    onClick={() => setOpen(task)}
                    className="cursor-grab rounded-[var(--radius-card)] border p-2.5 transition-opacity active:cursor-grabbing"
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--surface-2)",
                      opacity: dragging === task.id ? 0.4 : 1,
                    }}
                  >
                    <p className="text-[13px] leading-snug">{task.title}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px]">
                      <span style={{ color: statusColor(task.priority) }}>{task.priority}</span>
                      {task.checklistTotal > 0 && (
                        <span style={{ color: "var(--text-faint)" }}>
                          {task.checklistDone}/{task.checklistTotal}
                        </span>
                      )}
                      {task.deadline && (
                        <span className="flex items-center gap-1" style={{ color: "var(--text-faint)" }}>
                          <Calendar size={10} /> {relativeDate(task.deadline)}
                        </span>
                      )}
                    </div>
                  </article>
                ))}

                {items.length === 0 && adding !== column.key && (
                  <p className="px-1.5 py-3 text-[12px]" style={{ color: "var(--text-faint)" }}>
                    Nothing here
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {open && (
        <TaskDialog
          task={open}
          onClose={() => setOpen(null)}
          onSaved={() => { setOpen(null); router.refresh(); }}
        />
      )}
    </>
  );
}

function TaskDialog({
  task,
  onClose,
  onSaved,
}: {
  task: KanbanTask;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState(task.priority);
  const [deadline, setDeadline] = useState(task.deadline ? task.deadline.slice(0, 10) : "");
  const [status, setStatus] = useState(task.status);
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      await updateTask(task.id, { title, description, priority, status, deadline: deadline || null });
      onSaved();
    });
  }

  function remove() {
    start(async () => {
      await deleteTask(task.id);
      onSaved();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      style={{ background: "rgb(0 0 0 / 0.5)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="card w-full max-w-lg p-5"
        style={{ borderRadius: "var(--radius-dialog)" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Edit task"
      >
        <div className="flex items-start justify-between gap-3">
          <input
            className="input border-transparent bg-transparent px-0 text-lg font-semibold"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Task title"
          />
          <button
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-card)]"
            style={{ color: "var(--text-muted)" }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <textarea
          className="input mt-3 min-h-[110px] resize-y text-[13px]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does done look like?"
          aria-label="Task description"
        />

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="eyebrow" htmlFor="t-status">Status</label>
            <select id="t-status" className="input mt-1.5" value={status} onChange={(e) => setStatus(e.target.value)}>
              {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="eyebrow" htmlFor="t-priority">Priority</label>
            <select id="t-priority" className="input mt-1.5" value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="eyebrow" htmlFor="t-deadline">Due</label>
            <input
              id="t-deadline"
              type="date"
              className="input mt-1.5"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button className="btn btn-ghost" style={{ color: "var(--danger)" }} onClick={remove} disabled={pending}>
            <Trash2 size={15} /> Delete
          </button>
          <div className="flex gap-2">
            <button className="btn btn-ghost" onClick={onClose} disabled={pending}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={pending || !title.trim()}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
