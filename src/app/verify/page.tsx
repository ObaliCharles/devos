import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { LogoMark } from "@/components/brand";
import { SearchField } from "@/components/ui";

export const metadata: Metadata = {
  title: "Verify a certificate · DeveloperOS",
  description: "Check whether a DeveloperOS certificate is genuine.",
  robots: { index: false },
};

/**
 * The bare entry point, for someone who has a code but no link. A GET form so
 * it works without JavaScript — this page is most likely to be opened by a
 * recruiter on a locked-down machine.
 */
export default async function VerifyIndex({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  if (code?.trim()) redirect(`/verify/${encodeURIComponent(code.trim())}`);

  return (
    <main className="grid min-h-screen place-items-center px-5 py-16">
      <div className="w-full max-w-[460px]">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5" aria-label="DeveloperOS home">
          <LogoMark size={22} />
          <span className="text-[14px] font-semibold tracking-[-0.03em]">
            Developer<span style={{ color: "var(--text-faint)" }}>OS</span>
          </span>
        </Link>

        <div className="card p-6 sm:p-8">
          <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Verify a certificate</h1>
          <p className="text-body mt-2 text-[14px]">
            Enter the code printed on the certificate. It looks like{" "}
            <span className="num" style={{ color: "var(--text)" }}>
              DOS-A7K2-9QM4
            </span>
            .
          </p>
          <SearchField
            action="/verify"
            name="code"
            placeholder="DOS-XXXX-XXXX"
            className="mt-5"
          />
        </div>

        <p className="text-meta mt-6 text-center text-[12px]">
          No account is required to check a certificate.
        </p>
      </div>
    </main>
  );
}
