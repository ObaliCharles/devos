import Link from "next/link";
import type { Metadata } from "next";
import { BadgeCheck, CircleSlash, HelpCircle } from "lucide-react";
import { connectDB } from "@/lib/db";
import { Certificate } from "@/lib/models";
import { normalizeVerifyCode } from "@/lib/certificates";
import { LogoMark } from "@/components/brand";
import { formatDate } from "@/lib/utils";

/**
 * Public certificate verification.
 *
 * Reachable without an account — that is the entire point, since the people
 * who need to check a certificate are recruiters and clients who will never
 * sign up. Rendered per request because a revoked certificate must stop
 * verifying immediately, not at the next rebuild.
 *
 * What this page deliberately does NOT show: the holder's email, their user
 * id, their progress, or anything else about their account. A verification
 * page answers exactly one question — is this real — and every extra field is
 * a privacy leak to an unauthenticated stranger.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verify a certificate · DeveloperOS",
  description: "Check whether a DeveloperOS certificate is genuine.",
  robots: { index: false },
};

type Result =
  | { status: "malformed" }
  | { status: "unknown" }
  | { status: "revoked"; name: string; revokedAt: Date }
  | {
      status: "valid";
      name: string;
      recipient: string;
      issuedAt?: Date;
      provider?: string;
      code: string;
    };

async function lookup(raw: string): Promise<Result> {
  const code = normalizeVerifyCode(raw);
  // Rejected before touching the database: a string that cannot be one of our
  // codes should not cost a query, and it lets us say something more useful
  // than "not found".
  if (!code) return { status: "malformed" };

  await connectDB();
  const cert = await Certificate.findOne({ verifyCode: code })
    .select("name provider issuedAt recipientName revokedAt verifyCode")
    .lean<{
      name: string;
      provider?: string;
      issuedAt?: Date;
      recipientName?: string;
      revokedAt?: Date;
      verifyCode: string;
    } | null>();

  if (!cert) return { status: "unknown" };
  if (cert.revokedAt) return { status: "revoked", name: cert.name, revokedAt: cert.revokedAt };

  return {
    status: "valid",
    name: cert.name,
    recipient: cert.recipientName ?? "A DeveloperOS learner",
    issuedAt: cert.issuedAt,
    provider: cert.provider,
    code: cert.verifyCode,
  };
}

export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const result = await lookup(code);

  return (
    <main className="grid min-h-screen place-items-center px-5 py-16">
      <div className="w-full max-w-[520px]">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5" aria-label="DeveloperOS home">
          <LogoMark size={22} />
          <span className="text-[14px] font-semibold tracking-[-0.03em]">
            Developer<span style={{ color: "var(--text-faint)" }}>OS</span>
          </span>
        </Link>

        <div className="card p-6 sm:p-8">
          {result.status === "valid" ? (
            <>
              <Verdict
                icon={<BadgeCheck size={20} />}
                colour="var(--success)"
                label="Verified"
                headline="This certificate is genuine."
              />
              <dl className="mt-7 flex flex-col gap-0">
                <Field label="Awarded to" value={result.recipient} />
                <Field label="For" value={result.name} />
                {result.issuedAt && <Field label="Issued" value={formatDate(result.issuedAt) ?? "—"} />}
                {result.provider && <Field label="Issued by" value={result.provider} />}
                <Field label="Verification code" value={result.code} mono />
              </dl>
            </>
          ) : result.status === "revoked" ? (
            <>
              <Verdict
                icon={<CircleSlash size={20} />}
                colour="var(--danger)"
                label="Revoked"
                headline="This certificate has been withdrawn."
              />
              <dl className="mt-7 flex flex-col gap-0">
                <Field label="Originally for" value={result.name} />
                <Field label="Revoked" value={formatDate(result.revokedAt) ?? "—"} />
              </dl>
              <p className="text-body mt-6 text-[14px]">
                The code is real, but the certificate it belonged to is no longer valid. It should not be
                accepted as proof of completion.
              </p>
            </>
          ) : (
            <>
              <Verdict
                icon={<HelpCircle size={20} />}
                colour="var(--text-muted)"
                label={result.status === "malformed" ? "Not a valid code" : "No match"}
                headline={
                  result.status === "malformed"
                    ? "That is not a DeveloperOS code."
                    : "No certificate with that code."
                }
              />
              <p className="text-body mt-6 text-[14px]">
                {result.status === "malformed"
                  ? "DeveloperOS codes look like DOS-A7K2-9QM4 — eight characters after the prefix. Check for a typo; the letters O, I and L are never used, so a character that looks like one is probably a 0, 1 or a different letter."
                  : "Nothing has been issued against this code. If you were given it recently, check it was copied in full."}
              </p>
            </>
          )}
        </div>

        <p className="text-meta mt-6 text-center text-[12px]">
          Verification is provided by DeveloperOS. No account is required to check a certificate.
        </p>
      </div>
    </main>
  );
}

function Verdict({
  icon,
  colour,
  label,
  headline,
}: {
  icon: React.ReactNode;
  colour: string;
  label: string;
  headline: string;
}) {
  return (
    <div className="flex items-start gap-3.5">
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-tile)]"
        style={{ background: "var(--neutral-faint)", color: colour }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="eyebrow" style={{ color: colour }}>
          {label}
        </p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.02em]">{headline}</h1>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div
      className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-2.5"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <dt className="text-[14px]" style={{ color: "var(--text-faint)" }}>
        {label}
      </dt>
      <dd className={`text-[14px] font-medium ${mono ? "num" : ""}`} style={{ margin: 0 }}>
        {value}
      </dd>
    </div>
  );
}
