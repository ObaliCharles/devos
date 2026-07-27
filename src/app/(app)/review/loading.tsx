import { ListSkeleton } from "@/components/status-screens";

/** The review queue is a list of due lessons. */
export default function Loading() {
  return <ListSkeleton rows={4} />;
}
