/**
 * The shape of a structured lesson.
 *
 * ## Why this file exists at all
 *
 * A lesson used to be one markdown string. That is a fine way to store prose
 * and a hopeless way to store a *learning experience*, because nothing in the
 * product can see inside it: the renderer cannot lay it out, the AI generator
 * has no target to hit beyond "write an essay", and — the expensive part —
 * nothing the learner does inside a lesson can produce evidence, because there
 * is nothing in the document that knows it is an exercise.
 *
 * So a lesson body becomes a list of typed activities. And once activities are
 * typed, the important property falls out for free:
 *
 *   **the activity type decides what evidence it can produce.**
 *
 * A multiple-choice question is knowledge, machine-checkable, worth little. A
 * debugging exercise is the debugging dimension, machine-checkable, worth a
 * lot. A reflection is not evidence of anything and never claims to be. That
 * mapping lives in `ACTIVITY_META` below and is the join between this file and
 * `competency.ts` — it is why competence can be *derived* rather than authored.
 *
 * ## Why Zod and not Mongoose
 *
 * Mongoose stores; Zod validates. The activity union is a discriminated union
 * with twenty-odd payload shapes, which Mongoose models badly (its
 * discriminators are per-collection, not per-subdocument) and which Zod models
 * exactly. So the database column is `Mixed` and *this* file is the contract —
 * enforced on the way in, by every writer:
 *
 *   - the AI generator, `roadmap-gen.ts`, as the schema its second pass parses
 *   - the admin content builder
 *   - the seed script
 *
 * One union, three writers, no drift. A payload that does not parse never
 * reaches the database, which is what keeps the renderer free of defensive
 * checks for shapes that should have been impossible.
 *
 * Nothing here is required of an existing lesson. `sections` is empty on all
 * 92 catalog lessons and every lesson generated before today, and those render
 * from `body` exactly as they always did. See DECISIONS on the two-field seam.
 */

import { z } from "zod";
import { DIMENSIONS, type Dimension } from "./competency";

/* ============================================================== objectives */

/**
 * Bloom's levels, lowest to highest. Ordered on purpose: a lesson whose
 * objectives are all `remember` is a lesson that will not produce anything but
 * knowledge evidence, and being able to notice that is the point of storing
 * the level rather than a free-text sentence.
 */
export const COGNITIVE_LEVELS = [
  "remember",
  "understand",
  "apply",
  "analyze",
  "evaluate",
  "create",
] as const;

export type CognitiveLevel = (typeof COGNITIVE_LEVELS)[number];

/**
 * Verbs that describe something you can watch someone do.
 *
 * "Understand APIs" cannot be assessed, so it cannot be an objective, so the
 * generator must not be allowed to emit it. This list is how that is checked —
 * deterministically, with no model call, the same way the ATS scorer grades a
 * resume without asking an LLM's opinion.
 */
const MEASURABLE_VERBS = [
  "define", "list", "name", "identify", "recall", "state", "label",
  "explain", "describe", "summarise", "summarize", "classify", "compare", "contrast", "predict",
  "apply", "use", "implement", "write", "build", "configure", "solve", "calculate", "convert",
  "debug", "fix", "trace", "diagnose", "profile", "refactor",
  "analyse", "analyze", "distinguish", "decompose", "diagram", "model", "map",
  "evaluate", "justify", "critique", "choose", "select", "recommend", "assess", "review",
  "design", "compose", "create", "architect", "plan", "extend", "generalise", "generalize",
] as const;

/** Words that promise nothing observable. Objectives may not start with these. */
const VAGUE_VERBS = ["understand", "know", "learn", "grasp", "appreciate", "be", "become", "get", "study", "cover"];

export type ObjectiveCheck = {
  measurable: boolean;
  /** Empty when it passes. Written to be shown to whoever wrote the objective. */
  problems: string[];
};

