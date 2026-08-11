"use client";

import { useEffect } from "react";

/**
 * The last boundary. This one catches a failure in the **root layout itself** —
 * the one place `app/error.tsx` cannot reach, because that boundary renders
 * *inside* the layout that just threw.
 *
 * Two consequences shape everything below:
 *
 * 1. It must render its own `<html>` and `<body>`. There is no layout above it.
 * 2. It cannot rely on the design system. `globals.css` is imported by the root
 *    layout, and the root layout is what failed — so the tokens, the fonts and
 *    every utility class may be absent. Every style here is therefore inline
 *    and literal, which is the one place in this product that is correct.
 *
 * It should essentially never render. When it does, the app is broken badly
 * enough that the honest thing is a legible sentence and a reload button, not
 * an attempt to look like the product.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          // Literal, not tokens: see the note above. These are the dark palette's
          // real values, so a viewer who does get here still sees the product's
          // colours rather than a white flash.
          background: "#0a0c11",
          color: "#edeff4",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <main style={{ maxWidth: "34rem", textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.38)",
            }}
          >
            DeveloperOS
          </p>
          <h1
            style={{
              margin: "12px 0 0",
              fontSize: "22px",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.2,
            }}
          >
            The application failed to start
          </h1>
          <p
            style={{
              margin: "10px 0 0",
              fontSize: "14px",
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.6)",
            }}
          >
            Something went wrong before the page could be drawn. Your work is saved — nothing here
            writes to your account.
            {error.digest ? ` Reference ${error.digest}.` : ""}
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "24px",
              padding: "9px 18px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.11)",
              background: "#7c6bff",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
