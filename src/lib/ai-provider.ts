import Anthropic from "@anthropic-ai/sdk";

/**
 * Two model providers behind one interface, with automatic failover.
 *
 * Anthropic is the intended provider. Groq is the fallback, because an
 * Anthropic key without billing attached returns a hard error on every request
 *, which makes the whole AI surface untestable. Rather than stub the feature
 * out, a failed Claude call retries once against Groq's OpenAI-compatible
 * endpoint and the app keeps working.
 *
 * Groq is reached with plain fetch rather than a fourth SDK: the endpoint is
 * OpenAI-shaped, the streaming format is SSE, and both are stable enough that
 * a dependency would buy nothing.
 *
 * What is deliberately NOT abstracted away is which provider answered. The
 * caller gets it back and stores it on the message, because "why does this
 * reply read differently" is a question you cannot answer later without it.
 */

export type Provider = "anthropic" | "groq";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type Usage = { input: number; output: number };

export type StreamResult = { text: string; usage: Usage; provider: Provider };

/**
 * Claude Opus 5. The model matters here beyond quality: the web-search server
 * tool used to ground curriculum generation (see `researchResources`) is only
 * available on current models, so the old sonnet-4-5 pin made grounding
 * impossible rather than merely worse.
 */
export const ANTHROPIC_MODEL = "claude-opus-5";

/** Groq's current general-purpose instruct model. Fast, and free to test on. */
export const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export function hasAnthropic() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function hasGroq() {
  return Boolean(process.env.GROQ_API_KEY);
}

/** True when at least one provider can answer. */
export function isConfigured() {
  return hasAnthropic() || hasGroq();
}

/** Which providers are live, for the usage panel to be honest about. */
export function providerStatus() {
  return {
    anthropic: hasAnthropic(),
    groq: hasGroq(),
    primary: hasAnthropic() ? ("anthropic" as const) : hasGroq() ? ("groq" as const) : null,
  };
}

export function modelFor(provider: Provider) {
  return provider === "anthropic" ? ANTHROPIC_MODEL : GROQ_MODEL;
}

/**
 * A failure worth falling back on when a second provider is available.
 *
 * Before any text has streamed, almost every Anthropic failure is worth a
 * second opinion from Groq, the one that bites hardest is an **unbilled key**,
 * which Anthropic returns as a 400 with "credit balance too low", not a 402.
 * An earlier version treated every 400 as "our bug, don't retry", which meant
 * an unbilled Claude key never fell through to a perfectly good Groq key. Groq
 * speaks a different API, so a request Anthropic rejects can still succeed there
 * (and if it genuinely is malformed, Groq returns its own error, the user is
 * no worse off). So: fall over on everything except an auth error, which means
 * the key itself is wrong and retrying the same request won't help.
 */
function shouldFailOver(err: unknown) {
  const status = (err as { status?: number })?.status;
  if (status === 401) return false; // bad key, a retry can't fix it
  return true;
}

function describe(err: unknown) {
  const e = err as { status?: number; error?: { error?: { message?: string } }; message?: string };
  return e?.error?.error?.message || e?.message || `HTTP ${e?.status ?? "error"}`;
}

/* ------------------------------------------------------------------ Streaming */

/**
 * Stream a completion, calling `onDelta` for each chunk of text.
 *
 * Failover only happens before the first token. Once text has reached the
 * browser, switching providers mid-answer would splice two different replies
 * together, so a mid-stream failure is surfaced as an error instead.
 */
export async function streamChat({
  system,
  messages,
  maxTokens = 1200,
  onDelta,
}: {
  system: string;
  messages: ChatMessage[];
  maxTokens?: number;
  onDelta: (delta: string) => void;
}): Promise<StreamResult> {
  const errors: string[] = [];

  if (hasAnthropic()) {
    let emitted = false;
    try {
      return await streamAnthropic({
        system,
        messages,
        maxTokens,
        onDelta: (d) => {
          emitted = true;
          onDelta(d);
        },
      });
    } catch (err) {
      if (emitted || !hasGroq() || !shouldFailOver(err)) throw err;
      errors.push(`anthropic: ${describe(err)}`);
      console.warn("[ai] Anthropic failed, falling back to Groq, ", describe(err));
    }
  }

  if (hasGroq()) {
    return streamGroq({ system, messages, maxTokens, onDelta });
  }

  throw new Error(
    errors.length ? errors.join("; ") : "No AI provider configured.",
  );
}

