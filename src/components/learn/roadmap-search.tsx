"use client";

import { useState } from "react";
import { Search } from "lucide-react";

/**
 * The hero search. A prominent field with rotating example queries beneath it,
 * so a new user immediately sees the breadth of what they can look for, exactly
 * the "search Python, AI Engineering, Docker…" idea from the brief. It scrolls
 * to the Discover section and seeds it via a custom event, keeping the two in
 * sync without lifting state through the whole page tree.
 */

const EXAMPLES = ["Python", "AI Engineering", "Docker", "React Native", "Cyber Security", "Backend"];

export function RoadmapSearch() {
  const [value, setValue] = useState("");

  function submit(term: string) {
    const q = term.trim();
    if (!q) return;
    window.dispatchEvent(new CustomEvent("discover-search", { detail: q }));
    document.getElementById("discover")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="mx-auto w-full max-w-[640px]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
      >
        <label className="search h-12 px-4">
          <Search size={18} style={{ color: "var(--text-faint)" }} />
          <input
            className="search-input text-[14px]"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Search Python, AI Engineering, Docker, projects, certifications…"
            aria-label="Search what to learn"
          />
        </label>
      </form>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => {
              setValue(ex);
              submit(ex);
            }}
            className="chip chip-sm"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
