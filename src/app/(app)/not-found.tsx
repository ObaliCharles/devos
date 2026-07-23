import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { StatusScreen } from "@/components/status-screens";

/** Reached by notFound() from a lesson, project or challenge that is gone. */
export default function AppNotFound() {
  return (
    <StatusScreen
      icon={<FileQuestion size={24} />}
      eyebrow="Not found"
      title="That page does not exist"
      body="The link may be stale, or the thing it pointed at was deleted. Everything else in your workspace is fine."
      actions={
        <>
          <Link href="/dashboard" className="btn btn-primary">
            Back to dashboard
          </Link>
          <Link href="/learning" className="btn btn-ghost">
            Go to the roadmap
          </Link>
        </>
      }
    />
  );
}
