"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState } from "./ui";
import { GitBranch } from "lucide-react";

type Node = { id: string; title: string; degree: number };
type Edge = { source: string; target: string };

/**
 * The knowledge graph, laid out without a physics library. A real force
 * simulation is lovely and is exactly the kind of dependency DECISIONS 004
 * says to defer until it earns its place, for a few hundred notes a
 * deterministic layout reads fine and ships nothing extra.
 *
 * Nodes are placed by a simple rule: the most-connected notes near the centre,
 * everything else on a ring around them, seeded by a hash of the id so the
 * layout is stable between renders. Hovering a node lights its edges.
 */
export function GraphView({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) {
  const [hover, setHover] = useState<string | null>(null);

  const W = 900;
  const H = 620;

  const positioned = useMemo(() => {
    const sorted = [...nodes].sort((a, b) => b.degree - a.degree);
    const cx = W / 2;
    const cy = H / 2;

    return new Map(
      sorted.map((node, i) => {
        // Ring 0 is the hub; each subsequent ring holds more nodes further out.
        const ring = Math.floor(Math.sqrt(i));
        const inRing = i - ring * ring;
        const ringCount = (ring + 1) * (ring + 1) - ring * ring;
        const seed = hash(node.id);
        const angle = (inRing / ringCount) * Math.PI * 2 + seed * 0.5;
        const radius = ring === 0 ? 0 : 70 + ring * 82;
        return [
          node.id,
          { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius, node },
        ] as const;
      })
    );
  }, [nodes]);

  const connected = useMemo(() => {
    if (!hover) return new Set<string>();
    const set = new Set<string>([hover]);
    for (const e of edges) {
      if (e.source === hover) set.add(e.target);
      if (e.target === hover) set.add(e.source);
    }
    return set;
  }, [hover, edges]);

  if (nodes.length === 0) {
    return (
      <EmptyState
        icon={<GitBranch size={30} />}
        title="Nothing to graph yet"
        body="The graph draws a dot for every note and a line for every [[link]] between them. Write a few and connect them."
        action={<Link href="/notes" className="btn btn-primary">Back to notes</Link>}
      />
    );
  }

  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-auto" style={{ maxHeight: "72vh" }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="min-w-[900px]">
          {edges.map((e, i) => {
            const a = positioned.get(e.source);
            const b = positioned.get(e.target);
            if (!a || !b) return null;
            const lit = hover && (e.source === hover || e.target === hover);
            return (
              <line
                key={i}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={lit ? "var(--primary)" : "var(--border-strong)"}
                strokeWidth={lit ? 1.5 : 0.75}
                opacity={hover && !lit ? 0.15 : 0.6}
              />
            );
          })}

          {[...positioned.values()].map(({ x, y, node }) => {
            const r = 5 + Math.min(node.degree, 8) * 1.6;
            const dim = hover && !connected.has(node.id);
            return (
              <g
                key={node.id}
                transform={`translate(${x} ${y})`}
                onMouseEnter={() => setHover(node.id)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: "pointer", opacity: dim ? 0.25 : 1 }}
              >
                <Link href={`/notes?note=${node.id}`}>
                  <circle
                    r={r}
                    fill={node.degree > 0 ? "var(--primary)" : "var(--text-faint)"}
                    stroke="var(--surface)"
                    strokeWidth={2}
                  />
                  <text
                    y={r + 12}
                    textAnchor="middle"
                    fontSize={11}
                    fill="var(--text-muted)"
                    style={{ pointerEvents: "none" }}
                  >
                    {node.title.length > 22 ? node.title.slice(0, 21) + "…" : node.title}
                  </text>
                </Link>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="border-t px-5 py-3 text-xs" style={{ borderColor: "var(--border)", color: "var(--text-faint)" }}>
        {nodes.length} notes · {edges.length} links · bigger dots are more connected · hover to trace, click to open
      </div>
    </div>
  );
}

/** Cheap stable pseudo-random in [0,1) from a string. */
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}
