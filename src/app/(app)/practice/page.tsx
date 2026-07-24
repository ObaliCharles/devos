import Link from "next/link";
import { Check, Dumbbell, Target, Timer, Zap } from "lucide-react";
import { requireUser } from "@/lib/user";
import { getChallenges, getPracticeStats } from "@/lib/queries";
import { Badge, EmptyState, PageHeader, StatTile, type Tone } from "@/components/ui";

export const dynamic = "force-dynamic";

const LEVELS: { key: string; label: string; tone: Tone }[] = [
  { key: "easy", label: "Easy", tone: "success" },
  { key: "medium", label: "Medium", tone: "warning" },
  { key: "hard", label: "Hard", tone: "danger" },
];

const TONE_BY_LEVEL: Record<string, Tone> = {
  easy: "success",
  medium: "warning",
  hard: "danger",
};

export default async function PracticePage() {
  const user = await requireUser();
  const [challenges, stats] = await Promise.all([
    getChallenges(user._id),
    getPracticeStats(user._id),
  ]);

  const recommended = challenges.filter((c) => !c.solved).slice(0, 3);

  return (
    <div className="page-body">
      <PageHeader
        eyebrow="Practice"
        title="Practice centre"
        description="Reading about code does not make you a developer. Writing it does. Every challenge runs your code against real tests."
        actions={
          <Link href="/practice/challenges" className="btn btn-primary">
            <Dumbbell size={15} /> All challenges
          </Link>
        }
      />

      <section
        className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Practice summary"
      >
        <StatTile
          label="Solved"
          value={stats.solved}
          sub={`of ${stats.total} challenges`}
          icon={<Check size={17} />}
          tone="success"
        />
        <StatTile
          label="Attempts"
          value={stats.attempts}
          sub="all time"
          icon={<Target size={17} />}
          tone="info"
        />
        <StatTile
          label="Accuracy"
          value={`${stats.accuracy}%`}
          sub="passed / attempted"
          icon={<Zap size={17} />}
          tone="warning"
          trend={stats.accuracy >= 60 ? "up" : stats.accuracy > 0 ? "flat" : undefined}
        />
        <StatTile
          label="Remaining"
          value={stats.total - stats.solved}
          sub={stats.total === stats.solved ? "all done" : "to solve"}
          icon={<Dumbbell size={17} />}
          tone="primary"
        />
      </section>

      {challenges.length === 0 ? (
        <EmptyState
          icon={<Dumbbell size={22} />}
          title="No challenges loaded"
          body="Run npm run seed to load the starter challenge set, then refresh this page."
          action={
            <Link href="/learning" className="btn btn-primary">
              Go to the roadmap
              </Link>
          }
        />
      ) : (
        <>
          {/* --------------------------------------------------- Recommended */}
          {recommended.length > 0 && (
            <section className="section-stack">
              <div className="flex items-center gap-2.5">
                <Target size={17} style={{ color: "var(--primary)" }} />
                <h2 className="title-section">Recommended next</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recommended.map((c) => (
                  <Link
                    key={c.id}
                    href={`/practice/challenges/${c.id}`}
                    className="card card-link flex flex-col p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Badge tone={TONE_BY_LEVEL[c.difficulty] ?? "neutral"}>{c.difficulty}</Badge>
                      <span
                        className="num flex items-center gap-1 text-[12px] font-medium"
                        style={{ color: "var(--text-faint)" }}
                      >
                        <Zap size={12} style={{ color: "var(--warning)" }} /> {c.xp} XP
                      </span>
                    </div>
                    <h3 className="title-card mt-3">{c.title}</h3>
                    <p className="text-meta mt-1.5 flex items-center gap-1.5">
                      <Timer size={12} /> ~{c.estimatedMinutes} min · {c.category}
                    </p>
                    <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                      {c.technology.slice(0, 3).map((t) => (
                        <Badge key={t}>{t}</Badge>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ------------------------------------------------- By difficulty */}
          <section className="section-stack">
            <h2 className="title-section">By difficulty</h2>
            <div className="flex flex-col gap-8">
              {LEVELS.map(({ key, label, tone }) => {
                const group = challenges.filter((c) => c.difficulty === key);
                if (group.length === 0) return null;
                const solved = group.filter((c) => c.solved).length;

                return (
                  <div key={key}>
                    <div className="mb-3 flex items-center gap-3">
                      <Badge tone={tone}>{label}</Badge>
                      <span className="num text-[12px]" style={{ color: "var(--text-faint)" }}>
                        {solved}/{group.length} solved
                      </span>
                    </div>

                    <ul className="flex flex-col gap-1.5">
                      {group.map((c) => (
                        <li key={c.id}>
                          <Link
                            href={`/practice/challenges/${c.id}`}
                            className="card card-link flex items-center gap-3.5 p-3.5"
                          >
                            <span
                              className={`icon-tile h-8 w-8 ${c.solved ? "icon-tile-success" : ""}`}
                            >
                              {c.solved ? (
                                <Check size={15} strokeWidth={2.6} />
                              ) : (
                                <Dumbbell size={14} />
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[14px] font-medium">
                                {c.title}
                              </span>
                              <span className="text-meta block truncate">
                                {c.category} · ~{c.estimatedMinutes} min
                                {c.attempts > 0
                                  ? ` · ${c.attempts} attempt${c.attempts === 1 ? "" : "s"}`
                                  : ""}
                              </span>
                            </span>
                            <span
                              className="num flex shrink-0 items-center gap-1 text-[12px]"
                              style={{ color: "var(--text-faint)" }}
                            >
                              <Zap size={12} style={{ color: "var(--warning)" }} /> {c.xp}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