/**
 * Is this objective one you could grade someone against?
 *
 * Three questions: does it start with an observable verb, does it avoid the
 * vague ones, and does it say enough to act on. Advisory rather than fatal —
 * `Objective` below does not reject a failing statement, it just lets the
 * caller show the author what is wrong. Rejecting outright would mean one
 * weak sentence loses a whole generated roadmap, which is the exact failure
 * mode `roadmap-gen.ts` was restructured to avoid.
 */
export function checkObjective(statement: string): ObjectiveCheck {
  const problems: string[] = [];
  const trimmed = statement.trim();
  const first = trimmed.toLowerCase().split(/\s+/)[0]?.replace(/[^a-z]/g, "") ?? "";

  if (VAGUE_VERBS.includes(first)) {
    problems.push(`"${first}" is not observable — say what the learner will do that shows it.`);
  } else if (!MEASURABLE_VERBS.includes(first as (typeof MEASURABLE_VERBS)[number])) {
    problems.push("Start with an action verb, so the objective names something you can watch.");
  }
  if (trimmed.split(/\s+/).length < 4) {
    problems.push("Too short to assess against.");
  }

  return { measurable: problems.length === 0, problems };
}

export const Objective = z.object({
  /** One sentence, starting with an observable verb. See `checkObjective`. */
  statement: z.string().min(1).max(400),
  cognitiveLevel: z.enum(COGNITIVE_LEVELS).catch("understand").default("understand"),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).catch("beginner").default("beginner"),
  estimatedMinutes: z.coerce.number().int().min(1).max(240).catch(10).default(10),
  /**
   * Free text for now, deliberately. Prerequisites want to be Skill refs, but
   * the generator writes a whole tree in one pass and cannot reference ids that
   * do not exist yet. Resolving these to refs is a later, separate pass.
   */
  prerequisites: z.array(z.string().min(1)).max(8).catch([]).default([]),
  /** Which of the eight dimensions satisfying this objective demonstrates. */
  dimensions: z
    .array(z.enum(DIMENSIONS))
    .min(1)
    .max(8)
    .catch(["knowledge" as Dimension])
    .default(["knowledge" as Dimension]),
  /** 0–1. How well the assessing activity must go before this counts. */
  masteryThreshold: z.coerce.number().min(0.5).max(1).catch(0.8).default(0.8),
});

export type Objective = z.infer<typeof Objective>;

/* ============================================================== activities */

/**
 * Every way a concept can be taught or tested.
 *
 * The set is wide on purpose. A generator with four activity types available
 * writes the same lesson every time — paragraph, paragraph, paragraph, quiz —
 * which is the thing this model exists to stop.
 */
