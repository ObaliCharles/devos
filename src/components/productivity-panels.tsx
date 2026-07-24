"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Flame, Pause, Play, Plus, RotateCcw, Trash2 } from "lucide-react";
import {
  bumpGoalProgress,
  createGoal,
  createHabit,
  deleteGoal,
  deleteHabit,
  logFocusSession,
  toggleHabitToday,
} from "@/lib/actions";
import { EmptyState, ProgressBar } from "./ui";

function useWrite() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return { pending, run: (fn: () => Promise<unknown>) => start(async () => { await fn(); router.refresh(); }) };
}

/* ------------------------------------------------------------------- goals */

const METRICS = [
  { key: "minutes", label: "Minutes studied" },
  { key: "lessons", label: "Lessons mastered" },
  { key: "challenges", label: "Challenges solved" },
  { key: "notes", label: "Notes written" },
  { key: "tasks", label: "Tasks done" },
  { key: "reviews", label: "Reviews done" },
  { key: "custom", label: "Custom (manual)" },
];
const PERIODS = ["day", "week", "month", "quarter", "year"];

export function GoalsPanel({ goals }: { goals: Record<string, unknown>[] }) {
  const { pending, run } = useWrite();
  const [title, setTitle] = useState("");
  const [metric, setMetric] = useState("minutes");
  const [target, setTarget] = useState("");
  const [period, setPeriod] = useState("week");

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-4">
        <p className="eyebrow">New goal</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_150px_100px_120px_auto]">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Study 5 hours" aria-label="Title" />
          <select className="input" value={metric} onChange={(e) => setMetric(e.target.value)} aria-label="Metric">
            {METRICS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
          <input className="input" type="number" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Target" aria-label="Target" />
          <select className="input" value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Period">
            {PERIODS.map((p) => <option key={p} value={p}>per {p}</option>)}
          </select>
          <button className="btn btn-primary" disabled={!title.trim() || !target || pending} onClick={() => { run(() => createGoal({ title, metric, target: Number(target), period })); setTitle(""); setTarget(""); }}>
            <Plus size={15} />
          </button>
        </div>
      </div>

      {goals.length === 0 ? (
        <EmptyState title="No goals set" body="A goal is measured automatically from what you do, study minutes, lessons mastered, challenges solved. Set one and it tracks itself." />
      ) : (
        <ul className="flex flex-col gap-3">
          {goals.map((g) => {
            const value = Number(g.value);
            const target = Number(g.target);
            return (
              <li key={String(g.id)} className="card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{String(g.title)}</p>
                    <p className="text-xs" style={{ color: "var(--text-faint)" }}>{String(g.metric)} · per {String(g.period)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {g.metric === "custom" && (
                      <button className="btn btn-ghost h-8 px-2.5 text-[12px]" onClick={() => run(() => bumpGoalProgress(String(g.id), 1))} disabled={pending}>+1</button>
                    )}
                    <span className="text-sm font-semibold tabular-nums" style={{ color: g.achieved ? "var(--success)" : "var(--text)" }}>
                      {value}/{target}
                    </span>
                    <button onClick={() => run(() => deleteGoal(String(g.id)))} style={{ color: "var(--danger)" }} aria-label="Delete"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="mt-3">
                  <ProgressBar value={value} total={target} tone={g.achieved ? "success" : "primary"} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ habits */

export function HabitsPanel({ habits }: { habits: Record<string, unknown>[] }) {
  const { pending, run } = useWrite();
  const [title, setTitle] = useState("");

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-4">
        <p className="eyebrow">New habit</p>
        <div className="mt-3 flex gap-2">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Solve one challenge a day" aria-label="Habit" />
          <button className="btn btn-primary shrink-0" disabled={!title.trim() || pending} onClick={() => { run(() => createHabit({ title })); setTitle(""); }}>
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      {habits.length === 0 ? (
        <EmptyState title="No habits yet" body="The daily things that compound: a challenge a day, a note a day. Tick them off and watch the streak grow." />
      ) : (
        <ul className="flex flex-col gap-3">
          {habits.map((h) => {
            const recent = (h.recent ?? []) as { day: string; done: boolean }[];
            return (
              <li key={String(h.id)} className="card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => run(() => toggleHabitToday(String(h.id)))}
                      disabled={pending}
                      aria-label={h.doneToday ? "Undo today" : "Mark done today"}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border"
                      style={{ background: h.doneToday ? "var(--success)" : "transparent", borderColor: h.doneToday ? "var(--success)" : "var(--border-strong)", color: "#04140d" }}
                    >
                      {Boolean(h.doneToday) && <Check size={16} strokeWidth={3} />}
                    </button>
                    <div>
                      <p className="font-medium">{String(h.title)}</p>
                      <p className="flex items-center gap-1 text-xs" style={{ color: Number(h.currentStreak) > 0 ? "var(--warning)" : "var(--text-faint)" }}>
                        <Flame size={11} /> {String(h.currentStreak)} day streak · best {String(h.longestStreak)}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => run(() => deleteHabit(String(h.id)))} style={{ color: "var(--danger)" }} aria-label="Delete"><Trash2 size={14} /></button>
                </div>
                <div className="mt-3 flex gap-1">
                  {recent.map((d) => (
                    <div key={d.day} className="h-2.5 flex-1 rounded-[2px]" style={{ background: d.done ? String(h.colour) : "var(--border)" }} title={d.day} />
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- pomodoro */

export function FocusPanel({ today }: { today: { minutes: number; count: number; recent: Record<string, unknown>[] } }) {
  const { run } = useWrite();
  const [minutes, setMinutes] = useState(25);
  const [intent, setIntent] = useState("");
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [logged, setLogged] = useState(false);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    tick.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          // Session complete, log it once.
          setRunning(false);
          setLogged(true);
          run(() => logFocusSession({ minutes, intent }));
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => { if (tick.current) clearInterval(tick.current); };
  }, [running, minutes, intent, run]);

  function reset(m = minutes) {
    setRunning(false);
    setRemaining(m * 60);
    setLogged(false);
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const pct = 1 - remaining / (minutes * 60);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="card grid place-items-center p-10">
        <div className="text-center">
          <div className="relative mx-auto h-52 w-52">
            <svg width={208} height={208} className="-rotate-90">
              <circle cx={104} cy={104} r={94} fill="none" stroke="var(--border)" strokeWidth={8} />
              <circle
                cx={104} cy={104} r={94} fill="none" stroke="var(--primary)" strokeWidth={8} strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 94} strokeDashoffset={(1 - pct) * 2 * Math.PI * 94}
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <span className="text-5xl font-bold tabular-nums">{mm}:{ss}</span>
            </div>
          </div>

          {logged && <p className="mt-4 text-sm" style={{ color: "var(--success)" }}>Session logged. Nice work.</p>}

          <div className="mt-6 flex items-center justify-center gap-3">
            {!running ? (
              <button className="btn btn-primary" onClick={() => { setLogged(false); setRunning(true); }}>
                <Play size={15} /> {remaining === minutes * 60 ? "Start" : "Resume"}
              </button>
            ) : (
              <button className="btn btn-ghost" onClick={() => setRunning(false)}><Pause size={15} /> Pause</button>
            )}
            <button className="btn btn-ghost" onClick={() => reset()}><RotateCcw size={15} /> Reset</button>
          </div>

          <div className="mt-5 flex justify-center gap-2">
            {[15, 25, 50].map((m) => (
              <button
                key={m}
                onClick={() => { setMinutes(m); reset(m); }}
                className={`chip ${minutes === m ? "chip-on" : ""}`}
                aria-pressed={minutes === m}
              >
                {m} min
              </button>
            ))}
          </div>
          <input
            className="input mt-4 max-w-xs"
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="What are you focusing on? (optional)"
            aria-label="Focus intent"
          />
        </div>
      </div>

      <div className="card p-4">
        <p className="eyebrow">Today</p>
        <p className="mt-2 text-3xl font-bold tabular-nums">{today.minutes}<span className="text-lg" style={{ color: "var(--text-faint)" }}> min</span></p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{today.count} focus sessions</p>
        <ul className="mt-4 flex flex-col gap-2">
          {today.recent.map((s) => (
            <li key={String(s.id)} className="flex items-center justify-between text-sm">
              <span style={{ color: "var(--text-muted)" }}>{String(s.intent || "Focus")}</span>
              <span className="tabular-nums" style={{ color: "var(--text-faint)" }}>{String(s.minutes)}m</span>
            </li>
          ))}
          {today.recent.length === 0 && <li className="text-sm" style={{ color: "var(--text-faint)" }}>No sessions yet today.</li>}
        </ul>
      </div>
    </div>
  );
}
