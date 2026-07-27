"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCw, TriangleAlert } from "lucide-react";
import { StatusScreen } from "@/components/status-screens";

/**
 * Scoped to Knowledge. Without this, a failure here is caught by the app-wide
 * boundary and blanks every route below the shell; with it, the failure stays
 * inside Knowledge and the rest of the product keeps working.
 */
export default function NotesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[notes]", error);
  }, [error]);

  return (
    <StatusScreen
      tone="danger"
      icon={<TriangleAlert size={22} />}
      eyebrow="Knowledge"
      title="This section did not load"
      body={
        error.digest
          ? `Something went wrong in your knowledge base. Reference ${error.digest}.`
          : "Something went wrong in your knowledge base. Trying again usually works — the database connection is the usual culprit."
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
