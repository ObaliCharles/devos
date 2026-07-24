import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Lesson } from "@/lib/models";
import { requireUser } from "@/lib/user";
import { checkCap, isConfigured, recordUsage } from "@/lib/ai";
import { completeChat } from "@/lib/ai-provider";

export const runtime = "nodejs";

const Body = z.object({
  lessonId: z.string(),
  mode: z.enum(["simple", "senior", "analogy", "mistakes", "ask"]),
  question: z.string().max(2000).optional(),
});

const INSTRUCTION: Record<string, string> = {
  simple: "Explain this concept to someone who has been coding for three months. Short sentences. One worked example.",
  senior: "Explain this the way a staff engineer would to a mid-level colleague: the trade-offs, what breaks in production, what you would review for.",
  analogy: "Give one concrete analogy for this concept, then immediately say where the analogy breaks down.",
  mistakes: "List the three mistakes beginners most often make with this, and how each one shows up as a symptom in real code.",
  ask: "Answer the learner's question using the lesson as context.",
};

export async function POST(req: Request) {
  try {
    const user = await requireUser();

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: "Bad request." }, { status: 400 });
    }
    const { lessonId, mode, question } = parsed.data;

    if (!isConfigured()) {
      return Response.json(
        {
          text: "The AI tutor is not configured. Add ANTHROPIC_API_KEY or GROQ_API_KEY to .env.local and restart the dev server.",
        },
        { status: 200 }
      );
    }

    // The in-lesson tutor shares the same daily cap as the chat, one loop here
    // is exactly the runaway cost the BACKLOG warns about.
    const cap = await checkCap(user._id);
    if (!cap.ok) return Response.json({ error: cap.reason }, { status: 429 });

    await connectDB();
    const lesson = await Lesson.findById(lessonId).select("title body objectives").lean<{
      title: string; body: string; objectives?: string[];
    }>();
    if (!lesson) return Response.json({ error: "Lesson not found." }, { status: 404 });

    const { text, usage, provider } = await completeChat({
      maxTokens: 900,
      system:
        "You are the tutor inside DeveloperOS. You never hand over a finished solution to the learner's exercise, " +
        "you explain the idea well enough that they can write it themselves. Be concrete, use code, and stay under " +
        "300 words unless the question genuinely needs more.",
      messages: [
        {
          role: "user",
          content:
            `Lesson: ${lesson.title}\n\n` +
            `Objectives: ${(lesson.objectives ?? []).join("; ")}\n\n` +
            `Lesson material:\n${lesson.body.slice(0, 6000)}\n\n` +
            `---\n${INSTRUCTION[mode]}` +
            (question ? `\n\nLearner's question: ${question}` : ""),
        },
      ],
    });

    await recordUsage(user._id, usage.input, usage.output, provider);

    return Response.json({ text });
  } catch (err) {
    console.error("[ai/explain]", err);
    return Response.json(
      { error: "The tutor could not answer that. Check the server logs and try again." },
      { status: 500 }
    );
  }
}
