"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCw, TriangleAlert } from "lucide-react";
import { StatusScreen } from "@/components/status-screens";

/**
 * Scoped to AI Workspace. Without this, a failure here is caught by the app-wide
 * boundary and blanks every route below the shell; with it, the failure stays
 * inside AI Workspace and the rest of the product keeps working.
 */
export default function AiError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ai]", error);
  }, [error]);

  return (
    <StatusScreen
      tone="danger"
      icon={<TriangleAlert size={22} />}
      eyebrow="AI Workspace"
      title="This section did not load"
      body={
        error.digest
          ? `Something went wrong in the AI workspace. Reference ${error.digest}.`
          : "Something went wrong in the AI workspace. Trying again usually works — the database connection is the usual culprit."
      }
      actions={
        <>
          <button onClick={reset} className="btn btn-primary">
            <RotateCw size={15} /> Try again
          </button>
          <Link href="/dashboard" className="btn btn-ghost">
            Back to dashboard
          </Link>
        </>
      }
    />
  );
}
