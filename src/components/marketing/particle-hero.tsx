"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * An interactive particle field, used as the backdrop for the landing hero.
 *
 * Two things were changed from the reference, both load-bearing.
 *
 * **Colour.** The reference hard-codes a red inferno — `bg-black`, particles at
 * `hsl(4, 85%, …)`, `text-red-200`, red glows. Dropped in here it would have
 * been the only red surface in a product with exactly one accent. Particles now
 * read `--primary` and the field sits on `--bg`, so it is the same hero in
 * light mode, in dark mode, and if the accent ever changes.
 *
 * **Timing.** The reference ran a `setTimeout` per particle per cursor update
 * to fake a stagger — at its default 15×15 grid that is 225 timers scheduled on
 * every mouse move, plus a fresh 4-second timer per move on top. It pins a core
 * and stutters on a phone. Here one `requestAnimationFrame` loop owns all
 * motion: each particle eases toward its target at its own rate, so the stagger
 * survives and the timer storm does not. Nothing is scheduled per particle and
 * nothing is scheduled per event.
 *
 * Honours `prefers-reduced-motion`: the field renders, and stays still.
 */

type Particle = {
  el: HTMLDivElement;
  /** How much of the cursor offset this particle takes — falls off from centre. */
  dampening: number;
  scale: number;
  /** Current interpolated offset, in px. */
  x: number;
  y: number;
  /** Per-particle easing rate; the outer ring lags, which is the stagger. */
  ease: number;
};

export function ParticleHero({
  children,
  particleCount = 13,
  className = "",
}: {
  children?: ReactNode;
  /** Grid is particleCount × particleCount. 13 is ~169 nodes, a safe phone load. */
  particleCount?: number;
  className?: string;
}) {
  const field = useRef<HTMLDivElement>(null);
  const section = useRef<HTMLElement>(null);

  useEffect(() => {
    const container = field.current;
    if (!container) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rows = Math.max(5, particleCount);
    const centre = (rows - 1) / 2;
    const particles: Particle[] = [];

    container.replaceChildren();

    for (let i = 0; i < rows * rows; i += 1) {
      const row = Math.floor(i / rows);
      const col = i % rows;
      const distance = Math.hypot(row - centre, col - centre);

      const scale = Math.max(0.12, 1.15 - distance * 0.12);
      const opacity = Math.max(0.06, 0.9 - distance * 0.1);

      const el = document.createElement("div");
      el.className = "absolute rounded-full will-change-transform";
      el.style.cssText = `
        width: 0.4rem;
        height: 0.4rem;
        left: ${col * 1.8}rem;
        top: ${row * 1.8}rem;
        opacity: ${opacity};
        background: var(--primary);
        box-shadow: 0 0 ${Math.max(2, 10 - distance)}px var(--primary-muted);
        transform: scale(${scale});
      `;
      container.appendChild(el);

      particles.push({
        el,
        dampening: Math.max(0.28, 1 - distance * 0.08),
        scale,
        x: 0,
        y: 0,
        ease: Math.max(0.04, 0.16 - distance * 0.012),
      });
    }

    if (reduced) return () => container.replaceChildren();

    /* The cursor target. Kept in a ref-like closure rather than state: this
       updates on every pointer move, and a re-render per move is exactly the
       cost this rewrite exists to avoid. */
    let targetX = 0;
    let targetY = 0;
    let lastMove = 0;
    let auto = true;
    const start = performance.now();

    function onPointerMove(event: PointerEvent) {
      const rect = section.current?.getBoundingClientRect();
      if (!rect) return;
      targetX = (event.clientX - (rect.left + rect.width / 2)) * 0.7;
      targetY = (event.clientY - (rect.top + rect.height / 2)) * 0.7;
      lastMove = performance.now();
      auto = false;
    }

    const host = section.current;
    host?.addEventListener("pointermove", onPointerMove, { passive: true });

    let frame = 0;
    function tick(now: number) {
      // Idle for four seconds and the field takes itself back over — checked
      // here rather than by scheduling a timer on every single move.
      if (!auto && now - lastMove > 4000) auto = true;

      if (auto) {
        const t = (now - start) * 0.001;
        targetX = Math.sin(t * 0.3) * 180 + Math.sin(t * 0.17) * 90;
        targetY = Math.cos(t * 0.2) * 130 + Math.cos(t * 0.23) * 70;
      }

      for (const p of particles) {
        p.x += (targetX * p.dampening - p.x) * p.ease;
        p.y += (targetY * p.dampening - p.y) * p.ease;
        p.el.style.transform = `translate3d(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px, 0) scale(${p.scale})`;
      }

      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      host?.removeEventListener("pointermove", onPointerMove);
      container.replaceChildren();
    };
  }, [particleCount]);

  const side = `${Math.max(5, particleCount) * 1.8}rem`;

  return (
    <section ref={section} className={`relative overflow-hidden ${className}`}>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
        <div ref={field} className="relative" style={{ width: side, height: side }} />
      </div>

      {/* Ambient wash, in the accent rather than the reference's red/orange. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute left-1/2 top-1/2 h-[110vh] w-[110vh] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: "radial-gradient(circle, var(--glow), transparent 65%)",
          }}
        />
      </div>

      <div className="relative z-10">{children}</div>
    </section>
  );
}
