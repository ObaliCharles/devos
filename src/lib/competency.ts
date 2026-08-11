/**
 * Competency — what "mastered" means once it is evidence rather than a checkbox.
 *
 * The mastery gate (see `GATE_STEPS` in models/content.ts) answers "did you do
 * the five things for this lesson". That question is per-lesson and binary, and
 * it stays exactly as it is. This file answers the different, larger question:
 *
 *   "Across everything you have done, can you actually do this skill?"
 *
 * The difference matters because the gate can only ever be satisfied by the
 * lesson in front of you, and real competence is demonstrated in more places
 * than that — a challenge, a project commit, a teach-back, a review three weeks
 * later. So competence is not stored as a flag anywhere. It is **derived** from
 * a collection of `Evidence` rows, and this module holds the derivation.
 *
 * Pure, like `srs.ts`. No database, no imports. That is deliberate: the rule
 * for what counts as competence is the kind of thing that has to be readable in
 * one sitting and testable without a connection.
 */

/* ------------------------------------------------------------------ dimensions */

/**
 * The eight ways a skill can be demonstrated.
 *
 * A learner who can explain something but not implement it has real knowledge
 * and no capability; the reverse is a copy-paste developer. Storing one number
 * per skill cannot tell those apart, so we store one per dimension and only
 * call a skill mastered when the ones that matter for it are covered.
 */
export const DIMENSIONS = [
  "knowledge",
  "recall",
  "application",
  "problem_solving",
  "implementation",
  "debugging",
  "transfer",
  "explanation",
] as const;

export type Dimension = (typeof DIMENSIONS)[number];

export const DIMENSION_LABELS: Record<Dimension, { label: string; question: string }> = {
  knowledge: { label: "Knowledge", question: "Can you explain what it is?" },
  recall: { label: "Recall", question: "Can you remember it weeks later?" },
  application: { label: "Application", question: "Can you use it?" },
  problem_solving: { label: "Problem solving", question: "Can you solve unfamiliar problems with it?" },
  implementation: { label: "Implementation", question: "Can you code it?" },
  debugging: { label: "Debugging", question: "Can you fix it when it breaks?" },
  transfer: { label: "Transfer", question: "Can you use it somewhere new?" },
  explanation: { label: "Explanation", question: "Can you teach it?" },
};

/**
 * Where a piece of evidence came from. This is not decoration — it decides how
 * much the evidence is worth, below.
 */
export const EVIDENCE_SOURCES = [
  "quiz",
  "exercise",
  "challenge",
  "project",
  "teach_back",
  "review",
  "github",
  "assessment",
  "diagnostic",
  "self_report",
] as const;

export type EvidenceSource = (typeof EVIDENCE_SOURCES)[number];

/* ---------------------------------------------------------------- the weighting */

/**
 * How much one artefact from each source is worth, before any penalties.
 *
 * The ordering is the argument: a graded assessment and a passing test suite
 * are worth more than a multiple-choice quiz, and a self-report is worth
 * something close to nothing — not zero, because "I did the exercise" is weak
 * evidence rather than no evidence, but never enough to reach mastery on its
 * own. This is the number that stops the product going back to being a
 * checkbox with extra steps.
 */
const SOURCE_WEIGHT: Record<EvidenceSource, number> = {
  assessment: 1.0,
  challenge: 1.0,
  project: 0.9,
  github: 0.8,
  exercise: 0.8,
  teach_back: 0.8,
  review: 0.7,
  diagnostic: 0.6,
  quiz: 0.5,
  self_report: 0.15,
};

/**
 * The hint ladder from the spec, level 0 (unaided) to 6 (handed the solution).
 * Recorded on every piece of evidence a learner produced with the tutor open,
 * because "I solved it" and "the AI solved it" cannot be the same row.
 */
export const MAX_ASSIST_LEVEL = 6;

export const ASSIST_LEVELS = [
  "Unaided",
  "Guiding question",
  "Conceptual hint",
  "Pointed at the area",
  "Partial example",
  "Solution strategy",
  "Complete solution",
] as const;

/**
 * What AI assistance costs a piece of evidence.
 *
 * Level 0 keeps its full value. Level 6 keeps a fifth of it: being shown the
 * answer is not worthless — you still read and ran it — but it is not a
 * demonstration that you can do the thing, and the gap between those two is
 * the metric the whole product is built to close.
 */
export function assistMultiplier(assistLevel: number) {
  const level = Math.min(MAX_ASSIST_LEVEL, Math.max(0, assistLevel));
  return 1 - (level / MAX_ASSIST_LEVEL) * 0.8;
}

export type EvidenceInput = {
  dimension: Dimension;
  source: EvidenceSource;
  /** 0–1. How well it went: a quiz score, a fraction of tests passed. */
  strength: number;
  /** True when a machine decided the outcome, false when the learner asserted it. */
  verified: boolean;
  /**
   * 0–6 on the hint ladder. `undefined` means **not measured**, which is not
   * the same as unaided and must never be counted as it — see
   * `independenceFrom`. Nothing records this until the hint ladder ships, so
   * today it is undefined almost everywhere.
   */
  assistLevel?: number;
};

