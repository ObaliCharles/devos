import { DetailSkeleton } from "@/components/status-screens";

/** A profile is an identity block plus a content column, which is the detail
 *  shape rather than the dashboard one. */
export default function Loading() {
  return <DetailSkeleton />;
}
