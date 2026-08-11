import { FormSkeleton } from "@/components/status-screens";

/** The creation wizard is a field stack. It sits under /projects, so without
 *  this it inherited a list skeleton and jumped on arrival. */
export default function Loading() {
  return <FormSkeleton fields={6} />;
}