/** What one artefact contributes, after every penalty. */
export function evidenceWeight(e: EvidenceInput) {
  const strength = Math.min(1, Math.max(0, e.strength));
  // Unverified evidence is halved on top of its source weight. A self-reported
  // exercise and a test suite that actually ran are not the same claim, and the
  // product's one non-negotiable idea is that it never pretends they are.
  const trust = e.verified ? 1 : 0.5;
  return SOURCE_WEIGHT[e.source] * strength * trust * assistMultiplier(e.assistLevel ?? 0);
}

/* ------------------------------------------------------------------- scoring */

/**
 * How much accumulated weight one dimension needs before it counts as covered.
 * Two solid verified artefacts, or a larger pile of weak ones.
 */
export const DIMENSION_THRESHOLD = 1.5;

/**
 * Diminishing returns. The tenth quiz on the same dimension is not worth the
 * same as the first, or grinding one activity type would reach mastery without
 * ever demonstrating anything else — which is the failure mode this whole model
 * exists to prevent.
 */
function saturate(total: number) {
  return DIMENSION_THRESHOLD * (1 - Math.exp(-total / DIMENSION_THRESHOLD));
}

export type DimensionScore = {
  dimension: Dimension;
  /** 0–1, saturated. */
  score: number;
  covered: boolean;
  count: number;
  /** True when at least one machine-verified artefact backs it. */
  hasVerified: boolean;
};

/**
 * Score every dimension from a bag of evidence.
 *
 * `relevant` is which dimensions this skill is actually meant to be judged on —
 * a conceptual skill has no implementation dimension and demanding one would
 * make it permanently unmasterable. Defaults to all eight.
 */
export function scoreDimensions(
  evidence: EvidenceInput[],
  relevant: readonly Dimension[] = DIMENSIONS
): DimensionScore[] {
  return relevant.map((dimension) => {
    const rows = evidence.filter((e) => e.dimension === dimension);
    const total = rows.reduce((sum, e) => sum + evidenceWeight(e), 0);
    const score = saturate(total) / DIMENSION_THRESHOLD;
    return {
      dimension,
      score,
      // Rounded, because floating point should not decide whether someone has
      // mastered a skill by a millionth.
      covered: Number(score.toFixed(6)) >= 0.75,
      count: rows.length,
      hasVerified: rows.some((e) => e.verified),
    };
  });
}

export type CompetencyLevel = "untouched" | "aware" | "working" | "competent" | "mastered";

export type Competency = {
  level: CompetencyLevel;
  /** 0–1 across the relevant dimensions. */
  overall: number;
  dimensions: DimensionScore[];
  /** The dimensions still short of covered — this is what drives the next mission. */
  missing: Dimension[];
};

/**
 * The headline judgement.
 *
 * `mastered` deliberately requires two things a diligent clicker cannot
 * produce: every relevant dimension covered, and at least one machine-verified
 * artefact somewhere in the pile. Without the second clause a learner could
 * self-report their way to mastery, and the number would mean nothing.
 */
export function competencyFrom(
  evidence: EvidenceInput[],
  relevant: readonly Dimension[] = DIMENSIONS
): Competency {
  const dimensions = scoreDimensions(evidence, relevant);
  const overall = dimensions.length
    ? dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length
    : 0;
  const missing = dimensions.filter((d) => !d.covered).map((d) => d.dimension);
  const anyVerified = dimensions.some((d) => d.hasVerified);

  let level: CompetencyLevel = "untouched";
  if (evidence.length > 0) level = "aware";
  if (overall >= 0.35) level = "working";
  if (overall >= 0.65) level = "competent";
  if (missing.length === 0 && anyVerified) level = "mastered";

  return { level, overall, dimensions, missing };
}

/* --------------------------------------------------------------- independence */

export type Independence = {
  /** Share of evidence produced with no assistance. */
  independent: number;
  /** Levels 1–3: a question, a hint, a nudge. */
  hinted: number;
  /** Levels 4–6: shown a partial or complete answer. */
  solved: number;
  /**
   * How many artefacts the shares are computed over — **not** how much evidence
   * exists. Rows with no measured assist level are excluded, so this is the
   * number that says whether the shares mean anything. Below ~10, they do not.
   */
  sample: number;
};

/**
 * The AI dependency metric. Reported as three shares rather than one score,
 * because "62% independent" and "14% handed the answer" are different facts and
 * collapsing them into a single number hides the one that matters.
 *
 * Evidence with no measured assist level is **excluded**, not counted as
 * unaided. Treating "we did not ask" as "they did it alone" would report every
 * learner as 100% independent from the day this shipped — a flattering number,
 * produced by measuring nothing, on the one metric the product exists to move.
 * Until the hint ladder records levels, `sample` is honestly near zero and the
 * caller should say so rather than draw a chart.
 */
export function independenceFrom(evidence: EvidenceInput[]): Independence {
  const measured = evidence.filter((e) => typeof e.assistLevel === "number");
  if (measured.length === 0) return { independent: 0, hinted: 0, solved: 0, sample: 0 };

  let independent = 0;
  let hinted = 0;
  let solved = 0;
  for (const e of measured) {
    const level = Math.min(MAX_ASSIST_LEVEL, Math.max(0, e.assistLevel as number));
    if (level === 0) independent += 1;
    else if (level <= 3) hinted += 1;
    else solved += 1;
  }

  return {
    independent: independent / measured.length,
    hinted: hinted / measured.length,
    solved: solved / measured.length,
    sample: measured.length,
  };
}
