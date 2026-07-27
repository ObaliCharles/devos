import type { CSSProperties } from "react";

/**
 * The DeveloperOS brand marks.
 *
 * The mark is monochrome. It is a rounded square holding a single glyph, drawn
 * in the same stroke weight as every icon in the product, on a surface one
 * step off the sidebar. A gradient logo makes a developer tool look like a
 * token launch; a mark that is built out of the same parts as the interface it
 * sits in makes it look like software.
 *
 * The only accent in the whole lockup is a 3px dot: the status light on the
 * corner of the tile. That is the entire budget.
 *
 * Two forms:
 *
 *   LogoTile,  the square. Used where space is tight, the collapsed sidebar
 *              rail and the phone header.
 *   Wordmark,  the tile plus the full name. Used in the expanded sidebar and
 *              on the landing page.
 */

/** The glyph inside the tile: a terminal prompt, drawn as an outline. */
function PromptGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7 8.5 10.5 12 7 15.5" />
      <path d="M13.5 16h4" />
    </svg>
  );
}

/**
 * The mark in a rounded tile. `accent` puts the status dot on; it is on by
 * default and worth turning off anywhere the mark sits next to other accent.
 */
export function LogoTile({
  size = 28,
  radius,
  accent = true,
}: {
  size?: number;
  radius?: string;
  accent?: boolean;
}) {
  return (
    <span
      className="relative grid shrink-0 place-items-center"
      style={{
        width: size,
        height: size,
        borderRadius: radius ?? "var(--radius-tile)",
        background: "var(--surface-3)",
        border: "1px solid var(--border)",
        color: "var(--text)",
      }}
    >
      <PromptGlyph size={Math.round(size * 0.72)} />
      {accent && (
        <span
          className="absolute rounded-full"
          style={{
            width: Math.max(3, Math.round(size * 0.11)),
            height: Math.max(3, Math.round(size * 0.11)),
            right: Math.round(size * 0.15),
            bottom: Math.round(size * 0.15),
            background: "var(--primary)",
          }}
          aria-hidden
        />
      )}
    </span>
  );
}

/** The bare glyph, for a favicon-sized context or an <Image> swap later. */
export function LogoMark({
  size = 28,
  className,
  style,
}: {
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span className={className} style={style} role="img" aria-label="DeveloperOS">
      <LogoTile size={size} />
    </span>
  );
}

/**
 * The full lockup. One weight, one colour, tight tracking. "OS" is set in the
 * muted tone rather than a gradient, so the name reads as one word with a
 * considered end instead of two words fighting.
 */
export function Wordmark({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const tile = size === "lg" ? 32 : size === "sm" ? 26 : 28;
  const text = size === "lg" ? "text-[20px]" : size === "sm" ? "text-[15px]" : "text-[16px]";
  return (
    <span className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoTile size={tile} />
      <span className={`${text} font-semibold leading-none tracking-[-0.035em]`}>
        Developer
        <span style={{ color: "var(--text-faint)" }}>OS</span>
      </span>
    </span>
  );
}
