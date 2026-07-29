"use client";

import { useState, useTransition, type ComponentProps, type ReactNode } from "react";
import Link from "next/link";
import { useLinkStatus } from "next/link";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

/**
 * Buttons that admit they are working.
 *
 * Three different waits look identical to someone pressing a button, and none
 * of them showed anything before this: a server action running, a form posting,
 * and a route navigating. So there are three components rather than one clever
 * one — each hooks the signal that actually exists for its kind of wait.
 *
 * The shared rule is that the **icon** becomes the spinner and the label stays.
 * Appending a spinner would widen the button mid-press, and a button that
 * changes size while you are still looking at it reads as a different button.
 * Where there is no icon to borrow, `.btn[data-busy]` in globals.css appends one
 * instead.
 */

const SPINNER_SIZE = 15;

function Busy({ size = SPINNER_SIZE }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin" aria-hidden />;
}

type BaseProps = Omit<ComponentProps<"button">, "onClick"> & {
  /** Shown when idle; swapped for a spinner while busy. */
  icon?: ReactNode;
  /** Forces the busy state — for callers already tracking their own pending. */
  loading?: boolean;
  iconSize?: number;
};

/**
 * For anything that runs on press: a server action, a fetch, a mutation.
 *
 * It picks up the wait by itself two ways — a returned promise is awaited, and
 * a server action is wrapped in a transition — so most call sites pass nothing
 * beyond what they already had.
 */
export function ActionButton({
  icon,
  loading,
  iconSize,
  children,
  onClick,
  disabled,
  ...rest
}: BaseProps & { onClick?: (e: React.MouseEvent<HTMLButtonElement>) => unknown }) {
  const [pending, start] = useTransition();
  const [awaiting, setAwaiting] = useState(false);
  const busy = Boolean(loading) || pending || awaiting;

  function handle(e: React.MouseEvent<HTMLButtonElement>) {
    if (busy) return;
    start(() => {
      const result = onClick?.(e);
      if (result instanceof Promise) {
        setAwaiting(true);
        // `finally` and not `then`: a rejected action must still release the
        // button, or a failed save leaves it spinning for ever.
        void result.finally(() => setAwaiting(false));
      }
    });
  }

  return (
    <button
      {...rest}
      onClick={handle}
      disabled={disabled || busy}
      data-busy={busy ? "true" : undefined}
      aria-busy={busy || undefined}
    >
      {busy ? <Busy size={iconSize} /> : icon}
      {children}
    </button>
  );
}

/**
 * For the submit button of a `<form action={serverAction}>`. `useFormStatus`
 * reads the enclosing form's own pending state, which is the only signal that
 * survives the form resetting and re-rendering under it.
 */
export function SubmitButton({ icon, loading, iconSize, children, disabled, ...rest }: BaseProps) {
  const { pending } = useFormStatus();
  const busy = Boolean(loading) || pending;

  return (
    <button
      {...rest}
      type="submit"
      disabled={disabled || busy}
      data-busy={busy ? "true" : undefined}
      aria-busy={busy || undefined}
    >
      {busy ? <Busy size={iconSize} /> : icon}
      {children}
    </button>
  );
}

/**
 * For a link styled as a button. Most "dead" buttons in this app were never
 * buttons — they were links waiting on a server component, with nothing on
 * screen to say so. `useLinkStatus` reports exactly that wait, and only for the
 * link that was actually pressed.
 */
export function LinkButton({
  href,
  icon,
  iconSize,
  children,
  className,
  prefetch,
  ...rest
}: Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  icon?: ReactNode;
  iconSize?: number;
}) {
  return (
    <Link href={href} className={className} prefetch={prefetch} {...rest}>
      <LinkBody icon={icon} iconSize={iconSize}>
        {children}
      </LinkBody>
    </Link>
  );
}

/** Must be a descendant of the Link — that is where `useLinkStatus` reads from. */
function LinkBody({
  icon,
  iconSize,
  children,
}: {
  icon?: ReactNode;
  iconSize?: number;
  children: ReactNode;
}) {
  const { pending } = useLinkStatus();
  return (
    <>
      {pending ? <Busy size={iconSize} /> : icon}
      {children}
    </>
  );
}
