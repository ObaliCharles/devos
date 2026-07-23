import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/user";
import { getConversation, getConversations } from "@/lib/queries";
import { isConfigured } from "@/lib/ai";
import { AiChat } from "@/components/ai-chat";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  const user = await requireUser();

  const [conversations, active] = await Promise.all([
    getConversations(user._id),
    c ? getConversation(user._id, c) : Promise.resolve(null),
  ]);

  // A full-height route, not the usual growing document: a compact header that
  // stays put, and the chat fills the rest so its regions scroll internally.
  return (
    <div className="fills-viewport">
      <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow eyebrow-accent">AI centre</p>
          <h1 className="mt-1 truncate text-[22px] font-bold tracking-[-0.03em]">
            {active?.title ?? "Chat"}
          </h1>
        </div>
        <Link href="/ai" className="btn btn-ghost shrink-0">
          <ArrowLeft size={15} /> AI centre
        </Link>
      </div>

      <div className="min-h-0 flex-1">
        <AiChat conversations={conversations} active={active} configured={isConfigured()} />
      </div>
    </div>
  );
}
