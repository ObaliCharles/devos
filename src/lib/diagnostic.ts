import type { Dimension } from "./competency";

/**
 * The diagnostic onboarding assessment (learning-upgrade spec §19, §44).
 *
 * "What do I know?" is the first question the spec's most important product
 * test asks, and until this file there was no answer to it — a new signup
 * went straight to picking a roadmap with the system knowing nothing about
 * them. `EVIDENCE_SOURCES` in `lib/competency.ts` has included `"diagnostic"`
 * since Phase 1a with its own weight in `SOURCE_WEIGHT`; nothing has ever
 * written one. This is that writer.
 *
 * ## Why this is a fixed bank, not AI-generated
 *
 * A diagnostic has to be gradable the moment it is submitted, with no round
 * trip to a model and no chance of a malformed question reaching a learner
 * mid-assessment. Every question here is one of the real, already-validated
 * `Activity` shapes from `lib/lesson-schema.ts` — `multiple_choice`,
 * `code_tracing`, `fill_in_code` — not a parallel question format invented
 * for this one feature. That is also why coding and debugging are asked as
 * *predict* and *diagnose* rather than *write and run*: nothing here needs
 * `lib/runner.ts`, so the diagnostic works today rather than waiting on
 * DECISIONS 018's sandbox.
 *
 * ## Why Planning is not one of the four dimensions tested
 *
 * The spec's §19 list includes Planning. It is deliberately absent here: none
 * of the eight real competency dimensions in `lib/competency.ts` is "planning
 * ability", and the spec's own §13 describes planning as a taught, reviewed
 * skill with its own AI-reviewed workflow (Phase 2's planning assistant) —
 * force-fitting one diagnostic question into a dimension it does not belong
 * to would produce a number that means nothing. Four dimensions, tested
 * honestly, beat five where one is invented.
 */

export type QuestionKind = "multiple_choice" | "code_tracing" | "fill_in_code";

type ChoiceQuestion = {
  id: string;
  dimension: Dimension;
  kind: "multiple_choice";
  prompt: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
};

type TracingQuestion = {
  id: string;
  dimension: Dimension;
  kind: "code_tracing";
  code: string;
  prompt: string;
  expectedOutput: string;
  explanation: string;
};

type FillInQuestion = {
  id: string;
  dimension: Dimension;
  kind: "fill_in_code";
  template: string;
  blankId: string;
  answer: string;
  accept: string[];
  explanation: string;
};

export type DiagnosticQuestion = ChoiceQuestion | TracingQuestion | FillInQuestion;

/**
 * Eight questions, two per dimension. Real software-fundamentals content, not
 * placeholders — a diagnostic that does not test anything real cannot produce
 * evidence worth calling evidence.
 */