export const ACTIVITY_TYPES = [
  // presentational
  "text", "diagram", "image", "animation", "video", "resource", "callout",
  "worked_example", "interactive_example", "simulation",
  // responded to, machine-checkable
  "multiple_choice", "code_tracing", "fill_in_code", "coding_exercise", "debugging_exercise",
  // responded to, judged
  "prediction", "short_answer", "teach_back",
  // connective
  "flashcard", "project_task", "reflection", "assessment",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export type ActivityMeta = {
  label: string;
  /** What doing this well is evidence of. Null when it is not evidence at all. */
  dimension: Dimension | null;
  /** True when a machine decides the outcome. Drives `verified` on the Evidence row. */
  verifiable: boolean;
  /** True when the learner has to produce something before moving on. */
  respondable: boolean;
  /** Needs the code sandbox. See the note at the foot of this file. */
  executes: boolean;
};

/**
 * The join to `competency.ts`.
 *
 * Read this table as the answer to "what does finishing this activity prove?".
 * Reading a paragraph proves nothing and says so — `dimension: null` — which is
 * the honest half of the model and the half a completion-tracking product
 * leaves out.
 */
export const ACTIVITY_META: Record<ActivityType, ActivityMeta> = {
  text: { label: "Explanation", dimension: null, verifiable: false, respondable: false, executes: false },
  diagram: { label: "Diagram", dimension: null, verifiable: false, respondable: false, executes: false },
  image: { label: "Image", dimension: null, verifiable: false, respondable: false, executes: false },
  animation: { label: "Animation", dimension: null, verifiable: false, respondable: false, executes: false },
  video: { label: "Video", dimension: null, verifiable: false, respondable: false, executes: false },
  resource: { label: "Resource", dimension: null, verifiable: false, respondable: false, executes: false },
  callout: { label: "Callout", dimension: null, verifiable: false, respondable: false, executes: false },
  worked_example: { label: "Worked example", dimension: null, verifiable: false, respondable: false, executes: false },
  interactive_example: { label: "Interactive example", dimension: "application", verifiable: false, respondable: true, executes: true },
  simulation: { label: "Simulation", dimension: "application", verifiable: false, respondable: true, executes: false },

  multiple_choice: { label: "Multiple choice", dimension: "knowledge", verifiable: true, respondable: true, executes: false },
  code_tracing: { label: "Code tracing", dimension: "knowledge", verifiable: true, respondable: true, executes: false },
  fill_in_code: { label: "Fill in the code", dimension: "implementation", verifiable: true, respondable: true, executes: true },
  coding_exercise: { label: "Coding exercise", dimension: "implementation", verifiable: true, respondable: true, executes: true },
  debugging_exercise: { label: "Debugging exercise", dimension: "debugging", verifiable: true, respondable: true, executes: true },

  prediction: { label: "Prediction", dimension: "problem_solving", verifiable: false, respondable: true, executes: false },
  short_answer: { label: "Short answer", dimension: "knowledge", verifiable: false, respondable: true, executes: false },
  teach_back: { label: "Teach-back", dimension: "explanation", verifiable: false, respondable: true, executes: false },

  flashcard: { label: "Flashcard", dimension: "recall", verifiable: false, respondable: true, executes: false },
  project_task: { label: "Project task", dimension: "transfer", verifiable: false, respondable: true, executes: false },
  reflection: { label: "Reflection", dimension: null, verifiable: false, respondable: true, executes: false },
  assessment: { label: "Assessment", dimension: "problem_solving", verifiable: true, respondable: true, executes: true },
};

/** The types that need a real sandbox before they can be shown to anyone. */
export const EXECUTING_ACTIVITY_TYPES = ACTIVITY_TYPES.filter((t) => ACTIVITY_META[t].executes);

/* ------------------------------------------------------------ payload shapes */

const Markdown = z.string().min(1).max(20000);

const Choice = z.object({
  text: z.string().min(1),
  /** Shown after answering, right or wrong. Teaching beats scoring. */
  why: z.string().max(600).optional().default(""),
});

const TestCase = z.object({
  /** An expression evaluated against the learner's code, as in lib/runner.ts. */
  call: z.string().min(1),
  expected: z.unknown(),
  /** Hidden tests are what stop a learner hard-coding the visible cases. */
  hidden: z.boolean().catch(false).default(false),
});

/**
 * Hints, ordered from a nudge to the answer. Indices line up with the hint
 * ladder in `competency.ts`, so how far a learner walked down the list is
 * recorded as `assistLevel` on the evidence rather than being forgotten.
 */
const Hints = z.array(z.string().min(1)).max(6).catch([]).default([]);

const base = { title: z.string().max(200).optional().default("") };

/**
 * The union. Every variant is `{ type, ...payload }`, discriminated on `type`,
 * so `parse` narrows a stored blob to exactly one shape and the renderer can
 * switch on it with no casts.
 */
export const Activity = z.discriminatedUnion("type", [
  // ---- presentational
  z.object({ ...base, type: z.literal("text"), markdown: Markdown }),
  z.object({ ...base, type: z.literal("diagram"), mermaid: z.string().min(1).max(6000), caption: z.string().max(400).optional().default("") }),
  z.object({ ...base, type: z.literal("image"), url: z.string().url(), alt: z.string().min(1).max(300), caption: z.string().max(400).optional().default("") }),
  z.object({ ...base, type: z.literal("animation"), url: z.string().url(), alt: z.string().min(1).max(300) }),
  z.object({
    ...base,
    type: z.literal("video"),
    url: z.string().url(),
    provider: z.enum(["youtube", "other"]).catch("other").default("other"),
    /**
     * Segments turn a 90-minute lecture into watchable units with something to
     * do after each. A video with no segments is passive consumption, which is
     * the thing the spec is explicit about not shipping.
     */
    segments: z
      .array(z.object({ startSeconds: z.coerce.number().int().min(0), endSeconds: z.coerce.number().int().min(1), label: z.string().min(1).max(200) }))
      .max(20)
      .catch([])
      .default([]),
  }),
  z.object({ ...base, type: z.literal("resource"), url: z.string().url(), kind: z.enum(["docs", "course", "video", "article", "repo", "book", "paper", "podcast"]).catch("article").default("article"), why: z.string().max(600).optional().default("") }),
  z.object({ ...base, type: z.literal("callout"), tone: z.enum(["note", "warning", "pitfall"]).catch("note").default("note"), markdown: Markdown }),
  z.object({ ...base, type: z.literal("worked_example"), steps: z.array(z.object({ markdown: Markdown, code: z.string().max(6000).optional().default("") })).min(1).max(12) }),
  z.object({ ...base, type: z.literal("interactive_example"), starter: z.string().max(6000), language: z.string().max(40).catch("javascript").default("javascript"), prompt: z.string().max(2000).optional().default("") }),
  z.object({ ...base, type: z.literal("simulation"), markdown: Markdown, controls: z.array(z.string().min(1)).max(10).catch([]).default([]) }),

  // ---- machine-checkable
  z.object({ ...base, type: z.literal("multiple_choice"), prompt: z.string().min(1).max(2000), choices: z.array(Choice).min(2).max(6), answerIndex: z.coerce.number().int().min(0), explanation: z.string().max(1500).optional().default("") }),
  z.object({ ...base, type: z.literal("code_tracing"), code: z.string().min(1).max(6000), language: z.string().max(40).catch("javascript").default("javascript"), prompt: z.string().min(1).max(1000), expectedOutput: z.string().min(1).max(2000), explanation: z.string().max(1500).optional().default("") }),
  z.object({ ...base, type: z.literal("fill_in_code"), template: z.string().min(1).max(6000), language: z.string().max(40).catch("javascript").default("javascript"), blanks: z.array(z.object({ id: z.string().min(1), answer: z.string().min(1), accept: z.array(z.string().min(1)).max(6).catch([]).default([]) })).min(1).max(10), hints: Hints }),
  z.object({ ...base, type: z.literal("coding_exercise"), brief: Markdown, language: z.string().max(40).catch("javascript").default("javascript"), starter: z.string().max(6000).optional().default(""), tests: z.array(TestCase).min(1).max(20), acceptance: z.array(z.string().min(1)).max(10).catch([]).default([]), hints: Hints }),
  z.object({ ...base, type: z.literal("debugging_exercise"), brief: Markdown, language: z.string().max(40).catch("javascript").default("javascript"), broken: z.string().min(1).max(6000), tests: z.array(TestCase).min(1).max(20), /** Not shown; used to grade the learner's diagnosis. */ faultSummary: z.string().max(1000).optional().default(""), hints: Hints }),

  // ---- judged
  z.object({ ...base, type: z.literal("prediction"), prompt: z.string().min(1).max(2000), code: z.string().max(6000).optional().default(""), reveal: Markdown }),
  z.object({ ...base, type: z.literal("short_answer"), prompt: z.string().min(1).max(2000), /** What a good answer contains. Given to the judge, never to the learner up front. */ rubric: z.array(z.string().min(1)).min(1).max(8) }),
  z.object({ ...base, type: z.literal("teach_back"), prompt: z.string().min(1).max(2000), rubric: z.array(z.string().min(1)).min(1).max(8), /** Teach-back only means something unaided. */ aiFree: z.boolean().catch(true).default(true) }),

  // ---- connective
  z.object({ ...base, type: z.literal("flashcard"), front: z.string().min(1).max(1000), back: z.string().min(1).max(2000) }),
  z.object({ ...base, type: z.literal("project_task"), brief: Markdown, acceptance: z.array(z.string().min(1)).max(10).catch([]).default([]) }),
  z.object({ ...base, type: z.literal("reflection"), prompt: z.string().min(1).max(1000) }),
  z.object({ ...base, type: z.literal("assessment"), brief: Markdown, /** Assessments are the measurement of independent ability, so they default AI-free. */ aiFree: z.boolean().catch(true).default(true), tests: z.array(TestCase).max(20).catch([]).default([]), rubric: z.array(z.string().min(1)).max(8).catch([]).default([]) }),
]);

export type Activity = z.infer<typeof Activity>;

/* ================================================================= sections */

/**
 * The teaching arc. A lesson is a sequence of these, and the kind is what lets
 * the renderer, the table of contents and the resume-where-you-left-off logic
 * treat "the concept explanation" differently from "the debugging challenge"
 * without parsing prose to work out which is which.
 *
 * A lesson does not need all of them, and forcing every lesson through all
 * fourteen would produce exactly the padded uniformity the free-text body had.
 */
export const SECTION_KINDS = [
  "orientation",
  "prerequisite_check",
  "activate_prior_knowledge",
  "concept",
  "interactive_understanding",
  "worked_example",
  "guided_practice",
  "independent_practice",
  "debugging_challenge",
  "real_world",
  "project_connection",
  "teach_back",
  "assessment",
  "reflection",
] as const;

export type SectionKind = (typeof SECTION_KINDS)[number];

export const SECTION_LABELS: Record<SectionKind, string> = {
  orientation: "Why this matters",
  prerequisite_check: "Before you start",
  activate_prior_knowledge: "What you already know",
  concept: "The idea",
  interactive_understanding: "Check your understanding",
  worked_example: "Worked example",
  guided_practice: "Guided practice",
  independent_practice: "On your own",
  debugging_challenge: "Find the bug",
  real_world: "In the real world",
  project_connection: "In your project",
  teach_back: "Explain it back",
  assessment: "Assessment",
  reflection: "Reflection",
};

export const Section = z.object({
  kind: z.enum(SECTION_KINDS),
  /** Overrides `SECTION_LABELS` when the author wants a specific heading. */
  title: z.string().max(200).optional().default(""),
  /** Which of the lesson's objectives this section serves, by index. */
  objectiveIndexes: z.array(z.coerce.number().int().min(0)).max(8).catch([]).default([]),
  activities: z.array(Activity).min(1).max(20),
});

export type Section = z.infer<typeof Section>;

export const LessonDocument = z.object({
  objectives: z.array(Objective).min(1).max(8),
  sections: z.array(Section).min(1).max(20),
});

export type LessonDocument = z.infer<typeof LessonDocument>;

/* ================================================================== helpers */

/** Every activity in the document, flattened, in reading order. */
export function activitiesOf(sections: Section[]): Activity[] {
  return sections.flatMap((s) => s.activities);
}

/** Activities the learner has to actually do. Drives the progress indicator. */
export function respondableActivities(sections: Section[]): Activity[] {
  return activitiesOf(sections).filter((a) => ACTIVITY_META[a.type].respondable);
}

/**
 * Which dimensions this lesson can produce evidence for, as authored.
 *
 * Useful before the learner touches it: a lesson claiming an implementation
 * objective while containing nothing but text and a quiz cannot deliver it,
 * and `auditLesson` below turns that into a message rather than a surprise
 * three weeks later when the skill will not go green.
 */
export function dimensionsCovered(sections: Section[]): Dimension[] {
  const found = new Set<Dimension>();
  for (const a of activitiesOf(sections)) {
    const d = ACTIVITY_META[a.type].dimension;
    if (d) found.add(d);
  }
  return DIMENSIONS.filter((d) => found.has(d));
}

export type LessonAudit = {
  ok: boolean;
  problems: string[];
  /** Objectives whose statement is not measurable, by index. */
  vagueObjectives: number[];
  /** Objective dimensions with no activity anywhere that could demonstrate them. */
  unevidenced: Dimension[];
  /** True when nothing in the lesson asks the learner to do anything. */
  passive: boolean;
};

/**
 * Does this lesson do what it says it does?
 *
 * Deterministic, no model call. Run it at authoring time — in the generator, in
 * the admin builder, in the seed script — so a lesson that cannot possibly
 * deliver its objectives is caught by whoever wrote it rather than by the
 * learner who fails to master a skill and cannot see why.
 */
export function auditLesson(doc: LessonDocument): LessonAudit {
  const problems: string[] = [];

  const vagueObjectives = doc.objectives
    .map((o, i) => (checkObjective(o.statement).measurable ? -1 : i))
    .filter((i) => i >= 0);
  if (vagueObjectives.length > 0) {
    problems.push(`${vagueObjectives.length} objective(s) are not measurable.`);
  }

  const covered = new Set(dimensionsCovered(doc.sections));
  const claimed = new Set(doc.objectives.flatMap((o) => o.dimensions));
  const unevidenced = DIMENSIONS.filter((d) => claimed.has(d) && !covered.has(d));
  if (unevidenced.length > 0) {
    problems.push(`No activity can demonstrate: ${unevidenced.join(", ")}.`);
  }

  const passive = respondableActivities(doc.sections).length === 0;
  if (passive) problems.push("Nothing in this lesson asks the learner to do anything.");

  return { ok: problems.length === 0, problems, vagueObjectives, unevidenced, passive };
}

/**
 * Parse a stored `sections` blob, dropping anything that does not validate.
 *
 * Lenient on purpose, and only here. Writers use `Section.parse` and fail
 * loudly; the *reader* runs against documents written by earlier versions of
 * the schema, and one activity that no longer parses should cost that activity,
 * not the lesson. This is the same containment argument that made the roadmap
 * generator two passes.
 */
export function readSections(raw: unknown): Section[] {
  if (!Array.isArray(raw)) return [];
  const out: Section[] = [];
  for (const item of raw) {
    const section = Section.safeParse(item);
    if (section.success) {
      out.push(section.data);
      continue;
    }
    // Salvage: keep the section with only the activities that still parse.
    const candidate = item as { kind?: unknown; title?: unknown; activities?: unknown };
    const activities = Array.isArray(candidate.activities)
      ? candidate.activities.map((a) => Activity.safeParse(a)).filter((r) => r.success).map((r) => r.data)
      : [];
    if (activities.length === 0) continue;
    const salvaged = Section.safeParse({ ...candidate, activities });
    if (salvaged.success) out.push(salvaged.data);
  }
  return out;
}

/* ---------------------------------------------------------------------------
   A note on the executing types.

   `coding_exercise`, `debugging_exercise`, `fill_in_code`,
   `interactive_example` and `assessment` all run learner code. Today that
   means `lib/runner.ts`, which is Node's `vm` — isolation, not containment,
   and a documented remote code execution path for any signed-in user.

   Embedding those activity types in lessons multiplies that surface from one
   page to every lesson in the product, so `EXECUTING_ACTIVITY_TYPES` above is
   exported to be gated on: authoring may produce them, and the renderer must
   not run them until the sandbox behind `runner.ts` is a real one. The schema
   is deliberately ready before the runtime is, rather than the other way
   round.
   ------------------------------------------------------------------------- */
