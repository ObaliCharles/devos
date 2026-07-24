"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A calm scroll-reveal. Wraps content and settles it in the first time it
 * enters the viewport, opacity + a short upward glide, staggered by `index`.
 *
 * It is safe by construction: the hidden state (`reveal-ready`) is only applied
 * after mount, so server-rendered and JS-disabled views show the content
 * immediately, and it reveals-then-forgets (unobserves after the first entry)
 * so scrolling back up never re-triggers it. Honours reduced-motion via CSS.
 */
export function Reveal({
  children,
  index = 0,
  /** Extra stagger step per index, in ms. */
  step = 45,
  /** Cap so long lists never wait too long. */
  maxDelay = 320,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  index?: number;
  step?: number;
  maxDelay?: number;
  className?: string;
  as?: "div" | "li" | "section" | "article";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [armed, setArmed] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    // Arm the hidden state only now that JS is running.
    setArmed(true);

    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const delay = Math.min(index * step, maxDelay);

  return (
    <Tag
      ref={ref as never}
      className={`${armed ? "reveal-ready" : ""} ${shown ? "is-in" : ""} ${className}`}
      style={armed ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
