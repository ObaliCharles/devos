import Anthropic from "@anthropic-ai/sdk";

/**
 * Two model providers behind one interface, with automatic failover.
 *
 * Anthropic is the intended provider. Groq is the fallback, because an
 * Anthropic key without billing attached returns a hard error on every request
 * — which makes the whole AI surface untestable. Rather than stub the feature
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

export const ANTHROPIC_MODEL = "claude-sonnet-4-5";

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
 * A failure worth falling back on. A malformed request is our bug and will fail
 * identically on the other provider, so it is re-thrown rather than retried;
 * anything else (no credit, rate limit, overloaded, network) is worth a second
 * opinion from Groq.
 */
function shouldFailOver(err: unknown) {
  const status = (err as { status?: number })?.status;
  if (status === 400) return false;
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
      console.warn("[ai] Anthropic failed, falling back to Groq —", describe(err));
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
      console.warn("[ai] Anthropic failed, falling back to Groq —", describe(err));
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
