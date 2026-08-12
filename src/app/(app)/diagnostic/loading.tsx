import { FormSkeleton } from "@/components/status-screens";

/** A linear question flow, not a dashboard — the field-stack shape predicts
 *  it better than the default PageSkeleton the parent route would fall back to. */
export default function Loading() {
  return <FormSkeleton fields={3} />;
}
