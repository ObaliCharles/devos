"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { createNote } from "@/lib/actions";

const MIN_CHARS = 80;

export function NoteComposer({
  lessonId,
  lessonTitle,
  existingCount,
}: {
  lessonId: string;
  lessonTitle: string;
  existingCount: number;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(`${lessonTitle} — my notes`);
  const [body, setBody] = useState("");
  const [saved, setSaved] = useState(existingCount);
  const [pending, start] = useTransition();

  const short = body.trim().length < MIN_CHARS;

  function save() {
    start(async () => {
      await createNote({ title, body, lessonId });
      setBody("");
      setSaved((n) => n + 1);
      // Saving a note satisfies a gate requirement, and the gate is a sibling
      // component — only the server knows they are connected.
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        className="input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="Note title"
      />
      <textarea
        className="input min-h-[160px] resize-y font-[family-name:var(--font-mono)] text-[13px] leading-relaxed"
        placeholder={"What did this actually mean? Where would you use it?\nMarkdown works here."}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        aria-label="Note body"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-primary" disabled={short || pending} onClick={save}>
          <Save size={15} /> Save note
        </button>
        <span className="text-xs" style={{ color: "var(--text-faint)" }}>
          {short
            ? `${MIN_CHARS - body.trim().length} more characters — a one-word note teaches you nothing`
            : `${body.trim().length} characters`}
        </span>
        {saved > 0 && (
          <span className="text-xs" style={{ color: "var(--success)" }}>
            {saved} {saved === 1 ? "note" : "notes"} on this lesson
          </span>
        )}
      </div>
    </div>
  );
}
