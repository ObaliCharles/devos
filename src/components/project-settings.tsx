"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Save, Trash2 } from "lucide-react";
import { archiveProject, deleteProject, updateProject } from "@/lib/actions";

export type ProjectSettings = {
  id: string;
  title: string;
  description: string;
  goal: string;
  status: string;
  category: string;
  difficulty: string;
  visibility: string;
  repoUrl: string;
  liveUrl: string;
  figmaUrl: string;
  deadline: string;
  archived: boolean;
  skillIds: string[];
};

const STATUSES = ["planning", "building", "testing", "deployed", "paused", "complete"];
const CATEGORIES = ["web", "mobile", "api", "cli", "library", "data", "ai", "game", "other"];
const DIFFICULTIES = ["beginner", "intermediate", "advanced"];

export function ProjectSettingsForm({
  project,
  skills,
}: {
  project: ProjectSettings;
  skills: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState("");
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState(project);
  const set = <K extends keyof ProjectSettings>(key: K, value: ProjectSettings[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function save() {
    start(async () => {
      await updateProject(form.id, {
        title: form.title,
        description: form.description,
        goal: form.goal,
        status: form.status,
        category: form.category,
        difficulty: form.difficulty,
        visibility: form.visibility,
        repoUrl: form.repoUrl,
        liveUrl: form.liveUrl,
        figmaUrl: form.figmaUrl,
        deadline: form.deadline || null,
        skillIds: form.skillIds,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    });
  }

  function toggleSkill(id: string) {
    set("skillIds", form.skillIds.includes(id) ? form.skillIds.filter((s) => s !== id) : [...form.skillIds, id]);
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="card p-5">
        <p className="eyebrow">General</p>
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium" htmlFor="ps-title">Name</label>
            <input id="ps-title" className="input mt-1.5" value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="ps-desc">Description</label>
            <input id="ps-desc" className="input mt-1.5" value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="ps-goal">Goal</label>
            <textarea id="ps-goal" className="input mt-1.5 min-h-[80px] resize-y" value={form.goal} onChange={(e) => set("goal", e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Status", key: "status" as const, options: STATUSES },
              { label: "Category", key: "category" as const, options: CATEGORIES },
              { label: "Difficulty", key: "difficulty" as const, options: DIFFICULTIES },
            ].map(({ label, key, options }) => (
              <div key={key}>
                <label className="text-sm font-medium" htmlFor={`ps-${key}`}>{label}</label>
                <select id={`ps-${key}`} className="input mt-1.5" value={form[key]} onChange={(e) => set(key, e.target.value)}>
                  {options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium" htmlFor="ps-deadline">Deadline</label>
              <input id="ps-deadline" type="date" className="input mt-1.5" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="ps-vis">Visibility</label>
              <select id="ps-vis" className="input mt-1.5" value={form.visibility} onChange={(e) => set("visibility", e.target.value)}>
                <option value="private">Private</option>
                <option value="public">Public (shows on your portfolio)</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Repository", key: "repoUrl" as const, ph: "https://github.com/…" },
              { label: "Live URL", key: "liveUrl" as const, ph: "https://…" },
              { label: "Figma", key: "figmaUrl" as const, ph: "https://figma.com/…" },
            ].map(({ label, key, ph }) => (
              <div key={key}>
                <label className="text-sm font-medium" htmlFor={`ps-${key}`}>{label}</label>
                <input id={`ps-${key}`} className="input mt-1.5" value={form[key]} onChange={(e) => set(key, e.target.value)} placeholder={ph} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card p-5">
        <p className="eyebrow">Skills practised</p>
        <p className="mt-1.5 text-sm" style={{ color: "var(--text-muted)" }}>
          This is the link that makes the project show up on a skill page and count towards your portfolio.
        </p>
        {skills.length === 0 ? (
          <p className="mt-3 text-sm" style={{ color: "var(--text-faint)" }}>No skills in the roadmap yet.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {skills.map((s) => {
              const on = form.skillIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSkill(s.id)}
                  aria-pressed={on}
                  className={`chip ${on ? "chip-on" : ""}`}
                >
                  {s.title}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <div className="flex items-center gap-3">
        <button className="btn btn-primary" onClick={save} disabled={pending}>
          <Save size={15} /> Save changes
        </button>
        {saved && <span className="text-sm" style={{ color: "var(--success)" }}>Saved</span>}
      </div>

      <section className="card p-5" style={{ borderColor: "var(--danger)" }}>
        <p className="eyebrow" style={{ color: "var(--danger)" }}>Danger zone</p>
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{form.archived ? "Restore project" : "Archive project"}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Archiving hides it from the main list. Nothing is deleted.
              </p>
            </div>
            <button
              className="btn btn-ghost"
              disabled={pending}
              onClick={() => start(async () => { await archiveProject(form.id, !form.archived); router.refresh(); })}
            >
              <Archive size={15} /> {form.archived ? "Restore" : "Archive"}
            </button>
          </div>

          <div className="border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <p className="text-sm font-medium">Delete permanently</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              This removes the project and every task, bug, milestone and doc with it. Type the project name to confirm.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                className="input max-w-xs"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={form.title}
                aria-label="Type the project name to confirm deletion"
              />
              <button
                className="btn btn-ghost"
                style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
                disabled={confirm !== form.title || pending}
                onClick={() => start(async () => { await deleteProject(form.id); router.push("/projects"); })}
              >
                <Trash2 size={15} /> Delete forever
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
