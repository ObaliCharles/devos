"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Crown, Swords, Timer, Trophy } from "lucide-react";
import type { LeaderRow, MatchCard, Standing } from "@/lib/queries/compete";
import { createMatch, joinMatch } from "@/lib/actions";
import { ActionButton } from "@/components/action-button";
import { Avatar, ago } from "@/components/community/feed";

/**
 * The arena.
 *
 * A duel is asynchronous: you both get the same challenge and half an hour, and
 * whoever passes first wins. A live side-by-side battle needs a socket and a
 * shared clock; an async duel needs neither, works across timezones, and
 * produces the same rating signal — so the ladder is climbable from day one.
 *
 * The page leads with the one action worth taking, then what is waiting on you,
 * then the ladder. Standing is a strip, not a dashboard: this is a place to
 * play, and a wall of statistics would say otherwise.
 */

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

export function Arena({
  standing,
  active,
  history,
  open,
  leaders,
}: {
  standing: Standing;
  active: MatchCard[];
  history: MatchCard[];
  open: MatchCard[];
  leaders: LeaderRow[];
}) {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<string>("medium");
  const [mode, setMode] = useState<"ranked" | "casual">("ranked");
  const [error, setError] = useState("");

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p className="card p-3 text-[13px]" style={{ color: "var(--danger)" }} role="alert">
          {error}
        </p>
      )}

      {/* ------------------------------------------------------ standing */}
      <section className="card flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
        <div className="flex items-center gap-2.5">
          <Trophy size={18} style={{ color: standing.league.colour }} />
          <div>
            <p className="text-[14px] font-semibold" style={{ color: standing.league.colour }}>
              {standing.league.name}
            </p>
            <p className="num text-[12px]" style={{ color: "var(--text-faint)" }}>
              {standing.rating} rating
              {standing.rank ? ` · #${standing.rank}` : " · unranked"}
            </p>
          </div>
        </div>

        <div className="num flex flex-wrap gap-x-4 text-[13px]" style={{ color: "var(--text-muted)" }}>
          <span>
            <b style={{ color: "var(--success)" }}>{standing.wins}</b> W
          </span>
          <span>
            <b style={{ color: "var(--danger)" }}>{standing.losses}</b> L
          </span>
          <span>{standing.draws} D</span>
          {standing.streak > 1 && (
            <span style={{ color: "var(--warning)" }}>{standing.streak} in a row</span>
          )}
        </div>

        {standing.next && (
          <p className="num ml-auto text-[12px]" style={{ color: "var(--text-faint)" }}>
            {standing.next.needed} to {standing.next.name}
          </p>
        )}
      </section>

      {/* ---------------------------------------------------------- play */}
      <section className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-0 flex-1">
          <h2 className="eyebrow">Start a duel</h2>
          <p className="text-meta mt-1 text-[12px]">
            You both get the same challenge and 30 minutes. First to pass wins; if
            neither does, most passing tests takes it.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              className={`chip chip-sm capitalize ${difficulty === d ? "chip-on" : ""}`}
              aria-pressed={difficulty === d}
              onClick={() => setDifficulty(d)}
            >
              {d}
            </button>
          ))}
          <span className="mx-1 h-4 w-px" style={{ background: "var(--border)" }} />
          {(["ranked", "casual"] as const).map((m) => (
            <button
              key={m}
              className={`chip chip-sm capitalize ${mode === m ? "chip-on" : ""}`}
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
            >
              {m}
            </button>
          ))}
        </div>

        <ActionButton
          className="btn btn-primary"
          icon={<Swords size={15} />}
          onClick={async () => {
            const r = await createMatch(difficulty, mode);
            if (!r.ok) setError(r.error);
            else router.refresh();
          }}
        >
          Open a duel
        </ActionButton>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          {active.length > 0 && (
            <MatchList
              title="Your live duels"
              matches={active}
              render={(m) => (
                <Link href={`/learning/challenges/${m.challengeId}`} className="btn btn-primary btn-sm">
                  {m.you.solved ? "Review" : "Solve it"}
                </Link>
              )}
            />
          )}

          <section className="card overflow-hidden">
            <h2 className="eyebrow border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
              Open duels
            </h2>
            {open.length === 0 ? (
              <p className="text-body p-4 text-[13px]">
                Nobody is waiting. Open one and it appears here for everyone else.
              </p>
            ) : (
              <ul>
                {open.map((m, i) => (
                  <li
                    key={m.id}
                    className={`flex flex-wrap items-center gap-3 px-4 py-3 ${i > 0 ? "border-t" : ""}`}
                    style={i > 0 ? { borderColor: "var(--border-faint)" } : undefined}
                  >
                    {m.opponent && <Avatar author={m.opponent} size={28} />}
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium">{m.opponent?.name ?? "Someone"}</p>
                      <p className="text-[12px]" style={{ color: "var(--text-faint)" }}>
                        {m.difficulty} · {m.mode} · {ago(m.createdAt)}
                      </p>
                    </div>
                    <ActionButton
                      className="btn btn-secondary btn-sm"
                      icon={<Swords size={13} />}
                      onClick={async () => {
                        const r = await joinMatch(m.id);
                        if (!r.ok) setError(r.error);
                        else router.push(`/learning/challenges/${r.challengeId}`);
                      }}
                    >
                      Accept
                    </ActionButton>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {history.length > 0 && (
            <MatchList
              title="Match history"
              matches={history}
              render={(m) => (
                <span
                  className="num text-[13px] font-medium"
                  style={{ color: resultColour(m.result) }}
                >
                  {m.result === "win" ? "Won" : m.result === "loss" ? "Lost" : "Draw"}
                  {m.you.delta !== undefined && m.you.delta !== 0 && (
                    <span className="ml-1.5">
                      {m.you.delta > 0 ? "+" : ""}
                      {m.you.delta}
                    </span>
                  )}
                </span>
              )}
            />
          )}
        </div>

        {/* ------------------------------------------------------ ladder */}
        <aside className="card overflow-hidden lg:sticky lg:top-5">
          <h2 className="eyebrow border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
            Season ladder · {standing.season}
          </h2>
          {leaders.length === 0 ? (
            <p className="text-body p-4 text-[13px]">
              Nobody has played a ranked duel yet. First one on the board.
            </p>
          ) : (
            <ol>
              {leaders.map((l, i) => (
                <li
                  key={l.userId}
                  className={`flex items-center gap-2.5 px-4 py-2 ${i > 0 ? "border-t" : ""}`}
                  style={{
                    ...(i > 0 ? { borderColor: "var(--border-faint)" } : {}),
                    background: l.isMe ? "var(--primary-faint)" : undefined,
                  }}
                >
                  <span className="num w-5 shrink-0 text-[12px]" style={{ color: "var(--text-faint)" }}>
                    {i + 1}
                  </span>
                  {i === 0 && <Crown size={13} style={{ color: "var(--warning)" }} />}
                  <Link
                    href={`/u/${l.username}`}
                    className="min-w-0 flex-1 truncate text-[13px] hover:underline"
                  >
                    {l.name}
                  </Link>
                  <span className="num shrink-0 text-[13px] font-medium" style={{ color: l.colour }}>
                    {l.rating}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </div>
  );
}

function resultColour(result: MatchCard["result"]) {
  if (result === "win") return "var(--success)";
  if (result === "loss") return "var(--danger)";
  return "var(--text-muted)";
}

function MatchList({
  title,
  matches,
  render,
}: {
  title: string;
  matches: MatchCard[];
  render: (m: MatchCard) => React.ReactNode;
}) {
  return (
    <section className="card overflow-hidden">
      <h2 className="eyebrow border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
        {title}
      </h2>
      <ul>
        {matches.map((m, i) => (
          <li
            key={m.id}
            className={`flex flex-wrap items-center gap-3 px-4 py-3 ${i > 0 ? "border-t" : ""}`}
            style={i > 0 ? { borderColor: "var(--border-faint)" } : undefined}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{m.challengeTitle}</p>
              <p className="text-[12px]" style={{ color: "var(--text-faint)" }}>
                vs {m.opponent?.name ?? "—"} · {m.difficulty} · {m.mode}
                {m.status === "active" && m.expiresAt && (
                  <span className="ml-1.5" style={{ color: "var(--warning)" }}>
                    <Timer size={10} className="inline" /> ends {ago(m.expiresAt)}
                  </span>
                )}
              </p>
            </div>
            {render(m)}
          </li>
        ))}
      </ul>
    </section>
  );
}
