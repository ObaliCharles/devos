"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, Paperclip, Send, Square, X } from "lucide-react";
import { AiMark } from "@/components/ai-mark";

/**
 * The AI composer.
 *
 * Three ideas from the reference are worth keeping and are kept: the field
 * **grows with what you write** rather than scrolling a fixed box, the send
 * control **morphs** between send / dictate / stop instead of three buttons
 * appearing and disappearing, and attachments sit in a **tray that slides out
 * from behind** the field so adding one never shoves the text you are writing.
 *
 * Three are dropped. The spring easing and scale-on-hover contradict the flat
 * pass — nothing here moves further than it has to. The remote model icons were
 * hotlinked images of other companies' logos, replaced by this product's own
 * mark. And the fake models are gone: the picker lists what your keys actually
 * reach, so choosing one changes the request rather than a label.
 *
 * Dictation uses the Web Speech API where it exists and the button is simply
 * absent where it does not — Firefox and most mobile browsers have no support,
 * and a mic that silently does nothing is worse than no mic.
 */

export type PromptModel = { id: string; label: string; available: boolean };
export type PromptEffort = "low" | "medium" | "high";

export type PromptAttachment = {
  id: string;
  file: File;
  /** Object URL for images; empty for everything else. */
  url: string;
  name: string;
  size: number;
};

const EFFORTS: { key: PromptEffort; label: string; bars: number }[] = [
  { key: "low", label: "Fast", bars: 1 },
  { key: "medium", label: "Balanced", bars: 2 },
  { key: "high", label: "Thorough", bars: 3 },
];

const MIN_H = 44;
const MAX_H = 168;

/** Speech recognition is vendor-prefixed in Chrome and absent elsewhere. */
function speechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as
    | (new () => SpeechRecognitionLike)
    | null;
}

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};
type SpeechEvent = {
  resultIndex: number;
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
};

