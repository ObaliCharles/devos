"use client";

import { useState, useTransition } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Lock, RotateCcw, X } from "lucide-react";
import type { Activity } from "@/lib/lesson-schema";
import { ACTIVITY_META, EXECUTING_ACTIVITY_TYPES } from "@/lib/lesson-schema";
import { gradeTeachBack, type TeachBackResult } from "@/lib/actions";

/**
 * One activity, rendered.
 *
 * ## What this component mostly is not
 *
 * Almost nothing here calls `recordEvidence`. Every answer is client state
 * that resets on refresh — DECISIONS 026 holding: evidence is written only by
 * code that has already graded something server-side, and a multiple-choice
 * click has not been graded by anyone. What these activities produce is
 * *formative* feedback — right/wrong, a model answer to compare against — the
 * same kind a worked example or a textbook exercise gives, matching Chapter 5's
 * "Interactive Understanding" step, which sits before the real assessment.
 *
 * **`teach_back` is the one deliberate exception** — see DECISIONS 035. It
 * calls `gradeTeachBack`, a real server action, which is why `lessonId` is a
 * required prop here: every other activity type ignores it, `TeachBack` is
 * the only one that needs to say which lesson's evidence this is.
 *
 * The lesson's other evidence still comes from the same places it always
 * has: the Requirement 4 quiz, the exercise gate, and — once the sandbox
 * lands — graded code. Nothing here competes with those.
 *
 * ## Why the executing types are locked
 *
 * `coding_exercise`, `debugging_exercise`, `interactive_example` and
 * `assessment` need to actually run the learner's code, and today that would
 * mean `lib/runner.ts` — Node's `vm`, a documented RCE path, per DECISIONS 018
 * and 025. Rendering the brief and disabling the run button is the honest
 * version of "not built yet": it says what is missing, why, and that the
 * learner's progress on the rest of the lesson is unaffected — the same three
 * things any good empty state owes a reader.
 */
export function ActivityRenderer({ activity, lessonId }: { activity: Activity; lessonId: string }) {
  switch (activity.type) {
    case "text":
      return <TextBlock markdown={activity.markdown} />;
    case "callout":
      return <Callout tone={activity.tone} markdown={activity.markdown} title={activity.title} />;
    case "worked_example":
      return <WorkedExample steps={activity.steps} title={activity.title} />;
    case "image":
      return <ImageBlock url={activity.url} alt={activity.alt} caption={activity.caption} />;
    case "animation":
      return <ImageBlock url={activity.url} alt={activity.alt} />;
    case "diagram":
      return <DiagramBlock mermaid={activity.mermaid} caption={activity.caption} title={activity.title} />;
    case "video":
      return <VideoBlock activity={activity} />;
    case "resource":
      return <ResourceBlock activity={activity} />;
    case "simulation":
      return <TextBlock markdown={activity.markdown} note="Simulation" />;

    case "multiple_choice":
      return <MultipleChoice activity={activity} />;
    case "code_tracing":
      return <CodeTracing activity={activity} />;
    case "fill_in_code":
      return <FillInCode activity={activity} />;
    case "prediction":
      return <Prediction activity={activity} />;
    case "short_answer":
      return <ShortAnswer activity={activity} />;
    case "teach_back":
      return <TeachBack activity={activity} lessonId={lessonId} />;
    case "flashcard":
      return <FlashcardActivity front={activity.front} back={activity.back} />;
    case "reflection":
      return <Reflection prompt={activity.prompt} />;
    case "project_task":
      return <ProjectTask activity={activity} />;
    case "interactive_example":
      return <Locked activity={activity} brief={activity.prompt || "A runnable example lives here."} />;

    case "coding_exercise":
      return <Locked activity={activity} brief={activity.brief} />;
    case "debugging_exercise":
      return <Locked activity={activity} brief={activity.brief} />;
    case "assessment":
      return <Locked activity={activity} brief={activity.brief} />;

    default: {
      // Exhaustiveness check: if a new Activity variant is added to the union
      // without a case here, this line fails to typecheck rather than
      // silently rendering nothing at runtime.
      const _exhaustive: never = activity;
      return null;
    }
  }
}

function ActivityLabel({ activity }: { activity: Activity }) {
  const meta = ACTIVITY_META[activity.type];
  if (!activity.title && !meta.dimension) return null;
  return (
    <div className="flex items-center justify-between gap-3">
      {activity.title && <p className="title-heading">{activity.title}</p>}
    </div>
  );
}

/* ------------------------------------------------------------- presentational */

