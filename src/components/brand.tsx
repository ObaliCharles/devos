import type { CSSProperties } from "react";

/**
 * The DeveloperOS brand marks, as inline SVG so they inherit the theme and
 * scale without a network request.
 *
 * Two forms, used in the two places the product shows itself:
 *
 *   LogoMark, the "DO" monogram. Square. Used where space is tight: the
 *               collapsed sidebar rail and the phone header.
 *   Wordmark, the mark plus the full "DeveloperOS" name. Used where there is
 *               room to say it in full: the expanded sidebar and the web
 *               landing page.
 *
 * If you have the finished glassy renders, drop them at /public/logo-mark.png
 * and /public/logo-wordmark.png and swap the <svg> here for an <Image>; every
 * call site already goes through these two components.
 */

let gradientSeq = 0;

function BrandGradient({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0.1" x2="1" y2="0.9">
        <stop offset="0" stopColor="#9a6bff" />
        <stop offset="0.5" stopColor="#6d74f4" />
        <stop offset="1" stopColor="#39c2ff" />
      </linearGradient>
    </defs>
  );
}

/**
 * The "DO" monogram: a D whose bowl flows into an O, with a code glyph seated
 * in the D's counter. Built from two thick-stroked forms sharing one gradient,
 * so it reads as a single ligature rather than two letters.
 */
export function LogoMark({
  size = 28,
  className,
  style,
}: {
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const id = `dos-mark-${gradientSeq++}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 72 56"
      fill="none"
      className={className}
      style={style}
      role="img"
      aria-label="DeveloperOS"
    >
      <BrandGradient id={id} />

      {/* D, flat left edge, curved right bowl, drawn as a thick stroke so the
          counter stays open for the code glyph. */}
      <path
        d="M18 10 v36 M18 10 h10 a18 18 0 0 1 0 36 h-10"
        stroke={`url(#${id})`}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* O, a ring on the right, overlapping the D's bowl to merge into it. */}
      <circle cx="48" cy="28" r="14" stroke={`url(#${id})`} strokeWidth="10" />

      {/* </>, the code glyph inside the D's counter. */}
      <path
        d="M14 23 l-4 5 l4 5 M24 23 l4 5 l-4 5 M21 22 l-3 12"
        stroke="var(--primary-ink)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.92"
      />
    </svg>
  );
}

/** The mark in a filled, rounded tile, for chips and small chrome. */
export function LogoTile({ size = 28, radius }: { size?: number; radius?: string }) {
  return (
    <span
      className="grid shrink-0 place-items-center"
      style={{
        width: size,
        height: size,
        borderRadius: radius ?? "var(--radius-tile)",
        background: "linear-gradient(135deg, #9a6bff, #6d74f4 55%, #39c2ff)",
        boxShadow: "var(--sheen)",
      }}
    >
      <CodeGlyph size={Math.round(size * 0.52)} />
    </span>
  );
}

function CodeGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 6 l-5 6 l5 6 M16 6 l5 6 l-5 6 M14 4 l-4 16"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The full lockup: monogram tile plus the wordmark. "OS" carries the gradient
 * so the name reads as one word with a considered end, not two.
 */
export function Wordmark({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const tile = size === "lg" ? 34 : size === "sm" ? 26 : 30;
  const text = size === "lg" ? "text-[22px]" : size === "sm" ? "text-[15px]" : "text-[17px]";
  return (
    <span className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoTile size={tile} />
      <span className={`${text} font-bold tracking-[-0.03em] leading-none`}>
        Developer
        <span
          style={{
            background: "linear-gradient(120deg, #9a6bff, #39c2ff)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          OS
        </span>
      </span>
    </span>
  );
}
