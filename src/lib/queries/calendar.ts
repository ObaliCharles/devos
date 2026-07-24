import { connectDB } from "../db";
import { CalendarEvent, Interview, Milestone, Review } from "../models";

/**
 * The calendar pulls from several places at once: explicit events the user
 * created, plus deadlines that already exist elsewhere, milestones, scheduled
 * interviews, and reviews coming due. A deadline you have to copy into a second
 * place is a deadline you will miss, so they are read, not duplicated.
 */
export async function getCalendar(userId: unknown, from: Date, to: Date) {
  await connectDB();

  const [events, milestones, interviews, reviews] = await Promise.all([
    CalendarEvent.find({ user: userId, startAt: { $gte: from, $lte: to } }).lean(),
    Milestone.find({ user: userId, dueAt: { $gte: from, $lte: to } }).populate({ path: "project", select: "title" }).lean(),
    Interview.find({ user: userId, scheduledAt: { $gte: from, $lte: to } }).lean(),
    Review.find({ user: userId, dueAt: { $gte: from, $lte: to } }).populate({ path: "lesson", select: "title" }).lean(),
  ]);

  type Item = { id: string; title: string; kind: string; at: string; done: boolean; href?: string; source: string };
  const items: Item[] = [];

  for (const e of events) {
    items.push({
      id: String(e._id),
      title: String(e.title),
      kind: String(e.kind ?? "study"),
      at: new Date(e.startAt as Date).toISOString(),
      done: Boolean(e.done),
      source: "event",
    });
  }
  for (const m of milestones) {
    const project = m.project as { _id?: unknown; title?: string } | null;
    items.push({
      id: String(m._id),
      title: `${m.title}${project?.title ? ` · ${project.title}` : ""}`,
      kind: "deadline",
      at: new Date(m.dueAt as Date).toISOString(),
      done: m.status === "done",
      href: project?._id ? `/projects/${String(project._id)}/milestones` : undefined,
      source: "milestone",
    });
  }
  for (const i of interviews) {
    items.push({
      id: String(i._id),
      title: `Interview · ${i.company}`,
      kind: "interview",
      at: new Date(i.scheduledAt as Date).toISOString(),
      done: i.outcome !== "pending",
      href: "/career/interviews",
      source: "interview",
    });
  }
  for (const r of reviews) {
    const lesson = r.lesson as { title?: string } | null;
    items.push({
      id: String(r._id),
      title: `Review · ${lesson?.title ?? "lesson"}`,
      kind: "practice",
      at: new Date(r.dueAt as Date).toISOString(),
      done: false,
      href: "/review",
      source: "review",
    });
  }

  return items.sort((a, b) => a.at.localeCompare(b.at));
}