function TextBlock({ markdown, note }: { markdown: string; note?: string }) {
  return (
    <div className="prose-doc">
      {note && <p className="eyebrow mb-2">{note}</p>}
      <Markdown remarkPlugins={[remarkGfm]}>{markdown}</Markdown>
    </div>
  );
}

const CALLOUT_TONE: Record<string, { color: string; label: string }> = {
  note: { color: "var(--info)", label: "Note" },
  warning: { color: "var(--warning)", label: "Watch out" },
  pitfall: { color: "var(--danger)", label: "Common pitfall" },
};

/** A bordered strip, not a card — a callout is a remark on the text beside it,
 *  not an object of its own. */
function Callout({ tone, markdown, title }: { tone: string; markdown: string; title?: string }) {
  const t = CALLOUT_TONE[tone] ?? CALLOUT_TONE.note;
  return (
    <div
      className="rounded-[var(--radius-tile)] py-3 pl-4 pr-4"
      style={{ borderLeft: `2px solid ${t.color}`, background: "var(--surface-2)" }}
    >
      <p className="text-micro font-medium" style={{ color: t.color }}>
        {title || t.label}
      </p>
      <div className="prose-doc mt-1.5 text-ui">
        <Markdown remarkPlugins={[remarkGfm]}>{markdown}</Markdown>
      </div>
    </div>
  );
}

