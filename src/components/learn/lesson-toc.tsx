import type { ReactNode } from "react";

/**
 * The "On this page" rail, in the idiom of React, Next.js and Stripe docs.
 *
 * Headings are parsed out of the stored markdown on the server rather than
 * measured in the browser, which means the rail renders in the same pass as
 * the body — no layout shift, no client JS, and it works with the page
 * streaming. The cost is that it cannot highlight the section you are
 * currently scrolled to; that needs an IntersectionObserver and is a
 * deliberate trade, because a TOC that arrives late is worse than one that
 * does not follow you.
 */

export type Heading = { depth: 2 | 3; text: string; id: string };

/** GitHub-compatible heading slug, so anchors match what people expect. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`*_~]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * Pulls h2 and h3 out of a markdown body.
 *
 * Fenced code blocks are stripped first: a `# comment` inside a Python
 * example is not a heading, and without this every lesson that shows a
 * shell command grows a phantom TOC entry. h4 and deeper are ignored — a
 * four-level table of contents is a sign the page needs splitting, not a
 * deeper rail.
 */
export function extractHeadings(markdown: string): Heading[] {
  const withoutCode = markdown.replace(/```[\s\S]*?```/g, "");
  const out: Heading[] = [];
  const seen = new Map<string, number>();

  for (const line of withoutCode.split("\n")) {
    const m = /^(#{2,3})\s+(.+?)\s*#*$/.exec(line);
    if (!m) continue;
    const text = m[2].replace(/[`*_]/g, "").trim();
    if (!text) continue;

    // Duplicate headings get -1, -2 suffixes, matching GitHub's behaviour, so
    // two "Example" sections do not both anchor to the first one.
    const base = slugify(text);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);

    out.push({ depth: m[1].length === 2 ? 2 : 3, text, id: n === 0 ? base : `${base}-${n}` });
  }
  return out;
}

export function LessonToc({ headings }: { headings: Heading[] }) {
  // Below three entries the rail is longer than what it indexes.
  if (headings.length < 3) return null;

  return (
    <nav aria-labelledby="toc-heading">
      <p className="group-heading" id="toc-heading">
        On this page
      </p>
      <ul className="mt-2.5 flex flex-col gap-0.5">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className="row-link block truncate py-1 text-[12px]"
              style={{
                paddingLeft: h.depth === 3 ? 18 : 8,
                paddingRight: 8,
                color: "var(--text-muted)",
              }}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Heading renderers for react-markdown that stamp the same ids the TOC links
 * to. `scroll-mt` keeps the target clear of the sticky topbar — without it,
 * every anchor lands with the heading hidden behind the chrome.
 */
export const markdownHeadings = {
  h2: ({ children }: { children?: ReactNode }) => (
    <h2 id={slugify(String(children))} className="scroll-mt-20">
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: ReactNode }) => (
    <h3 id={slugify(String(children))} className="scroll-mt-20">
      {children}
    </h3>
  ),
};
