import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The frame around Clerk's sign-in and sign-up widgets. Clerk owns the form;
 * this owns everything around it, so the first screen a new person sees is
 * unmistakably the same product as the one behind the login.
 */
export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-[15px] font-semibold tracking-[-0.02em]"
          >
            <span
              className="grid h-[28px] w-[28px] place-items-center rounded-[var(--radius-tile)] text-[14px] font-bold"
              style={{
                background: "var(--primary)",
                color: "var(--primary-ink)",
                boxShadow: "var(--sheen)",
              }}
            >
              D
            </span>
            Developer<span style={{ color: "var(--primary)" }}>OS</span>
          </Link>

          <p className="eyebrow eyebrow-accent mt-8">{eyebrow}</p>
          <h1 className="mt-2 text-[26px] font-bold tracking-[-0.03em]">{title}</h1>
          <p className="text-body mx-auto mt-2 max-w-[38ch] text-[13.5px]">{description}</p>
        </div>

        <div className="flex justify-center">{children}</div>
      </div>
    </main>
  );
}

/**
 * Clerk theming, in one place. Its widget renders outside our CSS cascade, so
 * the tokens have to be handed to it explicitly — and only once, rather than
 * copy-pasted into each auth route.
 */
export const CLERK_APPEARANCE = {
  variables: {
    colorPrimary: "#6d74f4",
    colorBackground: "#101217",
    colorText: "#eceef3",
    colorTextSecondary: "#98a0af",
    colorInputBackground: "#16181f",
    colorInputText: "#eceef3",
    borderRadius: "9px",
    fontSize: "14px",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-md)]",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    footer: "bg-transparent",
  },
} as const;
