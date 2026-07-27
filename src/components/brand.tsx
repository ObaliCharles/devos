import type { CSSProperties } from "react";

/**
 * The DeveloperOS mark — concept 04, "Ligature".
 *
 * A D whose counter is a perfect circle, so the O sits inside the D rather
 * than beside it. Two letters, one form, one closed path with one hole. It is
 * drawn on a 32-unit grid: flat left edge at x=4, bowl of radius 12 centred on
 * (12,16), counter of radius 5.5 centred on (14.5,16). That offset is not
 * arbitrary — it puts a 5-unit stem against a 4-unit bowl wall, which is the
 * correct typographic relationship for a D and the reason the letter reads as
 * a letter rather than as a ring with a tail.
 *
 * Monochrome, always. There is no gradient, no shadow and no second colour
 * anywhere in the identity: the mark inherits `currentColor`, which is what
 * lets it sit on any surface in either theme without a variant file.
 *
 * Two forms:
 *
 *   LogoMark   the bare letterform. The default, and the right choice
 *              wherever there is already a container around it.
 *   LogoTile   the mark reversed out of a solid tile. For a favicon, an app
 *              icon, an avatar — anywhere the mark needs its own ground.
 *   Wordmark   the mark plus the full name, for the sidebar and the site.
 */

/** The letterform itself, as one even-odd path. */
const LIGATURE_D =
  "M4 4h8a12 12 0 0 1 0 24H4V4Zm10.5 6.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z";

/** The bare mark in the current text colour. */
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
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="currentColor"
      className={className}
      style={style}
      role="img"
      aria-label="DeveloperOS"
    >
      <path fillRule="evenodd" clipRule="evenodd" d={LIGATURE_D} />
    </svg>
  );
}

/**
 * The mark reversed out of a solid tile.
 *
 * The tile is the ink and the letter is the hole, so the shape is a single
 * filled rectangle with two subpaths knocked out of it. That means the tile
 * works on any background at any size without a border, which is exactly what
 * a favicon has to do.
 */
export function LogoTile({
  size = 28,
  radius,
  /** Kept for source compatibility; the identity has no accent. */
  accent,
}: {
  size?: number;
  radius?: string;
  accent?: boolean;
}) {
  void accent;
  return (
    <span
      className="grid shrink-0 place-items-center"
      style={{
        width: size,
        height: size,
        borderRadius: radius ?? "var(--radius-tile)",
        background: "var(--text)",
        color: "var(--bg)",
      }}
    >
      <LogoMark size={Math.round(size * 0.66)} />
    </span>
  );
}

/**
 * The full lockup. One weight, one colour, tight tracking. "OS" is set in the
 * muted tone rather than a second colour, so the name reads as one word with a
 * considered end instead of two words fighting.
 */
export function Wordmark({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const mark = size === "lg" ? 26 : size === "sm" ? 21 : 23;
  const text = size === "lg" ? "text-[19px]" : size === "sm" ? "text-[14.5px]" : "text-[16px]";
  return (
    <span className={`flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark size={mark} />
      <span className={`${text} font-semibold leading-none tracking-[-0.035em]`}>
        Developer
        <span style={{ color: "var(--text-faint)" }}>OS</span>
      </span>
    </span>
  );
}
