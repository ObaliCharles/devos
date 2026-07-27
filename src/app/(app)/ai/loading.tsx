import { ListSkeleton } from "@/components/status-screens";

/** Conversation rows. */
export default function Loading() {
  return <ListSkeleton rows={5} />;
}
