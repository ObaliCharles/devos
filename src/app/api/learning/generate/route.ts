import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/user";
import { checkCap } from "@/lib/ai";
import { generateRoadmap, type GenerateInput, type GenerateProgress } from "@/lib/roadmap-gen";
import { countOwnedRoadmaps, MAX_AI_ROADMAPS, persistRoadmap } from "@/lib/roadmap-persist";

/**
 * Curriculum generation, streamed.
 *
 * Generation takes a minute or more: research, then an outline, then one
 * content call per skill. As a server action that is a minute of silence and a
 * spinner, which is exactly the experience being complained about — you cannot
 * tell a slow generation from a hung one.
 *
 * So it runs here instead and reports as it goes. Each stage writes one JSON
 * line to the response body; the client reads them as they arrive and shows the
 * real stage, the real sources as they are found, and a real count of lessons
 * written. Newline-delimited JSON rather than SSE: the client is a fetch reader
 * doing no reconnection, so the extra `event:`/`data:` framing would buy
 * nothing.
 *
 * The connection is the only thing driving this work, so a client that
 * disconnects mid-generation abandons it — that is deliberate. A path nobody is
 * waiting for is not worth the tokens.
 */

export const dynamic = "force-dynamic";
// Generation regularly runs past a minute; the platform default would cut the
// stream off mid-write and leave a half-saved tree.
export const maxDuration = 300;

type Frame =
  | GenerateProgress
  | { stage: "done"; roadmapId: string; lessons: number; grounded: boolean }
  | { stage: "error"; error: string };

export async function POST(request: Request) {
  const user = await requireUser();

  let body: Partial<GenerateInput>;
  try {
    body = (await request.json()) as Partial<GenerateInput>;
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  const topic = body.topic?.trim();
  const goal = body.goal?.trim();
  if (!topic || !goal) {
    return Response.json(
      { error: "Give a topic and what you want to be able to do." },
      { status: 400 },
    );
  }

  // Both guards run before the stream opens, so a refusal is a plain status
  // code the client can render as an error rather than a stream that says
  // "researching" and then immediately gives up.
  const cap = await checkCap(user._id);
  if (!cap.ok) return Response.json({ error: cap.reason }, { status: 429 });

  if ((await countOwnedRoadmaps(user._id)) >= MAX_AI_ROADMAPS) {
    return Response.json(
      { error: `You can keep up to ${MAX_AI_ROADMAPS} generated paths. Delete one to make room.` },
      { status: 409 },
    );
  }

  const input: GenerateInput = {
    topic,
    goal,
    level: body.level ?? "beginner",
    context: body.context,
    months: body.months,
    hoursPerDay: body.hoursPerDay,
    includeProjects: body.includeProjects,
    includeCertifications: body.includeCertifications,
    style: body.style,
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const send = (frame: Frame) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(frame)}\n`));
        } catch {
          // The reader went away mid-generation. Stop writing; the work below
          // will finish or fail on its own and nothing is left half-written.
          open = false;
        }
      };

      try {
        const result = await generateRoadmap(input, send);

        if (!result.ok) {
          send({ stage: "error", error: result.error });
        } else {
          const saved = await persistRoadmap({
            userId: user._id,
            input,
            data: result.roadmap,
            provider: result.provider,
            resources: result.resources,
          });
          revalidatePath("/learning", "layout");
          revalidatePath("/dashboard");
          send({
            stage: "done",
            roadmapId: saved.roadmapId,
            lessons: saved.lessons,
            grounded: result.resources.length > 0,
          });
        }
      } catch (err) {
        console.error("[generate] failed:", err);
        send({
          stage: "error",
          error: err instanceof Error ? err.message : "Generation failed.",
        });
      } finally {
        open = false;
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      // Nginx and friends buffer by default, which would hold every progress
      // line until the whole response finished — the exact problem this route
      // exists to solve.
      "X-Accel-Buffering": "no",
    },
  });
}
