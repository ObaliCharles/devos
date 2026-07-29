import Link from "next/link";
import { CheckCircle2, Clock, Flame, Play, Target, X, Zap } from "lucide-react";
import type {
  AttemptRow,
  Collection,
  PracticeTeaser,
  WeekProgress,
} from "@/lib/queries/practice-home";
import { Heatmap } from "@/components/heatmap";

/**
 * The top of Practice.
 *
 * Everything here answers "what should I solve next" — the pick for today, the
 * one you walked away from, how far through the week you are, which topics you
 * have not touched. Nothing is a metric for its own sake: a practice page that
 * opens on charts is an analytics dashboard wearing a practice page's name.
 *
 * Server component. Nothing on it is interactive beyond links, so it ships no
 * JavaScript at all.
 */

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "var(--success)",
  medium: "var(--warning)",
  hard: "var(--danger)",
};

export function PracticeHome({
  daily,
  dailyDone,
  continueWith,
  week,
  collections,
  attempts,
  activity,
  streak,
}: {
  daily: PracticeTeaser;
  dailyDone: boolean;
  continueWith: PracticeTeaser;
  week: WeekProgress;
  collections: Collection[];
  attempts: AttemptRow[];
  activity: { day: string; minutes: number }[];
  streak: number;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* The two things worth doing right now, side by side. Continue takes the
          left slot when it exists, because an abandoned attempt is a stronger
          call to action than a fresh one. */}
      <div className="grid gap-4 md:grid-cols-2">
        {continueWith && (
          <Teaser
            eyebrow="Continue"
            note="You started this one."
            challenge={continueWith}
            cta="Pick it back up"
          />
        )}
        {daily && (
          <Teaser
            eyebrow="Today's challenge"
            note={dailyDone ? "Done for today." : "Fresh pick, changes at midnight."}
            challenge={daily}
            cta={dailyDone ? "Review it" : "Solve it"}
            done={dailyDone}
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          {/* -------------------------------------------------- the week */}
          <section className="card p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="eyebrow">This week</h2>
              <span className="num text-[13px]">
                <b>{week.solved}</b>
                <span style={{ color: "var(--text-faint)" }}> / {week.goal} solved</span>
              </span>
            </div>

            <div className="mt-3 flex gap-1.5">
              {week.days.map((d) => (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1.5">
                  <div
                    className="h-9 w-full rounded-[4px]"
                    title={`${d.day}: ${d.solved} solved`}
                    style={{
                      background:
                        d.solved > 0 ? "var(--primary)" : "var(--surface-3)",
                      // Today gets a ring rather than a fill, so an unsolved
                      // today is visibly *today* and visibly not done.
                      boxShadow: d.isToday ? "inset 0 0 0 1.5px var(--primary-muted)" : undefined,
                    }}
                  />
                  <span
                    className="text-[11px]"
                    style={{ color: d.isToday ? "var(--text)" : "var(--text-faint)" }}
                  >
                    {d.label}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* ------------------------------------------------ collections */}
          {collections.length > 0 && (
            <section className="card overflow-hidden">
              <h2 className="eyebrow border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                Topics
              </h2>
              <ul>
                {collections.map((c, i) => {
                  const pct = c.total > 0 ? Math.round((c.solved / c.total) * 100) : 0;
                  return (
                    <li
                      key={c.key}
                      className={i > 0 ? "border-t" : ""}
                      style={i > 0 ? { borderColor: "var(--border-faint)" } : undefined}
                    >
                      <Link
                        href={`/practice?tag=&status=all&q=${encodeURIComponent(c.key)}`}
                        className="row-link flex items-center gap-3 px-4 py-2.5"
                      >
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                          {c.label}
                        </span>
                        <span className="progress progress-sm w-24 shrink-0">
                          <span className="progress-bar" style={{ width: `${pct}%` }} />
                        </span>
                        <span
                          className="num w-14 shrink-0 text-right text-[12px]"
                          style={{ color: "var(--text-faint)" }}
                        >
                          {c.solved}/{c.total}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          {/* -------------------------------------------------- activity */}
          <section className="card p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="eyebrow">Activity</h2>
              {streak > 0 && (
                <span
                  className="num flex items-center gap-1 text-[12px]"
                  style={{ color: "var(--warning)" }}
                >
                  <Flame size={11} /> {streak}
                </span>
              )}
            </div>
            <div className="mt-3">
              <Heatmap days={activity} />
            </div>
          </section>

          {/* --------------------------------------------------- attempts */}
          <section className="card overflow-hidden">
            <h2 className="eyebrow border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
              Recent submissions
            </h2>
            {attempts.length === 0 ? (
              <p className="text-body p-4 text-[13px]">Nothing submitted yet.</p>
            ) : (
              <ul>
                {attempts.map((a, i) => (
                  <li
                    key={a.id}
                    className={i > 0 ? "border-t" : ""}
                    style={i > 0 ? { borderColor: "var(--border-faint)" } : undefined}
                  >
                    <Link
                      href={`/learning/challenges/${a.challengeId}`}
                      className="row-link flex items-center gap-2.5 px-4 py-2"
                    >
                      {a.passed ? (
                        <CheckCircle2 size={13} className="shrink-0" style={{ color: "var(--success)" }} />
                      ) : (
                        <X size={13} className="shrink-0" style={{ color: "var(--danger)" }} />
                      )}
                      <span className="min-w-0 flex-1 truncate text-[13px]">{a.title}</span>
                      <span className="num shrink-0 text-[12px]" style={{ color: "var(--text-faint)" }}>
                        {a.testsPassed}/{a.testsTotal}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Teaser({
  eyebrow,
  note,
  challenge,
  cta,
  done,
}: {
  eyebrow: string;
  note: string;
  challenge: NonNullable<PracticeTeaser>;
  cta: string;
  done?: boolean;
}) {
  const colour = DIFFICULTY_COLOR[challenge.difficulty] ?? "var(--text-muted)";
  return (
    <section className="card flex flex-col gap-3 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="eyebrow">{eyebrow}</h2>
        <span className="text-[12px]" style={{ color: "var(--text-faint)" }}>
          {note}
        </span>
      </div>

      <div className="flex items-start gap-3">
        <span
          className="mt-1 h-8 w-[3px] shrink-0 rounded-full"
          style={{ background: colour }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">{challenge.title}</p>
          <p
            className="mt-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[12px]"
            style={{ color: "var(--text-faint)" }}
          >
            <span className="capitalize" style={{ color: colour }}>
              {challenge.difficulty}
            </span>
            <span className="capitalize">{challenge.category}</span>
            <span className="num flex items-center gap-1">
              <Zap size={11} style={{ color: "var(--warning)" }} /> {challenge.xp}
            </span>
            <span className="num flex items-center gap-1">
              <Clock size={11} /> {challenge.estimatedMinutes}m
            </span>
          </p>
        </div>
      </div>

      <Link
        href={`/learning/challenges/${challenge.id}`}
        className={`btn btn-sm mt-auto w-fit ${done ? "btn-secondary" : "btn-primary"}`}
      >
        {done ? <Target size={14} /> : <Play size={14} />} {cta}
      </Link>
    </section>
  );
}
