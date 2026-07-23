import { connectDB } from "../db";
import { dayKey, dayKeyOffset } from "../day";
import { Lesson, LessonProgress, Note, Phase, Review, Roadmap, Skill, StudySession } from "../models";

export type LessonNode = {
  id: string;
  title: string;
  order: number;
  estimatedMinutes: number;
  state: string;
  gateDone: number;
};

export type SkillNode = {
  id: string;
  title: string;
  why?: string;
  difficulty: string;
  estimatedHours?: number;
  lessons: LessonNode[];
  mastered: number;
};

export type PhaseNode = {
  id: string;
  order: number;
  title: string;
  subtitle?: string;
  summary?: string;
  estimatedWeeks?: number;
  skills: SkillNode[];
  totalLessons: number;
  masteredLessons: number;
  /** A phase unlocks when the one before it is at least 80% mastered. */
  locked: boolean;
};

const GATE_KEYS = ["read", "noted", "exercised", "quizzed", "reviewed"] as const;

/**
 * One call that builds the whole tree with progress folded in. It is four
 * queries regardless of how big the roadmap gets, which matters more than
 * elegance here — the dashboard and every learning page depend on it.
 */
export async function getRoadmap(userId: unknown) {
  await connectDB();

  const roadmap = await Roadmap.findOne().lean<{ _id: unknown; title: string; summary?: string }>();
  if (!roadmap) return null;

  const [phases, skills, lessons, progress] = await Promise.all([
    Phase.find({ roadmap: roadmap._id }).sort({ order: 1 }).lean(),
    Skill.find().sort({ order: 1 }).lean(),
    Lesson.find().sort({ order: 1 }).select("-body -quiz").lean(),
    LessonProgress.find({ user: userId }).lean(),
  ]);

  const progressByLesson = new Map(progress.map((p) => [String(p.lesson), p]));

  const built: PhaseNode[] = phases.map((phase) => {
    const phaseSkills: SkillNode[] = skills
      .filter((s) => String(s.phase) === String(phase._id))
      .map((skill) => {
        const skillLessons: LessonNode[] = lessons
          .filter((l) => String(l.skill) === String(skill._id))
          .map((lesson) => {
            const p = progressByLesson.get(String(lesson._id));
            const gate = (p?.gate ?? {}) as Record<string, boolean>;
            return {
              id: String(lesson._id),
              title: lesson.title,
              order: lesson.order,
              estimatedMinutes: lesson.estimatedMinutes ?? 30,
              state: p?.state ?? "not_started",
              gateDone: GATE_KEYS.filter((k) => gate[k]).length,
            };
          });

        return {
          id: String(skill._id),
          title: skill.title,
          why: skill.why,
          difficulty: skill.difficulty ?? "beginner",
          estimatedHours: skill.estimatedHours,
          lessons: skillLessons,
          mastered: skillLessons.filter((l) => l.state === "mastered").length,
        };
      });

    const all = phaseSkills.flatMap((s) => s.lessons);
    return {
      id: String(phase._id),
      order: phase.order,
      title: phase.title,
      subtitle: phase.subtitle,
      summary: phase.summary,
      estimatedWeeks: phase.estimatedWeeks,
      skills: phaseSkills,
      totalLessons: all.length,
      masteredLessons: all.filter((l) => l.state === "mastered").length,
      locked: false,
    };
  });

  built.forEach((phase, i) => {
    if (i === 0) return;
    const prev = built[i - 1];
    const ratio = prev.totalLessons === 0 ? 1 : prev.masteredLessons / prev.totalLessons;
    phase.locked = ratio < 0.8;
  });

  return {
    title: roadmap.title,
    summary: roadmap.summary,
    phases: built,
    totalLessons: built.reduce((n, p) => n + p.totalLessons, 0),
    masteredLessons: built.reduce((n, p) => n + p.masteredLessons, 0),
  };
}

/** The single most useful thing on the dashboard: what to open next. */
export function findNextLesson(roadmap: Awaited<ReturnType<typeof getRoadmap>>) {
  if (!roadmap) return null;
  for (const phase of roadmap.phases) {
    if (phase.locked) continue;
    for (const skill of phase.skills) {
      for (const lesson of skill.lessons) {
        if (lesson.state !== "mastered") {
          return { phase, skill, lesson };
        }
      }
    }
  }
  return null;
}

export async function getDueReviews(userId: unknown) {
  await connectDB();
  // No `body` in the projection: the review card shows the title and the
  // objectives, and lesson bodies are the largest documents in the database.
  const due = await Review.find({ user: userId, dueAt: { $lte: new Date() } })
    .sort({ dueAt: 1 })
    .populate("lesson", "title objectives")
    .lean();
  return due;
}

/** For the places that only need the badge number, not the queue itself. */
export async function countDueReviews(userId: unknown) {
  await connectDB();
  return Review.countDocuments({ user: userId, dueAt: { $lte: new Date() } });
}

/**
 * Search lessons by title and body (BACKLOG Tier 0). Regex over both for now —
 * the Lesson text index is defined for when relevance starts to matter, and
 * swapping to `$text` is a one-line change here.
 */
export async function searchLessons(query: string, limit = 12) {
  const term = query.trim();
  if (term.length < 2) return [];
  await connectDB();
  const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const lessons = await Lesson.find({ $or: [{ title: rx }, { body: rx }] })
    .select("title skill order")
    .limit(limit)
    .lean();
  return lessons.map((l) => ({ id: String(l._id), title: String(l.title) }));
}

export async function getRecentNotes(userId: unknown, limit = 5) {
  await connectDB();
  return Note.find({ user: userId }).sort({ updatedAt: -1 }).limit(limit).lean();
}

/** Last 14 days of activity, oldest first, with gaps filled in as zeroes. */
export async function getActivityStrip(userId: unknown, days = 14) {
  await connectDB();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));

  const sessions = await StudySession.find({
    user: userId,
    day: { $gte: dayKey(from) },
  }).lean();
  const byDay = new Map(sessions.map((s) => [s.day, s]));

  return Array.from({ length: days }, (_, i) => {
    const day = dayKeyOffset(i, from);
    const s = byDay.get(day);
    return {
      day,
      minutes: s?.minutes ?? 0,
      lessons: s?.lessonsCompleted ?? 0,
    };
  });
}
