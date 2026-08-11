"use client";

import { useEffect } from "react";
import { RotateCw, TriangleAlert } from "lucide-react";
import { LinkButton } from "@/components/action-button";
import { StatusScreen } from "@/components/status-screens";

/**
 * The boundary for everything *outside* the app shell — the landing page,
 * `/verify`, `/preview`, the auth routes.
 *
 * `(app)/error.tsx` catches failures inside the signed-in product, and because
 * it is the closer boundary it keeps winning there; this one only ever runs for
 * the public surface, which until now had no boundary at all and would show a
 * raw Next.js error page to a logged-out visitor. A certificate verification
 * that 500s in front of a recruiter is the worst possible place in this product
 * to leak a stack trace.
 *
 * The actions differ from the in-app boundary on purpose: someone here may have
 * no account, so "back to dashboard" would be a door they cannot open.
 */
export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[public]", error);
  }, [error]);

  return (
    <StatusScreen
      tone="danger"
      icon={<TriangleAlert size={24} />}
      eyebrow="Something broke"
      title="This page did not load"
      body={
        error.digest
          ? `Something went wrong at our end. Nothing you did caused it. Reference ${error.digest}.`
          : "Something went wrong at our end. Nothing you did caused it, and trying again usually works."
      }
      actions={
        <>
          <button onClick={reset} className="btn btn-primary">
            <RotateCw size={15} /> Try again
          </button>
          <LinkButton href="/" className="btn btn-ghost">
            Back to home
          </LinkButton>
        </>
      }
    />
  );
}
