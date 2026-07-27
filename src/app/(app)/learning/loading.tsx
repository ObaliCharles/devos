import { ListSkeleton } from "@/components/status-screens";

/** The catalogue is a run of course rows. */
export default function Loading() {
  return <ListSkeleton rows={7} />;
}
