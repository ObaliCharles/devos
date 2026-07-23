"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import {
  createLesson,
  createPhase,
  createSkill,
  deleteFlag,
  deleteLesson,
  setUserRole,
  upsertFlag,
} from "@/lib/actions";
import { EmptyState } from "./ui";

function useWrite() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return { pending, run: (fn: () => Promise<unknown>) => start(async () => { await fn(); router.refresh(); }) };
}

/* ------------------------------------------------------------------- users */

export function UsersTable({ users, meId }: { users: Record<string, unknown>[]; meId: string }) {
  const { pending, run } = useWrite();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["User", "Email", "Role", "XP", "Streak", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={String(u.id)} style={{ borderBottom: "1px solid var(--border)" }}>
                <td className="px-4 py-3 font-medium">{String(u.name)}{String(u.id) === meId ? " (you)" : ""}</td>
                <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>{String(u.email)}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full px-2 py-0.5 text-[11px]" style={{ background: u.role === "admin" ? "var(--primary-faint)" : "var(--surface-2)", color: u.role === "admin" ? "var(--primary)" : "var(--text-muted)" }}>
                    {String(u.role)}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums">{String(u.xp)}</td>
                <td className="px-4 py-3 tabular-nums">{String(u.streak)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    className="btn btn-ghost h-7 px-2.5 text-[12px]"
                    disabled={pending}
                    onClick={() => run(async () => {
                      const res = await setUserRole(String(u.id), u.role === "admin" ? "user" : "admin");
                      if (!res.ok && res.message) setError(res.message);
                    })}
                  >
                    {u.role === "admin" ? "Demote" : "Make admin"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ feature flags */

export function FlagsPanel({ flags }: { flags: Record<string, unknown>[] }) {
  const { pending, run } = useWrite();
  const [key, setKey] = useState("");
  const [desc, setDesc] = useState("");

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-4">
        <p className="eyebrow">New flag</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input className="input" value={key} onChange={(e) => setKey(e.target.value)} placeholder="flag-key" aria-label="Key" />
          <input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What it controls" aria-label="Description" />
          <button className="btn btn-primary shrink-0" disabled={!key.trim() || pending} onClick={() => { run(() => upsertFlag({ key, enabled: false, description: desc })); setKey(""); setDesc(""); }}>
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      {flags.length === 0 ? (
        <EmptyState title="No feature flags" body="Flags let you turn parts of the app on and off without a deploy. Add one, then read it wherever you gate a feature." />
      ) : (
        <ul className="flex flex-col gap-2">
          {flags.map((f) => (
            <li key={String(f.id)} className="card flex items-center justify-between p-4">
              <div>
                <p className="font-[family-name:var(--font-mono)] text-sm">{String(f.key)}</p>
                {f.description ? <p className="text-xs" style={{ color: "var(--text-muted)" }}>{String(f.description)}</p> : null}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => run(() => upsertFlag({ key: String(f.key), enabled: !f.enabled, description: f.description as string | undefined }))}
                  className="relative h-6 w-11 rounded-full transition-colors"
                  style={{ background: f.enabled ? "var(--success)" : "var(--border-strong)" }}
                  aria-label={f.enabled ? "Disable" : "Enable"}
                  role="switch"
                  aria-checked={Boolean(f.enabled)}
                >
                  <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all" style={{ left: f.enabled ? "22px" : "2px" }} />
                </button>
                <button onClick={() => run(() => deleteFlag(String(f.id)))} style={{ color: "var(--danger)" }} aria-label="Delete"><Trash2 size={14} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------- roadmap builder ---- */

export function ContentBuilder({ content }: { content: { roadmapTitle: string; phases: Record<string, unknown>[] } | null }) {
  const { pending, run } = useWrite();
  const [phaseTitle, setPhaseTitle] = useState("");
  const [skillDraft, setSkillDraft] = useState<Record<string, string>>({});
  const [lessonDraft, setLessonDraft] = useState<Record<string, string>>({});

  if (!content) {
    return <EmptyState title="No roadmap" body="Run npm run seed to load the starter roadmap, then build on it here." />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-4">
        <p className="eyebrow">Add a phase to {content.roadmapTitle}</p>
        <div className="mt-3 flex gap-2">
          <input className="input" value={phaseTitle} onChange={(e) => setPhaseTitle(e.target.value)} placeholder="Phase title" aria-label="Phase title" />
          <button className="btn btn-primary shrink-0" disabled={!phaseTitle.trim() || pending} onClick={() => { run(() => createPhase({ title: phaseTitle })); setPhaseTitle(""); }}>
            <Plus size={15} /> Phase
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {content.phases.map((phase) => {
          const pid = String(phase.id);
          const skills = (phase.skills ?? []) as Record<string, unknown>[];
          return (
            <section key={pid} className="card p-4">
              <h3 className="font-semibold">Phase {String(phase.order)} · {String(phase.title)}</h3>

              <div className="mt-3 flex flex-col gap-3 pl-3" style={{ borderLeft: "2px solid var(--border)" }}>
                {skills.map((skill) => {
                  const sid = String(skill.id);
                  const lessons = (skill.lessons ?? []) as Record<string, unknown>[];
                  return (
                    <div key={sid}>
                      <p className="text-sm font-medium">{String(skill.title)}</p>
                      <ul className="mt-1.5 flex flex-col gap-1 pl-3">
                        {lessons.map((l) => (
                          <li key={String(l.id)} className="flex items-center justify-between text-[13px]" style={{ color: "var(--text-muted)" }}>
                            <span>{String(l.order)}. {String(l.title)}</span>
                            <button onClick={() => run(() => deleteLesson(String(l.id)))} style={{ color: "var(--danger)" }} aria-label="Delete lesson"><Trash2 size={12} /></button>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-1.5 flex gap-1.5 pl-3">
                        <input
                          className="input h-8 text-[12px]"
                          value={lessonDraft[sid] ?? ""}
                          onChange={(e) => setLessonDraft((d) => ({ ...d, [sid]: e.target.value }))}
                          placeholder="New lesson title"
                          aria-label="New lesson"
                        />
                        <button className="btn btn-ghost h-8 shrink-0 px-2 text-[12px]" disabled={!lessonDraft[sid]?.trim() || pending} onClick={() => { run(() => createLesson({ skillId: sid, title: lessonDraft[sid] })); setLessonDraft((d) => ({ ...d, [sid]: "" })); }}>
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                <div className="flex gap-1.5">
                  <input
                    className="input h-8 text-[12px]"
                    value={skillDraft[pid] ?? ""}
                    onChange={(e) => setSkillDraft((d) => ({ ...d, [pid]: e.target.value }))}
                    placeholder="New skill title"
                    aria-label="New skill"
                  />
                  <button className="btn btn-ghost h-8 shrink-0 px-2 text-[12px]" disabled={!skillDraft[pid]?.trim() || pending} onClick={() => { run(() => createSkill({ phaseId: pid, title: skillDraft[pid] })); setSkillDraft((d) => ({ ...d, [pid]: "" })); }}>
                    <Plus size={13} /> Skill
                  </button>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