function WorkedExample({
  steps,
  title,
}: {
  steps: { markdown: string; code?: string }[];
  title?: string;
}) {
  return (
    <div className="well flex flex-col gap-4 p-4">
      <p className="eyebrow eyebrow-accent">{title || "Worked example"}</p>
      <ol className="flex flex-col gap-4">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span
              className="num mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-micro font-medium"
              style={{ background: "var(--primary-faint)", color: "var(--primary)" }}
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="prose-doc text-ui">
                <Markdown remarkPlugins={[remarkGfm]}>{step.markdown}</Markdown>
              </div>
              {step.code && (
                <pre className="prose-doc mt-2">
                  <code>{step.code}</code>
                </pre>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ImageBlock({ url, alt, caption }: { url: string; alt: string; caption?: string }) {
  return (
    <figure>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={alt} className="w-full rounded-[var(--radius-card)]" loading="lazy" />
      {caption && (
        <figcaption className="text-micro mt-2" style={{ color: "var(--text-faint)" }}>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

/**
 * Renders the Mermaid *source*, not a diagram — this product has no client
 * diagram library wired in yet. Shown as labelled code rather than pretending
 * to be a picture, which is the honest version of "not rendered yet."
 */
function DiagramBlock({ mermaid, caption, title }: { mermaid: string; caption?: string; title?: string }) {
  return (
    <figure className="well p-4">
      <p className="eyebrow">{title || "Diagram"}</p>
      <pre className="prose-doc mt-2 overflow-x-auto">
        <code>{mermaid}</code>
      </pre>
      {caption && (
        <figcaption className="text-micro mt-2" style={{ color: "var(--text-faint)" }}>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

function timestamp(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * A video, broken into the segments it was authored with. §22: a 90-minute
 * lecture is not one block of passive consumption — each segment is a unit
 * with something after it, so the list is the point, not the player chrome.
 */
function VideoBlock({
  activity,
}: {
  activity: Extract<Activity, { type: "video" }>;
}) {
  return (
    <div className="flex flex-col gap-3">
      <a
        href={activity.url}
        target="_blank"
        rel="noreferrer"
        className="row-link flex items-center gap-3 rounded-[var(--radius-card)] border p-3"
        style={{ borderColor: "var(--border-faint)" }}
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-tile)]"
          style={{ background: "var(--surface-2)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-ui font-medium truncate">{activity.title || "Watch the video"}</p>
          <p className="text-micro" style={{ color: "var(--text-faint)" }}>Opens in a new tab</p>
        </div>
      </a>
      {activity.segments.length > 0 && (
        <ul className="flex flex-col">
          {activity.segments.map((seg, i) => (
            <li
              key={i}
              className="flex items-center gap-3 py-2"
              style={{ borderTop: i === 0 ? undefined : "1px solid var(--border-faint)" }}
            >
              <span className="num text-micro shrink-0" style={{ color: "var(--text-faint)" }}>
                {timestamp(seg.startSeconds)}
              </span>
              <span className="text-ui" style={{ color: "var(--text-muted)" }}>{seg.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const RESOURCE_KIND_LABEL: Record<string, string> = {
  docs: "Documentation", course: "Course", video: "Video", article: "Article",
  repo: "Repository", book: "Book", paper: "Paper", podcast: "Podcast",
};

function ResourceBlock({ activity }: { activity: Extract<Activity, { type: "resource" }> }) {
  return (
    <a
      href={activity.url}
      target="_blank"
      rel="noreferrer"
      className="row-link flex items-start justify-between gap-3 rounded-[var(--radius-card)] border p-3"
      style={{ borderColor: "var(--border-faint)" }}
    >
      <div className="min-w-0">
        <p className="text-ui font-medium">{activity.title || activity.url}</p>
        {activity.why && (
          <p className="text-micro mt-0.5" style={{ color: "var(--text-faint)" }}>{activity.why}</p>
        )}
      </div>
      <span className="badge shrink-0">{RESOURCE_KIND_LABEL[activity.kind] ?? activity.kind}</span>
    </a>
  );
}

/* ---------------------------------------------------------- machine-checkable */

function MultipleChoice({ activity }: { activity: Extract<Activity, { type: "multiple_choice" }> }) {
  const [picked, setPicked] = useState<number | null>(null);
  const correct = picked === activity.answerIndex;

  return (
    <div className="flex flex-col gap-3">
      <ActivityLabel activity={activity} />
      <p className="text-ui">{activity.prompt}</p>
      <div className="flex flex-col gap-2">
        {activity.choices.map((choice, i) => {
          const isPicked = picked === i;
          const revealCorrect = picked !== null && i === activity.answerIndex;
          return (
            <button
              key={i}
              type="button"
              disabled={picked !== null}
              onClick={() => setPicked(i)}
              className="row-link flex items-center gap-2.5 rounded-[var(--radius-control)] border px-3 py-2.5 text-left text-ui disabled:cursor-default"
              style={{
                borderColor: revealCorrect
                  ? "var(--success)"
                  : isPicked
                  ? "var(--danger)"
                  : "var(--border-faint)",
                background: revealCorrect
                  ? "var(--success-faint)"
                  : isPicked
                  ? "var(--danger-faint)"
                  : undefined,
              }}
            >
              {picked !== null &&
                (revealCorrect ? (
                  <Check size={14} style={{ color: "var(--success)" }} />
                ) : isPicked ? (
                  <X size={14} style={{ color: "var(--danger)" }} />
                ) : (
                  <span className="w-3.5" />
                ))}
              {choice.text}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className="well flex flex-col gap-1 p-3">
          <p className="text-micro font-medium" style={{ color: correct ? "var(--success)" : "var(--text-muted)" }}>
            {correct ? "Right." : "Not quite."}
          </p>
          {(activity.explanation || activity.choices[picked]?.why) && (
            <p className="text-micro" style={{ color: "var(--text-faint)" }}>
              {activity.explanation || activity.choices[picked]?.why}
            </p>
          )}
          <button onClick={() => setPicked(null)} className="btn btn-ghost btn-xs mt-1 self-start">
            <RotateCcw size={12} /> Try again
          </button>
        </div>
      )}
    </div>
  );
}

function CodeTracing({ activity }: { activity: Extract<Activity, { type: "code_tracing" }> }) {
  const [value, setValue] = useState("");
  const [checked, setChecked] = useState(false);
  const correct = value.trim() === activity.expectedOutput.trim();

  return (
    <div className="flex flex-col gap-3">
      <ActivityLabel activity={activity} />
      <p className="text-ui">{activity.prompt}</p>
      <pre className="prose-doc">
        <code>{activity.code}</code>
      </pre>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setChecked(false);
          }}
          placeholder="What does this print?"
          className="input max-w-xs flex-1"
        />
        <button onClick={() => setChecked(true)} className="btn btn-secondary btn-sm" disabled={!value}>
          Check
        </button>
      </div>
      {checked && (
        <div className="well flex flex-col gap-1 p-3">
          <p className="text-micro font-medium" style={{ color: correct ? "var(--success)" : "var(--danger)" }}>
            {correct ? "Right." : `Not quite — it prints ${activity.expectedOutput}`}
          </p>
          {activity.explanation && (
            <p className="text-micro" style={{ color: "var(--text-faint)" }}>{activity.explanation}</p>
          )}
        </div>
      )}
    </div>
  );
}

function FillInCode({ activity }: { activity: Extract<Activity, { type: "fill_in_code" }> }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);

  function isRight(id: string, answer: string, accept: string[]) {
    const v = (values[id] ?? "").trim();
    return v === answer.trim() || accept.some((a) => a.trim() === v);
  }

  // The template is split on `___<id>___` markers so each blank renders as its
  // own input inline with the surrounding code, rather than a separate list
  // disconnected from where the answer actually goes.
  const parts = activity.template.split(/(___\w+___)/g);

  return (
    <div className="flex flex-col gap-3">
      <ActivityLabel activity={activity} />
      <pre className="prose-doc whitespace-pre-wrap">
        <code>
          {parts.map((part, i) => {
            const m = /^___(\w+)___$/.exec(part);
            if (!m) return <span key={i}>{part}</span>;
            const blank = activity.blanks.find((b) => b.id === m[1]);
            if (!blank) return <span key={i}>{part}</span>;
            const right = checked && isRight(blank.id, blank.answer, blank.accept);
            return (
              <input
                key={i}
                value={values[blank.id] ?? ""}
                onChange={(e) => {
                  setValues((v) => ({ ...v, [blank.id]: e.target.value }));
                  setChecked(false);
                }}
                className="num mx-0.5 rounded-[4px] border px-1.5 py-0.5"
                style={{
                  width: `${Math.max(4, blank.answer.length) + 1}ch`,
                  borderColor: checked ? (right ? "var(--success)" : "var(--danger)") : "var(--border-strong)",
                  background: "var(--surface-2)",
                  color: "var(--text)",
                }}
              />
            );
          })}
        </code>
      </pre>
      <div className="flex items-center gap-2">
        <button onClick={() => setChecked(true)} className="btn btn-secondary btn-sm">
          Check
        </button>
        {activity.hints.length > 0 && hintLevel < activity.hints.length && (
          <button onClick={() => setHintLevel((n) => n + 1)} className="btn btn-ghost btn-sm">
            Hint
          </button>
        )}
      </div>
      {hintLevel > 0 && (
        <ul className="flex flex-col gap-1">
          {activity.hints.slice(0, hintLevel).map((h, i) => (
            <li key={i} className="text-micro" style={{ color: "var(--text-faint)" }}>{h}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- judged */

function Prediction({ activity }: { activity: Extract<Activity, { type: "prediction" }> }) {
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <p className="eyebrow eyebrow-accent">Predict first</p>
      <p className="text-ui">{activity.prompt}</p>
      {activity.code && (
        <pre className="prose-doc">
          <code>{activity.code}</code>
        </pre>
      )}
      {!revealed ? (
        <>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="What do you think happens?"
            rows={2}
            className="input"
          />
          <button onClick={() => setRevealed(true)} className="btn btn-secondary btn-sm self-start">
            Reveal
          </button>
        </>
      ) : (
        <div className="well prose-doc p-3 text-ui">
          <Markdown remarkPlugins={[remarkGfm]}>{activity.reveal}</Markdown>
        </div>
      )}
    </div>
  );
}

function ShortAnswer({ activity }: { activity: Extract<Activity, { type: "short_answer" }> }) {
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-ui">{activity.prompt}</p>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Answer in your own words."
        rows={3}
        className="input"
      />
      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          disabled={!answer.trim()}
          className="btn btn-secondary btn-sm self-start"
        >
          Compare against the rubric
        </button>
      ) : (
        <div className="well flex flex-col gap-1.5 p-3">
          <p className="text-micro font-medium" style={{ color: "var(--text-muted)" }}>
            A complete answer covers:
          </p>
          <ul className="flex flex-col gap-1">
            {activity.rubric.map((r, i) => (
              <li key={i} className="text-micro flex gap-2" style={{ color: "var(--text-faint)" }}>
                <span aria-hidden>·</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Chapter 29 / spec §30: a teach-back is stronger evidence than reading, and
 * only means something unaided — so unlike every other formative activity
 * here it really is graded, by `gradeTeachBack`, and really does write
 * evidence (DECISIONS 035). If grading fails — no provider configured, the
 * model unreachable — the rubric still reveals locally, so a broken AI call
 * costs the score, not the whole exercise; the learner can still compare
 * their own answer by eye.
 */
function TeachBack({
  activity,
  lessonId,
}: {
  activity: Extract<Activity, { type: "teach_back" }>;
  lessonId: string;
}) {
  const [answer, setAnswer] = useState("");
  const [grade, setGrade] = useState<TeachBackResult | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [pending, start] = useTransition();

  function submit() {
    start(async () => {
      const res = await gradeTeachBack(lessonId, activity.prompt, activity.rubric, answer);
      setGrade(res);
      if (!res.ok) setRevealed(true); // fall back to the rubric, not a dead end
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <p className="eyebrow eyebrow-accent">Teach it back</p>
        {activity.aiFree && <span className="badge">No AI while you write this</span>}
      </div>
      <p className="text-ui">{activity.prompt}</p>
      <textarea
        value={answer}
        onChange={(e) => {
          setAnswer(e.target.value);
          setGrade(null);
        }}
        placeholder="Explain it as if to someone who has not seen this lesson."
        rows={4}
        className="input"
      />

      {!grade && (
        <button
          onClick={submit}
          disabled={!answer.trim() || pending}
          className="btn btn-secondary btn-sm self-start"
        >
          {pending ? "Grading…" : "Submit for grading"}
        </button>
      )}

      {grade?.ok && (
        <div className="well flex flex-col gap-2 p-3">
          <p className="text-micro font-medium" style={{ color: grade.score >= 0.75 ? "var(--success)" : "var(--text-muted)" }}>
            {Math.round(grade.score * 100)}% — {grade.feedback}
          </p>
          <ul className="flex flex-col gap-1">
            {activity.rubric.map((r, i) => {
              const hit = grade.matched.some((m) => m.trim() === r.trim());
              return (
                <li key={i} className="text-micro flex gap-2" style={{ color: hit ? "var(--text-muted)" : "var(--text-faint)" }}>
                  {hit ? <Check size={12} style={{ color: "var(--success)" }} /> : <span aria-hidden>·</span>}
                  {r}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {grade && !grade.ok && (
        <p className="text-micro" style={{ color: "var(--danger)" }}>
          {grade.message}
        </p>
      )}

      {revealed && !grade?.ok && (
        <div className="well flex flex-col gap-1.5 p-3">
          <p className="text-micro font-medium" style={{ color: "var(--text-muted)" }}>
            A complete explanation covers:
          </p>
          <ul className="flex flex-col gap-1">
            {activity.rubric.map((r, i) => (
              <li key={i} className="text-micro flex gap-2" style={{ color: "var(--text-faint)" }}>
                <span aria-hidden>·</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- connective */

function FlashcardActivity({ front, back }: { front: string; back: string }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setFlipped((f) => !f)}
      className="card card-link flex min-h-[110px] w-full flex-col items-center justify-center gap-2 p-6 text-center"
    >
      <p className="eyebrow">{flipped ? "Answer" : "Question"}</p>
      <p className="text-ui">{flipped ? back : front}</p>
      <p className="text-micro" style={{ color: "var(--text-faint)" }}>Tap to flip</p>
    </button>
  );
}

function Reflection({ prompt }: { prompt: string }) {
  const [value, setValue] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <p className="eyebrow eyebrow-accent">Reflect</p>
      <p className="text-ui">{prompt}</p>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="What changed in your understanding?"
        rows={3}
        className="input"
      />
      <p className="text-micro" style={{ color: "var(--text-faint)" }}>
        Save this as a note below to keep it — reflections here are not stored on their own.
      </p>
    </div>
  );
}

function ProjectTask({ activity }: { activity: Extract<Activity, { type: "project_task" }> }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="eyebrow eyebrow-accent">In your project</p>
      <div className="prose-doc text-ui">
        <Markdown remarkPlugins={[remarkGfm]}>{activity.brief}</Markdown>
      </div>
      {activity.acceptance.length > 0 && (
        <ul className="well flex flex-col gap-2 p-3">
          {activity.acceptance.map((a, i) => (
            <li key={i} className="text-micro flex gap-2.5" style={{ color: "var(--text-muted)" }}>
              <span className="shrink-0" style={{ color: "var(--text-faint)" }} aria-hidden>□</span>
              {a}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- locked */

/**
 * The executing types, until `lib/runner.ts` is a real sandbox. Shows the
 * brief — the reading value survives even while the run button does not — and
 * says plainly what is missing and why, per the empty-state rule in the design
 * brief: what, why it matters, what happens instead.
 */
function Locked({ activity, brief }: { activity: Activity; brief: string }) {
  return (
    <div className="well flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <Lock size={14} style={{ color: "var(--text-faint)" }} />
        <p className="text-micro font-medium" style={{ color: "var(--text-faint)" }}>
          {ACTIVITY_META[activity.type].label} — not available yet
        </p>
      </div>
      <div className="prose-doc text-ui" style={{ opacity: 0.75 }}>
        <Markdown remarkPlugins={[remarkGfm]}>{brief}</Markdown>
      </div>
      <p className="text-micro" style={{ color: "var(--text-faint)" }}>
        This exercise runs your code, and that needs a real sandbox this product does not have
        yet — the rest of the lesson is unaffected, and nothing here counts against your progress.
      </p>
    </div>
  );
}

/** True for the types `Locked` renders. Exported so a page can decide whether
 *  to show a "some exercises are read-only for now" notice up front. */
export function isLockedActivity(type: Activity["type"]): boolean {
  return (EXECUTING_ACTIVITY_TYPES as readonly string[]).includes(type);
}
