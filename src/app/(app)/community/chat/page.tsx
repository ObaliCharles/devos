import { requireUser } from "@/lib/user";
import { getGroupBySlug, listGroups, listMessages } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { ChatRoom } from "@/components/community/chat-room";

export const dynamic = "force-dynamic";

/**
 * Chat lives on the same groups Discussions does, so joining a group gets you
 * both. The room is chosen with `?room=slug` rather than a nested route: the
 * rail stays mounted across switches, which is what keeps a room change from
 * feeling like a page load.
 */
export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>;
}) {
  const { room: slug } = await searchParams;
  const user = await requireUser();

  const rooms = await listGroups(user._id, 40).catch(() => []);
  const active = slug
    ? await getGroupBySlug(user._id, slug).catch(() => null)
    : null;
  const messages = active ? await listMessages(user._id, active.id).catch(() => []) : [];

  return (
    <div className="page-body">
      <PageHeader
        eyebrow="Community"
        title="Chat"
        description="One room per group, for the conversation that is not worth keeping. Anything that is belongs in Discussions."
      />
      <ChatRoom
        rooms={rooms}
        room={
          active
            ? {
                id: active.id,
                slug: active.slug,
                name: active.name,
                description: active.description,
                topic: active.topic,
                memberCount: active.memberCount,
                postCount: active.postCount,
                joined: active.joined,
              }
            : null
        }
        messages={messages}
      />
    </div>
  );
}
