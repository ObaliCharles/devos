import type { CSSProperties } from "react";

/**
 * The mark for everything AI in this product.
 *
 * The sparkle it replaces was the problem: four-pointed stars are the house
 * style of every AI feature shipped since 2023, they say "magic" rather than
 * "machine", and they carry none of this product's identity. This does.
 *
 * The construction is one idea: **a robot head whose eyes are D and O**. The
 * head is a rounded square with an antenna and two ear stubs — read at 16px it
 * is unmistakably a robot; read at 64px you see the letters. The left eye is a
 * D (a stem with a bowl), the right eye is an O (a ring). Nothing is decorative
 * — every shape is either the head or a letter.
 *
 * Drawn on a 32×32 grid like `LogoMark`, in `currentColor`, so it inherits the
 * accent from whatever it sits in and needs no variant per surface.
 */

export function AiMark({
  size = 24,
  className,
  style,
  title = "DeveloperOS AI",
}: {
  size?: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      style={style}
      role="img"
      aria-label={title}
    >
      {/* Antenna — the one stroke that makes the silhouette read as a head
          rather than a screen, at any size. */}
      <path
        d="M16 3v3.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="16" cy="3" r="1.6" fill="currentColor" />

      {/* Ear stubs */}
      <path
        d="M3.5 15v3M28.5 15v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* The head */}
      <rect
        x="6"
        y="7"
        width="20"
        height="19"
        rx="5.5"
        stroke="currentColor"
        strokeWidth="2"
      />

      {/* Left eye — D. A stem plus a bowl, drawn as one stroke so it stays a
          letter when the whole mark is scaled down to a 14px inline icon. */}
      <path
        d="M11.4 13.2v6.6h1.5a3.3 3.3 0 0 0 0-6.6h-1.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />

      {/* Right eye — O */}
      <circle cx="21" cy="16.5" r="3.1" stroke="currentColor" strokeWidth="1.9" />

      {/* Mouth — a short bar, kept quiet so the eyes stay the subject. */}
      <path
        d="M13 22.4h6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
}

/**
 * The mark on a tinted plate, for places that need presence — a panel header,
 * an empty state, the AI entry point on Learn.
 */
export function AiTile({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-[var(--radius-tile)] ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        background: "var(--primary-faint)",
        color: "var(--primary)",
      }}
    >
      <AiMark size={Math.round(size * 0.62)} />
    </span>
  );
}
