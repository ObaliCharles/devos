import { requireUser } from "@/lib/user";
import { getConversation, getConversations } from "@/lib/queries";
import { isConfigured } from "@/lib/ai";
import { AiChat } from "@/components/ai-chat";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; q?: string }>;
}) {
  const { c, q } = await searchParams;
  const user = await requireUser();

  const [conversations, active] = await Promise.all([
    getConversations(user._id),
    c ? getConversation(user._id, c) : Promise.resolve(null),
  ]);

  // Chat is a full-height route. On desktop it fills the shell and its regions
  // scroll internally; on phones the AiChat component takes over the whole
  // screen (ChatGPT-style) with its own header, so the page bleeds past the
  // container gutter to the screen edges and hands the component all the room.
  // The header/back live inside AiChat, so both breakpoints share one source
  // of truth.
  return (
    <div className="fills-viewport max-md:-mx-[var(--page-pad)] max-md:-my-[var(--page-top)] max-md:!h-[calc(100dvh-var(--topbar-h))]">
      {/* The only route in the product with no visible page title, because a
          full-height chat has nowhere to put one without stealing a line from
          the transcript. It still needs a heading: without one the document
          outline has a hole and a screen reader lands in a message list with
          no idea what it is looking at. */}
      <h1 className="sr-only">
        {active?.title ? `AI workspace — ${active.title}` : "AI workspace"}
      </h1>
      <AiChat
        conversations={conversations}
        active={active}
        configured={isConfigured()}
        initialPrompt={q?.slice(0, 500) ?? ""}
      />
    </div>
  );
}
