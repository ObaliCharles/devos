import { Schema, model, models } from "mongoose";
import { DIMENSIONS, EVIDENCE_SOURCES, MAX_ASSIST_LEVEL } from "../competency";

/* ===========================================================================
   EVIDENCE — the record of what a learner has actually demonstrated.

   This is an append-only log, not a summary. Nothing here is ever updated to
   "the current level" of anything, because the moment you store a level you
   have to decide what invalidates it, and the honest answer (forgetting,
   which is invisible) cannot be observed. So the collection stores artefacts —
   this quiz, that commit, this teach-back, at this time, with this much help —
   and every judgement about competence is derived from them by
   `lib/competency.ts` at read time.

   Two consequences worth knowing before adding to this file:

   1. Rows are immutable. Correcting something means writing another row, the
      way a ledger works. That is what makes "how did you change over the last
      month" answerable at all — the past is still there to compare against.
   2. Deriving is a query, not a field. Nothing caches a mastery score. If that
      becomes too slow, cache it somewhere that is obviously a cache, and never
      on the User.
   ======================================================================== */

const EvidenceSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    /**
     * The skill this is evidence for. Required: evidence that is not attached
     * to a competency is an activity log, and there is already one of those.
     */
    skill: { type: Schema.Types.ObjectId, ref: "Skill", required: true, index: true },
    /** Where it happened, when it happened inside a lesson. */
    lesson: { type: Schema.Types.ObjectId, ref: "Lesson", index: true },
    /** Or inside a project, which is the other place real evidence comes from. */
    project: { type: Schema.Types.ObjectId, ref: "Project", index: true },

    /** Which of the eight capabilities this demonstrates. */
    dimension: { type: String, enum: [...DIMENSIONS], required: true },
    /** What produced it. Decides most of its weight — see SOURCE_WEIGHT. */
    source: { type: String, enum: [...EVIDENCE_SOURCES], required: true },
    /** The activity type, when it came from inside a structured lesson. */
    activityType: String,

    /** 0–1. How well it went: a quiz fraction, tests passed over tests run. */
    strength: { type: Number, required: true, min: 0, max: 1 },

    /**
     * True only when a machine decided the outcome. `setGateStep` ticking a box
     * is not verification, and writing `verified: true` for one would quietly
     * turn the whole model back into a checkbox — so the rule is: if a human
     * asserted it, this is false, no exceptions.
     */
    verified: { type: Boolean, default: false },

    /**
     * How far down the hint ladder the learner went, 0 unaided to 6 handed the
     * answer. Stored per artefact rather than aggregated, because the useful
     * question is "has this been going up on hard problems", which needs the
     * series and not the average.
     *
     * **No default, deliberately.** Absent means "not measured", which is not
     * the same as unaided, and defaulting it to 0 would report every learner as
     * fully independent on the strength of having measured nothing. Nothing
     * writes it until the hint ladder ships.
     */
    assistLevel: { type: Number, min: 0, max: MAX_ASSIST_LEVEL },
    /** True when produced under an explicit no-AI assessment. */
    aiFree: { type: Boolean, default: false },

    /** Pointer to the artefact: an attempt id, a commit sha, a note id. */
    ref: String,
    /** One line, shown on the skill page. "Passed 12/12 tests, unaided." */
    detail: { type: String, maxlength: 300 },
  },
  { timestamps: true }
);

// The read that matters: everything for one user and one skill, newest first.
// Authorisation is a filter, so the index starts with the user.
EvidenceSchema.index({ user: 1, skill: 1, dimension: 1, createdAt: -1 });
// Backs the independence metric and the monthly comparison, which slice by
// time across every skill rather than by skill.
EvidenceSchema.index({ user: 1, createdAt: -1 });

/* ---------------------------------------------------------------------------
   Objectives on a skill.

   A Lesson carries its own objectives (see content.ts). A Skill needs one more
   thing the lesson cannot know: which dimensions this particular skill is
   fairly judged on. A conceptual skill has no implementation dimension, and
   demanding one would leave it permanently unmasterable — so `dimensions` here
   is the `relevant` argument passed to `competencyFrom`.
   ------------------------------------------------------------------------- */

const SkillCompetencySchema = new Schema(
  {
    skill: { type: Schema.Types.ObjectId, ref: "Skill", required: true, unique: true },
    /** Empty means all eight apply. */
    dimensions: { type: [String], enum: [...DIMENSIONS], default: [] },
    /** Skills that should be competent before this one is attempted. */
    prerequisites: [{ type: Schema.Types.ObjectId, ref: "Skill" }],
  },
  { timestamps: true }
);

export const Evidence = models.Evidence ?? model("Evidence", EvidenceSchema);
export const SkillCompetency =
  models.SkillCompetency ?? model("SkillCompetency", SkillCompetencySchema);