async function streamAnthropic({
  system,
  messages,
  maxTokens,
  onDelta,
}: {
  system: string;
  messages: ChatMessage[];
  maxTokens: number;
  onDelta: (delta: string) => void;
}): Promise<StreamResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 0 });

  const stream = client.messages.stream({
    model: ANTHROPIC_MODEL,
    max_tokens: maxTokens,
    system,
    messages,
  });

  let text = "";
  stream.on("text", (delta) => {
    text += delta;
    onDelta(delta);
  });

  const final = await stream.finalMessage();
  return {
    text,
    usage: {
      input: final.usage?.input_tokens ?? 0,
      output: final.usage?.output_tokens ?? 0,
    },
    provider: "anthropic",
  };
}

async function streamGroq({
  system,
  messages,
  maxTokens,
  onDelta,
}: {
  system: string;
  messages: ChatMessage[];
  maxTokens: number;
  onDelta: (delta: string) => void;
}): Promise<StreamResult> {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: maxTokens,
      stream: true,
      // Groq takes the system prompt as the first message rather than a field.
      messages: [{ role: "system", content: system }, ...messages],
      stream_options: { include_usage: true },
    }),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Groq request failed (${res.status}). ${detail.slice(0, 300)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  const usage: Usage = { input: 0, output: 0 };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line; keep the trailing partial.
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const line = frame.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;

      try {
        const json = JSON.parse(payload) as {
          choices?: { delta?: { content?: string } }[];
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          text += delta;
          onDelta(delta);
        }
        if (json.usage) {
          usage.input = json.usage.prompt_tokens ?? usage.input;
          usage.output = json.usage.completion_tokens ?? usage.output;
        }
      } catch {
        /* A malformed frame is not worth failing a whole answer over. */
      }
    }
  }

  return { text, usage, provider: "groq" };
}

/* -------------------------------------------------------------- Grounding */

/** One real thing a learner can open: the docs page, the course, the video. */
export type Resource = {
  title: string;
  url: string;
  kind: "docs" | "course" | "video" | "article" | "repo";
  /** Why this one and not the other forty. */
  note: string;
};

export type ResearchResult = { resources: Resource[]; usage: Usage };

/**
 * Find what the internet actually recommends for a subject, before writing a
 * single lesson.
 *
 * This is the difference between a curriculum and a plausible-sounding list of
 * headings. Asked cold, a model writes the roadmap it remembers — which means
 * last year's tooling, a library that has since been deprecated, and links that
 * 404. Here the model searches first and the results are carried into every
 * later prompt, so lesson order follows the order the official documentation
 * teaches in and every citation is a page that resolves.
 *
 * Anthropic-only by design: `web_search` is a server tool that runs on
 * Anthropic's side, and Groq has no equivalent. A Groq-only install still
 * generates paths, just ungrounded — the caller is told which it got so the UI
 * can say so rather than implying a citation that was never checked.
 */
