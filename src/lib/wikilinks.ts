/**
 * `[[wiki link]]` parsing, shared by the editor (to render them) and the
 * actions (to derive backlinks on save). One implementation so the two can
 * never disagree about what counts as a link.
 *
 * The syntax is Obsidian's: `[[Title]]` links by title, `[[Title|shown text]]`
 * overrides the display. Titles are matched case-insensitively on save.
 */

const LINK = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

export type ParsedLink = { target: string; label: string };

/** Every distinct link target in a body, in first-seen order. */
export function extractLinks(body: string): ParsedLink[] {
  const seen = new Map<string, ParsedLink>();
  for (const match of body.matchAll(LINK)) {
    const target = match[1].trim();
    if (!target) continue;
    const key = target.toLowerCase();
    if (!seen.has(key)) seen.set(key, { target, label: (match[2] ?? target).trim() });
  }
  return [...seen.values()];
}

/** Just the target titles, lowercased — the shape the backlink sync wants. */
export function extractTargets(body: string): string[] {
  return extractLinks(body).map((l) => l.target.toLowerCase());
}

/**
 * Splits a body into text and link segments so a renderer can walk it once.
 * Returning segments rather than HTML keeps this safe to use in React without
 * dangerouslySetInnerHTML.
 */
export type Segment = { type: "text"; value: string } | { type: "link"; target: string; label: string };

export function segment(body: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const match of body.matchAll(LINK)) {
    const start = match.index ?? 0;
    if (start > last) out.push({ type: "text", value: body.slice(last, start) });
    const target = match[1].trim();
    out.push({ type: "link", target, label: (match[2] ?? target).trim() });
    last = start + match[0].length;
  }
  if (last < body.length) out.push({ type: "text", value: body.slice(last) });
  return out;
}
