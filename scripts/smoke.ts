/**
 * Drives the whole loop against a real database and asserts the rules hold.
 *
 *   npm run smoke
 *
 * This is not a unit test suite. It is the answer to "does the thing actually
 * work", executed the way a user would execute it: pick a lesson, fail to
 * master it, satisfy the gate, master it, review it tomorrow. The rules it
 * checks are the ones the product makes a promise about — if any of these
 * break, the product is lying to the user, which is worse than a crash.
 *
 * It works on a throwaway user (`smoke-test-user`) and deletes everything it
 * created on the way out, so it is safe to run against your own database.
 */
import "dotenv/config";
import { config } from "dotenv";
import mongoose from "mongoose";

config({ path: ".env.local", override: true });

import {
  ActivityLog,
  AiConversation,
  AiMemory,
  AiMessage,
  AiUsage,
  Backlink,
  Bug,
  Deployment,
  Flashcard,
  Lesson,
  LessonProgress,
  Milestone,
  Note,
  NoteVersion,
  Project,
  Review,
  Skill,
  Snippet,
  StudySession,
  Task,
  TimeEntry,
  User,
  GATE_STEPS,
} from "../src/lib/models";
import { grade, nextDue, INTERVALS_DAYS } from "../src/lib/srs";
import { isLevelAllowed, nextAllowedLevel, LADDER_INSTRUCTION } from "../src/lib/hint-ladder";
import { buildGeneratedObjectives, buildGeneratedSections } from "../src/lib/roadmap-gen-sections";
import { DIAGNOSTIC_QUESTIONS, gradeAnswer, gradeDiagnostic } from "../src/lib/diagnostic";
import {
  DIMENSIONS,
  assistMultiplier,
  competencyFrom,
  evidenceWeight,
  independenceFrom,
} from "../src/lib/competency";
import {
  ACTIVITY_META,
  ACTIVITY_TYPES,
  Activity,
  EXECUTING_ACTIVITY_TYPES,
  LessonDocument,
  auditLesson,
  checkObjective,
  dimensionsCovered,
  readSections,
  respondableActivities,
} from "../src/lib/lesson-schema";
import { dayKey, dayKeyOffset } from "../src/lib/day";
import { levelFromXp } from "../src/lib/user";

const CLERK_ID = "smoke-test-user";

let passed = 0;
const failures: string[] = [];

function check(label: string, condition: boolean) {
  if (condition) {
    passed += 1;
    console.log(`  ok    ${label}`);
  } else {
    failures.push(label);
    console.log(`  FAIL  ${label}`);
  }
}

/**
 * A minimal roadmap so the loop has something to run against, whether the
 * target database was seeded or not. Idempotent by slug, so re-runs reuse it.
 * This is what lets the smoke test point at an empty throwaway database and
 * still exercise the whole learning loop.
 */
async function ensureContent() {
  const { Roadmap, Phase, Skill, Lesson } = await import("../src/lib/models");

  let roadmap = await Roadmap.findOne({ slug: "smoke-roadmap" });
  if (!roadmap) roadmap = await Roadmap.create({ slug: "smoke-roadmap", title: "Smoke roadmap" });

  let phase = await Phase.findOne({ roadmap: roadmap._id, order: 1 });
  if (!phase) phase = await Phase.create({ roadmap: roadmap._id, order: 1, title: "Phase" });

  let skill = await Skill.findOne({ phase: phase._id, order: 1 });
  if (!skill) skill = await Skill.create({ phase: phase._id, order: 1, title: "Smoke skill" });

  const lesson = await Lesson.findOne({ skill: skill._id, order: 1 });
  if (!lesson) {
    await Lesson.create({
      skill: skill._id,
      order: 1,
      title: "Smoke lesson",
      body: "Body of the smoke lesson.",
      objectives: ["Exist for the test"],
      xp: 50,
    });
  }
}

/* --------------------------------------------------------------- pure rules */

