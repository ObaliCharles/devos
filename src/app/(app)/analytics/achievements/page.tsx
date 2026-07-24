import { Award, Lock } from "lucide-react";
import { requireUser } from "@/lib/user";
import { getAchievements } from "@/lib/queries";
import { syncAchievements } from "@/lib/actions";
import { TIER_COLOR } from "@/lib/achievements";

export const dynamic = "force-dynamic";

export default async function AchievementsPage() {
  const user = await requireUser();
  await syncAchievements();
  const achievements = await getAchievements(user._id, user.xp ?? 0, user.currentStreak ?? 0);

  const unlocked = achievements.filter((a) => a.unlocked);
  const locked = achievements.filter((a) => !a.unlocked);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        {unlocked.length} of {achievements.length} unlocked. Badges are earned from real work, mastering lessons, solving challenges, shipping projects.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[...unlocked, ...locked].map((a) => (
          <div
            key={a.key}
            className="card flex gap-3 p-4"
            style={{ opacity: a.unlocked ? 1 : 0.6 }}
          >
            <div
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full"
              style={{ background: a.unlocked ? `color-mix(in srgb, ${TIER_COLOR[a.tier]} 20%, transparent)` : "var(--surface-2)" }}
            >
              {a.unlocked ? <Award size={20} style={{ color: TIER_COLOR[a.tier] }} /> : <Lock size={16} style={{ color: "var(--text-faint)" }} />}
            </div>
            <div className="min-w-0">
              <p className="font-medium">{a.title}</p>
              <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>{a.description}</p>
              {!a.unlocked && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: "var(--border)" }}>
                    <div className="h-full rounded-full" style={{ width: `${a.progress}%`, background: TIER_COLOR[a.tier] }} />
                  </div>
                  <span className="text-[10px] tabular-nums" style={{ color: "var(--text-faint)" }}>{a.value}/{a.threshold}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
