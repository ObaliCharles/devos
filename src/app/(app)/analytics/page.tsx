import { requireUser } from "@/lib/user";
import { getAnalytics, levelInfo } from "@/lib/queries";
import { syncAchievements } from "@/lib/actions";
import { Heatmap } from "@/components/heatmap";
import { Section, Stat, StatRow } from "@/components/ui";

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
    /* Reference implementation for the section primitives. Nothing on this page
       is an object — four readings and two regions — so nothing on it is a
       card. The four numbers were four tiles with four different icons, which
       said "these are separate things"; one divided row says "these belong
       together", which is what a stat row always means. The icons are gone
       because they were decoration: a clock beside "Total time" adds nothing a
       reader did not already have from the word. */
    <div className="page-body">
      <Section major={false}>
        <StatRow className="stagger">
          <Stat
            label="Level"
            value={level.level}
            sub={`${level.title} · ${level.need - level.into} XP to next`}
          />
          <Stat label="Total time" value={`${data.totalHours}h`} sub="tracked across everything" />
          <Stat label="Lessons mastered" value={data.lessonsMastered} sub="past the gate" />
          <Stat label="Challenges solved" value={data.challengesSolved} sub="tests passing" />
        </StatRow>
      </Section>

      {/* -------------------------------------------------------- Heatmap */}
      <Section
        title="Activity"
        action={<span className="text-meta">Last 12 weeks</span>}
      >
        <Heatmap days={data.heatmap} />
      </Section>

      {/* --------------------------------------------------- Time by kind */}
      <Section
        title="Where your time goes"
        action={
          totalKindMinutes > 0 ? (
            <span className="text-meta num">{Math.round(totalKindMinutes / 6) / 10}h total</span>
          ) : undefined
        }
      >
        {data.timeByKind.length === 0 ? (
          <p className="text-body mt-4 text-ui">
            No time tracked yet. Master a lesson, run a focus session, or log time on a project and
            the breakdown appears here.
          </p>
        ) : (
          <ul className="mt-5 flex flex-col gap-3">
            {data.timeByKind.map((k) => (
              <li key={k.kind} className="flex items-center gap-4">
                <span className="w-[76px] shrink-0 text-ui capitalize" style={{ color: "var(--text-muted)" }}>
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
                  className="num w-[52px] shrink-0 text-right text-micro"
                  style={{ color: "var(--text-faint)" }}
                >
                  {Math.round((k.minutes / 60) * 10) / 10}h
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
