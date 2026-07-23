"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * The thin line that runs across the top of the window while a route is
 * loading.
 *
 * Next's App Router does not expose navigation-start events, so the trigger is
 * a capture-phase click on any internal link: that fires the instant you press,
 * which is the whole point — the bar has to appear before the server responds,
 * or it is confirming something you already know. The bar then eases towards
 * 90% on a decaying curve and never reaches the end on its own; only the new
 * pathname landing completes it. A progress bar that fills to 100% and waits
 * is worse than none at all.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);

  function stop() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }

  useEffect(() => {
    function start() {
      if (hide.current) clearTimeout(hide.current);
      stop();
      setVisible(true);
      setProgress(8);
      // Decaying approach to 90%: fast at first, then visibly slowing, which
      // reads as "working" rather than "stuck".
      timer.current = setInterval(() => {
        setProgress((p) => (p >= 90 ? p : p + Math.max(0.4, (90 - p) * 0.08)));
      }, 90);
    }

    function onClick(e: MouseEvent) {
      // Let the browser have modified clicks and anything not a plain left-click.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Same page, or only the hash changed — nothing will load.
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }

      start();
    }

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", start);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", start);
      stop();
    };
  }, []);

  // The new route committed — run the bar to the end, then fade it out.
  useEffect(() => {
    stop();
    setProgress(100);
    hide.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 260);
    return () => {
      if (hide.current) clearTimeout(hide.current);
    };
  }, [pathname, search]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px]"
      aria-hidden
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 200ms var(--ease)",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background: "linear-gradient(90deg, var(--primary), var(--info))",
          boxShadow: "0 0 8px var(--primary-muted)",
          transition: "width 180ms var(--ease-out)",
        }}
      />
    </div>
  );
}
