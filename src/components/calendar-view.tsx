"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { createEvent, deleteEvent, toggleEventDone } from "@/lib/actions";

type Item = {
  id: string;
  title: string;
  kind: string;
  at: string;
  done: boolean;
  href?: string;
  source: string;
};

/**
 * The month shown is driven by the URL (?y=&m=), so paging is plain navigation
 * and the server refetches — no client-side date fetching, and a month is a
 * shareable link. Only user-created events can be ticked or deleted; the items
 * pulled in from elsewhere (milestones, interviews, reviews) link back to
 * where they actually live.
 *
 * Layout is a two-pane workspace: the grid is for orientation, the rail is for
 * doing. Reading a month and acting on a day are different tasks and they
 * should not share the same 92px box.
 */

const KINDS = [
  { key: "study", label: "Learning", color: "var(--success)" },
  { key: "project", label: "Project", color: "var(--primary)" },
  { key: "practice", label: "Practice", color: "var(--info)" },
  { key: "interview", label: "Interview", color: "var(--warning)" },
  { key: "deadline", label: "Deadline", color: "var(--danger)" },
  { key: "focus", label: "Focus", color: "var(--danger)" },
  { key: "personal", label: "Personal", color: "var(--text-muted)" },
] as const;

const KIND_COLOR: Record<string, string> = Object.fromEntries(
  KINDS.map((k) => [k.key, k.color]),
);

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Local-time key. `toISOString` would shift the day for anyone west of UTC. */
function keyOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function timeOf(at: string) {
  return new Date(at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function CalendarView({
  items,
  year,
  month,
}: {
  items: Item[];
  year: number;
  month: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [composing, setComposing] = useState<string | null>(null);

  const todayKey = keyOf(new Date());
  const [selected, setSelected] = useState<string>(() => {
    const today = new Date();
    // Land on today when the visible month contains it, otherwise the 1st.
    return today.getFullYear() === year && today.getMonth() === month
      ? keyOf(today)
      : keyOf(new Date(year, month, 1));
  });

  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const byDay = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const it of items) {
      const k = keyOf(new Date(it.at));
      const list = map.get(k);
      if (list) list.push(it);
      else map.set(k, [it]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => +new Date(a.at) - +new Date(b.at));
    }
    return map;
  }, [items]);

  // A full 6×7 grid including leading/trailing days, so the calendar never
  // changes height between months — nothing below it jumps on navigation.
  const cells = useMemo(() => {
    const out: { date: Date; inMonth: boolean }[] = [];
    const lead = first.getDay();
    for (let i = lead; i > 0; i--) {
      out.push({ date: new Date(year, month, 1 - i), inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      out.push({ date: new Date(year, month, d), inMonth: true });
    }
    while (out.length % 7 !== 0 || out.length < 42) {
      out.push({
        date: new Date(year, month, daysInMonth + (out.length - lead - daysInMonth) + 1),
        inMonth: false,
      });
      if (out.length >= 42) break;
    }
    return out;
  }, [year, month, daysInMonth, first]);

  const prev = month === 0 ? { y: year - 1, m: 11 } : { y: year, m: month - 1 };
  const next = month === 11 ? { y: year + 1, m: 0 } : { y: year, m: month + 1 };

  const selectedItems = byDay.get(selected) ?? [];
  const selectedDate = new Date(`${selected}T12:00:00`);

  const upcoming = useMemo(
    () =>
      items
        .filter((it) => +new Date(it.at) >= Date.now() && !it.done)
        .sort((a, b) => +new Date(a.at) - +new Date(b.at))
        .slice(0, 5),
    [items],
  );

  function refresh() {
    router.refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_312px]">
      {/* ================================================================ Grid */}
      <section className="panel overflow-hidden">
        {/* -------------------------------------------------------- Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
          <div className="flex items-center gap-1">
            <Link
              href={`/calendar?y=${prev.y}&m=${prev.m}`}
              className="btn-icon btn-icon-sm"
              aria-label="Previous month"
              scroll={false}
            >
              <ChevronLeft size={16} />
            </Link>
            <Link
              href={`/calendar?y=${next.y}&m=${next.m}`}
              className="btn-icon btn-icon-sm"
              aria-label="Next month"
              scroll={false}
            >
              <ChevronRight size={16} />
            </Link>
          </div>

          <h2 className="title-section min-w-0 truncate">{monthName}</h2>

          <div className="ml-auto flex items-center gap-2">
            <Link href="/calendar" className="btn btn-ghost btn-sm" scroll={false}>
              Today
            </Link>
            <button
              onClick={() => setComposing(selected)}
              className="btn btn-primary btn-sm"
            >
              <Plus size={14} /> Add event
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------ Weekday row */}
        <div className="grid grid-cols-7 border-b">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="overline py-2 text-center"
              style={{ color: "var(--text-faint)" }}
            >
              <span className="hidden sm:inline">{d}</span>
              <span className="sm:hidden">{d[0]}</span>
            </div>
          ))}
        </div>

        {/* ------------------------------------------------------------ Cells */}
        <div className="grid grid-cols-7">
          {cells.map(({ date, inMonth }, i) => {
            const key = keyOf(date);
            const dayItems = byDay.get(key) ?? [];
            const isToday = key === todayKey;
            const isSelected = key === selected;

            return (
              <button
                key={key + i}
                onClick={() => setSelected(key)}
                onDoubleClick={() => setComposing(key)}
                aria-label={`${date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}, ${dayItems.length} events`}
                aria-current={isToday ? "date" : undefined}
                aria-pressed={isSelected}
                className="group relative flex h-[104px] flex-col items-stretch gap-1 border-b border-r p-1.5 text-left last:border-r-0"
                style={{
                  background: isSelected ? "var(--primary-faint)" : "transparent",
                  opacity: inMonth ? 1 : 0.38,
                  transition: "background var(--dur-fast) var(--ease)",
                }}
              >
                <span className="flex items-center justify-between">
                  <span
                    className="num grid h-[22px] min-w-[22px] place-items-center rounded-full px-1 text-[12px]"
                    style={
                      isToday
                        ? {
                            background: "var(--primary)",
                            color: "var(--primary-ink)",
                            fontWeight: 700,
                          }
                        : {
                            color: isSelected ? "var(--primary)" : "var(--text-muted)",
                            fontWeight: isSelected ? 600 : 500,
                          }
                    }
                  >
                    {date.getDate()}
                  </span>
                  {/* Hover affordance rather than a permanently visible + on
                      every one of 42 cells */}
                  <span
                    className="btn-icon btn-icon-sm h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden
                  >
                    <Plus size={11} />
                  </span>
                </span>

                <span className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
                  {dayItems.slice(0, 2).map((it) => (
                    <span
                      key={it.id}
                      className="flex items-center gap-1.5 truncate rounded-[var(--radius-xs)] px-1.5 py-[3px] text-[10.5px] font-medium"
                      style={{
                        background: `color-mix(in srgb, ${KIND_COLOR[it.kind] ?? "var(--primary)"} 14%, transparent)`,
                        color: "var(--text)",
                        textDecoration: it.done ? "line-through" : undefined,
                        opacity: it.done ? 0.55 : 1,
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: KIND_COLOR[it.kind] ?? "var(--primary)" }}
                      />
                      <span className="truncate">{it.title}</span>
                    </span>
                  ))}
                  {dayItems.length > 2 && (
                    <span className="px-1.5 text-[10px]" style={{ color: "var(--text-faint)" }}>
                      +{dayItems.length - 2} more
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* -------------------------------------------------------- Colour key */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          {KINDS.filter((k) => k.key !== "focus").map((k) => (
            <span
              key={k.key}
              className="flex items-center gap-1.5 text-[11.5px]"
              style={{ color: "var(--text-faint)" }}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: k.color }} />
              {k.label}
            </span>
          ))}
        </div>
      </section>

      {/* ================================================================ Rail */}
      <aside className="flex flex-col gap-6">
        {/* ----------------------------------------------------- Selected day */}
        <section className="panel flex flex-col">
          <div className="flex items-start justify-between gap-3 border-b px-4 py-3.5">
            <div className="min-w-0">
              <p className="eyebrow eyebrow-accent">{selected === todayKey ? "Today" : "Selected"}</p>
              <h2 className="title-card mt-1 truncate">
                {selectedDate.toLocaleDateString(undefined, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </h2>
            </div>
            <button
              onClick={() => setComposing(selected)}
              className="btn-icon btn-icon-sm shrink-0"
              aria-label="Add event on this day"
            >
              <Plus size={15} />
            </button>
          </div>

          {selectedItems.length === 0 ? (
            <div className="px-4 py-9 text-center">
              <span className="icon-tile mx-auto mb-3">
                <CalendarDays size={16} />
              </span>
              <p className="text-[13.5px] font-medium">Nothing scheduled</p>
              <p className="text-meta mt-1">
                Deadlines, interviews and reviews land here on their own.
              </p>
              <button
                onClick={() => setComposing(selected)}
                className="btn btn-secondary btn-sm mt-4"
              >
                <Plus size={14} /> Add an event
              </button>
            </div>
          ) : (
            <ul className="flex flex-col p-2">
              {selectedItems.map((it) => (
                <li key={it.id} className="group flex items-start gap-2.5 rounded-[var(--radius-control)] p-2 transition-colors hover:bg-[var(--surface-2)]">
                  <span
                    className="mt-[7px] h-2 w-2 shrink-0 rounded-full"
                    style={{ background: KIND_COLOR[it.kind] ?? "var(--primary)" }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className="block truncate text-[13.5px] font-medium"
                      style={{
                        textDecoration: it.done ? "line-through" : undefined,
                        color: it.done ? "var(--text-faint)" : "var(--text)",
                      }}
                    >
                      {it.title}
                    </span>
                    <span className="text-meta block">
                      {timeOf(it.at)} · <span className="capitalize">{it.kind}</span>
                    </span>
                  </span>

                  <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    {it.source === "event" ? (
                      <>
                        <button
                          onClick={() => start(() => toggleEventDone(it.id).then(refresh))}
                          className="btn-icon btn-icon-sm"
                          disabled={pending}
                          aria-label={it.done ? "Mark as not done" : "Mark as done"}
                          style={{ color: it.done ? "var(--success)" : undefined }}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => start(() => deleteEvent(it.id).then(refresh))}
                          className="btn-icon btn-icon-sm"
                          disabled={pending}
                          aria-label="Delete event"
                          style={{ color: "var(--danger)" }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    ) : it.href ? (
                      <Link href={it.href} className="btn-icon btn-icon-sm" aria-label="Open">
                        <ArrowUpRight size={14} />
                      </Link>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* -------------------------------------------------------- Upcoming */}
        <section className="panel">
          <div className="border-b px-4 py-3.5">
            <h2 className="title-card">Upcoming</h2>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-meta px-4 py-6 text-center">Nothing ahead in this month.</p>
          ) : (
            <ul className="flex flex-col p-2">
              {upcoming.map((it) => {
                const when = new Date(it.at);
                const body = (
                  <>
                    <span
                      className="mt-[7px] h-2 w-2 shrink-0 rounded-full"
                      style={{ background: KIND_COLOR[it.kind] ?? "var(--primary)" }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">{it.title}</span>
                      <span className="text-meta block">
                        {when.toLocaleDateString(undefined, { day: "numeric", month: "short" })} ·{" "}
                        {timeOf(it.at)}
                      </span>
                    </span>
                  </>
                );
                return (
                  <li key={it.id}>
                    {it.href ? (
                      <Link href={it.href} className="row-link flex items-start gap-2.5 p-2">
                        {body}
                      </Link>
                    ) : (
                      <button
                        onClick={() => setSelected(keyOf(when))}
                        className="row-link flex w-full items-start gap-2.5 p-2 text-left"
                      >
                        {body}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </aside>

      {composing && (
        <AddEvent
          day={composing}
          onClose={() => setComposing(null)}
          onDone={() => {
            setComposing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------- Composer */

function AddEvent({
  day,
  onClose,
  onDone,
}: {
  day: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("study");
  const [time, setTime] = useState("09:00");
  const [pending, start] = useTransition();

  const label = new Date(`${day}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  function submit() {
    if (!title.trim() || pending) return;
    start(async () => {
      await createEvent({ title, kind, startAt: `${day}T${time}` });
      onDone();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      style={{ background: "rgb(4 5 8 / 0.6)", backdropFilter: "blur(3px)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="glass-strong scale-in w-full max-w-[420px] p-4"
        style={{ borderRadius: "var(--radius-dialog)", boxShadow: "var(--shadow-xl)" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-event-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">New event</p>
            <h2 id="add-event-title" className="title-card mt-1">
              {label}
            </h2>
          </div>
          <button onClick={onClose} className="btn-icon btn-icon-sm" aria-label="Close">
            <X size={15} />
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          <div>
            <label className="label" htmlFor="event-title">
              Title
            </label>
            <input
              id="event-title"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="What is happening?"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-[1fr_120px] gap-3">
            <div>
              <label className="label" htmlFor="event-kind">
                Type
              </label>
              <select
                id="event-kind"
                className="select"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
              >
                {KINDS.map((k) => (
                  <option key={k.key} value={k.key}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="event-time">
                Time
              </label>
              <input
                id="event-time"
                type="time"
                className="input"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
          <button className="btn btn-primary" disabled={!title.trim() || pending} onClick={submit}>
            {pending ? "Adding…" : "Add event"}
          </button>
        </div>
      </div>
    </div>
  );
}
