"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { AiMark } from "@/components/ai-mark";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * The in-lesson tutor for a catalog lesson. Tapping it fetches an explanation
 * from /api/ai/explain-topic and shows it inline, no navigation, no page state
 * change, so opening a second lesson's explanation never disturbs the first and
 * the page never "misbehaves". This is the "if you didn't understand, ask AI"
 * affordance on every lesson.
 */
export function ExplainLesson({
  course,
  topic,
  objective,
}: {
  course: string;
  topic: string;
  objective?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"simple" | "example" | "mistakes">("simple");

  async function explain(nextMode: typeof mode) {
    setMode(nextMode);
    setOpen(true);
    setLoading(true);
    setText(null);
    try {
      const res = await fetch("/api/ai/explain-topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course, topic, objective, mode: nextMode }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      setText(data.text ?? data.error ?? "The tutor could not answer.");
    } catch {
      setText("Lost connection to the tutor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2">
      {!open ? (
        <button
          onClick={() => explain("simple")}
          className="btn btn-tonal btn-xs"
          aria-label={`Ask AI to explain ${topic}`}
        >
          <AiMark size={13} /> Ask AI to explain
        </button>
      ) : (
        <div
          className="rounded-[var(--radius-tile)] border p-3"
          style={{ borderColor: "var(--primary-muted)", background: "var(--primary-faint)" }}
        >
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {(
              [
                ["simple", "Explain simply"],
                ["example", "Show an example"],
                ["mistakes", "Common mistakes"],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                onClick={() => explain(m)}
                aria-pressed={mode === m}
                disabled={loading}
                className={`chip chip-sm ${mode === m ? "chip-on" : ""}`}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => setOpen(false)}
              className="btn btn-ghost btn-xs ml-auto"
              aria-label="Close explanation"
            >
              Close
            </button>
          </div>

          {loading ? (
            <p className="flex items-center gap-2 py-2 text-[14px]" style={{ color: "var(--text-muted)" }}>
              <Loader2 size={14} className="animate-spin" /> Thinking…
            </p>
          ) : (
            <div className="prose-doc text-[14px]">
              <Markdown remarkPlugins={[remarkGfm]}>{text ?? ""}</Markdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
