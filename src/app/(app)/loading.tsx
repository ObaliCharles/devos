import { PageSkeleton } from "@/components/status-screens";

/** Streams instantly while a route's server data resolves. */
export default function Loading() {
  return <PageSkeleton />;
}
