"use server";

import { connectDB } from "../db";
import { User } from "../models";
import { requireUser } from "../user";
import { recordEvidence } from "../evidence";
import { competencyFrom, type EvidenceInput } from "../competency";
import {
  DIAGNOSTIC_QUESTIONS,
  EXPLANATION_PROMPT,
  gradeDiagnostic,
  type DiagnosticAnswer,
} from "../diagnostic";

/**
 * Grading and recording the diagnostic onboarding assessment.
 *
 * This is not exported for the client to call piecemeal — it takes the whole
 * set of answers and grades them together, the same "one submission, graded
 * server-side" shape `submitQuiz` and `submitCode` already use. There is no
 * partial-credit save-as-you-go: a diagnostic half-taken and abandoned should
 * not leave four confident-looking Evidence rows behind.
 */
export async function submitDiagnostic(answers: DiagnosticAnswer[], explanationText: string) {
  await connectDB();
  const user = await requireUser();

  const { graded, perDimension } = gradeDiagnostic(answers);

  // One verified row per graded question — machine-decided, so `verified:
  // true` is honest here in exactly the way DECISIONS 026 requires. No
  // `skill`: see the field's own note on why a diagnostic cannot have one.
  // `aiFree: true` because it is true: `/diagnostic` has no AI panel, by
  // construction — the page's own copy already promises "No AI, no notes",
  // and until this the evidence it produced did not back that claim up. See
  // DECISIONS on `getAiFreePerformance`, which this is the write side of.
  await Promise.all(
    graded.map((g) =>
      recordEvidence({
        userId: user._id,
        dimension: g.dimension,
        source: "diagnostic",
        strength: g.correct ? 1 : 0,
        verified: true,
        aiFree: true,
        detail: g.correct ? "Answered correctly in the diagnostic" : "Missed in the diagnostic",
      }),
    ),
  );

  // The free-response answer is real evidence and genuinely unverified — the
  // honest self_report weight (DECISIONS 026), not the diagnostic's machine-
  // graded one. A trivially short answer ("idk") is not treated as an attempt.
  const trimmed = explanationText.trim();
  if (trimmed.length >= 40) {
    await recordEvidence({
      userId: user._id,
      dimension: EXPLANATION_PROMPT.dimension,
      source: "self_report",
      strength: 1,
      verified: false,
      detail: "Free-response answer in the diagnostic, ungraded",
    });
  }

  // Idempotent: retaking the diagnostic writes fresh evidence (the append-only
  // ledger keeps both attempts) but does not move the "first diagnosed" date.
  if (!user.onboardedAt) {
    await User.updateOne({ _id: user._id }, { $set: { onboardedAt: new Date() } });
  }

  const dimensions = Object.keys(perDimension) as (keyof typeof perDimension)[];
  const inputs: EvidenceInput[] = dimensions.map((d) => {
    const bucket = perDimension[d]!;
    return {
      dimension: d,
      source: "diagnostic",
      strength: bucket.correct / Math.max(1, bucket.total),
      verified: true,
    };
  });
  const profile = competencyFrom(inputs, dimensions);

  return {
    ok: true as const,
    graded,
    perDimension,
    profile,
    score: graded.filter((g) => g.correct).length,
    total: DIAGNOSTIC_QUESTIONS.length,
  };
}
