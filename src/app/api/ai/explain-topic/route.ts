import { z } from "zod";
import { requireUser } from "@/lib/user";
import { checkCap, isConfigured, recordUsage } from "@/lib/ai";
import { completeChat } from "@/lib/ai-provider";

export const runtime = "nodejs";

/**
 * Explains a catalog topic on demand.
 *
 * The course catalog holds structure (module/lesson outlines) but not frozen
 * prose, so depth is generated fresh and accurately here rather than stored and
 * left to go stale. Unlike /api/ai/explain, this takes free-text topic and
 * course context instead of a stored lessonId, because catalog courses are not
 * database lessons. Same daily cap as the rest of the assistant.
 */
const Body = z.object({
  course: z.string().max(200),
  topic: z.string().max(200),
  objective: z.string().max(400).optional(),
  mode: z.enum(["simple", "example", "mistakes"]).default("simple"),
});

const INSTRUCTION: Record<string, string> = {
  simple:
    "Explain this topic clearly to someone new to it. Short paragraphs, then one worked code example. Under 250 words.",
  example:
    "Teach this topic through one concrete, runnable code example, walking through it line by line. Under 300 words.",
  mistakes:
    "List the three mistakes beginners most often make with this topic and how each shows up as a symptom in real code.",
};

export async function POST(req: Request) {
  try {
    const user = await requireUser();

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: "Bad request." }, { status: 400 });
    }
    const { course, topic, objective, mode } = parsed.data;

    if (!isConfigured()) {
      return Response.json(
        {
          text: "The AI tutor is not configured. Add ANTHROPIC_API_KEY or GROQ_API_KEY to .env.local and restart the dev server.",
        },
        { status: 200 },
      );
    }

    const cap = await checkCap(user._id);
    if (!cap.ok) return Response.json({ error: cap.reason }, { status: 429 });

    const { text, usage, provider } = await completeChat({
      maxTokens: 900,
      system:
        "You are the tutor inside DeveloperOS, an intelligent developer learning OS. Teach the idea well enough " +
        "that the learner can apply it themselves. Be concrete, use real code, and keep it tight.",
      messages: [
        {
          role: "user",
          content:
            `Course: ${course}\n` +
            `Topic: ${topic}\n` +
            (objective ? `Learning objective: ${objective}\n` : "") +
            `\n---\n${INSTRUCTION[mode]}`,
        },
      ],
    });

    await recordUsage(user._id, usage.input, usage.output, provider);
    return Response.json({ text });
  } catch (err) {
    console.error("[ai/explain-topic]", err);
    return Response.json(
      { error: "The tutor could not answer that. Check the server logs and try again." },
      { status: 500 },
    );
  }
}
