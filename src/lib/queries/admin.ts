import { connectDB } from "../db";
import {
  AiUsage,
  AuditLog,
  Challenge,
  FeatureFlag,
  Lesson,
  Note,
  Phase,
  Project,
  Roadmap,
  Skill,
  User,
} from "../models";

/**
 * Admin reads. These are the only queries in the app that deliberately cross
 * user boundaries, which is why they live behind requireAdmin and why the
 * writes next to them are all logged.
 */

export async function getAdminOverview() {
  await connectDB();
  const [users, admins, lessons, challenges, projects, notes, roadmaps] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "admin" }),
    Lesson.countDocuments(),
    Challenge.countDocuments(),
    Project.countDocuments(),
    Note.countDocuments({ trashedAt: null }),
    Roadmap.countDocuments(),
  ]);

  // Rough activity signal: total AI spend across everyone today.
  const spendAgg = await AiUsage.aggregate([{ $group: { _id: null, micros: { $sum: "$costMicros" }, reqs: { $sum: "$requests" } } }]);
  const aiSpendUsd = (spendAgg[0]?.micros ?? 0) / 1_000_000;

  return { users, admins, lessons, challenges, projects, notes, roadmaps, aiSpendUsd, aiRequests: spendAgg[0]?.reqs ?? 0 };
}

export async function getAdminUsers() {
  await connectDB();
  const users = await User.find().sort({ createdAt: -1 }).limit(200).lean();
  return users.map((u) => ({
    id: String(u._id),
    name: String(u.name ?? "—"),
    email: String(u.email ?? "—"),
    role: String(u.role ?? "user"),
    xp: Number(u.xp ?? 0),
    streak: Number(u.currentStreak ?? 0),
    createdAt: new Date(u.createdAt as Date).toISOString(),
  }));
}

/** The content tree for the roadmap builder — phases, skills and lesson counts. */
export async function getAdminContent() {
  await connectDB();
  const roadmap = await Roadmap.findOne().lean<{ _id: unknown; title: string } | null>();
  if (!roadmap) return null;

  const [phases, skills, lessons] = await Promise.all([
    Phase.find({ roadmap: roadmap._id }).sort({ order: 1 }).lean(),
    Skill.find().sort({ order: 1 }).lean(),
    Lesson.find().select("skill title order").sort({ order: 1 }).lean(),
  ]);

  const lessonsBySkill = new Map<string, { id: string; title: string; order: number }[]>();
  for (const l of lessons) {
    const key = String(l.skill);
    (lessonsBySkill.get(key) ?? lessonsBySkill.set(key, []).get(key)!).push({
      id: String(l._id),
      title: String(l.title),
      order: Number(l.order),
    });
  }

  return {
    roadmapTitle: String(roadmap.title),
    phases: phases.map((p) => ({
      id: String(p._id),
      title: String(p.title),
      order: Number(p.order),
      skills: skills
        .filter((s) => String(s.phase) === String(p._id))
        .map((s) => ({
          id: String(s._id),
          title: String(s.title),
          order: Number(s.order),
          lessons: lessonsBySkill.get(String(s._id)) ?? [],
        })),
    })),
  };
}

export async function getFeatureFlags() {
  await connectDB();
  const flags = await FeatureFlag.find().sort({ key: 1 }).lean();
  return flags.map((f) => ({
    id: String(f._id),
    key: String(f.key),
    enabled: Boolean(f.enabled),
    description: f.description as string | undefined,
  }));
}

export async function getAuditLog(limit = 100) {
  await connectDB();
  const rows = await AuditLog.find().sort({ createdAt: -1 }).limit(limit).populate({ path: "actor", select: "name email" }).lean();
  return rows.map((r) => {
    const actor = r.actor as { name?: string; email?: string } | null;
    return {
      id: String(r._id),
      actor: actor?.name ?? actor?.email ?? "unknown",
      action: String(r.action),
      target: r.target as string | undefined,
      at: new Date(r.createdAt as Date).toISOString(),
    };
  });
}
