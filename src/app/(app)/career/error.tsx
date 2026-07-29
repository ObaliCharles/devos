"use client";

import { useEffect } from "react";
import { LinkButton } from "@/components/action-button";
import Link from "next/link";
import { RotateCw, TriangleAlert } from "lucide-react";
import { StatusScreen } from "@/components/status-screens";

/**
 * Scoped to Career. Without this, a failure here is caught by the app-wide
 * boundary and blanks every route below the shell; with it, the failure stays
 * inside Career and the rest of the product keeps working.
 */
export default function CareerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[career]", error);
  }, [error]);

  return (
    <StatusScreen
      tone="danger"
      icon={<TriangleAlert size={22} />}
      eyebrow="Career"
      title="This section did not load"
      body={
        error.digest
          ? `Something went wrong in the career tools. Reference ${error.digest}.`
          : "Something went wrong in the career tools. Trying again usually works — the database connection is the usual culprit."
      }
      actions={
        <>
          <button onClick={reset} className="btn btn-primary">
            <RotateCw size={15} /> Try again
          </button>
          <LinkButton href="/dashboard" className="btn btn-ghost">
            Back to dashboard
          </LinkButton>
        </>
      }
    />
  );
}
