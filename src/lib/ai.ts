import { connectDB } from "./db";
import { dayKey } from "./day";
import { AiUsage } from "./models";
import type { Provider } from "./ai-provider";

/**
 * Everything about talking to the model that is not a specific feature: the
 * client, the model id, pricing, and the rate/cost cap.
 *
 * The BACKLOG calls rate limiting "urgent before launch" and warns that one
 * loop in a client component can cost real money. So the cap is enforced here,
 * server-side, before any request goes out, not in the UI, which cannot be
 * trusted, and not as an afterthought.
 */

export { ANTHROPIC_MODEL as AI_MODEL, isConfigured, providerStatus } from "./ai-provider";

// Per-token prices in micro-dollars, so the running total stays in integers.
// Anthropic Sonnet is $3 / million in, $15 / million out. Groq is cheap enough
// that rounding it to zero would make the cap meaningless, so it is billed at
// its own rate rather than the primary provider's.
const PRICING: Record<Provider, { input: number; output: number }> = {
  anthropic: { input: 3, output: 15 },
  groq: { input: 1, output: 1 },
};

// Per-user, per-day ceilings. Generous for one person, ruinous for a runaway
// loop, which is the point.
export const DAILY_REQUEST_CAP = 200;
export const DAILY_COST_CAP_MICROS = 2_000_000; // $2.00 a day

export function costMicros(
  inputTokens: number,
  outputTokens: number,
  provider: Provider = "anthropic",
) {
  const rate = PRICING[provider] ?? PRICING.anthropic;
  return inputTokens * rate.input + outputTokens * rate.output;
}

export type CapCheck =
  | { ok: true; usage: { requests: number; costMicros: number } }
  | { ok: false; reason: string };

/**
 * Called before every model request. Reads today's usage for the user and
 * refuses if either ceiling is already hit. Returns the current usage so the
 * caller can show how close to the limit they are.
 */
export async function checkCap(userId: unknown): Promise<CapCheck> {
  await connectDB();
  const usage = await AiUsage.findOne({ user: userId, day: dayKey() }).lean<{
    requests?: number;
    costMicros?: number;
  } | null>();

  const requests = usage?.requests ?? 0;
  const spent = usage?.costMicros ?? 0;

  if (requests >= DAILY_REQUEST_CAP) {
    return { ok: false, reason: `Daily limit of ${DAILY_REQUEST_CAP} AI requests reached. Resets tomorrow.` };
  }
  if (spent >= DAILY_COST_CAP_MICROS) {
    return { ok: false, reason: `Daily AI budget of $${(DAILY_COST_CAP_MICROS / 1_000_000).toFixed(2)} reached. Resets tomorrow.` };
  }
  return { ok: true, usage: { requests, costMicros: spent } };
}

/** Records one request's tokens and cost against today. Atomic, upsert. */
export async function recordUsage(
  userId: unknown,
  inputTokens: number,
  outputTokens: number,
  provider: Provider = "anthropic",
) {
  await connectDB();
  await AiUsage.updateOne(
    { user: userId, day: dayKey() },
    {
      $inc: {
        requests: 1,
        inputTokens,
        outputTokens,
        costMicros: costMicros(inputTokens, outputTokens, provider),
      },
    },
    { upsert: true }
  );
}

/** Pull token counts off a finished message, tolerating shape differences. */
export function tokensOf(message: { usage?: { input_tokens?: number; output_tokens?: number } }) {
  return {
    input: message.usage?.input_tokens ?? 0,
    output: message.usage?.output_tokens ?? 0,
  };
}