export function PromptInput({
  value,
  onChange,
  onSubmit,
  attachments,
  onAttach,
  onRemoveAttachment,
  models,
  model,
  onModelChange,
  effort,
  onEffortChange,
  busy,
  onStop,
  placeholder = "Ask anything…",
  maxAttachments = 6,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  attachments: PromptAttachment[];
  onAttach: (files: File[]) => void;
  onRemoveAttachment: (id: string) => void;
  models: PromptModel[];
  model: string;
  onModelChange: (id: string) => void;
  effort: PromptEffort;
  onEffortChange: (e: PromptEffort) => void;
  busy: boolean;
  onStop?: () => void;
  placeholder?: string;
  maxAttachments?: number;
}) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const baseline = useRef("");

  const [menuOpen, setMenuOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const canDictate = speechRecognition() !== null;
  const hasContent = value.trim() !== "" || attachments.length > 0;

  /* Grow to fit, then scroll. Measuring from 0 is what makes it shrink again
     when you delete a line — a textarea will not report a smaller scrollHeight
     than its current height. */
  useEffect(() => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = "0px";
    const next = Math.max(MIN_H, Math.min(el.scrollHeight, MAX_H));
    el.style.height = `${next}px`;
    setScrolled(el.scrollHeight > MAX_H);
  }, [value]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (shell.current && !shell.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [menuOpen]);

  const stopDictation = useCallback(() => {
    recognition.current?.stop();
    recognition.current = null;
    setListening(false);
  }, []);

  useEffect(() => stopDictation, [stopDictation]);

  function startDictation() {
    const Ctor = speechRecognition();
    if (!Ctor) return;

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    baseline.current = value;

    rec.onresult = (e) => {
      let settled = "";
      let pending = "";
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const r = e.results[i];
        if (r.isFinal) settled += r[0].transcript;
        else pending += r[0].transcript;
      }
      if (settled) baseline.current = `${baseline.current}${baseline.current ? " " : ""}${settled}`;
      onChange(`${baseline.current}${pending ? ` ${pending}` : ""}`.trim());
    };
    rec.onerror = stopDictation;
    rec.onend = stopDictation;

    recognition.current = rec;
    setListening(true);
    rec.start();
  }

  function pickFiles(list: FileList | null) {
    const files = Array.from(list ?? []).slice(0, Math.max(0, maxAttachments - attachments.length));
    if (files.length > 0) onAttach(files);
  }

  const activeModel = models.find((m) => m.id === model);
  const activeEffort = EFFORTS.find((e) => e.key === effort) ?? EFFORTS[1];

  return (
    <div ref={shell} className="relative flex w-full flex-col">
      <input
        ref={fileInput}
        type="file"
        multiple
        className="hidden"
        tabIndex={-1}
        onChange={(e) => {
          pickFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Attachment tray. It sits behind the field and slides out from under
          it, so adding a file never pushes the text you are writing. */}
      <div
        aria-hidden={attachments.length === 0}
        className="relative z-0 overflow-hidden"
        style={{
          height: attachments.length > 0 ? 68 : 0,
          transition: "height var(--dur) var(--ease-out)",
        }}
      >
        <div
          className="absolute inset-x-3 bottom-[-8px] flex h-[68px] items-start gap-2 overflow-x-auto rounded-t-[var(--radius-card)] border border-b-0 px-2 pt-2"
          style={{
            background: "var(--surface-2)",
            borderColor: "var(--border)",
            transform: attachments.length > 0 ? "translateY(0)" : "translateY(100%)",
            transition: "transform var(--dur) var(--ease-out)",
          }}
        >
          {attachments.map((a) => (
            <Thumb key={a.id} attachment={a} onRemove={() => onRemoveAttachment(a.id)} />
          ))}
        </div>
      </div>

      {/* The field */}
      <div
        className="relative z-10 rounded-[var(--radius-card)] border"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <textarea
          ref={textarea}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (hasContent && !busy) onSubmit();
            }
          }}
          placeholder={listening ? "Listening…" : placeholder}
          aria-label="Message"
          disabled={listening}
          className={`block w-full resize-none bg-transparent px-3.5 pb-11 pt-3 text-[14px] leading-relaxed outline-none ${
            scrolled ? "overflow-y-auto" : "overflow-y-hidden"
          }`}
          style={{ minHeight: MIN_H, color: "var(--text)" }}
        />

        {/* Controls sit inside the field, pinned to its floor. */}
        <div className="absolute inset-x-2 bottom-2 flex items-center gap-1">
          <button
            type="button"
            className={`chip chip-sm ${menuOpen ? "chip-on" : ""}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={menuOpen}
          >
            <AiMark size={12} />
            {activeModel?.label ?? "Model"}
          </button>

          <button
            type="button"
            className="chip chip-sm"
            onClick={() =>
              onEffortChange(
                EFFORTS[(EFFORTS.findIndex((e) => e.key === effort) + 1) % EFFORTS.length].key,
              )
            }
            title="How hard the model should think"
          >
            <Bars level={activeEffort.bars} />
            {activeEffort.label}
          </button>

          <button
            type="button"
            className="btn-icon-sm ml-auto"
            onClick={() => fileInput.current?.click()}
            disabled={attachments.length >= maxAttachments}
            aria-label="Attach files"
          >
            <Paperclip size={14} />
          </button>

          {/* One control, three states. Separate buttons appearing and
              disappearing would move the target under the pointer. */}
          <button
            type="button"
            className="btn btn-primary h-8 w-8 shrink-0 p-0"
            onClick={() => {
              if (busy) onStop?.();
              else if (listening) stopDictation();
              else if (hasContent) onSubmit();
              else startDictation();
            }}
            disabled={!busy && !listening && !hasContent && !canDictate}
            aria-label={
              busy ? "Stop generating" : listening ? "Stop dictation" : hasContent ? "Send" : "Dictate"
            }
          >
            {busy ? (
              <Loader2 size={14} className="animate-spin" />
            ) : listening ? (
              <Square size={13} fill="currentColor" />
            ) : hasContent ? (
              <Send size={14} />
            ) : (
              <Mic size={14} />
            )}
          </button>
        </div>

        {menuOpen && (
          <ul
            role="listbox"
            className="absolute bottom-full left-2 z-50 mb-2 w-52 overflow-hidden rounded-[var(--radius-card)] border p-1"
            style={{
              background: "var(--bg-elevated)",
              borderColor: "var(--border)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            {models.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={m.id === model}
                  disabled={!m.available}
                  className={`row-link flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[13px] ${
                    m.id === model ? "nav-row-on" : ""
                  }`}
                  style={!m.available ? { opacity: 0.45 } : undefined}
                  onClick={() => {
                    onModelChange(m.id);
                    setMenuOpen(false);
                  }}
                >
                  <AiMark size={13} />
                  <span className="min-w-0 flex-1 truncate">{m.label}</span>
                  {/* An unconfigured provider is listed but disabled, so it is
                      obvious the option exists and why it cannot be picked. */}
                  {!m.available && (
                    <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>
                      no key
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Bars({ level }: { level: number }) {
  return (
    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden>
      <rect x="1.5" y="8" width="2.5" height="4.5" rx="1" fill="currentColor" />
      <rect x="5.75" y="5" width="2.5" height="7.5" rx="1" fill="currentColor" opacity={level >= 2 ? 1 : 0.3} />
      <rect x="10" y="2" width="2.5" height="10.5" rx="1" fill="currentColor" opacity={level >= 3 ? 1 : 0.3} />
    </svg>
  );
}

function Thumb({
  attachment,
  onRemove,
}: {
  attachment: PromptAttachment;
  onRemove: () => void;
}) {
  return (
    <span
      className="group relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-xs)] border"
      style={{ background: "var(--surface-3)", borderColor: "var(--border)" }}
      title={attachment.name}
    >
      {attachment.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={attachment.url} alt="" className="h-full w-full object-cover" draggable={false} />
      ) : (
        <span
          className="num px-1 text-center text-[10px] leading-tight"
          style={{ color: "var(--text-faint)" }}
        >
          {attachment.name.split(".").pop()?.slice(0, 4).toUpperCase() ?? "FILE"}
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${attachment.name}`}
        className="absolute right-0.5 top-0.5 grid h-4 w-4 place-items-center rounded-full opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        style={{ background: "var(--bg)", color: "var(--text-muted)" }}
      >
        <X size={9} strokeWidth={3} />
      </button>
    </span>
  );
}
