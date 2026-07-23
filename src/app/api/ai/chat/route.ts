import { z } from "zod";
import { connectDB } from "@/lib/db";
import { AiConversation, AiMessage } from "@/lib/models";
import { requireUser } from "@/lib/user";
import { checkCap, isConfigured, recordUsage } from "@/lib/ai";
import { modelFor, streamChat } from "@/lib/ai-provider";
import { buildSystemContext } from "@/lib/ai-context";

export const runtime = "nodejs";

const Body = z.object({
  conversationId: z.string(),
  message: z.string().min(1).max(8000),
});

/**
 * Streaming chat. The response is Server-Sent-Events so the client can render
 * tokens as they arrive — the BACKLOG asks for this, and a tutor that appears
 * word by word feels alive where one that pauses for ten seconds feels broken.
 *
 * The cap is checked before the request goes out, and usage is recorded after.
 * That ordering matters: a loop cannot run up a bill because the (N+1)th call
 * is refused by reading the count the Nth call wrote.
 */
export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Bad request." }, { status: 400 });
  const { conversationId, message } = parsed.data;

  if (!isConfigured()) {
    return Response.json(
      {
        error:
          "The AI tutor is not configured. Add ANTHROPIC_API_KEY or GROQ_API_KEY to .env.local and restart.",
      },
      { status: 200 }
    );
  }

  await connectDB();

  const convo = await AiConversation.findOne({ _id: conversationId, user: user._id });
  if (!convo) return Response.json({ error: "Conversation not found." }, { status: 404 });

  const cap = await checkCap(user._id);
  if (!cap.ok) return Response.json({ error: cap.reason }, { status: 429 });

  // Persist the user's message immediately, so a dropped connection does not
  // lose it.
  await AiMessage.create({ conversation: convo._id, user: user._id, role: "user", content: message });

  // The conversation so far, oldest first, plus the new turn.
  const history = await AiMessage.find({ conversation: convo._id })
    .sort({ createdAt: 1 })
    .select("role content")
    .lean();

  const system = await buildSystemContext(user, {
    lessonId: convo.context?.lesson ? String(convo.context.lesson) : undefined,
    projectId: convo.context?.project ? String(convo.context.project) : undefined,
    noteId: convo.context?.note ? String(convo.context.note) : undefined,
    challengeId: convo.context?.challenge ? String(convo.context.challenge) : undefined,
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // streamChat picks Anthropic first and silently retries on Groq if the
        // Anthropic call fails before any text has been sent — which is what
        // an unbilled API key looks like.
        const { text, usage, provider } = await streamChat({
          system,
          maxTokens: 1200,
          messages: history.map((m) => ({
            role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
            content: String(m.content),
          })),
          onDelta: (delta) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
          },
        });

        // Persist the assistant turn and bill the tokens against whichever
        // provider actually answered.
        await AiMessage.create({
          conversation: convo._id,
          user: user._id,
          role: "assistant",
          content: text,
          model: modelFor(provider),
          inputTokens: usage.input,
          outputTokens: usage.output,
        });
        await recordUsage(user._id, usage.input, usage.output, provider);

        // Give a brand-new conversation a title from its first exchange.
        const count = await AiMessage.countDocuments({ conversation: convo._id });
        const update: Record<string, unknown> = { lastMessageAt: new Date(), messageCount: count };
        if (convo.title === "New conversation") {
          update.title = message.slice(0, 48) + (message.length > 48 ? "…" : "");
        }
        await AiConversation.updateOne({ _id: convo._id }, { $set: update });

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true, provider })}\n\n`),
        );
      } catch (err) {
        console.error("[ai/chat]", err);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              error:
                "Every configured AI provider refused that request. Check the server logs — an unbilled Anthropic key with no GROQ_API_KEY set is the usual cause.",
            })}\n\n`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
