import { connectDB } from "../db";
import { Challenge, Lesson, Note, Project, Snippet } from "../models";

/**
 * Universal search — the thing behind CTRL+K. It queries the collections a
 * developer actually reaches for and returns a flat, ranked-ish list with the
 * href to jump to. Regex-based and capped per type; when the content outgrows
 * that, the Mongo text indexes (already defined) or Atlas Search take over
 * without the callers changing.
 */

export type SearchHit = { type: string; id: string; title: string; subtitle?: string; href: string };

export async function search(userId: unknown, q: string): Promise<SearchHit[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  await connectDB();

  const rx = new RegExp(escape(term), "i");

  const [lessons, notes, projects, challenges, snippets] = await Promise.all([
    Lesson.find({ title: rx }).select("title").limit(6).lean(),
    Note.find({ user: userId, trashedAt: null, $or: [{ title: rx }, { body: rx }] }).select("title").limit(6).lean(),
    Project.find({ user: userId, title: rx }).select("title status").limit(5).lean(),
    Challenge.find({ title: rx }).select("title difficulty").limit(5).lean(),
    Snippet.find({ user: userId, $or: [{ title: rx }, { code: rx }] }).select("title language").limit(5).lean(),
  ]);

  const hits: SearchHit[] = [];
  for (const l of lessons) hits.push({ type: "Lesson", id: String(l._id), title: String(l.title), href: `/learning/lesson/${l._id}` });
  for (const n of notes) hits.push({ type: "Note", id: String(n._id), title: String(n.title), href: `/notes?note=${n._id}` });
  for (const p of projects) hits.push({ type: "Project", id: String(p._id), title: String(p.title), subtitle: String(p.status), href: `/projects/${p._id}` });
  for (const c of challenges) hits.push({ type: "Challenge", id: String(c._id), title: String(c.title), subtitle: String(c.difficulty), href: `/practice/challenges/${c._id}` });
  for (const s of snippets) hits.push({ type: "Snippet", id: String(s._id), title: String(s.title), subtitle: String(s.language), href: `/notes/snippets` });

  return hits;
}

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
