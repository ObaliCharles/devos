import { ListSkeleton } from "@/components/status-screens";

/** Feeds, threads and group lists are all runs of rows. Covers every route
 *  under /community, which previously inherited the dashboard-shaped skeleton
 *  from (app)/loading.tsx and so predicted the wrong layout. */
export default function Loading() {
  return <ListSkeleton rows={7} />;
}
