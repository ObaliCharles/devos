/**
 * Pull a JSON object out of a model reply, tolerant of stray prose and a
 * ```json fence the model added despite being told not to.
 *
 * Was private to `roadmap-gen.ts`; moved here once `lib/actions/teach-back.ts`
 * needed the exact same tolerance for the exact same reason — every prompt
 * in this codebase that asks a model for structured JSON hits the same failure
 * mode (a fence, a stray sentence before the brace) and should parse it the
 * same forgiving way rather than each call site growing its own slightly
 * different regex.
 */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("The model did not return JSON.");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}
