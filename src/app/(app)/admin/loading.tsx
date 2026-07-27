import { FormSkeleton } from "@/components/status-screens";

/** Admin panels are forms and tables. */
export default function Loading() {
  return <FormSkeleton fields={4} />;
}
