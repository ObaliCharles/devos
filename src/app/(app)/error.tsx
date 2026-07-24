"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCw, TriangleAlert } from "lucide-react";
import { HomeLink, StatusScreen } from "@/components/status-screens";

/**
 * Catches anything a page throws below the shell, so the sidebar and topbar
 * stay on screen and the failure is recoverable in place.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app]", error);
  }, [error]);

  return (
    <StatusScreen
      tone="danger"
      icon={<TriangleAlert size={24} />}
      eyebrow="Something broke"
      title="This page did not load"
      body={
        // The digest is the only handle on a production error, where the real
        // message is stripped before it reaches the browser.
        error.digest
          ? `The server hit an error while rendering. Reference ${error.digest}.`
          : "The server hit an error while rendering this page. Trying again often works, the database connection is the usual culprit."
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