export async function researchResources({
  topic,
  goal,
  level,
  style,
  maxSearches = 5,
}: {
  topic: string;
  goal: string;
  level: string;
  /** Videos / Reading / Interactive / Mixed — steers what counts as a good source. */
  style?: string;
  maxSearches?: number;
}): Promise<ResearchResult> {
  if (!hasAnthropic()) return { resources: [], usage: { input: 0, output: 0 } };

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 1 });

  const prefer =
    style === "Videos"
      ? "Favour high-quality video courses and conference talks, but always include the official documentation."
      : style === "Interactive"
        ? "Favour interactive tutorials, playgrounds and exercise sets, but always include the official documentation."
        : style === "Reading"
          ? "Favour written documentation, books and long-form articles."
          : "Mix official documentation, one respected course, and one or two strong written guides.";

  const message = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 4000,
    // The research step is short and its output is a list, not an argument.
    // Low effort keeps it from turning five searches into fifteen.
    output_config: { effort: "low" },
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: maxSearches }],
    system: `You research learning resources for a curriculum designer.

Search the web for what is actually recommended for this subject today, then return the best sources. ${prefer}

Rules:
- Prefer canonical and primary sources: the official docs, the maintainers' own guide, the standard reference.
- Every URL must be one you saw in a search result. Never invent or guess a URL.
- Reject anything you cannot date to a currently-maintained version of the technology.
- Between 4 and 8 resources. Fewer good ones beats a padded list.

Output ONLY valid JSON, no prose and no markdown fences:
{"resources":[{"title":string,"url":string,"kind":"docs"|"course"|"video"|"article"|"repo","note":string}]}

"note" is one short sentence on what this source is best for.`,
    messages: [
      {
        role: "user",
        content: `Subject: ${topic}\nLearner's goal: ${goal}\nCurrent level: ${level}\n\nResearch and return the JSON now.`,
      },
    ],
  });

  const text = message.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .filter(Boolean)
    .join("\n");

  return {
    resources: parseResources(text),
    usage: {
      input: message.usage?.input_tokens ?? 0,
      output: message.usage?.output_tokens ?? 0,
    },
  };
}

/**
 * Read the resource list out of the reply, dropping anything malformed.
 *
 * Deliberately lenient: research is an enhancement to generation, not a gate on
 * it. A garbled list costs the path its citations, never the path itself.
 */
function parseResources(text: string): Resource[] {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return [];
  }

  const rows = (parsed as { resources?: unknown[] })?.resources;
  if (!Array.isArray(rows)) return [];

  const kinds = new Set(["docs", "course", "video", "article", "repo"]);
  const seen = new Set<string>();
  const out: Resource[] = [];

  for (const row of rows) {
    const r = row as Partial<Resource>;
    const url = String(r?.url ?? "").trim();
    const title = String(r?.title ?? "").trim();
    // A citation that is not an http(s) URL is not a citation.
    if (!title || !/^https?:\/\//i.test(url) || seen.has(url)) continue;
    seen.add(url);
    out.push({
      title: title.slice(0, 160),
      url,
      kind: (kinds.has(String(r?.kind)) ? r!.kind : "article") as Resource["kind"],
      note: String(r?.note ?? "").trim().slice(0, 240),
    });
    if (out.length >= 8) break;
  }

  return out;
}

/* ----------------------------------------------------------- Non-streaming */

/** One-shot completion, same failover rules. Used by the in-lesson tutor. */
export async function completeChat({
  system,
  messages,
  maxTokens = 900,
}: {
  system: string;
  messages: ChatMessage[];
  maxTokens?: number;
}): Promise<StreamResult> {
  if (hasAnthropic()) {
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 0 });
      const message = await client.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: maxTokens,
        system,
        messages,
      });
      return {
        text: message.content
          .map((b) => (b.type === "text" ? b.text : ""))
          .filter(Boolean)
          .join("\n"),
        usage: {
          input: message.usage?.input_tokens ?? 0,
          output: message.usage?.output_tokens ?? 0,
        },
        provider: "anthropic",
      };
    } catch (err) {
      if (!hasGroq() || !shouldFailOver(err)) throw err;
      console.warn("[ai] Anthropic failed, falling back to Groq, ", describe(err));
    }
  }

  if (!hasGroq()) throw new Error("No AI provider configured.");

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Groq request failed (${res.status}). ${detail.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  return {
    text: json.choices?.[0]?.message?.content ?? "",
    usage: {
      input: json.usage?.prompt_tokens ?? 0,
      output: json.usage?.completion_tokens ?? 0,
    },
    provider: "groq",
  };
}
