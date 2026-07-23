import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { StatusScreen } from "@/components/status-screens";

/** The public 404, for URLs that never reach the authenticated shell. */
export default function NotFound() {
  return (
    <main className="min-h-screen">
      <StatusScreen
        icon={<FileQuestion size={24} />}
        eyebrow="404"
        title="That page does not exist"
        body="The link may be stale or mistyped. Head back and start again."
        actions={
          <>
            <Link href="/" className="btn btn-primary">
              Back to home
            </Link>
            <Link href="/sign-in" className="btn btn-ghost">
              Sign in
            </Link>
          </>
        }
      />
    </main>
  );
}
