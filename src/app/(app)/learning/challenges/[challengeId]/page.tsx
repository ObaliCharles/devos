import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/user";
import { getChallenge } from "@/lib/queries";
import { ChallengeWorkspace } from "@/components/practice/challenge-workspace";

export const dynamic = "force-dynamic";

const TRAIL = [
  { href: "/learning", label: "Learning" },
  { href: "/learning/challenges", label: "Challenges" },
];

export default async function ChallengePage({ params }: { params: Promise<{ challengeId: string }> }) {
  const { challengeId } = await params;
  const user = await requireUser();
  const challenge = await getChallenge(user._id, challengeId);
  if (!challenge) notFound();

  return (
    <div className="page-body">
      {/* A trail rather than a back button: the workspace is two levels deep,
          and from here you are as likely to want the catalogue as the page you
          arrived from. */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px]">
        {TRAIL.map((crumb) => (
          <span key={crumb.href} className="flex items-center gap-1.5">
            <Link
              href={crumb.href}
              className="transition-colors hover:text-[var(--text)]"
              style={{ color: "var(--text-faint)" }}
            >
              {crumb.label}
            </Link>
            <ChevronRight size={13} style={{ color: "var(--text-faint)", opacity: 0.5 }} />
          </span>
        ))}
        <span className="truncate" style={{ color: "var(--text-muted)" }}>
          {challenge.title}
        </span>
      </nav>

      <ChallengeWorkspace challenge={challenge} />
    </div>
  );
}
