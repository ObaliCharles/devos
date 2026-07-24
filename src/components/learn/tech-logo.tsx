import type { CSSProperties, ReactElement } from "react";

/**
 * Real technology brand marks as inline SVG, so a course about React shows the
 * React atom, Docker shows the whale, Python shows the two-snake mark, and so
 * on — not a generic icon. Marks are simplified, single/duotone paths drawn to
 * each brand's real silhouette and colours, sized by a single `size` prop.
 *
 * Resolved by key via <TechLogo name="react" />. Unknown names fall back to a
 * neutral mark so nothing ever renders broken.
 */

type LogoProps = { size?: number; className?: string; style?: CSSProperties };

function svg(size: number, extra?: CSSProperties) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    xmlns: "http://www.w3.org/2000/svg",
    style: extra,
  } as const;
}

/* ------------------------------------------------------------------ Python */
function Python({ size = 22, className, style }: LogoProps) {
  return (
    <svg {...svg(size, style)} className={className} aria-hidden>
      <defs>
        <linearGradient id="py-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#387EB8" />
          <stop offset="1" stopColor="#366994" />
        </linearGradient>
        <linearGradient id="py-y" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE052" />
          <stop offset="1" stopColor="#FFC331" />
        </linearGradient>
      </defs>
      <path
        fill="url(#py-b)"
        d="M11.9 2c-2 0-3.7.3-3.7 2v1.8h4v.5H6.4C4.7 6.3 3.5 7.3 3.5 9.8v1.4c0 1.9 1 3.1 2.9 3.1h1.2v-1.8c0-1.9 1.6-3.5 3.5-3.5h3.9c1.6 0 2.9-1.3 2.9-2.9V4c0-1.5-1.3-2-2.9-2H11.9zM9.7 3.3c.4 0 .7.3.7.7s-.3.7-.7.7-.7-.3-.7-.7.3-.7.7-.7z"
      />
      <path
        fill="url(#py-y)"
        d="M12.1 22c2 0 3.7-.3 3.7-2v-1.8h-4v-.5h5.8c1.7 0 2.9-1 2.9-3.5v-1.4c0-1.9-1-3.1-2.9-3.1h-1.2v1.8c0 1.9-1.6 3.5-3.5 3.5H9c-1.6 0-2.9 1.3-2.9 2.9V20c0 1.5 1.3 2 2.9 2h3.1zm2.2-1.3c-.4 0-.7-.3-.7-.7s.3-.7.7-.7.7.3.7.7-.3.7-.7.7z"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------- React */
function React_({ size = 22, className, style }: LogoProps) {
  return (
    <svg {...svg(size, style)} className={className} aria-hidden fill="none">
      <circle cx="12" cy="12" r="2" fill="#61DAFB" />
      <g stroke="#61DAFB" strokeWidth="1" fill="none">
        <ellipse cx="12" cy="12" rx="10" ry="4" />
        <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
        <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ Docker */
function Docker({ size = 22, className, style }: LogoProps) {
  return (
    <svg {...svg(size, style)} className={className} aria-hidden fill="#2496ED">
      <path d="M13.5 9h2.2v2h-2.2zM10.9 9h2.2v2h-2.2zM8.3 9h2.2v2H8.3zM10.9 6.5h2.2v2h-2.2zM8.3 6.5h2.2v2H8.3zM5.7 9h2.2v2H5.7z" />
      <path d="M22.5 10.4c-.5-.3-1.6-.5-2.5-.3-.1-.9-.6-1.6-1.4-2.3l-.5-.4-.4.5c-.5.6-.7 1.6-.6 2.4.1.4.3.9.6 1.2-.3.2-.9.4-1.6.4H1.6c-.3 1.6.1 3.6 1.3 5 1.2 1.4 3 2.1 5.3 2.1 5 0 8.8-2.3 10.5-6.5.7 0 2.2 0 3-1.5 0-.1.2-.3.5-1l.1-.3-.6-.2z" />
    </svg>
  );
}

/* --------------------------------------------------------------------- Git */
function Git({ size = 22, className, style }: LogoProps) {
  return (
    <svg {...svg(size, style)} className={className} aria-hidden fill="#F05133">
      <path d="M23.5 11.1L12.9.5a1.6 1.6 0 0 0-2.3 0L8.4 2.7l2.8 2.8a1.9 1.9 0 0 1 2.4 2.4l2.7 2.7a1.9 1.9 0 1 1-1.1 1l-2.5-2.5v6.6a1.9 1.9 0 1 1-1.6-.1V9a1.9 1.9 0 0 1-1-2.5L7.3 3.8.5 10.6a1.6 1.6 0 0 0 0 2.3l10.6 10.6a1.6 1.6 0 0 0 2.3 0l10.1-10.1a1.6 1.6 0 0 0 0-2.3z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ AWS */
function AWS({ size = 22, className, style }: LogoProps) {
  return (
    <svg {...svg(size, style)} className={className} aria-hidden>
      <path
        fill="#FF9900"
        d="M6.8 10.4c0 .3 0 .5.1.7l.3.6q0 .1.1.2l-.1.2-.6.4h-.2l-.2-.2-.2-.3-.2-.4c-.5.6-1.2.9-2 .9-.6 0-1-.2-1.4-.5s-.5-.8-.5-1.3q0-.9.6-1.4c.5-.4 1.1-.5 1.9-.5l.8.1.9.2v-.6c0-.5-.1-.9-.3-1.1-.2-.2-.6-.3-1.2-.3l-.9.1-.9.3h-.2q-.1 0-.1-.2v-.3q0-.2.1-.2l.1-.1.9-.3 1.1-.1c.9 0 1.5.2 1.9.6.4.4.6 1 .6 1.7zm-2.7 1c.3 0 .5 0 .8-.1l.7-.4.3-.4.1-.6v-.3l-.7-.2-.7-.1c-.5 0-.8.1-1.1.3-.2.2-.3.4-.3.8 0 .3.1.5.2.7z"
      />
      <path
        fill="#FF9900"
        d="M2.6 15.9c2.9 1.7 6.5 2.6 10 2.6 2.3 0 4.9-.5 7.3-1.5.3-.1.7.2.3.5-2.1 1.6-5.1 2.4-7.7 2.4-3.7 0-7-1.4-9.5-3.6-.2-.2 0-.5.3-.4z"
      />
    </svg>
  );
}

/* -------------------------------------------------------------- JavaScript */
function JavaScript({ size = 22, className, style }: LogoProps) {
  return (
    <svg {...svg(size, style)} className={className} aria-hidden>
      <rect width="24" height="24" rx="3" fill="#F7DF1E" />
      <path
        fill="#000"
        d="M12.5 18.4c.4.7.9 1.2 1.9 1.2.8 0 1.3-.4 1.3-1 0-.7-.5-.9-1.5-1.3l-.5-.2c-1.5-.6-2.5-1.4-2.5-3.1 0-1.6 1.2-2.8 3-2.8 1.3 0 2.3.5 2.9 1.7l-1.6 1c-.3-.6-.7-.8-1.3-.8s-.9.4-.9.8c0 .6.4.8 1.3 1.2l.5.2c1.8.8 2.8 1.5 2.8 3.3 0 1.9-1.5 3-3.5 3-2 0-3.2-.9-3.8-2.2zm-6.5.2c.3.6.6 1 1.3 1 .7 0 1.1-.3 1.1-1.3v-6.8h2v6.9c0 2-1.2 2.9-2.9 2.9-1.6 0-2.5-.8-2.9-1.8z"
      />
    </svg>
  );
}

/* ------------------------------------------------------------- TypeScript */
function TypeScript({ size = 22, className, style }: LogoProps) {
  return (
    <svg {...svg(size, style)} className={className} aria-hidden>
      <rect width="24" height="24" rx="3" fill="#3178C6" />
      <path
        fill="#fff"
        d="M13 11.9v-1.5H6.3v1.5h2.4v6.9h1.9v-6.9zm.6 6.5c.3.2.7.3 1.1.4l1.4.2c.5 0 .9-.1 1.3-.2.4-.1.7-.3 1-.5s.5-.5.6-.8.2-.7.2-1.1c0-.3 0-.6-.1-.8l-.4-.6-.7-.5-.9-.4-.9-.3-.6-.3-.3-.3-.1-.4.1-.3.2-.3.4-.1h1.1l.5.2.5.2.4.3v-1.7l-.9-.3-1.2-.1c-.5 0-.9 0-1.3.2l-1 .5-.6.8-.2 1.1.4 1.2c.3.3.7.6 1.3.8l.9.4.6.3.3.3.1.4-.1.3-.2.3-.4.2h-1.2l-.7-.2-.6-.4z"
      />
    </svg>
  );
}

/* --------------------------------------------------------------- Kubernetes */
function Kubernetes({ size = 22, className, style }: LogoProps) {
  return (
    <svg {...svg(size, style)} className={className} aria-hidden fill="#326CE5">
      <path d="M12 1.6l8.5 4.1 2.1 9.1-5.9 7.4H7.3l-5.9-7.4 2.1-9.1zM12 6a1.1 1.1 0 0 0-1.1 1.1v2.3l-2 1.1-.1.1a1.1 1.1 0 1 0 .5 1.4l2 .9 1 1.9-.9 2.1a1.1 1.1 0 1 0 1.5 0l-.9-2.1 1-1.9 2 .9a1.1 1.1 0 1 0 .4-1.5l-2-1.1V7.1A1.1 1.1 0 0 0 12 6z" />
    </svg>
  );
}

/* --------------------------------------------------------- generic fallback */
function Fallback({ size = 22, className, style }: LogoProps) {
  return (
    <svg {...svg(size, style)} className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M8 7l-4 5 4 5M16 7l4 5-4 5M13.5 5l-3 14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const REGISTRY: Record<string, (p: LogoProps) => ReactElement> = {
  python: Python,
  react: React_,
  "react native": React_,
  docker: Docker,
  git: Git,
  github: Git,
  aws: AWS,
  cloud: AWS,
  javascript: JavaScript,
  js: JavaScript,
  typescript: TypeScript,
  ts: TypeScript,
  kubernetes: Kubernetes,
  k8s: Kubernetes,
};

/** Names that have a real brand mark, for callers that want to check first. */
export const TECH_WITH_LOGO = new Set(Object.keys(REGISTRY));

export function TechLogo({ name, size = 22, className, style }: { name: string } & LogoProps) {
  const Logo = REGISTRY[name.toLowerCase().trim()] ?? Fallback;
  return <Logo size={size} className={className} style={style} />;
}
