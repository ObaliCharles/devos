import { connectDB } from "../db";
import { Certificate, Challenge, Lesson, Note, Project, Roadmap, Snippet } from "../models";
import { CERTIFICATIONS, COURSES, PROJECTS, flatLessons } from "../catalog";

/**
 * Universal search, the thing behind ⌘K.
 *
 * It searches two different worlds and has to be honest about both:
 *
 *   The database — your lessons, notes, projects, snippets, challenges,
 *   certificates and roadmaps. Regex queries, capped per type. When this
 *   outgrows regex, the Mongo text indexes (already defined) or Atlas Search
 *   take over without callers changing.
 *
 *   The catalog — courses, their lessons, the project briefs and the
 *   certifications. These are static data in the bundle rather than documents,
 *   so they are filtered in memory. They were missing entirely before, which
 *   meant ⌘K could not find the course catalog: the one thing people most want
 *   to jump to.
 *
 * Results are grouped by type rather than scored. A fake relevance number over
 * a regex match would be worse than a predictable order you can learn.
 */

export type SearchHit = {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

export async function search(userId: unknown, q: string): Promise<SearchHit[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  await connectDB();

  const rx = new RegExp(escape(term), "i");
  const needle = term.toLowerCase();

  const [lessons, notes, projects, challenges, snippets, certificates, roadmaps] = await Promise.all([
    Lesson.find({ title: rx }).select("title").limit(6).lean(),
    Note.find({ user: userId, trashedAt: null, $or: [{ title: rx }, { body: rx }] })
      .select("title")
      .limit(6)
      .lean(),
    Project.find({ user: userId, title: rx }).select("title status").limit(5).lean(),
    Challenge.find({ title: rx }).select("title difficulty").limit(5).lean(),
    Snippet.find({ user: userId, $or: [{ title: rx }, { code: rx }] })
      .select("title language")
      .limit(5)
      .lean(),
    Certificate.find({ user: userId, $or: [{ name: rx }, { provider: rx }] })
      .select("name provider")
      .limit(5)
      .lean(),
    Roadmap.find({ owner: userId, $or: [{ title: rx }, { summary: rx }] })
      .select("title summary")
      .limit(5)
      .lean(),
  ]);

  const hits: SearchHit[] = [];

  /* ---- The catalog, filtered in memory ---------------------------------- */

  // Courses match on title, tagline, track or any tag, so "js" finds
  // JavaScript Essentials even though its title does not contain those letters.
  for (const c of COURSES) {
    const haystack = [c.title, c.tagline, c.track, ...c.tags].join(" ").toLowerCase();
    if (!haystack.includes(needle)) continue;
    hits.push({
      type: "Course",
      id: c.slug,
      title: c.title,
      subtitle: `${c.level} · ${c.hours}h`,
      href: `/learning/course/${c.slug}`,
    });
  }

  // Individual catalog lessons, capped hard. A broad term would otherwise
  // return two hundred rows and bury everything else in the palette.
  let catalogLessons = 0;
  for (const c of COURSES) {
    if (catalogLessons >= 6) break;
    for (const l of flatLessons(c)) {
      if (catalogLessons >= 6) break;
      if (!l.title.toLowerCase().includes(needle)) continue;
      hits.push({
        type: "Lesson",
        id: `${c.slug}-${l.index}`,
        title: l.title,
        subtitle: c.title,
        href: `/learning/course/${c.slug}/${l.index + 1}`,
      });
      catalogLessons += 1;
    }
  }

  for (const p of PROJECTS) {
    const haystack = [p.title, p.tagline, p.outcome, ...(p.skills ?? []), ...p.tags]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(needle)) continue;
    hits.push({
      type: "Project brief",
      id: p.slug,
      title: p.title,
      subtitle: `${p.level} · ${p.hours}h`,
      href: `/learning/project/${p.slug}`,
    });
  }

  for (const c of CERTIFICATIONS) {
    const haystack = [c.title, c.provider, c.tagline, ...c.tags].join(" ").toLowerCase();
    if (!haystack.includes(needle)) continue;
    hits.push({
      type: "Certification",
      id: c.slug,
      title: c.title,
      subtitle: c.provider,
      href: "/career/certificates",
    });
  }

  /* ---- Your own records -------------------------------------------------- */

  for (const l of lessons)
    hits.push({
      type: "Lesson",
      id: String(l._id),
      title: String(l.title),
      href: `/learning/lesson/${l._id}`,
    });
  for (const r of roadmaps)
    hits.push({
      type: "Roadmap",
      id: String(r._id),
      title: String(r.title),
      subtitle: r.summary ? String(r.summary).slice(0, 60) : undefined,
      href: "/learning/roadmap",
    });
  for (const n of notes)
    hits.push({ type: "Note", id: String(n._id), title: String(n.title), href: `/notes?note=${n._id}` });
  for (const p of projects)
    hits.push({
      type: "Project",
      id: String(p._id),
      title: String(p.title),
      subtitle: String(p.status),
      href: `/projects/${p._id}`,
    });
  for (const c of challenges)
    hits.push({
      type: "Challenge",
      id: String(c._id),
      title: String(c.title),
      subtitle: String(c.difficulty),
      href: `/learning/challenges/${c._id}`,
    });
  for (const s of snippets)
    hits.push({
      type: "Snippet",
      id: String(s._id),
      title: String(s.title),
      subtitle: String(s.language),
      href: "/notes/snippets",
    });
  for (const c of certificates)
    hits.push({
      type: "Certificate",
      id: String(c._id),
      title: String(c.name),
      subtitle: c.provider ? String(c.provider) : undefined,
      href: "/career/certificates",
    });

  return hits;
}

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
