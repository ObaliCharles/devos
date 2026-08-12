import { requireUser } from "@/lib/user";
import { DIAGNOSTIC_QUESTIONS, EXPLANATION_PROMPT } from "@/lib/diagnostic";
import { PageHeader } from "@/components/ui";
import { DiagnosticFlow } from "@/components/diagnostic/diagnostic-flow";

export const dynamic = "force-dynamic";

/**
 * "What do I know?" — the learning-upgrade spec's own first question (§44),
 * and the one step the product had no answer for until this page: a new
 * signup went straight to picking a roadmap with the system knowing nothing
 * real about them.
 *
 * Reachable, not forced. There is no middleware gate sending every new user
 * here — see DECISIONS on why that is a deliberate, separate product decision
 * this change does not make unilaterally. It is linked from the dashboard
 * when `user.onboardedAt` is unset, and open to revisit any time after.
 */
export default async function DiagnosticPage() {
  const user = await requireUser();

  return (
    <div className="page-body">
      <PageHeader
        eyebrow="Diagnostic"
        title={user.onboardedAt ? "Retake the diagnostic" : "What do you already know?"}
        description="Nine short questions across four areas — knowledge, problem solving, implementation and debugging. No AI, no notes. This becomes your starting point, not a score to pass."
      />
      <DiagnosticFlow questions={DIAGNOSTIC_QUESTIONS} explanationPrompt={EXPLANATION_PROMPT} />
    </div>
  );
}
