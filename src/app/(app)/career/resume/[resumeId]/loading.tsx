import { FormSkeleton } from "@/components/status-screens";

/** The resume editor is a long field stack, not the career index's list. */
export default function Loading() {
  return <FormSkeleton fields={7} />;
}
