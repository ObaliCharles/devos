"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Flame,
  Github,
  Globe,
  MapPin,
  Pencil,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import type { Profile } from "@/lib/queries/profile";
import { toggleFollow } from "@/lib/actions";
import { ActionButton } from "@/components/action-button";
import { Avatar } from "@/components/community/feed";

/**
 * A public profile.
 *
 * The order is deliberate: identity, then what the person has *done*, then what
 * they say about themselves. Bio and links sit below the contribution graph
 * because a profile is mostly earned, not typed — and a profile with every text
 * field blank still has a streak, a level and 182 days of activity to show.
 *
 * Numbers are all real. Someone on day one reads zero rather than a seeded
 * baseline, which is the honest version and also the one that makes the first
 * solved challenge feel like it moved something.
 */

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "var(--success)",
  medium: "var(--warning)",
  hard: "var(--danger)",
};

export function ProfileView({ profile }: { profile: Profile }) {
  const [following, setFollowing] = useState(profile.isFollowing);
  const [followers, setFollowers] = useState(profile.followers);
  const [error, setError] = useState("");

  const pct = profile.need > 0 ? Math.round((profile.into / profile.need) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      {/* ------------------------------------------------------- identity */}
      <header className="card p-5">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar author={profile} size={72} />

          <div className="min-w-0 flex-1">
            <h1 className="title-page">{profile.name}</h1>
            <p className="num text-[13px]" style={{ color: "var(--text-faint)" }}>
              @{profile.username}
            </p>

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="chip chip-sm" style={{ color: "var(--primary)" }}>
                Level {profile.level} · {profile.title}
              </span>
              {profile.streak > 0 && (
                <span className="chip chip-sm" style={{ color: "var(--warning)" }}>
                  <Flame size={11} /> {profile.streak}-day streak
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {profile.isSelf ? (
              <Link href="/settings" className="btn btn-secondary btn-sm">
                <Pencil size={14} /> Edit profile
              </Link>
            ) : (
              <ActionButton
                className={`btn btn-sm ${following ? "btn-secondary" : "btn-primary"}`}
                onClick={async () => {
                  const result = await toggleFollow(profile.id);
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setFollowing(result.following);
                  setFollowers((n) => n + (result.following ? 1 : -1));
                }}
              >
                {following ? "Following" : "Follow"}
              </ActionButton>
            )}
          </div>
        </div>

        {error && (
          <p className="mt-2 text-[13px]" style={{ color: "var(--danger)" }} role="alert">
            {error}
          </p>
        )}

        {/* XP to the next level — the one progress bar that belongs up here,
            because it is the only number still in motion. */}
        <div className="mt-4">
          <div className="flex items-baseline justify-between text-[12px]">
            <span style={{ color: "var(--text-faint)" }}>
              <span className="num">{profile.xp.toLocaleString()}</span> XP
            </span>
            <span className="num" style={{ color: "var(--text-faint)" }}>
              {profile.into}/{profile.need} to level {profile.level + 1}
            </span>
          </div>
          <div className="progress progress-sm mt-1.5">
            <div className="progress-bar" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t pt-4 text-[13px]"
            style={{ borderColor: "var(--border-faint)" }}>
          <Stat label="Solved" value={profile.solved} icon={<CheckCircle2 size={13} />} />
          <Stat label="Shipped" value={profile.projectsShipped} icon={<Zap size={13} />} />
          <Stat label="Badges" value={profile.badges} icon={<Trophy size={13} />} />
          <Stat label="Posts" value={profile.posts} />
          <Stat label="Followers" value={followers} icon={<Users size={13} />} />
          <Stat label="Following" value={profile.following} />
        </dl>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          {/* ------------------------------------------- recent challenges */}
          <section className="card overflow-hidden">
            <h2 className="eyebrow border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
              Recently solved
            </h2>
            {profile.recentSolves.length === 0 ? (
              <p className="text-body p-4 text-[13px]">
                {profile.isSelf
                  ? "Solve a challenge and it shows up here."
                  : "Nothing solved yet."}
              </p>
            ) : (
              <ul>
                {profile.recentSolves.map((c, i) => (
                  <li
                    key={c.id}
                    className={i > 0 ? "border-t" : ""}
                    style={i > 0 ? { borderColor: "var(--border-faint)" } : undefined}
                  >
                    <Link
                      href={`/learning/challenges/${c.id}`}
                      className="row-link flex items-center gap-3 px-4 py-2.5"
                    >
                      <span
                        className="h-6 w-[3px] shrink-0 rounded-full"
                        style={{ background: DIFFICULTY_COLOR[c.difficulty] ?? "var(--border)" }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate text-[13px]">{c.title}</span>
                      <span
                        className="shrink-0 text-[12px] capitalize"
                        style={{ color: DIFFICULTY_COLOR[c.difficulty] }}
                      >
                        {c.difficulty}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ------------------------------------------------------- about */}
          {(profile.bio || profile.location || profile.website || profile.githubUsername) && (
            <section className="card p-4">
              <h2 className="eyebrow">About</h2>
              {profile.bio && <p className="text-body mt-2 text-[14px]">{profile.bio}</p>}
              <div
                className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[13px]"
                style={{ color: "var(--text-faint)" }}
              >
                {profile.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={13} /> {profile.location}
                  </span>
                )}
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="flex items-center gap-1.5"
                    style={{ color: "var(--primary)" }}
                  >
                    <Globe size={13} /> {profile.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
                {profile.githubUsername && (
                  <a
                    href={`https://github.com/${profile.githubUsername}`}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="flex items-center gap-1.5"
                    style={{ color: "var(--primary)" }}
                  >
                    <Github size={13} /> {profile.githubUsername}
                  </a>
                )}
              </div>
            </section>
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-5">
          {profile.skills.length > 0 && (
            <section className="card p-4">
              <h2 className="eyebrow">Skills</h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {profile.skills.map((s) => (
                  <span key={s} className="chip chip-sm">
                    {s}
                  </span>
                ))}
              </div>
            </section>
          )}

          {profile.badgeNames.length > 0 && (
            <section className="card p-4">
              <h2 className="eyebrow">Badges</h2>
              <ul className="mt-3 flex flex-col gap-1.5">
                {profile.badgeNames.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-[13px]">
                    <Trophy size={13} style={{ color: "var(--warning)" }} />
                    {b}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {profile.groups.length > 0 && (
            <section className="card p-4">
              <h2 className="eyebrow">Groups</h2>
              <ul className="mt-3 flex flex-col gap-1">
                {profile.groups.map((g) => (
                  <li key={g.slug}>
                    <Link
                      href={`/community/groups/${g.slug}`}
                      className="row-link -mx-2 block truncate px-2 py-1.5 text-[13px]"
                    >
                      {g.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card p-4">
            <h2 className="eyebrow">Streak</h2>
            <p className="num mt-2 text-[24px] font-bold">{profile.streak}</p>
            <p className="text-meta text-[12px]">
              current · best {profile.longestStreak}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-1.5">
      {icon && <span style={{ color: "var(--text-faint)" }}>{icon}</span>}
      <dt className="sr-only">{label}</dt>
      <dd className="num font-semibold">{value}</dd>
      <span style={{ color: "var(--text-faint)" }}>{label}</span>
    </div>
  );
}
