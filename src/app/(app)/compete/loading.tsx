import { ListSkeleton } from "@/components/status-screens";

/** The Arena is a ladder and a match history — rows, not stat tiles. */
export default function Loading() {
  return <ListSkeleton rows={8} />;
}
