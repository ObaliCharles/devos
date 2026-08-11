import type React from "react";

/**
 * The DeveloperOS concept icons.
 *
 * ## What belongs in this file, and what does not
 *
 * An audit found 80 distinct `lucide-react` icons across 98 files. Replacing
 * all of them would be churn: a tick, a cross, a plus and a chevron are solved
 * problems, lucide draws them consistently, and a hand-made checkmark is not an
 * identity — it is a worse checkmark.
 *
 * What lucide cannot give the product is a mark for the twelve ideas that only
 * exist *here*: mastery, evidence, a roadmap that adapts, a tutor that is not a
 * chatbot. Those are the ones drawn below. Everything else keeps using lucide,
 * on purpose.
 *
 * ## Why they sit on lucide's exact geometry
 *
 * 24×24 box, 2px stroke, round caps and joins, `currentColor`, no fills except
 * the deliberate solid nodes. That is lucide's grid, matched exactly — because
 * these icons appear *beside* lucide icons in the same sidebar row and the same
 * button, and a set that differs in stroke weight reads as a mistake rather
 * than as an identity. Distinctiveness comes from the metaphors, not from
 * drawing at a different weight.
 *
 * ## The visual language
 *
 * Three shapes recur, and they are what make the set read as one family:
 *
 *   nodes      a solid dot is a fixed point — you, a concept, a verified fact
 *   paths      orthogonal runs between nodes: progression, order, route
 *   brackets   [ ] and { } — structure, in the notation developers already read
 *
 * Nothing here is a star, a flame, a rocket or a lightbulb. Those are the
 * vocabulary of a product that has to tell you it is exciting.
 */

type IconProps = React.SVGProps<SVGSVGElement> & {
  size?: number;
  strokeWidth?: number;
};

/**
 * The shared frame. Every icon below is this wrapper plus geometry, so a change
 * to stroke weight or the box is one edit rather than twelve.
 */
function Icon({ size = 24, strokeWidth = 2, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** A solid node. The one filled shape in the system: a fixed, definite point. */
function Node({ cx, cy, r = 1.75 }: { cx: number; cy: number; r?: number }) {
  return <circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />;
}

/* ------------------------------------------------------------------- learning */

/**
 * Roadmap — an orthogonal route with a station at each end. Solid node is where
 * you are standing; the open ring is where the path currently ends. It turns,
 * because this one is meant to.
 */
export function IconRoadmap(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 19v-4h6v-5h6V6" />
      <Node cx={6} cy={19} />
      <circle cx={18} cy={6} r={2} />
    </Icon>
  );
}

/** Learn — content held inside brackets. Structure first, prose second. */
export function IconLearn(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 4H5v16h4" />
      <path d="M15 4h4v16h-4" />
      <path d="M9.5 10h5" />
      <path d="M9.5 14h3" />
    </Icon>
  );
}

/** Practice — a prompt and a cursor. Where you type the answer rather than read it. */
export function IconPractice(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m7 10 3 2.5-3 2.5" />
      <path d="M13.5 15h3.5" />
    </Icon>
  );
}

/** Review — the cycle, drawn around the node it keeps returning to. */
export function IconReview(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M21 12a9 9 0 1 1-9-9c2.5 0 4.8 1 6.5 2.6L21 8" />
      <path d="M21 3v5h-5" />
      <Node cx={12} cy={12} r={2} />
    </Icon>
  );
}

/**
 * Mastery — a point proven from every side. Not a star and not a trophy: both
 * are awards, and this one is a measurement.
 */
export function IconMastery(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3 21 12l-9 9-9-9z" />
      <Node cx={12} cy={12} r={2.25} />
    </Icon>
  );
}

/** Knowledge — two ideas converging on a third. The graph, at its smallest. */
export function IconKnowledge(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="6" cy="7" r="2" />
      <circle cx="18" cy="9" r="2" />
      <path d="M6.9 8.8 10.1 16.2" />
      <path d="M16.8 10.6 12.2 16.4" />
      <Node cx={11} cy={18} r={2} />
    </Icon>
  );
}

/**
 * AI tutor — a node between angle brackets. It is something you talk *through*,
 * in the notation of the work. Deliberately not a sparkle: a sparkle promises
 * magic, and the tutor's entire job is to refuse to be magic.
 */
export function IconTutor(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 6 6 12l3 6" />
      <path d="m15 6 3 6-3 6" />
      <Node cx={12} cy={12} />
    </Icon>
  );
}

/* ---------------------------------------------------------------------- build */

/** Projects — braces around a node. A structure you are building around a thing. */
export function IconProjects(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 3c-2 0-3 1-3 3v3c0 1.5-1 3-3 3 2 0 3 1.5 3 3v3c0 2 1 3 3 3" />
      <path d="M14 3c2 0 3 1 3 3v3c0 1.5 1 3 3 3-2 0-3 1.5-3 3v3c0 2-1 3-3 3" />
      <Node cx={12} cy={12} />
    </Icon>
  );
}

/** Build — assembly. Two parts, stacked, becoming one thing. */
export function IconBuild(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="13" width="16" height="7" rx="1.5" />
      <rect x="7" y="4" width="10" height="7" rx="1.5" />
    </Icon>
  );
}

/* ---------------------------------------------------------------------- prove */

/**
 * Evidence — a ledger, torn off. The Evidence collection is literally
 * append-only, so the mark is a record rather than a checkbox. A checkbox would
 * be the wrong sign twice over: it is what this product exists to argue with.
 */
export function IconEvidence(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M10 9h4" />
      <path d="M10 13h4" />
    </Icon>
  );
}

/** Career — the trend, on a baseline. Where the work is going, measured. */
export function IconCareer(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 20h16" />
      <path d="m7 16 4-4 3 2.5 5-6" />
      <Node cx={19} cy={8.5} />
    </Icon>
  );
}

/** Focus — an aperture closing on one thing. Everything else stops. */
export function IconFocus(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3a9 9 0 0 1 9 9" />
      <path d="M12 21a9 9 0 0 1-9-9" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}

/**
 * The registry. Lets a page render the set (see /preview) and gives the command
 * palette and nav a single place to look a concept's mark up by name.
 */
export const CONCEPT_ICONS = {
  roadmap: { label: "Roadmap", Icon: IconRoadmap },
  learn: { label: "Learn", Icon: IconLearn },
  practice: { label: "Practice", Icon: IconPractice },
  review: { label: "Review", Icon: IconReview },
  mastery: { label: "Mastery", Icon: IconMastery },
  knowledge: { label: "Knowledge", Icon: IconKnowledge },
  tutor: { label: "AI Tutor", Icon: IconTutor },
  projects: { label: "Projects", Icon: IconProjects },
  build: { label: "Build", Icon: IconBuild },
  evidence: { label: "Evidence", Icon: IconEvidence },
  career: { label: "Career", Icon: IconCareer },
  focus: { label: "Focus", Icon: IconFocus },
} as const;

export type ConceptKey = keyof typeof CONCEPT_ICONS;
