"use client";

import { useEffect, useState } from "react";

/**
 * "Good morning, John" — using the reader's clock, not the server's.
 *
 * This was wrong before and wrong in a way that is easy to miss in
 * development: the greeting was computed inside a server component, so it read
 * the *server's* hour. On a host running UTC that greets a learner in Nairobi
 * with "Good morning" at 3pm and "Good afternoon" at 11pm. The machine that
 * knows what time it is for you is the one in front of you.
 *
 * So the hour is read after mount. Until then it renders the name alone —
 * never a guessed greeting, which would flip visibly on hydration.
 */
export function Greeting({ name, className }: { name: string; className?: string }) {
  const [part, setPart] = useState<string | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    setPart(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
  }, []);

  return (
    <h1 className={className}>
      {part ? `${part}, ${name}` : name}
    </h1>
  );
}
