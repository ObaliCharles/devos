import { ASSIST_LEVELS, MAX_ASSIST_LEVEL } from "./competency";

/**
 * The hint ladder (Chapter 8 §11) — progressive assistance for a lesson
 * exercise, in place of a tutor that either says nothing useful or hands over
 * the answer.
 *
 * Pure and stateless, like `srs.ts`: this file only knows how to go from a
 * level number to an instruction and to the next allowed level. Where the
 * level is stored, who is allowed to ask, and what the model is actually told
 * belongs to the caller — `lib/actions/learning.ts` for storage,
 * `requestExerciseHint` for the prompt assembly.
 *
 * ## Why progression is enforced, not just presented
 *
 * A UI that only offers "get the next hint" cannot itself skip levels — but a
 * request is a request, not a click, and the same rule the mastery gate
 * follows applies here: the client disables the button as a courtesy, the
 * server refuses as a rule. `nextAllowedLevel` is what a caller checks a
 * requested level against before spending a model call on it. Skipping
 * straight to level 6 for a 15-word question is exactly the failure mode a
 * hint ladder exists to prevent.
 */

export type HintLevel = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * What the model is told to do at each level. Level 0 is deliberately absent —
 * "try it yourself" is the ambient default, not a request, so nothing ever
 * calls the model for it.
 */
export const LADDER_INSTRUCTION: Record<HintLevel, string> = {
  1: "Do not explain anything and do not mention the answer. Ask exactly one guiding question that points them at what to think about next.",
  2: "Give one conceptual hint — name the idea or principle involved, in the abstract, without applying it to their specific exercise.",
  3: "Point at the relevant area — say which part of the exercise, which function, which line of reasoning to look at, without saying what to do there.",
  4: "Give a partial, analogous example: a small snippet that demonstrates the technique on a *different*, simpler problem, never on their actual exercise.",
  5: "Explain the solution strategy in prose — the steps, in order, in words. No code.",
  6: "Give the complete solution, with a short explanation of why it works. This is the only level allowed to write the learner's actual answer.",
};

/** Same seven labels as the metric that measures how often each is reached. */
export const LADDER_LABELS = ASSIST_LEVELS;

/**
 * The highest level a caller may request right now, given the deepest level
 * already reached. Requests only ever climb one rung — there is no "skip to
 * the end" — and never past the top of the ladder.
 */
export function nextAllowedLevel(current: number): HintLevel {
  const floor = Math.max(0, Math.min(MAX_ASSIST_LEVEL, current));
  return Math.min(MAX_ASSIST_LEVEL, floor + 1) as HintLevel;
}

/** Is this a level the caller could request right now, given where they are? */
export function isLevelAllowed(requested: number, current: number): requested is HintLevel {
  return Number.isInteger(requested) && requested >= 1 && requested <= nextAllowedLevel(current);
}
