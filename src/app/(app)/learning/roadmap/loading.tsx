import { ListSkeleton } from "@/components/status-screens";

/** Phases and skills read as a list. */
export default function Loading() {
  return <ListSkeleton rows={8} />;
}
