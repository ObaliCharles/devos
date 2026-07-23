"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Save, Trash2 } from "lucide-react";
import { deleteAccount, exportData, updatePreferences, updateProfile } from "@/lib/actions";

type Prefs = {
  theme: string;
  timezone: string;
  reminderHour: number;
  emailDigest: boolean;
  notifyLearning: boolean;
  notifyProjects: boolean;
  notifyReviews: boolean;
  pomodoroMinutes: number;
};

export function SettingsForm({ name, email, prefs }: { name: string; email: string; prefs: Prefs }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [displayName, setDisplayName] = useState(name);
  const [p, setP] = useState<Prefs>(prefs);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState("");

  function save() {
    start(async () => {
      await Promise.all([
        updateProfile({ name: displayName }),
        updatePreferences({ ...p }),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    });
  }

  function download() {
    start(async () => {
      const json = await exportData();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `developeros-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="card p-5">
        <p className="eyebrow">Profile</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium" htmlFor="s-name">Display name</label>
            <input id="s-name" className="input mt-1.5" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="s-email">Email</label>
            <input id="s-email" className="input mt-1.5" value={email} disabled style={{ opacity: 0.6 }} />
            <p className="mt-1 text-[11px]" style={{ color: "var(--text-faint)" }}>Managed by your sign-in provider.</p>
          </div>
        </div>
      </section>

      <section className="card p-5">
        <p className="eyebrow">Preferences</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium" htmlFor="s-theme">Theme</label>
            <select id="s-theme" className="input mt-1.5" value={p.theme} onChange={(e) => {
              setP({ ...p, theme: e.target.value });
              document.documentElement.dataset.theme = e.target.value;
              localStorage.setItem("dos-theme", e.target.value);
            }}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="s-tz">Timezone</label>
            <input id="s-tz" className="input mt-1.5" value={p.timezone} onChange={(e) => setP({ ...p, timezone: e.target.value })} placeholder="e.g. Europe/London (blank = server)" />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="s-reminder">Daily reminder hour</label>
            <input id="s-reminder" type="number" min={0} max={23} className="input mt-1.5" value={p.reminderHour} onChange={(e) => setP({ ...p, reminderHour: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="s-pom">Pomodoro length (min)</label>
            <input id="s-pom" type="number" min={5} max={90} className="input mt-1.5" value={p.pomodoroMinutes} onChange={(e) => setP({ ...p, pomodoroMinutes: Number(e.target.value) })} />
          </div>
        </div>
      </section>

      <section className="card p-5">
        <p className="eyebrow">Notifications</p>
        <div className="mt-4 flex flex-col gap-3">
          {[
            { key: "notifyLearning" as const, label: "Learning reminders" },
            { key: "notifyReviews" as const, label: "Reviews coming due" },
            { key: "notifyProjects" as const, label: "Project deadlines" },
            { key: "emailDigest" as const, label: "Weekly email digest" },
          ].map((row) => (
            <label key={row.key} className="flex items-center justify-between text-sm">
              <span>{row.label}</span>
              <input type="checkbox" checked={p[row.key]} onChange={(e) => setP({ ...p, [row.key]: e.target.checked })} />
            </label>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button className="btn btn-primary" onClick={save} disabled={pending}><Save size={15} /> {saved ? "Saved" : "Save settings"}</button>
      </div>

      <section className="card p-5">
        <p className="eyebrow">Your data</p>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
          Export everything you have created as JSON. Your data is yours; this is the honest half of that promise.
        </p>
        <button className="btn btn-ghost mt-3" onClick={download} disabled={pending}><Download size={15} /> Export my data</button>
      </section>

      <section className="card p-5" style={{ borderColor: "var(--danger)" }}>
        <p className="eyebrow" style={{ color: "var(--danger)" }}>Delete account</p>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
          Permanently deletes your account and everything you own — notes, projects, progress, everything. Shared content stays. Type <strong>DELETE</strong> to confirm.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input className="input max-w-xs" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" aria-label="Type DELETE to confirm" />
          <button
            className="btn btn-ghost"
            style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
            disabled={confirm !== "DELETE" || pending}
            onClick={() => start(async () => { const r = await deleteAccount(confirm); if (r.ok) window.location.href = "/"; })}
          >
            <Trash2 size={15} /> Delete forever
          </button>
        </div>
      </section>
    </div>
  );
}
