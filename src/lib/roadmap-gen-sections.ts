import { z } from "zod";
import { DIMENSIONS, type Dimension } from "./competency";
import { COGNITIVE_LEVELS, Objective, Section, type CognitiveLevel } from "./lesson-schema";

/**
 * Turning the model's Pass-2 reply into real `sections`/`learningObjectives`.
 *
 * ## Why the model is not asked for `Section`/`Activity` JSON directly
 *
 * `lesson-schema.ts`'s `Activity` union has 23 variants and some have five or
 * six required fields each. Asking a model to produce that shape reliably,
 * inside a prompt that is already generating a body, a quiz and practice tasks
 * for two or three lessons at once, is asking for the exact failure mode
 * `roadmap-gen.ts`'s own top comment describes: a good start that runs out of
 * output tokens or drifts on a nested shape, and Zod rejecting the whole
 * lesson for it.
 *
 * So the wire shape the model actually fills in (`GeneratedExtras` below) is
 * small and flat — one pitfall paragraph, one check question, one reflection
 * prompt, one dimension tag per objective. This file is what turns that into
 * the real, validated `Section[]` and `Objective[]` lesson-schema.ts defines,
 * parsed through the actual `Section.safeParse`/`Objective.safeParse` at the
 * boundary rather than trusted. If the model's `check` came back with a
 * malformed `answerIndex`, or its dimension tag is not one of the eight real
 * ones, that one piece is dropped — never the lesson, matching the
 * containment `readSections` already applies when *reading* stored lessons.
 *
 * Pure and synchronous throughout: no network, no database. That is what
 * makes it testable without an AI provider configured, unlike
 * `generateRoadmap` itself.
 */

export const GeneratedExtras = z.object({
  /** One paragraph: a mistake a beginner actually makes here. */
  pitfall: z.string().max(600).optional().default(""),
  /** A single formative comprehension check, distinct from the graded quiz. */
  check: z
    .object({
      prompt: z.string().min(1),
      choices: z.array(z.string().min(1)).min(2).max(5),
      answerIndex: z.coerce.number().int().min(0).default(0),
      explanation: z.string().default(""),
    })
    .optional(),
  /** One question for the closing reflection step. */
  reflection: z.string().max(300).optional().default(""),
  /** A teach-back prompt and the rubric it is graded against — see
   *  lib/actions/teach-back.ts. Rubric points are shown to the grader, never
   *  to the learner up front, matching `TeachBack`'s own contract in
   *  lesson-schema.ts. */
  teachBack: z
    .object({
      prompt: z.string().min(1),
      rubric: z.array(z.string().min(1)).min(1).max(6),
    })
    .optional(),
});
export type GeneratedExtras = z.infer<typeof GeneratedExtras>;

/** One dimension + cognitive-level tag per objective, matched by index. */
export const ObjectiveTag = z.object({
  dimension: z.enum(DIMENSIONS).catch("knowledge" as Dimension).default("knowledge"),
  cognitiveLevel: z.enum(COGNITIVE_LEVELS).catch("understand" as CognitiveLevel).default("understand"),
});
export type ObjectiveTag = z.infer<typeof ObjectiveTag>;

/**
 * Build the lesson's structured sections from the small wire shape.
 *
 * Every piece is independently optional and independently validated —
 * `.filter(Boolean)` at the end is doing real work, not tidying. A lesson
 * where only the pitfall came back well-formed gets one section instead of
 * three, not zero.
 */
export function buildGeneratedSections(extras: GeneratedExtras): Section[] {
  const sections: unknown[] = [];

  if (extras.pitfall.trim()) {
    sections.push({
      kind: "concept",
      activities: [{ type: "callout", tone: "pitfall", markdown: extras.pitfall.trim() }],
    });
  }

  if (extras.check) {
    const answerIndex =
      extras.check.answerIndex < extras.check.choices.length ? extras.check.answerIndex : 0;
    sections.push({
      kind: "interactive_understanding",
      activities: [
        {
          type: "multiple_choice",
          prompt: extras.check.prompt,
          choices: extras.check.choices.map((text) => ({ text })),
          answerIndex,
          explanation: extras.check.explanation,
        },
      ],
    });
  }

  if (extras.reflection.trim()) {
    sections.push({
      kind: "reflection",
      activities: [{ type: "reflection", prompt: extras.reflection.trim() }],
    });
  }

  if (extras.teachBack) {
    sections.push({
      kind: "teach_back",
      activities: [
        {
          type: "teach_back",
          prompt: extras.teachBack.prompt,
          rubric: extras.teachBack.rubric,
          aiFree: true,
        },
      ],
    });
  }

  return sections
    .map((s) => Section.safeParse(s))
    .filter((r): r is { success: true; data: Section } => r.success)
    .map((r) => r.data);
}

/**
 * Build measurable objectives from Pass 1's plain-text objectives and Pass
 * 2's per-objective tags. Mismatched lengths are expected and handled, not
 * guarded against — the model may tag fewer objectives than exist, or the
 * arrays may not line up 1:1 if a lesson's objective count changed between
 * passes; an objective with no tag falls back to "knowledge" / "understand"
 * rather than being dropped, since the untagged statement is still real.
 */
export function buildGeneratedObjectives(
  objectives: string[],
  tags: ObjectiveTag[],
  meta: { difficulty: "beginner" | "intermediate" | "advanced"; estimatedMinutes: number },
): Objective[] {
  return objectives
    .map((statement, i) => {
      const tag = tags[i];
      return Objective.safeParse({
        statement,
        cognitiveLevel: tag?.cognitiveLevel ?? "understand",
        difficulty: meta.difficulty,
        estimatedMinutes: Math.max(1, Math.round(meta.estimatedMinutes / Math.max(1, objectives.length))),
        dimensions: [tag?.dimension ?? "knowledge"],
      });
    })
    .filter((r): r is { success: true; data: Objective } => r.success)
    .map((r) => r.data);
}
