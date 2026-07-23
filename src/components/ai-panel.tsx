"use client";

import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Mode = "simple" | "senior" | "analogy" | "mistakes" | "ask";

const PRESETS: { mode: Mode; label: string }[] = [
  { mode: "simple", label: "Explain simply" },
  { mode: "senior", label: "Explain like a senior" },
  { mode: "analogy", label: "Give an analogy" },
  { mode: "mistakes", label: "Common mistakes" },
];

export function AiPanel({ lessonId }: { lessonId: string }) {
  const [answer, setAnswer] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  async function ask(mode: Mode, q?: string) {
    setLoading(true);
    setAnswer(null);
    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, mode, question: q }),
      });
      const data = await res.json();
      setAnswer(data.text ?? data.error ?? "No answer came back.");
    } catch {
      setAnswer("Could not reach the tutor. Is the dev server still running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.mode}
            className="btn btn-ghost h-8 px-3 text-[13px]"
            disabled={loading}
            onClick={() => ask(p.mode)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="input"
          placeholder="Or ask your own question about this lesson"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && question.trim() && !loading) ask("ask", question);
          }}
          aria-label="Ask the tutor"
        />
        <button
          className="btn btn-primary shrink-0 px-3"
          disabled={!question.trim() || loading}
          onClick={() => ask("ask", question)}
          aria-label="Send question"
        >
          <Send size={15} />
        </button>
      </div>

      {loading && (
        <p className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
          <Sparkles size={14} className="animate-pulse" /> Thinking…
        </p>
      )}

      {answer && (
        <div
          className="prose-doc rounded-[var(--radius-control)] border p-4 text-[14px]"
          style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
        >
          <Markdown remarkPlugins={[remarkGfm]}>{answer}</Markdown>
        </div>
      )}
    </div>
  );
}
