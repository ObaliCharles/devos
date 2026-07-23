"use client";

import Link from "next/link";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { segment } from "@/lib/wikilinks";

/**
 * Markdown with `[[wiki links]]` turned into real links. The trick is that
 * react-markdown does not know the `[[ ]]` syntax, so the body is split on
 * links first; the text runs go through Markdown, and each link becomes a
 * router Link. Splitting rather than a regex-replace keeps it safe — no
 * dangerouslySetInnerHTML anywhere.
 *
 * `titleToId` maps a lowercased note title to its id so a link can navigate. A
 * link to a note that does not exist renders muted, the way Obsidian shows an
 * unresolved link — a prompt to create it, not an error.
 */
export function WikiMarkdown({
  body,
  titleToId,
}: {
  body: string;
  titleToId: Record<string, string>;
}) {
  const segments = segment(body);

  return (
    <div className="prose-doc">
      {segments.map((seg, i) => {
        if (seg.type === "text") {
          return <Markdown key={i} remarkPlugins={[remarkGfm]}>{seg.value}</Markdown>;
        }
        const id = titleToId[seg.target.toLowerCase()];
        if (id) {
          return (
            <Link
              key={i}
              href={`/notes?note=${id}`}
              className="rounded px-1"
              style={{ color: "var(--primary)", background: "var(--primary-faint)", textDecoration: "none" }}
            >
              {seg.label}
            </Link>
          );
        }
        return (
          <span
            key={i}
            title="This note does not exist yet"
            style={{ color: "var(--text-faint)", borderBottom: "1px dashed var(--border-strong)" }}
          >
            {seg.label}
          </span>
        );
      })}
    </div>
  );
}