function checkPureLogic() {
  console.log("\nspaced repetition");
  check("first review is due tomorrow", INTERVALS_DAYS[0] === 1);
  check("remembering moves up the ladder", grade(2, true) === 3);
  check("forgetting drops back two rungs", grade(3, false) === 1);
  check("forgetting cannot go below zero", grade(1, false) === 0);
  check(
    "the ladder tops out instead of overflowing",
    nextDue(99).getTime() > Date.now() && !Number.isNaN(nextDue(99).getTime())
  );
  check("due dates land early in the morning", nextDue(0).getHours() === 4);

  console.log("\nlevels");
  check("a new user is level 1", levelFromXp(0).level === 1);
  check("200 XP is level 2", levelFromXp(200).level === 2);
  check("each level costs more than the last", levelFromXp(600).level === 3);

  console.log("\nday keys");
  const now = new Date();
  check(
    "today is the local date, not the UTC one",
    dayKey(now) ===
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
        now.getDate()
      ).padStart(2, "0")}`
  );
  check("yesterday is one day back", dayKeyOffset(-1) !== dayKey());
  check("day keys sort lexicographically", dayKeyOffset(-1) < dayKey());

  console.log("\nmeasurable objectives");
  check("\"understand X\" is rejected", !checkObjective("Understand APIs").measurable);
  check("so is any other vague verb", !checkObjective("Know how HTTP works").measurable);
  check(
    "an observable verb with substance passes",
    checkObjective("Explain the difference between GET, POST, PUT and DELETE").measurable
  );
  check(
    "a real verb with nothing after it still fails",
    !checkObjective("Implement it").measurable
  );
  check("the rejection says why", checkObjective("Understand APIs").problems.length > 0);

  console.log("\nevidence weighting");
  const solid = { dimension: "implementation", source: "challenge", strength: 1, verified: true } as const;
  check("a verified artefact outweighs the same claim self-reported", evidenceWeight(solid) > evidenceWeight({ ...solid, verified: false }));
  check("a self-report is worth very little", evidenceWeight({ ...solid, source: "self_report" }) < 0.2);
  check("unaided work keeps its full value", assistMultiplier(0) === 1);
  check("being handed the answer costs most of it", assistMultiplier(6) < 0.25);
  check("the ladder is monotonic", assistMultiplier(2) > assistMultiplier(5));
  check("assist levels cannot be gamed past the ends", assistMultiplier(-3) === assistMultiplier(0) && assistMultiplier(99) === assistMultiplier(6));
  check(
    "solving it yourself beats being shown how",
    evidenceWeight({ ...solid, assistLevel: 0 }) > evidenceWeight({ ...solid, assistLevel: 6 })
  );

  console.log("\ncompetency");
  const oneDim = ["implementation"] as const;
  check("no evidence is untouched", competencyFrom([], oneDim).level === "untouched");
  check(
    "self-reports alone never reach mastery",
    competencyFrom(
      Array.from({ length: 40 }, () => ({ dimension: "implementation", source: "self_report", strength: 1, verified: false }) as const),
      oneDim
    ).level !== "mastered"
  );
  check(
    "verified work across the relevant dimension does",
    competencyFrom(
      Array.from({ length: 4 }, () => ({ dimension: "implementation", source: "challenge", strength: 1, verified: true }) as const),
      oneDim
    ).level === "mastered"
  );
  check(
    "a dimension with no evidence is reported as missing",
    competencyFrom(
      [{ dimension: "implementation", source: "challenge", strength: 1, verified: true }],
      ["implementation", "explanation"]
    ).missing.includes("explanation")
  );
  check(
    "one skill cannot be mastered by grinding a single dimension",
    competencyFrom(
      Array.from({ length: 30 }, () => ({ dimension: "knowledge", source: "quiz", strength: 1, verified: true }) as const),
      ["knowledge", "implementation"]
    ).level !== "mastered"
  );
  check(
    "repeating the same activity has diminishing returns",
    (() => {
      const one = competencyFrom([{ dimension: "knowledge", source: "quiz", strength: 1, verified: true }], ["knowledge"]).overall;
      const ten = competencyFrom(
        Array.from({ length: 10 }, () => ({ dimension: "knowledge", source: "quiz", strength: 1, verified: true }) as const),
        ["knowledge"]
      ).overall;
      return ten > one && ten - one < one * 10;
    })()
  );

  console.log("\nindependence");
  const mixed = [
    { dimension: "implementation", source: "challenge", strength: 1, verified: true, assistLevel: 0 },
    { dimension: "implementation", source: "challenge", strength: 1, verified: true, assistLevel: 2 },
    { dimension: "implementation", source: "challenge", strength: 1, verified: true, assistLevel: 6 },
  ] as const;
  const ind = independenceFrom([...mixed]);
  check("the three shares account for everything", Math.abs(ind.independent + ind.hinted + ind.solved - 1) < 1e-9);
  check("a hint is not counted as a solution", ind.hinted > 0 && ind.solved > 0 && ind.hinted === ind.solved);
  check("the sample size is reported so a small one can be discounted", ind.sample === 3);
  check("no evidence reports a zero sample rather than 100% independent", independenceFrom([]).sample === 0);

  console.log("\nlesson documents");
  const goodActivity = Activity.safeParse({
    type: "multiple_choice",
    prompt: "Which method is idempotent?",
    choices: [{ text: "POST" }, { text: "PUT" }],
    answerIndex: 1,
  });
  check("a well-formed activity parses", goodActivity.success);
  check(
    "an activity missing its payload is rejected",
    !Activity.safeParse({ type: "multiple_choice", prompt: "No choices" }).success
  );
  check("an unknown activity type is rejected", !Activity.safeParse({ type: "interpretive_dance", markdown: "x" }).success);
  check(
    "every activity type has a meaning attached",
    ACTIVITY_TYPES.every((t) => typeof ACTIVITY_META[t]?.label === "string")
  );
  check(
    "reading a paragraph is not evidence of anything",
    ACTIVITY_META.text.dimension === null && ACTIVITY_META.reflection.dimension === null
  );
  check("a debugging exercise is evidence of debugging", ACTIVITY_META.debugging_exercise.dimension === "debugging");
  check(
    "only machine-checked activities claim to be verifiable",
    !ACTIVITY_META.teach_back.verifiable && ACTIVITY_META.coding_exercise.verifiable
  );
  check(
    "the activities needing a sandbox are named, so they can be gated",
    EXECUTING_ACTIVITY_TYPES.includes("coding_exercise") && !EXECUTING_ACTIVITY_TYPES.includes("multiple_choice")
  );

  const passiveDoc = {
    objectives: [
      { statement: "Implement a REST endpoint with validation and status codes", dimensions: ["implementation"] },
    ],
    sections: [{ kind: "concept", activities: [{ type: "text", markdown: "Some prose about REST." }] }],
  };
  const passive = auditLesson(LessonDocument.parse(passiveDoc));
  check("a lesson that asks nothing of the learner is caught", passive.passive);
  check(
    "a lesson claiming a dimension it cannot demonstrate is caught",
    passive.unevidenced.includes("implementation")
  );
  check("the audit explains itself", passive.problems.length > 0 && !passive.ok);

  const soundDoc = LessonDocument.parse({
    objectives: [
      { statement: "Implement a REST endpoint with validation and status codes", dimensions: ["implementation"] },
    ],
    sections: [
      { kind: "concept", activities: [{ type: "text", markdown: "Some prose about REST." }] },
      {
        kind: "independent_practice",
        activities: [
          {
            type: "coding_exercise",
            brief: "Write the handler.",
            tests: [{ call: "handler()", expected: 200 }],
          },
        ],
      },
    ],
  });
  check("a lesson that can deliver its objectives passes", auditLesson(soundDoc).ok);
  check("a vague objective is caught by the audit too", auditLesson(LessonDocument.parse({ ...soundDoc, objectives: [{ statement: "Understand REST", dimensions: ["implementation"] }] })).vagueObjectives.length === 1);
  check("the audit reports which dimensions are actually covered", dimensionsCovered(soundDoc.sections).includes("implementation"));
  check("only the activities that need answering count toward progress", respondableActivities(soundDoc.sections).length === 1);

  console.log("\nreading stored lessons");
  check("a lesson with no sections reads as empty, not as a crash", readSections(undefined).length === 0);
  check("a non-array body does not throw", readSections("just markdown").length === 0);
  const salvaged = readSections([
    {
      kind: "concept",
      activities: [
        { type: "text", markdown: "This one is fine." },
        { type: "multiple_choice", prompt: "broken, no choices" },
      ],
    },
  ]);
  check("one unparseable activity costs that activity, not the section", salvaged.length === 1);
  check("and the good activity survives", salvaged[0]?.activities.length === 1);
  check(
    "a section whose activities are all broken is dropped",
    readSections([{ kind: "concept", activities: [{ type: "nonsense" }] }]).length === 0
  );

  console.log("\nhint ladder");
  check("starting from nothing, the next allowed level is 1", nextAllowedLevel(0) === 1);
  check("the ladder climbs one rung at a time", nextAllowedLevel(3) === 4);
  check("the ladder tops out at 6, not past it", nextAllowedLevel(6) === 6 && nextAllowedLevel(99) === 6);
  check("level 1 is allowed from a cold start", isLevelAllowed(1, 0));
  check("level 2 is not allowed from a cold start — no skipping", !isLevelAllowed(2, 0));
  check("level 4 is allowed once level 3 has been reached", isLevelAllowed(4, 3));
  check("level 6 is still refused after only reaching level 3", !isLevelAllowed(6, 3));
  check("level 0 is never a valid request — it is the ambient default", !isLevelAllowed(0, 0));
  check("every level from 1 to 6 has an instruction", [1, 2, 3, 4, 5, 6].every((l) => typeof LADDER_INSTRUCTION[l as 1] === "string"));

  console.log("\ndiagnostic — grading");
  check("has two questions per dimension", DIAGNOSTIC_QUESTIONS.length === 8);
  check(
    "covers exactly the four testable dimensions, not planning",
    new Set(DIAGNOSTIC_QUESTIONS.map((q) => q.dimension)).size === 4
  );

  const mc = DIAGNOSTIC_QUESTIONS.find((q) => q.kind === "multiple_choice")!;
  check("the right multiple-choice answer grades correct", gradeAnswer(mc, { id: mc.id, kind: "multiple_choice", choiceIndex: mc.answerIndex }));
  check("any other choice grades incorrect", !gradeAnswer(mc, { id: mc.id, kind: "multiple_choice", choiceIndex: (mc.answerIndex + 1) % mc.choices.length }));
  check("an answer to the wrong question id never grades correct", !gradeAnswer(mc, { id: "not-this-one", kind: "multiple_choice", choiceIndex: mc.answerIndex }));
  check("no answer at all grades incorrect, not undefined behaviour", !gradeAnswer(mc, undefined));

  const trace = DIAGNOSTIC_QUESTIONS.find((q) => q.kind === "code_tracing")!;
  check("the exact expected output grades correct", gradeAnswer(trace, { id: trace.id, kind: "code_tracing", text: trace.expectedOutput }));
  check(
    "whitespace and case around the answer do not cost the grade",
    gradeAnswer(trace, { id: trace.id, kind: "code_tracing", text: `  ${trace.expectedOutput.toUpperCase()}  ` })
  );
  check("a wrong output grades incorrect", !gradeAnswer(trace, { id: trace.id, kind: "code_tracing", text: "definitely wrong" }));

  const fill = DIAGNOSTIC_QUESTIONS.find((q) => q.kind === "fill_in_code")!;
  check("the canonical answer grades correct", gradeAnswer(fill, { id: fill.id, kind: "fill_in_code", text: fill.answer }));
  if (fill.accept.length > 0) {
    check("an accepted alternative also grades correct", gradeAnswer(fill, { id: fill.id, kind: "fill_in_code", text: fill.accept[0] }));
  }
  check("an unrelated answer grades incorrect", !gradeAnswer(fill, { id: fill.id, kind: "fill_in_code", text: "nonsense" }));

  const allCorrect = gradeDiagnostic(
    DIAGNOSTIC_QUESTIONS.map((q) =>
      q.kind === "multiple_choice"
        ? { id: q.id, kind: "multiple_choice" as const, choiceIndex: q.answerIndex }
        : q.kind === "code_tracing"
          ? { id: q.id, kind: "code_tracing" as const, text: q.expectedOutput }
          : { id: q.id, kind: "fill_in_code" as const, text: q.answer }
    )
  );
  check("answering everything correctly scores 8 for 8", allCorrect.graded.every((g) => g.correct));
  check("and every dimension reports 100%", Object.values(allCorrect.perDimension).every((b) => b!.correct === b!.total));

  const nothingAnswered = gradeDiagnostic([]);
  check("answering nothing grades every question incorrect, not a crash", nothingAnswered.graded.every((g) => !g.correct));
  check("and still reports every dimension, at 0", Object.values(nothingAnswered.perDimension).every((b) => b!.correct === 0));

  console.log("\nroadmap generation — sections from the model's small wire shape");
  check("no extras produces no sections, not a crash", buildGeneratedSections({ pitfall: "", reflection: "" }).length === 0);
  check(
    "a pitfall alone becomes one callout section",
    (() => {
      const s = buildGeneratedSections({ pitfall: "Forgetting to close the connection.", reflection: "" });
      return s.length === 1 && s[0].kind === "concept" && s[0].activities[0]?.type === "callout";
    })()
  );
  check(
    "a check alone becomes one interactive_understanding section",
    (() => {
      const s = buildGeneratedSections({
        pitfall: "",
        reflection: "",
        check: { prompt: "Which is idempotent?", choices: ["POST", "PUT"], answerIndex: 1, explanation: "" },
      });
      return s.length === 1 && s[0].kind === "interactive_understanding" && s[0].activities[0]?.type === "multiple_choice";
    })()
  );
  check(
    "an out-of-range answerIndex is clamped, not dropped",
    (() => {
      const s = buildGeneratedSections({
        pitfall: "",
        reflection: "",
        check: { prompt: "Which is idempotent?", choices: ["POST", "PUT"], answerIndex: 9, explanation: "" },
      });
      const mc = s[0]?.activities[0];
      return mc?.type === "multiple_choice" && mc.answerIndex === 0;
    })()
  );
  check(
    "a check with too few choices is dropped rather than crashing the lesson",
    buildGeneratedSections({ pitfall: "", reflection: "", check: { prompt: "?", choices: ["only one"], answerIndex: 0, explanation: "" } }).length === 0
  );
  check(
    "all three together produce three sections",
    buildGeneratedSections({
      pitfall: "A real mistake.",
      reflection: "What surprised you?",
      check: { prompt: "?", choices: ["a", "b"], answerIndex: 0, explanation: "" },
    }).length === 3
  );
  check(
    "a teach-back becomes its own section, aiFree by construction",
    (() => {
      const s = buildGeneratedSections({
        pitfall: "",
        reflection: "",
        teachBack: { prompt: "Explain it.", rubric: ["Covers X", "Covers Y"] },
      });
      const tb = s[0]?.activities[0];
      return s.length === 1 && s[0].kind === "teach_back" && tb?.type === "teach_back" && tb.aiFree === true;
    })()
  );
  check(
    "a teach-back with no rubric at all is dropped, not sent with an empty one",
    buildGeneratedSections({ pitfall: "", reflection: "", teachBack: { prompt: "Explain it.", rubric: [] } }).length === 0
  );
  check(
    "all four extras together produce four sections",
    buildGeneratedSections({
      pitfall: "A real mistake.",
      reflection: "What surprised you?",
      check: { prompt: "?", choices: ["a", "b"], answerIndex: 0, explanation: "" },
      teachBack: { prompt: "Explain it.", rubric: ["Covers X"] },
    }).length === 4
  );

  console.log("\nroadmap generation — measurable objectives from plain text + tags");
  const objs = buildGeneratedObjectives(
    ["Explain the difference between GET and POST", "Implement a REST endpoint with validation"],
    [
      { dimension: "knowledge", cognitiveLevel: "understand" },
      { dimension: "implementation", cognitiveLevel: "apply" },
    ],
    { difficulty: "beginner", estimatedMinutes: 30 }
  );
  check("both objectives survive with their real statements", objs.length === 2 && objs[1].statement.includes("REST endpoint"));
  check("each keeps the dimension tag it was given", objs[0].dimensions[0] === "knowledge" && objs[1].dimensions[0] === "implementation");
  check("and the cognitive level", objs[1].cognitiveLevel === "apply");
  check(
    "estimated minutes are split across the objectives, not duplicated on each",
    objs[0].estimatedMinutes === 15 && objs[1].estimatedMinutes === 15
  );

  const untagged = buildGeneratedObjectives(
    ["Write a function that reverses a string"],
    [], // the model returned no tags at all
    { difficulty: "beginner", estimatedMinutes: 20 }
  );
  check("an objective with no tag still survives, defaulted rather than dropped", untagged.length === 1);
  check("defaulted to knowledge/understand", untagged[0].dimensions[0] === "knowledge" && untagged[0].cognitiveLevel === "understand");

  // Objective.statement is `min(1)` on raw length, not trimmed content — so
  // this has to be truly empty, not whitespace, to actually exercise the
  // rejection. Written out because that distinction is exactly the kind of
  // thing a test using "   " would get wrong silently.
  const blank = buildGeneratedObjectives([""], [{ dimension: "knowledge", cognitiveLevel: "understand" }], {
    difficulty: "beginner",
    estimatedMinutes: 10,
  });
  check("an empty statement is dropped by the schema's own min-length rule", blank.length === 0);
}

/* --------------------------------------------- the structured lesson, stored */

async function checkLearningSchema() {
  console.log("\nstructured lessons in the database");

  const { Evidence, Lesson, Skill } = await import("../src/lib/models");
  process.env.SMOKE_CLERK_ID = CLERK_ID;
  const { requireUser } = await import("../src/lib/user");
  const user = await requireUser();

  const skill = await Skill.findOne();
  if (!skill) {
    failures.push("no skills in the database — run `npm run seed` first");
    return;
  }

  // The whole point of the two-field seam: the lessons that already exist keep
  // working untouched. If this ever fails, the change stopped being additive.
  //
  // Note the `$exists: false` half. A lesson written before this schema has no
  // `sections` key at all, not an empty one — Mongoose only writes the default
  // for documents it saves itself. Anything reading `sections` therefore has to
  // survive `undefined`, which is why `readSections` takes `unknown` and why
  // this query asks the question the database can actually answer.
  const legacy = await Lesson.findOne({
    $or: [{ sections: { $exists: false } }, { sections: { $size: 0 } }],
  }).lean<{ body: string; sections?: unknown[] }>();
  check("lessons written before this model still load", !!legacy && typeof legacy.body === "string");
  check("and they carry no sections rather than a broken one", (legacy?.sections ?? []).length === 0);
  check("an absent sections field reads as no sections", readSections(legacy?.sections).length === 0);

  const doc = LessonDocument.parse({
    objectives: [
      {
        statement: "Explain when a database index helps and when it costs",
        cognitiveLevel: "understand",
        dimensions: ["knowledge", "explanation"],
      },
    ],
    sections: [
      { kind: "orientation", activities: [{ type: "text", markdown: "Indexes are why the dashboard is fast." }] },
      {
        kind: "interactive_understanding",
        objectiveIndexes: [0],
        activities: [
          {
            type: "multiple_choice",
            prompt: "What does an index cost?",
            choices: [{ text: "Nothing" }, { text: "Write throughput and space" }],
            answerIndex: 1,
          },
        ],
      },
      { kind: "teach_back", activities: [{ type: "teach_back", prompt: "Explain indexes without notes.", rubric: ["Mentions the write cost"] }] },
    ],
  });

  const structured = await Lesson.create({
    skill: skill._id,
    order: 9001,
    title: "Smoke structured lesson",
    body: "Fallback body, kept because `body` is still required.",
    learningObjectives: doc.objectives,
    sections: doc.sections,
  });

  const reread = await Lesson.findById(structured._id).lean<{
    learningObjectives: { statement: string; dimensions: string[] }[];
    sections: unknown[];
  }>();
  check("a structured lesson round-trips through Mongo", !!reread && reread.sections.length === 3);
  check("its objectives keep their dimensions", reread?.learningObjectives[0]?.dimensions.includes("explanation") === true);
  check(
    "and the activities survive the Mixed column intact",
    readSections(reread?.sections).length === 3
  );
  check(
    "a stored activity still narrows to its own shape",
    (() => {
      const parsed = readSections(reread?.sections);
      const mc = parsed[1]?.activities[0];
      return mc?.type === "multiple_choice" && mc.choices.length === 2;
    })()
  );

  console.log("\nevidence");

  // checkTheLoop ran a quiz and a review through this user against this same
  // skill, and those now write evidence of their own. Clear it, or this section
  // is asserting against the other section's side effects.
  await Evidence.deleteMany({ user: user._id });

  await Evidence.create([
    { user: user._id, skill: skill._id, lesson: structured._id, dimension: "knowledge", source: "quiz", strength: 1, verified: true, assistLevel: 0, detail: "5/5 unaided" },
    { user: user._id, skill: skill._id, lesson: structured._id, dimension: "explanation", source: "teach_back", strength: 0.9, verified: false, assistLevel: 2 },
  ]);

  const rows = await Evidence.find({ user: user._id, skill: skill._id }).lean<
    { dimension: string; source: string; strength: number; verified: boolean; assistLevel: number }[]
  >();
  check("evidence is stored against the user and the skill", rows.length === 2);
  check("a machine-graded row is marked verified", rows.some((r) => r.source === "quiz" && r.verified));
  check("a judged row is not", rows.some((r) => r.source === "teach_back" && !r.verified));

  const derived = competencyFrom(
    rows.map((r) => ({
      dimension: r.dimension as (typeof DIMENSIONS)[number],
      source: r.source as Parameters<typeof evidenceWeight>[0]["source"],
      strength: r.strength,
      verified: r.verified,
      assistLevel: r.assistLevel,
    })),
    ["knowledge", "explanation"]
  );
  check("competence is derived from the stored rows, not from a flag", derived.overall > 0);
  check("two artefacts are not yet mastery", derived.level !== "mastered");
  check("and the derivation says which dimension is short", derived.dimensions.length === 2);

  const rejected = await Evidence.create({
    user: user._id,
    skill: skill._id,
    dimension: "recall",
    source: "review",
    strength: 5,
  }).then(
    () => false,
    () => true
  );
  check("strength outside 0–1 is refused by the schema", rejected);

  await Lesson.deleteOne({ _id: structured._id });
  await Evidence.deleteMany({ user: user._id });
  delete process.env.SMOKE_CLERK_ID;
}

/* -------------------------------------------- evidence, written by real work */

async function checkEvidenceWritePath() {
  console.log("\nevidence is written by the graded actions, not by the client");

  const { Evidence, Lesson, Challenge, Review } = await import("../src/lib/models");
  const { submitQuiz, setGateStep, gradeReview, submitCode } = await import("../src/lib/actions");
  const { getSkillCompetency, getIndependence, listEvidence } = await import("../src/lib/queries");

  process.env.SMOKE_CLERK_ID = CLERK_ID;
  const { requireUser } = await import("../src/lib/user");
  const user = await requireUser();

  const lesson = await Lesson.findOne().sort({ order: 1 }).lean<{ _id: unknown; skill: unknown }>();
  if (!lesson) {
    failures.push("no lessons in the database — run `npm run seed` first");
    return;
  }
  const lessonId = String(lesson._id);

  // The write path is only observable against a clean slate, and checkTheLoop
  // has already run a quiz and a review through this user.
  await Evidence.deleteMany({ user: user._id });

  // ---- the exported surface is the security property
  const actions = await import("../src/lib/actions");
  check(
    "there is no action a client can call to write evidence directly",
    !Object.keys(actions).some((k) => /^recordEvidence$|^evidenceFrom/.test(k))
  );

  // ---- a graded quiz
  await submitQuiz(lessonId, 4, 5);
  const quizRows = await Evidence.find({ user: user._id, source: "quiz" }).lean<
    { dimension: string; strength: number; verified: boolean; assistLevel?: number }[]
  >();
  check("passing a quiz records evidence", quizRows.length === 1);
  check("a quiz is evidence of knowledge", quizRows[0]?.dimension === "knowledge");
  check("machine-graded, so it is verified", quizRows[0]?.verified === true);
  check("and it carries the real score, not a pass flag", Math.abs((quizRows[0]?.strength ?? 0) - 0.8) < 1e-9);
  check(
    "no assist level is recorded, because none was measured",
    quizRows[0]?.assistLevel === undefined
  );

  await submitQuiz(lessonId, 2, 5);
  check(
    "a failed attempt is recorded too, rather than only successes",
    (await Evidence.countDocuments({ user: user._id, source: "quiz" })) === 2
  );

  // ---- a self-reported exercise
  //
  // checkTheLoop already ticked this box, and the recorder only fires on the
  // false -> true transition, so the box has to be cleared first to observe it.
  // That the naive version of this test failed is the guard working.
  await setGateStep(lessonId, "exercised", false);
  await setGateStep(lessonId, "exercised", true);
  const claims = await Evidence.find({ user: user._id, source: "self_report" }).lean<{ verified: boolean }[]>();
  check("ticking the exercise records a self-report", claims.length === 1);
  check("which is never marked verified", claims[0]?.verified === false);
  await setGateStep(lessonId, "exercised", true);
  check(
    "re-ticking an already-ticked box records nothing further",
    (await Evidence.countDocuments({ user: user._id, source: "self_report" })) === 1
  );

  await setGateStep(lessonId, "read", true);
  await setGateStep(lessonId, "reviewed", true);
  check(
    "reading and reviewing demonstrate nothing, so they record nothing",
    (await Evidence.countDocuments({ user: user._id, source: "self_report" })) === 1
  );

  // ---- a review grade
  const review = await Review.findOne({ user: user._id });
  if (review) {
    await gradeReview(String(review._id), true);
    const recall = await Evidence.find({ user: user._id, dimension: "recall" }).lean<{ verified: boolean; source: string }[]>();
    check("grading a review records recall evidence", recall.length === 1);
    check(
      "self-assessed recall is not verified, however honest it was",
      recall[0]?.verified === false && recall[0]?.source === "review"
    );
  }

  // ---- a graded challenge, which is the strong case
  const skillId = lesson.skill;
  const challenge = await Challenge.create({
    slug: `smoke-evidence-${Date.now()}`,
    title: "Smoke evidence challenge",
    prompt: "Return the answer.",
    category: "algorithms",
    entryPoint: "solution",
    skills: [skillId],
    tests: [
      { call: "solution()", expected: "42" },
      { call: "solution()", expected: "42", hidden: true },
    ],
  });
  const cid = String(challenge._id);

  await submitCode(cid, "function solution() { return 42; }", 3);
  const solved = await Evidence.find({ user: user._id, source: "challenge" }).lean<
    { dimension: string; strength: number; verified: boolean; skill: unknown }[]
  >();
  check("solving a challenge records evidence", solved.length === 1);
  check("a challenge is evidence of implementation", solved[0]?.dimension === "implementation");
  check("decided by the tests, so it is verified", solved[0]?.verified === true);
  check("all tests passed is full strength", solved[0]?.strength === 1);
  check("and it is attached to the skill the challenge declares", String(solved[0]?.skill) === String(skillId));

  await submitCode(cid, "function solution() { return 0; }", 1);
  const failed = await Evidence.find({ user: user._id, source: "challenge" }).sort({ createdAt: -1 }).lean<{ strength: number }[]>();
  check("a failing submission is recorded as well", failed.length === 2);
  check("at the strength it earned, which is none", failed[0]?.strength === 0);

  const debugChallenge = await Challenge.create({
    slug: `smoke-debug-${Date.now()}`,
    title: "Smoke debugging challenge",
    prompt: "Fix it.",
    category: "debugging",
    entryPoint: "solution",
    skills: [skillId],
    tests: [{ call: "solution()", expected: "1" }],
  });
  await submitCode(String(debugChallenge._id), "function solution() { return 1; }", 1);
  check(
    "a debugging challenge is evidence of debugging, not implementation",
    (await Evidence.countDocuments({ user: user._id, dimension: "debugging" })) === 1
  );

  const orphan = await Challenge.create({
    slug: `smoke-orphan-${Date.now()}`,
    title: "Smoke unmapped challenge",
    prompt: "Return it.",
    category: "algorithms",
    entryPoint: "solution",
    tests: [{ call: "solution()", expected: "1" }],
  });
  const before = await Evidence.countDocuments({ user: user._id });
  await submitCode(String(orphan._id), "function solution() { return 1; }", 1);
  check(
    "a challenge mapped to no skill records nothing rather than guessing",
    (await Evidence.countDocuments({ user: user._id })) === before
  );

  // ---- reading it back
  const competency = await getSkillCompetency(user._id, skillId);
  check("the skill now derives a competency from real work", competency.overall > 0);
  check("implementation is among the dimensions scored", competency.dimensions.some((d) => d.dimension === "implementation"));
  check(
    "and the dimensions with nothing behind them are still reported missing",
    competency.missing.length > 0
  );

  const independence = await getIndependence(user._id);
  check(
    "independence reports a zero sample rather than a flattering 100%",
    independence.sample === 0 && independence.independent === 0
  );

  const items = await listEvidence(user._id, skillId);
  check("the artefacts can be listed, so a score can show its working", items.length > 0);
  check("each one says what it was", items.every((i) => typeof i.detail === "string"));

  await Challenge.deleteMany({ _id: { $in: [challenge._id, debugChallenge._id, orphan._id] } });
  await Evidence.deleteMany({ user: user._id });
  delete process.env.SMOKE_CLERK_ID;
}

/* ------------------------------------------------------------- hint ladder */

async function checkHintLadder() {
  console.log("\nhint ladder — server-enforced progression and evidence");

  const { Evidence, Lesson, LessonProgress } = await import("../src/lib/models");
  const { setGateStep, requestExerciseHint } = await import("../src/lib/actions");
  const { getIndependence } = await import("../src/lib/queries");

  process.env.SMOKE_CLERK_ID = CLERK_ID;
  const { requireUser } = await import("../src/lib/user");
  const user = await requireUser();

  const lesson = await Lesson.findOne().sort({ order: 1 }).lean<{ _id: unknown; skill: unknown }>();
  if (!lesson) {
    failures.push("no lessons in the database — run `npm run seed` first");
    return;
  }
  const lessonId = String(lesson._id);
  await Evidence.deleteMany({ user: user._id });
  await LessonProgress.updateOne({ user: user._id, lesson: lessonId }, { $set: { hintLevel: 0 } });

  // ---- the skip-refusal is checked before any model call, so it is testable
  // with no AI provider configured — the same property a cold-start CI run
  // needs to hold.
  const skipped = await requestExerciseHint(lessonId, 4);
  check("a request more than one rung past the current level is refused", skipped.ok === false);
  check(
    "and the lesson's own progress is untouched by the refusal",
    (await LessonProgress.findOne({ user: user._id, lesson: lessonId }).lean<{ hintLevel?: number }>())
      ?.hintLevel === 0
  );

  // ---- the level a learner actually reached flows into the evidence that
  // ticking the exercise produces. This is the property the whole ladder
  // exists for — exercised without asking recorded no assist level at all
  // (DECISIONS 026); this is the first thing that gives it a real number.
  await LessonProgress.updateOne({ user: user._id, lesson: lessonId }, { $set: { hintLevel: 3 } });
  await setGateStep(lessonId, "exercised", false);
  await setGateStep(lessonId, "exercised", true);

  const claim = await Evidence.findOne({ user: user._id, source: "self_report" }).lean<{
    assistLevel?: number;
    detail?: string;
  }>();
  check("the exercise claim carries the level the ladder actually reached", claim?.assistLevel === 3);
  check("and says so in its own detail line", (claim?.detail ?? "").includes("level 3"));

  const afterClaim = await LessonProgress.findOne({ user: user._id, lesson: lessonId }).lean<{
    hintLevel?: number;
  }>();
  check("the ladder resets once the exercise is marked done", afterClaim?.hintLevel === 0);

  // ---- an unaided claim is still distinguishable from a hinted one: no
  // level recorded at all, not a fabricated zero that looks the same as
  // "measured and found to be zero".
  await Evidence.deleteMany({ user: user._id });
  await setGateStep(lessonId, "exercised", false);
  await setGateStep(lessonId, "exercised", true);
  const unaided = await Evidence.findOne({ user: user._id, source: "self_report" }).lean<{
    assistLevel?: number;
    detail?: string;
  }>();
  check("an unaided claim records no assist level", unaided?.assistLevel === undefined);
  check("and its detail line says so", (unaided?.detail ?? "").includes("unaided"));

  // ---- the independence metric this was all built to feed. Phase 1 shipped
  // it honestly reporting sample: 0 forever, because nothing wrote a real
  // assist level. This is the first real number it has ever seen.
  await LessonProgress.updateOne({ user: user._id, lesson: lessonId }, { $set: { hintLevel: 2 } });
  await setGateStep(lessonId, "exercised", false);
  await setGateStep(lessonId, "exercised", true);
  const independence = await getIndependence(user._id);
  check("a hinted claim finally gives the independence metric a sample", independence.sample >= 1);
  check("and counts it as hinted, not independent", independence.hinted > 0);

  await Evidence.deleteMany({ user: user._id });
  await LessonProgress.updateOne({ user: user._id, lesson: lessonId }, { $set: { hintLevel: 0 } });
  delete process.env.SMOKE_CLERK_ID;
}

/* ------------------------------------------------------------- diagnostic */

async function checkDiagnostic() {
  console.log("\ndiagnostic — the recorded assessment");

  const { Evidence, Skill, User } = await import("../src/lib/models");
  const { submitDiagnostic } = await import("../src/lib/actions");
  const { getDiagnosticProfile, getSkillCompetency } = await import("../src/lib/queries");

  process.env.SMOKE_CLERK_ID = CLERK_ID;
  const { requireUser } = await import("../src/lib/user");
  const user = await requireUser();

  await Evidence.deleteMany({ user: user._id });
  await User.updateOne({ _id: user._id }, { $unset: { onboardedAt: "" } });

  // Answer half right, half wrong, on purpose — a diagnostic that only ever
  // gets tested with a perfect score would not catch a grading bug that only
  // shows up on a miss.
  const answers = DIAGNOSTIC_QUESTIONS.map((q, i) => {
    const rightAnswer =
      q.kind === "multiple_choice"
        ? { id: q.id, kind: "multiple_choice" as const, choiceIndex: q.answerIndex }
        : q.kind === "code_tracing"
          ? { id: q.id, kind: "code_tracing" as const, text: q.expectedOutput }
          : { id: q.id, kind: "fill_in_code" as const, text: q.answer };
    if (i % 2 === 0) return rightAnswer;
    return q.kind === "multiple_choice"
      ? { id: q.id, kind: "multiple_choice" as const, choiceIndex: (q.answerIndex + 1) % q.choices.length }
      : { id: q.id, kind: q.kind, text: "definitely wrong" };
  });

  const result = await submitDiagnostic(answers, "A short, real answer about two threads touching one variable.");
  check("submission reports a score out of the real question count", result.total === DIAGNOSTIC_QUESTIONS.length);
  check("half right, half wrong, is what got submitted", result.score === Math.ceil(DIAGNOSTIC_QUESTIONS.length / 2));

  const rows = await Evidence.find({ user: user._id, source: "diagnostic" }).lean<
    { dimension: string; strength: number; verified: boolean; skill?: unknown; aiFree?: boolean }[]
  >();
  check("one evidence row per question", rows.length === DIAGNOSTIC_QUESTIONS.length);
  check("every diagnostic row is machine-graded, so verified", rows.every((r) => r.verified === true));
  check("and carries no skill — there is no roadmap yet to attach it to", rows.every((r) => r.skill === undefined));
  check("and is tagged aiFree — there really is no AI panel on that page", rows.every((r) => r.aiFree === true));
  check(
    "strength reflects right vs wrong, not a flat participation score",
    rows.some((r) => r.strength === 1) && rows.some((r) => r.strength === 0)
  );

  const selfReport = await Evidence.findOne({ user: user._id, source: "self_report", dimension: "explanation" }).lean<{
    verified: boolean;
  } | null>();
  check("a real free-response answer is recorded", !!selfReport);
  check("as an honest self-report, not a graded diagnostic row", selfReport?.verified === false);

  const trivial = await submitDiagnostic([], "idk");
  check("submitting again does not error", trivial.total === DIAGNOSTIC_QUESTIONS.length);
  const selfReportCount = await Evidence.countDocuments({ user: user._id, source: "self_report", dimension: "explanation" });
  check("a trivially short free-response is not recorded as an attempt", selfReportCount === 1);

  const afterFirst = await User.findById(user._id).lean<{ onboardedAt?: Date }>();
  check("the first diagnostic sets onboardedAt", !!afterFirst?.onboardedAt);
  const firstStamp = afterFirst!.onboardedAt;

  await submitDiagnostic(answers, "");
  const afterRetake = await User.findById(user._id).lean<{ onboardedAt?: Date }>();
  check(
    "retaking it does not move the original onboarded date",
    afterRetake?.onboardedAt?.getTime() === firstStamp?.getTime()
  );

  // ---- reading it back
  const profile = await getDiagnosticProfile(user._id);
  check("a diagnostic profile is derivable from the recorded evidence", profile !== null);
  check(
    "it covers the four tested dimensions, not eight",
    profile!.dimensions.length === 4 && profile!.dimensions.every((d) => ["knowledge", "problem_solving", "implementation", "debugging"].includes(d.dimension))
  );

  // ---- the property the skill-less design exists for: every diagnostic row
  // written above is real, verified evidence, and none of it counts toward
  // any specific skill, because none of it carries one.
  const skill = await Skill.findOne();
  if (skill) {
    const skillProfile = await getSkillCompetency(user._id, skill._id);
    check(
      "diagnostic evidence never inflates a specific skill's competency",
      skillProfile.dimensions.every((d) => d.count === 0)
    );
  }

  const noProfile = await getDiagnosticProfile("000000000000000000000000");
  check("a user with no diagnostic evidence gets null, not a fabricated empty profile", noProfile === null);

  await Evidence.deleteMany({ user: user._id });
  await User.updateOne({ _id: user._id }, { $unset: { onboardedAt: "" } });
  delete process.env.SMOKE_CLERK_ID;
}

/* ---------------------------------------------------------------- tutor state */

async function checkTutorState() {
  console.log("\ntutor state — what the AI is actually told");

  const { Evidence, Lesson } = await import("../src/lib/models");
  const { learnerStateSummary } = await import("../src/lib/ai-context");

  process.env.SMOKE_CLERK_ID = CLERK_ID;
  const { requireUser } = await import("../src/lib/user");
  const user = await requireUser();

  const lesson = await Lesson.findOne().sort({ order: 1 }).lean<{ _id: unknown; skill: unknown }>();
  if (!lesson) {
    failures.push("no lessons in the database — run `npm run seed` first");
    return;
  }
  const skillId = lesson.skill;
  await Evidence.deleteMany({ user: user._id });

  const empty = await learnerStateSummary(user._id, skillId);
  check("nothing recorded says nothing, rather than a mastery of zero", empty === "");

  // ---- competency half
  await Evidence.create([
    { user: user._id, skill: skillId, dimension: "implementation", source: "challenge", strength: 1, verified: true },
    { user: user._id, skill: skillId, dimension: "implementation", source: "challenge", strength: 1, verified: true },
  ]);
  const withCompetency = await learnerStateSummary(user._id, skillId);
  check("real skill evidence produces a competency line", withCompetency.includes("competency in this skill"));
  check("it names what is still missing", /Weakest|already has evidence/.test(withCompetency));

  const wrongSkill = await learnerStateSummary(user._id, "000000000000000000000000");
  check("evidence for one skill does not leak into a summary for another", !wrongSkill.includes("competency in this skill"));

  await Evidence.deleteMany({ user: user._id });

  // ---- independence half — below the sample floor
  await Evidence.create(
    Array.from({ length: 4 }, () => ({
      user: user._id,
      skill: skillId,
      dimension: "implementation",
      source: "challenge",
      strength: 1,
      verified: true,
      assistLevel: 0,
    })),
  );
  const tooFewSamples = await learnerStateSummary(user._id);
  check("fewer than ten measured pieces of work says nothing about dependency", !tooFewSamples.includes("graded pieces of work"));
  await Evidence.deleteMany({ user: user._id });

  // ---- independence half — heavy on being shown the answer
  await Evidence.create(
    Array.from({ length: 10 }, (_, i) => ({
      user: user._id,
      skill: skillId,
      dimension: "implementation",
      source: "challenge",
      strength: 1,
      verified: true,
      assistLevel: i < 5 ? 6 : 0, // 50% shown the full solution, well over the 30% guidance threshold
    })),
  );
  const heavyOnSolutions = await learnerStateSummary(user._id);
  check("ten or more samples does report the dependency split", heavyOnSolutions.includes("graded pieces of work"));
  check(
    "leaning on full solutions steers the tutor toward lower hints, not silence",
    heavyOnSolutions.includes("favour the lower rungs")
  );
  await Evidence.deleteMany({ user: user._id });

  // ---- independence half — mostly unaided
  await Evidence.create(
    Array.from({ length: 10 }, (_, i) => ({
      user: user._id,
      skill: skillId,
      dimension: "implementation",
      source: "challenge",
      strength: 1,
      verified: true,
      assistLevel: i < 7 ? 0 : 6, // 70% unaided, over the 60% threshold
    })),
  );
  const mostlyUnaided = await learnerStateSummary(user._id);
  check("mostly unaided work steers toward trusting them, not over-explaining", mostlyUnaided.includes("a small nudge is usually enough"));

  await Evidence.deleteMany({ user: user._id });
  delete process.env.SMOKE_CLERK_ID;
}

/* -------------------------------------------------------------- teach-back */

/**
 * `gradeTeachBack` calls a real model — every other AI-dependent action in
 * this suite (`requestExerciseHint`, `generateRoadmap`) is tested the same
 * way for the same reason, see DECISIONS 032/033: the suite's reliability
 * must not depend on a provider key happening to be present in whatever
 * environment it runs in. This only exercises the guard that returns before
 * any network call is made.
 */
async function checkTeachBackGuard() {
  console.log("\nteach-back — the guard before any model call");

  const { Lesson } = await import("../src/lib/models");
  const { gradeTeachBack } = await import("../src/lib/actions");

  process.env.SMOKE_CLERK_ID = CLERK_ID;
  const { requireUser } = await import("../src/lib/user");
  await requireUser();

  const lesson = await Lesson.findOne().sort({ order: 1 }).lean<{ _id: unknown }>();
  if (!lesson) {
    failures.push("no lessons in the database — run `npm run seed` first");
    return;
  }

  const empty = await gradeTeachBack(String(lesson._id), "Explain it.", ["Covers X"], "   ");
  check("an empty explanation is refused before any grading call", empty.ok === false);
  check("and says what to do, not a generic error", !empty.ok && empty.message === "Write an explanation first.");

  delete process.env.SMOKE_CLERK_ID;
}

/* ---------------------------------------------------------- AI-free mode */

async function checkAiFreePerformance() {
  console.log("\nAI-free mode — independent performance vs. everything else");

  const { Evidence } = await import("../src/lib/models");
  const { getAiFreePerformance } = await import("../src/lib/queries");

  process.env.SMOKE_CLERK_ID = CLERK_ID;
  const { requireUser } = await import("../src/lib/user");
  const user = await requireUser();
  await Evidence.deleteMany({ user: user._id });

  const empty = await getAiFreePerformance(user._id);
  check("no evidence at all is not comparable, not a fabricated split", !empty.comparable && empty.aiFree.sample === 0);

  // Below the sample floor on the aiFree side — three rows, floor is five.
  await Evidence.create(
    Array.from({ length: 3 }, () => ({
      user: user._id,
      dimension: "explanation",
      source: "teach_back",
      strength: 0.9,
      verified: true,
      aiFree: true,
    })),
  );
  await Evidence.create(
    Array.from({ length: 8 }, () => ({
      user: user._id,
      dimension: "knowledge",
      source: "quiz",
      strength: 0.6,
      verified: true,
      aiFree: false,
    })),
  );
  const tooFew = await getAiFreePerformance(user._id);
  check("still not comparable below the floor on one side", !tooFew.comparable);
  check("but the samples it did find are reported, not hidden", tooFew.aiFree.sample === 3 && tooFew.other.sample === 8);

  await Evidence.deleteMany({ user: user._id });

  // Over the floor on both sides, with a real, deliberate gap between them.
  await Evidence.create(
    Array.from({ length: 6 }, () => ({
      user: user._id,
      dimension: "explanation",
      source: "teach_back",
      strength: 0.9,
      verified: true,
      aiFree: true,
    })),
  );
  await Evidence.create(
    Array.from({ length: 6 }, () => ({
      user: user._id,
      dimension: "knowledge",
      source: "quiz",
      strength: 0.5,
      verified: true,
      aiFree: false,
    })),
  );
  const compared = await getAiFreePerformance(user._id);
  check("comparable once both sides clear the floor", compared.comparable);
  check("the aiFree average reflects only aiFree rows", Math.abs(compared.aiFree.avgStrength - 0.9) < 1e-9);
  check("the other average reflects only the rest", Math.abs(compared.other.avgStrength - 0.5) < 1e-9);

  // Unverified evidence must not sneak into either side of the comparison.
  await Evidence.create({
    user: user._id,
    dimension: "application",
    source: "self_report",
    strength: 1,
    verified: false,
    aiFree: true,
  });
  const withUnverified = await getAiFreePerformance(user._id);
  check("an unverified row does not inflate the aiFree sample", withUnverified.aiFree.sample === 6);

  await Evidence.deleteMany({ user: user._id });
  delete process.env.SMOKE_CLERK_ID;
}

/* ---------------------------------------------------------- the actual loop */

async function checkTheLoop() {
  const lesson = await Lesson.findOne().sort({ order: 1 });
  if (!lesson) {
    failures.push("no lessons in the database — run `npm run seed` first");
    return;
  }
  const lessonId = String(lesson._id);

  const { setGateStep, submitQuiz, masterLesson, createNote, deleteNote, gradeReview, updateNote } =
    await import("../src/lib/actions");
  const { requireUser } = await import("../src/lib/user");

  console.log("\nsign-in");

  // The Clerk stub reports this id; the real getCurrentUser turns it into a
  // local user document. Nothing below is mocked.
  process.env.SMOKE_CLERK_ID = CLERK_ID;
  const user = await requireUser();
  check("a first-time Clerk id creates a local user", String(user.clerkId) === CLERK_ID);
  check("the new user starts at zero XP", (user.xp ?? 0) === 0);

  const again0 = await requireUser();
  check("signing in twice reuses the same user", String(again0._id) === String(user._id));

  console.log("\nthe mastery gate");

  const empty = await masterLesson(lessonId);
  check("a lesson with nothing done is refused", empty.ok === false);
  check(
    "the refusal names every outstanding requirement",
    GATE_STEPS.every((s) => empty.ok === false && empty.message.includes(s.label))
  );

  await setGateStep(lessonId, "read", true);
  await setGateStep(lessonId, "exercised", true);
  await setGateStep(lessonId, "reviewed", true);

  const selfReported = await masterLesson(lessonId);
  check("three self-reported ticks are not enough", selfReported.ok === false);

  await setGateStep(lessonId, "quizzed", true);
  const afterClickingQuiz = await LessonProgress.findOne({ user: user._id, lesson: lessonId });
  check("the quiz gate cannot be clicked", afterClickingQuiz?.gate.quizzed === false);

  await setGateStep(lessonId, "noted", true);
  const afterClickingNote = await LessonProgress.findOne({ user: user._id, lesson: lessonId });
  check("the note gate cannot be clicked", afterClickingNote?.gate.noted === false);

  const failedQuiz = await submitQuiz(lessonId, 1, 5);
  check("20% fails the quiz", failedQuiz.passed === false);

  const passedQuiz = await submitQuiz(lessonId, 4, 5);
  check("80% passes the quiz", passedQuiz.passed === true);

  const retried = await submitQuiz(lessonId, 1, 5);
  const afterRetry = await LessonProgress.findOne({ user: user._id, lesson: lessonId });
  check("a bad retry does not report as a pass", retried.passed === false);
  check("a bad retry does not take back a cleared gate", afterRetry?.gate.quizzed === true);
  check("the stored score is the best attempt", afterRetry?.quizScore === 80);

  const { id: noteId } = await createNote({
    title: "Smoke note",
    body: "Long enough to count as a real note about this lesson.",
    lessonId,
  });
  const withNote = await LessonProgress.findOne({ user: user._id, lesson: lessonId });
  check("writing a note clears the note gate", withNote?.gate.noted === true);

  await deleteNote(noteId);
  const reopened = await masterLesson(lessonId);
  check("deleting the note reopens the gate", reopened.ok === false);
  check(
    "and the refusal says which one",
    reopened.ok === false && reopened.message.includes("Write a note")
  );

  await createNote({
    title: "Smoke note",
    body: "Long enough to count as a real note about this lesson.",
    lessonId,
  });

  console.log("\nmastery");

  const xpBefore = (await User.findById(user._id))!.xp ?? 0;
  const mastered = await masterLesson(lessonId);
  check("all five requirements met is accepted", mastered.ok === true);

  const progress = await LessonProgress.findOne({ user: user._id, lesson: lessonId });
  check("the lesson is recorded as mastered", progress?.state === "mastered");
  check("with a timestamp", progress?.masteredAt instanceof Date);

  const userAfter = await User.findById(user._id);
  check("XP went up", (userAfter?.xp ?? 0) > xpBefore);
  check("the streak started at 1", userAfter?.currentStreak === 1);
  check("today is recorded as the last active day", userAfter?.lastActiveDay === dayKey());

  const session = await StudySession.findOne({ user: user._id, day: dayKey() });
  check("today's session counts the lesson", session?.lessonsCompleted === 1);

  const review = await Review.findOne({ user: user._id, lesson: lessonId });
  check("the lesson entered the revision queue", review !== null);
  check("due tomorrow, not today", (review?.dueAt.getTime() ?? 0) > Date.now());

  const again = await masterLesson(lessonId);
  check("mastering twice is not an error", again.ok === true);
  const userAfterTwice = await User.findById(user._id);
  check("and does not award XP twice", userAfterTwice?.xp === userAfter?.xp);

  await setGateStep(lessonId, "read", false);
  const stillMastered = await LessonProgress.findOne({ user: user._id, lesson: lessonId });
  check("unticking afterwards does not un-master it", stillMastered?.state === "mastered");
  await setGateStep(lessonId, "read", true);

  console.log("\nrevision");

  // Pull the review into the past so it is genuinely due.
  await Review.updateOne({ _id: review!._id }, { $set: { dueAt: new Date(Date.now() - 1000) } });

  await gradeReview(String(review!._id), false);
  const lapsed = await Review.findOne({ _id: review!._id });
  const lapsedProgress = await LessonProgress.findOne({ user: user._id, lesson: lessonId });
  check("forgetting counts a lapse", lapsed?.lapses === 1);
  check("and flags the lesson for revision", lapsedProgress?.state === "needs_revision");

  await gradeReview(String(review!._id), true);
  const recovered = await Review.findOne({ _id: review!._id });
  check("remembering pushes the due date out", (recovered?.dueAt.getTime() ?? 0) > Date.now());

  console.log("\nownership");

  const stranger = await User.create({ clerkId: "smoke-test-stranger", name: "Stranger" });
  const strangerNote = await Note.create({ user: stranger._id, title: "Private", body: "secret" });

  // Still acting as the smoke user, reaching for someone else's data.
  await updateNote(String(strangerNote._id), { title: "Hacked" });
  check("you cannot edit someone else's note", (await Note.findById(strangerNote._id))?.title === "Private");

  await deleteNote(String(strangerNote._id));
  check("you cannot delete someone else's note", (await Note.findById(strangerNote._id)) !== null);

  // A server action's arguments are just JSON by the time they arrive; the
  // type annotation is long gone. Reassigning `user` must not be possible.
  const mine = await Note.findOne({ user: user._id });
  await updateNote(String(mine!._id), { body: "ok", user: stranger._id } as { body: string });
  check(
    "a note cannot be reassigned to another user",
    String((await Note.findById(mine!._id))?.user) === String(user._id)
  );

}

/* ---------------------------------------------------------------- projects */

async function checkProjects() {
  const { requireUser } = await import("../src/lib/user");
  const {
    createProject, updateProject, createTask, moveTask, updateTask,
    createMilestone, setMilestoneStatus, createBug, setBugStatus,
    createDeployment, logProjectTime, deleteProject,
  } = await import("../src/lib/actions");

  process.env.SMOKE_CLERK_ID = CLERK_ID;
  const user = await requireUser();

  console.log("\nprojects — the skill link");

  const skill = await Skill.findOne().lean<{ _id: unknown } | null>();
  const created = await createProject({
    title: "Smoke project",
    description: "Built by the smoke test",
    features: ["Auth", "Dashboard", "Tests"],
    skillIds: skill ? [String(skill._id)] : [],
    category: "web",
  });
  check("a project can be created", created.ok === true);
  const projectId = created.ok ? created.id : "";

  const project = await Project.findById(projectId);
  check("the wizard's features became tasks", (project?.counts?.tasks ?? 0) === 3);

  if (skill) {
    const forSkill = await Project.countDocuments({ user: user._id, skills: skill._id });
    check("the project links to the skill it practises", forSkill === 1);
  } else {
    check("the project links to the skill it practises", true);
  }

  check("ownership blocks a foreign project id", await (async () => {
    // The loop test already made this stranger; reuse rather than collide with
    // the unique clerkId index.
    const stranger = await User.findOneAndUpdate(
      { clerkId: "smoke-test-stranger" },
      { $setOnInsert: { name: "S" } },
      { upsert: true, new: true }
    );
    const theirs = await Project.create({ user: stranger._id, title: "Theirs" });
    // Acting as the smoke user, try to rename someone else's project. The
    // action refuses — whether by throwing or no-op, the row must be untouched.
    await updateProject(String(theirs._id), { title: "Hacked" }).catch(() => {});
    const after = await Project.findById(theirs._id);
    return after?.title === "Theirs";
  })());

  console.log("\nprojects — the board");

  const task = await createTask({ projectId, title: "Wire up JWT", status: "todo", priority: "high" });
  check("a task can be added to the board", task.ok === true);
  const taskId = task.ok ? task.id : "";

  await moveTask(taskId, "done");
  const moved = await Task.findById(taskId);
  check("moving a task to done stamps completedAt", moved?.completedAt instanceof Date);
  const refreshed = await Project.findById(projectId);
  check("finishing a task updates the done count", (refreshed?.counts?.tasksDone ?? 0) >= 1);

  await moveTask(taskId, "doing");
  const reopened = await Task.findById(taskId);
  check("moving it back clears completedAt", reopened?.completedAt == null);

  await updateTask(taskId, { priority: "critical", title: "Wire up JWT properly" });
  const edited = await Task.findById(taskId);
  check("a task can be edited", edited?.priority === "critical" && edited?.title === "Wire up JWT properly");

  console.log("\nprojects — milestones, bugs, deployments");

  await createMilestone({ projectId, title: "Auth done" });
  const milestone = await Milestone.findOne({ project: projectId });
  check("a milestone can be created", milestone !== null);
  await setMilestoneStatus(String(milestone!._id), "done");
  check("a milestone can be completed", (await Milestone.findById(milestone!._id))?.status === "done");

  await createBug({ projectId, title: "Redirect loop after login", severity: "high" });
  const bug = await Bug.findOne({ project: projectId });
  check("a bug can be reported", bug !== null);
  check("open bugs show in the count", (await Project.findById(projectId))?.counts?.bugsOpen === 1);
  await setBugStatus(String(bug!._id), "fixed");
  check("fixing a bug drops it from the open count", (await Project.findById(projectId))?.counts?.bugsOpen === 0);

  await createDeployment({ projectId, platform: "vercel", environment: "production", url: "https://smoke.vercel.app" });
  const deployment = await Deployment.findOne({ project: projectId });
  check("a deployment can be recorded", deployment !== null);
  check("a production deploy moves the project to deployed", (await Project.findById(projectId))?.status === "deployed");
  check("and captures the live url", (await Project.findById(projectId))?.liveUrl === "https://smoke.vercel.app");

  console.log("\nprojects — time tracking");

  await logProjectTime(projectId, 45, taskId);
  const timed = await Project.findById(projectId);
  check("logged time lands on the project", (timed?.minutesSpent ?? 0) === 45);
  const entry = await TimeEntry.findOne({ project: projectId });
  check("and creates a time entry for analytics", entry?.minutes === 45);
  const taskTime = await Task.findById(taskId);
  check("and accrues against the task", (taskTime?.actualMinutes ?? 0) === 45);

  console.log("\nprojects — activity feed");
  const activity = await ActivityLog.countDocuments({ project: projectId });
  check("meaningful actions were logged to the feed", activity >= 3);

  console.log("\nprojects — the planning assistant");
  {
    const { submitProjectPlan, submitProjectRetro } = await import("../src/lib/actions");

    // The guard, before any model call is attempted — same reasoning as the
    // teach-back guard test: this sandbox has a real provider key configured,
    // so a "does it save" test would fire a live network request, and the
    // smoke suite's reliability must not depend on that. See DECISIONS 032/033.
    const missingBoth = await submitProjectPlan(projectId, { building: "", need: "", steps: "", risks: "" });
    check("a plan with nothing in it is refused before any review", missingBoth.ok === false);

    const missingSteps = await submitProjectPlan(projectId, {
      building: "A thing",
      need: "",
      steps: "",
      risks: "",
    });
    check("building alone, with no steps, is still refused", missingSteps.ok === false);

    // The retro is a plain save, not an AI call — fully testable. Seed a plan
    // directly rather than through the action, for the same reason as above.
    check("a retro is refused with no plan to compare against", (await submitProjectRetro(projectId, "Went fine.")).ok === false);

    await Project.updateOne(
      { _id: projectId },
      { $set: { "plan.building": "A smoke-tested thing", "plan.steps": "Step one. Step two.", "plan.submittedAt": new Date() } },
    );
    check("an empty retro is refused", (await submitProjectRetro(projectId, "   ")).ok === false);

    const retro = await submitProjectRetro(projectId, "It took longer than the plan expected.");
    check("a real retro against a real plan is accepted", retro.ok === true);

    const withRetro = await Project.findById(projectId).lean<{ plan?: { retro?: string; retroAt?: Date } }>();
    check("the retro is persisted on the project", withRetro?.plan?.retro === "It took longer than the plan expected.");
    check("with a timestamp", withRetro?.plan?.retroAt instanceof Date);

    const updated = await submitProjectRetro(projectId, "Actually, it went about as expected.");
    check("saving again updates the same retro rather than appending a new one", updated.ok === true);
    const afterUpdate = await Project.findById(projectId).lean<{ plan?: { retro?: string } }>();
    check(
      "and the update actually landed",
      afterUpdate?.plan?.retro === "Actually, it went about as expected.",
    );

    // Planning was deliberately kept out of the competency system — none of
    // the eight dimensions is "planning ability" (DECISIONS on the diagnostic
    // made the same call). Real assertion, not a query that can never fail:
    // the count before and after a full plan+retro round trip must be equal.
    const { Evidence } = await import("../src/lib/models");
    const before = await Evidence.countDocuments({ user: user._id });
    await submitProjectRetro(projectId, "One more pass, to be sure.");
    const after = await Evidence.countDocuments({ user: user._id });
    check("a full plan-and-retro round trip writes no Evidence at all", before === after);
  }

  console.log("\nprojects — deletion cascades");
  await deleteProject(projectId);
  check("deleting a project removes it", (await Project.findById(projectId)) === null);
  check("and takes its tasks with it", (await Task.countDocuments({ project: projectId })) === 0);
  check("and its bugs", (await Bug.countDocuments({ project: projectId })) === 0);

  delete process.env.SMOKE_CLERK_ID;
}

/* --------------------------------------------------------------- knowledge */

async function checkKnowledge() {
  const { requireUser } = await import("../src/lib/user");
  const {
    createNote, updateNote, deleteNote, restoreNote, restoreVersion,
    openDailyNote, createFlashcard, gradeFlashcard, saveSnippet,
  } = await import("../src/lib/actions");

  process.env.SMOKE_CLERK_ID = CLERK_ID;
  const user = await requireUser();

  console.log("\nknowledge — wiki links and backlinks");

  const target = await createNote({ title: "MongoDB Indexes", body: "How compound indexes work." });
  const source = await createNote({ title: "Query performance", body: "Depends on [[MongoDB Indexes]] being right." });

  const links = await Backlink.find({ from: source.id });
  check("a [[wiki link]] creates a backlink row", links.length === 1);
  const resolved = await Backlink.findOne({ from: source.id, to: { $ne: null } });
  check("the link resolved to the target note by title", String(resolved?.to) === target.id);

  // Dangling link that resolves when the target is created afterwards.
  const dangling = await createNote({ title: "Sharding", body: "See [[Replica Sets]] first." });
  const beforeTarget = await Backlink.findOne({ from: dangling.id });
  check("a link to a missing note is kept but unresolved", beforeTarget != null && beforeTarget.to == null);

  const replica = await createNote({ title: "Replica Sets", body: "A primary and its secondaries." });
  const afterTarget = await Backlink.findOne({ from: dangling.id });
  check("creating the missing note resolves the dangling link", String(afterTarget?.to) === replica.id);

  console.log("\nknowledge — versions");

  await updateNote(target.id, { body: "First substantial revision of the indexes note.", snapshot: true });
  await updateNote(target.id, { body: "Second revision, quite different again.", snapshot: true });
  const versions = await NoteVersion.find({ note: target.id }).sort({ createdAt: 1 });
  check("a snapshot save records a version", versions.length >= 1);

  const oldest = versions[0];
  await restoreVersion(target.id, String(oldest._id));
  const restored = await Note.findById(target.id);
  check("restoring a version brings its body back", restored?.body === oldest.body);

  console.log("\nknowledge — trash is a grace period");

  const doomed = await createNote({ title: "Scratch", body: "temporary" });
  await deleteNote(doomed.id);
  const trashed = await Note.findById(doomed.id);
  check("first delete only trashes the note", trashed != null && trashed.trashedAt != null);

  await restoreNote(doomed.id);
  const back = await Note.findById(doomed.id);
  check("a trashed note can be restored", back != null && back.trashedAt == null);

  await deleteNote(doomed.id); // trash
  await deleteNote(doomed.id); // and now really delete
  check("a second delete removes it for good", (await Note.findById(doomed.id)) === null);

  console.log("\nknowledge — daily notes");
  const d1 = await openDailyNote();
  const d2 = await openDailyNote();
  check("opening the daily note twice returns the same one", d1.id === d2.id);

  console.log("\nknowledge — flashcards on the SRS ladder");
  await createFlashcard({ front: "What is an index?", back: "A sorted structure for fast lookup." });
  const card = await Flashcard.findOne({ user: user._id });
  const dueNow = card!.dueAt.getTime();
  await gradeFlashcard(String(card!._id), true);
  const graded = await Flashcard.findById(card!._id);
  check("grading a flashcard right pushes its due date out", (graded?.dueAt.getTime() ?? 0) > dueNow);
  check("and moves it up the ladder", (graded?.step ?? 0) === 1);

  console.log("\nknowledge — snippets");
  await saveSnippet({ title: "Mongo connect", language: "typescript", code: "mongoose.connect(uri)" });
  check("a snippet can be saved", (await Snippet.countDocuments({ user: user._id })) === 1);

  console.log("\nknowledge — the note gate still holds");
  const lesson = await Lesson.findOne();
  // Start from a clean slate: the loop test left a note on this same lesson.
  await Note.deleteMany({ user: user._id, lesson: lesson!._id });
  const lessonNote = await createNote({ title: "Lesson note", body: "In my own words.", lessonId: String(lesson!._id) });
  const progressed = await LessonProgress.findOne({ user: user._id, lesson: lesson!._id });
  check("a lesson-linked note still clears the note gate", progressed?.gate.noted === true);
  await deleteNote(lessonNote.id); // first delete only trashes
  const afterTrash = await LessonProgress.findOne({ user: user._id, lesson: lesson!._id });
  check("trashing the only note reopens the gate", afterTrash?.gate.noted === false);

  delete process.env.SMOKE_CLERK_ID;
}

/* ---------------------------------------------------------------- practice */

async function checkPractice() {
  const { runChallenge } = await import("../src/lib/runner");
  const { Challenge, ChallengeProgress, ChallengeAttempt } = await import("../src/lib/models");
  const { requireUser } = await import("../src/lib/user");
  const { runCode, submitCode } = await import("../src/lib/actions");

  console.log("\npractice — the executor");

  // Direct executor unit checks — the part everything else depends on.
  const good = runChallenge("function add(a,b){return a+b}", [
    { call: "add(2,3)", expected: "5" },
    { call: "add(-1,1)", expected: "0" },
  ]);
  check("correct code passes every test", good.ok && good.passedCount === 2);

  const wrong = runChallenge("function add(a,b){return a-b}", [{ call: "add(2,3)", expected: "5" }]);
  check("wrong code fails", !wrong.ok && wrong.passedCount === 0);

  const broken = runChallenge("function add(a,b){ this is not js", [{ call: "add(1,1)", expected: "2" }]);
  check("a syntax error is reported, not thrown", broken.error != null && broken.results.length === 0);

  const looping = runChallenge("function f(){ while(true){} }", [{ call: "f()", expected: "1" }]);
  check("an infinite loop is killed by the timeout", looping.results[0]?.passed === false);

  const deep = runChallenge("function pair(){return [1,{a:2}]}", [{ call: "pair()", expected: '[1,{"a":2}]' }]);
  check("results compare structurally, not by identity", deep.ok);

  const escaped = runChallenge("function f(){ return typeof process }", [{ call: "f()", expected: '"undefined"' }]);
  check("the sandbox hides process from the code", escaped.ok);

  console.log("\npractice — grading and XP");

  process.env.SMOKE_CLERK_ID = CLERK_ID;
  const user = await requireUser();

  const challenge = await Challenge.create({
    slug: "smoke-add",
    title: "Add",
    prompt: "Add two numbers",
    starterCode: "function add(a,b){}",
    entryPoint: "add",
    xp: 40,
    tests: [
      { call: "add(1,2)", expected: "3" },
      { call: "add(10,20)", expected: "30", hidden: true },
    ],
  });
  const cid = String(challenge._id);

  const dryRun = await runCode(cid, "function add(a,b){return a+b}");
  check("Run grades only the visible tests", dryRun.total === 1);
  check("Run records no attempt", (await ChallengeAttempt.countDocuments({ user: user._id, challenge: cid })) === 0);

  const xpBefore = (await User.findById(user._id))!.xp ?? 0;
  const failedSubmit = await submitCode(cid, "function add(a,b){return a-b}");
  check("a failing submit is not solved", failedSubmit.ok === false);
  check("but it is recorded as an attempt", (await ChallengeAttempt.countDocuments({ user: user._id, challenge: cid })) === 1);
  check("a failed submit awards no XP", ((await User.findById(user._id))!.xp ?? 0) === xpBefore);

  const passSubmit = await submitCode(cid, "function add(a,b){return a+b}", 5);
  check("a passing submit runs the hidden tests too", passSubmit.outcome?.total === 2);
  check("passing marks it solved and first-solve", passSubmit.ok && passSubmit.firstSolve === true);
  check("solving awards XP", ((await User.findById(user._id))!.xp ?? 0) === xpBefore + 40);

  const again = await submitCode(cid, "function add(a,b){return a+b}", 5);
  check("re-solving does not award XP twice", !again.firstSolve && ((await User.findById(user._id))!.xp ?? 0) === xpBefore + 40);

  const progress = await ChallengeProgress.findOne({ user: user._id, challenge: cid });
  check("progress records it solved", progress?.solved === true);

  await Challenge.deleteOne({ _id: cid });
  await ChallengeProgress.deleteMany({ challenge: cid });
  await ChallengeAttempt.deleteMany({ challenge: cid });

  delete process.env.SMOKE_CLERK_ID;
}

/* --------------------------------------------------------------------- ai */

async function checkAi() {
  const { requireUser } = await import("../src/lib/user");
  const { checkCap, recordUsage, costMicros, DAILY_REQUEST_CAP } = await import("../src/lib/ai");
  const { AiUsage, AiMemory, AiConversation, AiMessage } = await import("../src/lib/models");
  const { createConversation, deleteConversation, saveMemory, deleteMemory } = await import("../src/lib/actions");
  const { dayKey } = await import("../src/lib/day");

  process.env.SMOKE_CLERK_ID = CLERK_ID;
  const user = await requireUser();

  console.log("\nai — cost caps (the urgent one)");

  const fresh = await checkCap(user._id);
  check("a fresh user is under the cap", fresh.ok === true);

  await recordUsage(user._id, 1000, 500);
  const usage = await AiUsage.findOne({ user: user._id, day: dayKey() });
  check("usage records tokens", usage?.inputTokens === 1000 && usage?.outputTokens === 500);
  check("and computes a cost", usage?.costMicros === costMicros(1000, 500));
  check("and counts the request", usage?.requests === 1);

  // Trip the request ceiling directly and confirm the gate refuses.
  await AiUsage.updateOne({ user: user._id, day: dayKey() }, { $set: { requests: DAILY_REQUEST_CAP } });
  const capped = await checkCap(user._id);
  check("hitting the request cap refuses further calls", capped.ok === false);

  await AiUsage.deleteMany({ user: user._id });

  console.log("\nai — memory is editable");
  await saveMemory({ key: "Current goal", value: "Ship the backend", kind: "goal" });
  const mem = await AiMemory.findOne({ user: user._id, key: "Current goal" });
  check("a memory can be saved", mem?.value === "Ship the backend");
  await saveMemory({ key: "Current goal", value: "Ship everything", kind: "goal" });
  check("saving the same key updates rather than duplicates", (await AiMemory.countDocuments({ user: user._id, key: "Current goal" })) === 1);
  await deleteMemory(String(mem!._id));
  check("a memory can be forgotten", (await AiMemory.findById(mem!._id)) === null);

  console.log("\nai — conversations");
  const convo = await createConversation({ title: "Test chat" });
  check("a conversation can be created", (await AiConversation.findById(convo.id)) !== null);
  await AiMessage.create({ conversation: convo.id, user: user._id, role: "user", content: "hi" });
  await deleteConversation(convo.id);
  check("deleting a conversation removes it", (await AiConversation.findById(convo.id)) === null);
  check("and takes its messages with it", (await AiMessage.countDocuments({ conversation: convo.id })) === 0);

  delete process.env.SMOKE_CLERK_ID;
}

/* ------------------------------------------------------------------ career */

async function checkCareer() {
  const { scoreResume } = await import("../src/lib/ats");
  const { requireUser } = await import("../src/lib/user");
  const { createResume, saveResume, createApplication, moveApplication } = await import("../src/lib/actions");
  const { Resume, JobApplication } = await import("../src/lib/models");

  console.log("\ncareer — ATS scoring (pure)");

  const empty = scoreResume({});
  check("an empty resume scores low", empty.score < 20);
  check("and lists what is missing", empty.findings.length > 3);

  const strong = scoreResume({
    personal: { fullName: "A Dev", email: "a@dev.io", headline: "Full-stack developer" },
    summary: "A developer who builds real things. ".repeat(6),
    skills: ["TypeScript", "React", "Node", "MongoDB", "Next.js", "Docker", "Postgres", "AWS"],
    experience: [{ role: "Dev", company: "X", bullets: ["Built a system, reducing latency by 40%", "Led a team of 3"] }],
    projects: [{}, {}],
    education: [{}],
  });
  check("a complete resume scores high", strong.score >= 80);
  check("action-verb, quantified bullets are recognised", strong.strengths.some((s) => /action|quantif/i.test(s)));

  console.log("\ncareer — resume persistence + applications");

  process.env.SMOKE_CLERK_ID = CLERK_ID;
  const user = await requireUser();

  const { id } = await createResume({ title: "My CV" });
  check("a resume is created", (await Resume.findById(id)) !== null);

  const result = await saveResume(id, {
    personal: { fullName: "Dev", email: "d@ev.io", headline: "Builder" },
    summary: "Long enough summary to count for the ATS score here now. ".repeat(3),
    skills: ["TS", "React", "Node", "Mongo", "Next", "Docker", "SQL", "AWS"],
  });
  check("saving recomputes and returns an ATS score", (result?.atsScore ?? 0) > 0);
  const stored = await Resume.findById(id);
  check("the score is persisted on the resume", stored?.atsScore === result?.atsScore);

  const app = await createApplication({ company: "Acme", position: "Engineer", status: "wishlist" });
  check("an application can be tracked", app.ok === true);
  await moveApplication(app.ok ? app.id : "", "applied");
  const moved = await JobApplication.findById(app.ok ? app.id : "");
  check("moving to applied stamps the date", moved?.appliedAt instanceof Date);
  check("and appends to the timeline", (moved?.timeline?.length ?? 0) >= 2);

  await Resume.deleteMany({ user: user._id });
  await JobApplication.deleteMany({ user: user._id });
  delete process.env.SMOKE_CLERK_ID;
}

/* --------------------------------------------------------------- analytics */

async function checkAnalytics() {
  const { earnedKeys, ACHIEVEMENTS } = await import("../src/lib/achievements");
  const { requireUser } = await import("../src/lib/user");
  const { createGoal, createHabit, toggleHabitToday, logFocusSession, createEvent, syncAchievements } =
    await import("../src/lib/actions");
  const { getGoals, getHabits, getFocusToday } = await import("../src/lib/queries");
  const { Habit, FocusSession, CalendarEvent, Achievement, Goal, StudySession } = await import("../src/lib/models");
  const { dayKey } = await import("../src/lib/day");

  console.log("\nanalytics — achievement engine (pure)");
  check("a beginner has earned nothing", earnedKeys({}).length === 0);
  check("one mastered lesson earns the first badge", earnedKeys({ lessonsMastered: 1 }).includes("first-lesson"));
  check("higher counts earn more", earnedKeys({ challengesSolved: 50 }).length > earnedKeys({ challengesSolved: 1 }).length);
  check("every badge has a positive threshold", ACHIEVEMENTS.every((a) => a.threshold > 0));

  process.env.SMOKE_CLERK_ID = CLERK_ID;
  const user = await requireUser();

  console.log("\nanalytics — habits and streaks");
  await createHabit({ title: "Practice daily" });
  const habit = await Habit.findOne({ user: user._id });
  await toggleHabitToday(String(habit!._id));
  const doneOnce = await Habit.findById(habit!._id);
  check("ticking a habit today sets a 1-day streak", doneOnce?.currentStreak === 1);
  check("and records today", (doneOnce?.completedDays ?? []).includes(dayKey()));
  await toggleHabitToday(String(habit!._id));
  const undone = await Habit.findById(habit!._id);
  check("un-ticking clears the streak", undone?.currentStreak === 0);

  const habits = await getHabits(user._id);
  check("the habit query reports doneToday correctly", habits[0]?.doneToday === false);

  console.log("\nanalytics — focus sessions feed time tracking");
  await logFocusSession({ minutes: 25, intent: "deep work" });
  const focus = await getFocusToday(user._id);
  check("a focus session is logged", focus.count === 1 && focus.minutes === 25);
  const session = await StudySession.findOne({ user: user._id, day: dayKey() });
  check("and its minutes reach the day's study session", (session?.focusMinutes ?? 0) === 25);

  console.log("\nanalytics — goals measure live");
  await createGoal({ title: "Focus 20 min", metric: "minutes", target: 20, period: "day" });
  const goals = await getGoals(user._id);
  const goal = goals.find((g) => g.title === "Focus 20 min");
  check("a minutes goal reads real study time", (goal?.value ?? 0) >= 25);
  check("and is marked achieved when met", goal?.achieved === true);

  console.log("\nanalytics — achievement sweep unlocks");
  await syncAchievements();
  // The focus session logged 25 min but the badge needs 600; nothing yet.
  const focusBadge = await Achievement.findOne({ user: user._id, key: "focus-600" });
  check("an unmet badge stays locked", focusBadge === null);

  console.log("\ncalendar — events and pulled-in deadlines");
  await createEvent({ title: "Study block", kind: "study", startAt: new Date().toISOString() });
  check("a calendar event can be created", (await CalendarEvent.countDocuments({ user: user._id })) === 1);

  await Promise.all([
    Habit.deleteMany({ user: user._id }),
    FocusSession.deleteMany({ user: user._id }),
    CalendarEvent.deleteMany({ user: user._id }),
    Achievement.deleteMany({ user: user._id }),
    Goal.deleteMany({ user: user._id }),
  ]);
  delete process.env.SMOKE_CLERK_ID;
}

/* ------------------------------------------------------------------- admin */

async function checkAdmin() {
  const { requireUser, requireAdmin } = await import("../src/lib/user");
  const { setUserRole, upsertFlag, createLesson } = await import("../src/lib/actions");
  const { AuditLog, FeatureFlag, User } = await import("../src/lib/models");

  console.log("\nadmin — the guard");

  // The smoke user is a normal user (not first-ever on the shared smoke db).
  process.env.SMOKE_CLERK_ID = CLERK_ID;
  const user = await requireUser();
  await User.updateOne({ _id: user._id }, { $set: { role: "user" } });

  let refused = false;
  try { await requireAdmin(); } catch { refused = true; }
  check("a normal user is refused admin", refused === true);

  let flagBlocked = false;
  try { await upsertFlag({ key: "x", enabled: true }); } catch { flagBlocked = true; }
  check("a normal user cannot toggle a flag", flagBlocked === true);

  console.log("\nadmin — actions are audited");
  await User.updateOne({ _id: user._id }, { $set: { role: "admin" } });

  await upsertFlag({ key: "smoke-flag", enabled: true, description: "test" });
  check("an admin can create a flag", (await FeatureFlag.findOne({ key: "smoke-flag" }))?.enabled === true);
  check("and it is written to the audit log", (await AuditLog.countDocuments({ actor: user._id, action: /flag/ })) >= 1);

  console.log("\nadmin — last-admin protection");
  // Make a second admin, then confirm the smoke admin cannot demote themselves
  // while they would be the last one — first create a stranger admin.
  const stranger = await User.findOneAndUpdate(
    { clerkId: "smoke-test-stranger" },
    { $setOnInsert: { name: "S" }, $set: { role: "user" } },
    { upsert: true, new: true }
  );
  // Only smoke user is admin now. Demoting them must be refused.
  await User.updateMany({ _id: { $ne: user._id }, role: "admin" }, { $set: { role: "user" } });
  const demoteSelf = await setUserRole(String(user._id), "user");
  check("cannot demote the last admin", demoteSelf.ok === false);

  // Promote the stranger, then demoting the smoke user is allowed.
  await setUserRole(String(stranger._id), "admin");
  const nowOk = await setUserRole(String(stranger._id), "user");
  check("demoting is allowed while another admin exists", nowOk.ok === true);

  await FeatureFlag.deleteMany({ key: "smoke-flag" });
  await AuditLog.deleteMany({ actor: user._id });
  delete process.env.SMOKE_CLERK_ID;
}

/* ------------------------------------------------------------ tier-0 finishes */

async function checkTierZero() {
  const { requireUser } = await import("../src/lib/user");
  const { trackLessonTime } = await import("../src/lib/actions");
  const { searchLessons } = await import("../src/lib/queries");
  const { Lesson, LessonProgress, TimeEntry, StudySession } = await import("../src/lib/models");
  const { dayKey } = await import("../src/lib/day");

  process.env.SMOKE_CLERK_ID = CLERK_ID;
  const user = await requireUser();
  const lesson = await Lesson.findOne();

  console.log("\ntier-0 — real lesson time tracking");
  await trackLessonTime(String(lesson!._id), 30);
  const progress = await LessonProgress.findOne({ user: user._id, lesson: lesson!._id });
  check("a heartbeat accrues real minutes on the lesson", (progress?.minutesSpent ?? 0) > 0);
  const entry = await TimeEntry.findOne({ user: user._id, kind: "lesson", lesson: lesson!._id, day: dayKey() });
  check("and books it as a lesson TimeEntry", entry !== null);

  await trackLessonTime(String(lesson!._id), 30);
  const entries = await TimeEntry.countDocuments({ user: user._id, kind: "lesson", lesson: lesson!._id, day: dayKey() });
  check("a second beat increments the same daily entry, not a new one", entries === 1);

  const beat = await StudySession.findOne({ user: user._id, day: dayKey() });
  check("tracked time reaches the day's study session", (beat?.minutes ?? 0) > 0);

  console.log("\ntier-0 — lesson search");
  const found = await searchLessons(user._id, String(lesson!.title).slice(0, 5));
  check("a lesson is found by a slice of its title", found.some((l) => l.id === String(lesson!._id)));
  check("a one-character query returns nothing", (await searchLessons(user._id, "x")).length === 0);

  delete process.env.SMOKE_CLERK_ID;
}

/* ---------------------------------------------------------------- platform */

async function checkPlatform() {
  const { requireUser } = await import("../src/lib/user");
  const { search, getNotifications } = await import("../src/lib/queries");
  const { updatePreferences, exportData, createNote, deleteAccount } = await import("../src/lib/actions");
  const { User, Note, Notification, Project } = await import("../src/lib/models");

  process.env.SMOKE_CLERK_ID = CLERK_ID;
  const user = await requireUser();

  console.log("\nplatform — global search");
  await createNote({ title: "Kubernetes basics", body: "pods and services" });
  await Project.create({ user: user._id, title: "Kubernetes dashboard" });
  const hits = await search(user._id, "kubernetes");
  check("search finds a matching note", hits.some((h) => h.type === "Note" && /kubernetes/i.test(h.title)));
  check("and a matching project", hits.some((h) => h.type === "Project"));
  check("every hit carries a link", hits.every((h) => h.href.length > 0));
  check("a too-short query returns nothing", (await search(user._id, "k")).length === 0);
  check("search is scoped to the user", (await search("000000000000000000000000", "kubernetes")).every((h) => h.type === "Lesson" || h.type === "Challenge"));

  console.log("\nplatform — settings");
  await updatePreferences({ theme: "light", pomodoroMinutes: 50, notifyReviews: false });
  const after = await User.findById(user._id);
  check("a preference is saved", after?.preferences?.theme === "light");
  check("and only whitelisted keys land", after?.preferences?.pomodoroMinutes === 50);

  // A malicious extra key must not reach the document. Capture the baseline
  // rather than assume it — an earlier check may have set this user's role.
  const before = await User.findById(user._id);
  const roleBefore = before?.role;
  const xpBefore = before?.xp ?? 0;
  await updatePreferences({ theme: "dark", role: "superadmin", xp: 999999 } as Record<string, unknown>);
  const guarded = await User.findById(user._id);
  check("settings cannot smuggle in role or xp", guarded?.role === roleBefore && (guarded?.xp ?? 0) === xpBefore);

  console.log("\nplatform — data export and account delete");
  const json = await exportData();
  const parsed = JSON.parse(json);
  check("export includes the user's notes", Array.isArray(parsed.notes) && parsed.notes.length >= 1);

  await Notification.create({ user: user._id, title: "Test", kind: "system" });
  check("notifications read back", (await getNotifications(user._id)).length >= 1);

  const noDelete = await deleteAccount("nope");
  check("delete refuses without the confirm word", noDelete.ok === false);
  check("and the user still exists", (await User.findById(user._id)) !== null);

  const del = await deleteAccount("DELETE");
  check("delete removes the account", del.ok === true && (await User.findById(user._id)) === null);
  check("and takes the user's notes with it", (await Note.countDocuments({ user: user._id })) === 0);

  delete process.env.SMOKE_CLERK_ID;
}

const TEST_CLERK_IDS = [CLERK_ID, "smoke-test-stranger"];

/**
 * Runs at both ends. At the start because a run that crashed half way through
 * leaves a user with gates already ticked, and the next run then "passes"
 * checks it never really made — a green result built on someone else's state
 * is worse than a red one.
 */
async function cleanup() {
  const users = await User.find({ clerkId: { $in: TEST_CLERK_IDS } }).select("_id").lean();
  const ids = users.map((u) => u._id);
  if (ids.length === 0) return;

  await Promise.all([
    User.deleteMany({ _id: { $in: ids } }),
    LessonProgress.deleteMany({ user: { $in: ids } }),
    Note.deleteMany({ user: { $in: ids } }),
    Review.deleteMany({ user: { $in: ids } }),
    StudySession.deleteMany({ user: { $in: ids } }),
    Project.deleteMany({ user: { $in: ids } }),
    Task.deleteMany({ user: { $in: ids } }),
    Milestone.deleteMany({ user: { $in: ids } }),
    Bug.deleteMany({ user: { $in: ids } }),
    Deployment.deleteMany({ user: { $in: ids } }),
    ActivityLog.deleteMany({ user: { $in: ids } }),
    TimeEntry.deleteMany({ user: { $in: ids } }),
    Backlink.deleteMany({ user: { $in: ids } }),
    NoteVersion.deleteMany({ user: { $in: ids } }),
    Flashcard.deleteMany({ user: { $in: ids } }),
    Snippet.deleteMany({ user: { $in: ids } }),
    AiUsage.deleteMany({ user: { $in: ids } }),
    AiMemory.deleteMany({ user: { $in: ids } }),
    AiConversation.deleteMany({ user: { $in: ids } }),
    AiMessage.deleteMany({ user: { $in: ids } }),
    (await import("../src/lib/models")).Evidence.deleteMany({ user: { $in: ids } }),
    (await import("../src/lib/models")).Resume.deleteMany({ user: { $in: ids } }),
    (await import("../src/lib/models")).JobApplication.deleteMany({ user: { $in: ids } }),
    (await import("../src/lib/models")).Certificate.deleteMany({ user: { $in: ids } }),
    (await import("../src/lib/models")).Interview.deleteMany({ user: { $in: ids } }),
    (await import("../src/lib/models")).Client.deleteMany({ user: { $in: ids } }),
    (await import("../src/lib/models")).IncomeEntry.deleteMany({ user: { $in: ids } }),
    (await import("../src/lib/models")).Portfolio.deleteMany({ user: { $in: ids } }),
  ]);
}

async function main() {
  // The smoke test creates and deletes users, so it must never run against the
  // real application database. SMOKE_MONGODB_URI lets you point it at a throwaway
  // (the local `npm run db` is ideal); it only falls back to MONGODB_URI when no
  // dedicated one is set.
  const uri = process.env.SMOKE_MONGODB_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("Set SMOKE_MONGODB_URI (or MONGODB_URI) — see SETUP.md");

  // The app's connectDB() reads MONGODB_URI at call time. Point it at the same
  // database the harness is on, or the two open competing connections.
  process.env.MONGODB_URI = uri;

  await mongoose.connect(uri);
  console.log(`connected to ${uri.replace(/\/\/[^@]*@/, "//***@")}`);

  await cleanup();
  await ensureContent();
  checkPureLogic();
  // After checkTheLoop, not before: that section asserts a *first-time* Clerk
  // id creates the user, and resolving the user here first would quietly turn
  // that into a second-time check that passes for the wrong reason.
  await checkTheLoop();
  await checkLearningSchema();
  await checkEvidenceWritePath();
  await checkHintLadder();
  await checkDiagnostic();
  await checkTutorState();
  await checkTeachBackGuard();
  await checkAiFreePerformance();
  await checkProjects();
  await checkKnowledge();
  await checkPractice();
  await checkAi();
  await checkCareer();
  await checkAnalytics();
  await checkAdmin();
  await checkTierZero();
  await checkPlatform();
  await cleanup();

  await mongoose.disconnect();

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length > 0) {
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
  }
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
