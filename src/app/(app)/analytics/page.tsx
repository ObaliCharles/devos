import { BookOpen, Clock, Target, TrendingUp } from "lucide-react";
import { requireUser } from "@/lib/user";
import { getAnalytics, levelInfo } from "@/lib/queries";
import { syncAchievements } from "@/lib/actions";
import { Heatmap } from "@/components/heatmap";
import { StatTile } from "@/components/ui";

export const dynamic = "force-dynamic";

const KIND_COLOR: Record<string, string> = {
  lesson: "var(--primary)",
  project: "var(--info)",
  task: "var(--info)",
  practice: "var(--success)",
  review: "var(--warning)",
  notes: "var(--text-muted)",
  focus: "var(--danger)",
  other: "var(--text-faint)",
};

export default async function AnalyticsOverviewPage() {
  const user = await requireUser();
  // A cheap place to catch up any badges earned since the last visit.
  await syncAchievements();
  const data = await getAnalytics(user._id);
  const level = levelInfo(user.xp ?? 0);

  const maxKind = Math.max(1, ...data.timeByKind.map((k) => k.minutes));
  const totalKindMinutes = data.timeByKind.reduce((sum, k) => sum + k.minutes, 0);

  return (
    <div className="section-stack">
      <section className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Level"
          value={level.level}
          sub={`${level.title} · ${level.need - level.into} XP to next`}
          icon={<TrendingUp size={17} />}
          tone="primary"
        />
        <StatTile
          label="Total time"
          value={`${data.totalHours}h`}
          sub="tracked across everything"
          icon={<Clock size={17} />}
          tone="info"
        />
        <StatTile
          label="Lessons mastered"
          value={data.lessonsMastered}
          sub="past the gate"
          icon={<BookOpen size={17} />}
          tone="success"
        />
        <StatTile
          label="Challenges solved"
          value={data.challengesSolved}
          sub="tests passing"
          icon={<Target size={17} />}
          tone="warning"
        />
      </section>

      {/* -------------------------------------------------------- Heatmap */}
      <section className="card p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="title-section">Activity</h2>
          <span className="text-meta">Last 12 weeks</span>
        </div>
        <div className="mt-5">
          <Heatmap days={data.heatmap} />
        </div>
      </section>

      {/* --------------------------------------------------- Time by kind */}
      <section className="card p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="title-section">Where your time goes</h2>
          {totalKindMinutes > 0 && (
            <span className="text-meta num">
              {Math.round(totalKindMinutes / 6) / 10}h total
            </span>
          )}
        </div>

        {data.timeByKind.length === 0 ? (
          <p className="text-body mt-4 text-[13.5px]">
            No time tracked yet. Master a lesson, run a focus session, or log time on a project and
            the breakdown appears here.
          </p>
        ) : (
          <ul className="mt-5 flex flex-col gap-3">
            {data.timeByKind.map((k) => (
              <li key={k.kind} className="flex items-center gap-4">
                <span className="w-[76px] shrink-0 text-[13px] capitalize" style={{ color: "var(--text-muted)" }}>
                  {k.kind}
                </span>
                <span className="progress h-[18px] flex-1 rounded-[var(--radius-xs)]" style={{ background: "var(--surface-2)" }}>
                  <span
                    className="block h-full rounded-[var(--radius-xs)]"
                    style={{
                      width: `${(k.minutes / maxKind) * 100}%`,
                      background: KIND_COLOR[k.kind] ?? "var(--primary)",
                      opacity: 0.85,
                    }}
                  />
                </span>
                <span
                  className="num w-[52px] shrink-0 text-right text-[12.5px]"
                  style={{ color: "var(--text-faint)" }}
                >
                  {Math.round((k.minutes / 60) * 10) / 10}h
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