export const DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  // ---- knowledge
  {
    id: "k1",
    dimension: "knowledge",
    kind: "multiple_choice",
    prompt: "Which of these HTTP methods is guaranteed idempotent — calling it twice has the same effect as once?",
    choices: ["POST", "PUT", "PATCH"],
    answerIndex: 1,
    explanation: "PUT replaces a resource wholesale, so sending the same PUT twice leaves it in the same state. POST and PATCH are not guaranteed to be.",
  },
  {
    id: "k2",
    dimension: "knowledge",
    kind: "multiple_choice",
    prompt: "What does Big-O notation describe?",
    choices: [
      "The exact runtime of a program in seconds",
      "How runtime or memory grows as the input size grows",
      "The number of lines of code in a function",
      "Which programming language is faster",
    ],
    answerIndex: 1,
    explanation: "Big-O describes growth, not a stopwatch reading — O(n) on a fast machine can be slower in wall-clock time than O(n²) on tiny input.",
  },
  // ---- problem solving (predict what code does)
  {
    id: "p1",
    dimension: "problem_solving",
    kind: "code_tracing",
    code: "function f(n) {\n  if (n <= 1) return n;\n  return f(n - 1) + f(n - 2);\n}\nconsole.log(f(6));",
    prompt: "What does this print?",
    expectedOutput: "8",
    explanation: "f is Fibonacci: 0, 1, 1, 2, 3, 5, 8 — f(6) is the 7th term, 8.",
  },
  {
    id: "p2",
    dimension: "problem_solving",
    kind: "code_tracing",
    code: "const arr = [1, 2, 3];\nconst result = arr.map(n => n * 2).filter(n => n > 3);\nconsole.log(result);",
    prompt: "What does this print? (write it exactly as it would appear, e.g. [1,2])",
    expectedOutput: "[4,6]",
    explanation: "map doubles each value to [2,4,6]; filter keeps only values over 3, leaving [4,6].",
  },
  // ---- implementation
  {
    id: "i1",
    dimension: "implementation",
    kind: "fill_in_code",
    template: "function isEven(n) {\n  return n % 2 ___BLANK___ 0;\n}",
    blankId: "BLANK",
    answer: "===",
    accept: ["=="],
    explanation: "n % 2 is 0 for even numbers — the blank is a strict-equality comparison.",
  },
  {
    id: "i2",
    dimension: "implementation",
    kind: "fill_in_code",
    template: "const nums = [1, 2, 3, 4];\nconst sum = nums.___BLANK___((total, n) => total + n, 0);",
    blankId: "BLANK",
    answer: "reduce",
    accept: [],
    explanation: "reduce folds an array down to one value — here, the running total.",
  },
  // ---- debugging
  {
    id: "d1",
    dimension: "debugging",
    kind: "multiple_choice",
    prompt:
      "This should return the largest number in an array but sometimes returns undefined:\n\n" +
      "function max(arr) {\n  let best;\n  for (const n of arr) {\n    if (n > best) best = n;\n  }\n  return best;\n}\n\n" +
      "What is the bug?",
    choices: [
      "best starts as undefined, and every comparison against undefined is false",
      "for...of should be for...in",
      "The function is missing a return statement",
      "arr.length is never checked before the loop",
    ],
    answerIndex: 0,
    explanation: "n > undefined is always false, so best only gets set if some element is compared to a previously-set best — the first comparison never assigns.",
  },
  {
    id: "d2",
    dimension: "debugging",
    kind: "multiple_choice",
    prompt: "A function is missing `await` before a call that returns a Promise. What is the most likely symptom?",
    choices: [
      "A syntax error at parse time",
      "The code receives a Promise object instead of the resolved value",
      "The program crashes immediately with an unhandled exception",
      "Nothing — await has no effect on correctness",
    ],
    answerIndex: 1,
    explanation: "Without await, you get the Promise itself — code that expects the resolved value typically fails downstream, not at the missing await.",
  },
];

/** One free-response question, collected but not machine-graded — see the
 *  module comment on why this produces weak, unverified evidence rather than
 *  a fabricated score. */
export const EXPLANATION_PROMPT = {
  id: "explain-1",
  dimension: "explanation" as Dimension,
  prompt: "In your own words: what is a race condition, and where might one actually happen?",
};

export type DiagnosticAnswer =
  | { id: string; kind: "multiple_choice"; choiceIndex: number }
  | { id: string; kind: "code_tracing"; text: string }
  | { id: string; kind: "fill_in_code"; text: string };

export type GradedQuestion = { id: string; dimension: Dimension; correct: boolean };

function normalise(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, "");
}

/** Grade one answer against its question. Pure — no side effects, no I/O. */
export function gradeAnswer(question: DiagnosticQuestion, answer: DiagnosticAnswer | undefined): boolean {
  if (!answer || answer.kind !== question.kind || answer.id !== question.id) return false;

  if (question.kind === "multiple_choice" && answer.kind === "multiple_choice") {
    return answer.choiceIndex === question.answerIndex;
  }
  if (question.kind === "code_tracing" && answer.kind === "code_tracing") {
    return normalise(answer.text) === normalise(question.expectedOutput);
  }
  if (question.kind === "fill_in_code" && answer.kind === "fill_in_code") {
    const accepted = [question.answer, ...question.accept].map(normalise);
    return accepted.includes(normalise(answer.text));
  }
  return false;
}

/**
 * Grade every question and roll the result up by dimension. `perDimension`
 * is a fraction (correct / total for that dimension), which is exactly the
 * `strength` `submitDiagnostic` writes to Evidence — see lib/actions/diagnostic.ts.
 */
export function gradeDiagnostic(answers: DiagnosticAnswer[]): {
  graded: GradedQuestion[];
  perDimension: Partial<Record<Dimension, { correct: number; total: number }>>;
} {
  const byId = new Map(answers.map((a) => [a.id, a]));
  const graded: GradedQuestion[] = DIAGNOSTIC_QUESTIONS.map((q) => ({
    id: q.id,
    dimension: q.dimension,
    correct: gradeAnswer(q, byId.get(q.id)),
  }));

  const perDimension: Partial<Record<Dimension, { correct: number; total: number }>> = {};
  for (const g of graded) {
    const bucket = perDimension[g.dimension] ?? { correct: 0, total: 0 };
    bucket.total += 1;
    if (g.correct) bucket.correct += 1;
    perDimension[g.dimension] = bucket;
  }

  return { graded, perDimension };
}
