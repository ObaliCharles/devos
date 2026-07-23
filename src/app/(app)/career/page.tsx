import Link from "next/link";
import { ArrowRight, Award, Briefcase, FileText, Globe } from "lucide-react";
import { requireUser } from "@/lib/user";
import { getCareerReadiness } from "@/lib/queries";
import { IconTile, Ring, StatTile } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CareerOverviewPage() {
  const user = await requireUser();
  const r = await getCareerReadiness(user._id);

  return (
    <div className="section-stack">
      {/* ------------------------------------------------------- Readiness */}
      <section className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-x-10 gap-y-6">
          <div className="min-w-0">
            <p className="eyebrow">Job readiness</p>
            <p
              className="num mt-2 text-[44px] font-bold leading-none"
              style={{ color: r.ready ? "var(--success)" : "var(--warning)" }}
            >
              {r.overall}%
            </p>
            <p className="text-body mt-2 text-[13.5px]">
              {r.ready
                ? "You are in good shape to apply."
                : "A few things would strengthen your case."}
            </p>
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-5">
            <Ring value={r.resumeScore} label="Resume" />
            <Ring value={r.portfolioScore} label="Portfolio" />
            <Ring value={r.projectScore} label="Projects" />
            <Ring value={r.certScore} label="Certs" />
          </div>
        </div>

        {/* Gaps are the whole point of a readiness score, so they are actions,
            not decorative chips: each one links to where you fix it. */}
        {r.gaps.length > 0 && (
          <div className="mt-6 border-t pt-5">
            <p className="overline">To improve your score</p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {r.gaps.map((g) => (
                <li key={g}>
                  <span className="well flex items-center gap-2 px-3 py-2.5 text-[13px]">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: "var(--warning)" }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate">{g}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* --------------------------------------------------------- Modules */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          href="/career/resume"
          label="Resume"
          value={`${r.resumeScore}%`}
          sub="ATS score"
          icon={<FileText size={17} />}
          tone={r.resumeScore >= 70 ? "success" : "warning"}
        />
        <StatTile
          href="/career/portfolio"
          label="Portfolio"
          value={r.portfolioScore === 100 ? "Published" : "Draft"}
          sub={r.portfolioScore === 100 ? "live and public" : "not published yet"}
          icon={<Globe size={17} />}
          tone={r.portfolioScore === 100 ? "success" : "neutral"}
        />
        <StatTile
          href="/career/applications"
          label="Applications"
          value={r.counts.applications}
          sub="tracked"
          icon={<Briefcase size={17} />}
          tone="info"
        />
        <StatTile
          href="/career/certificates"
          label="Certificates"
          value={r.counts.certs}
          sub="earned"
          icon={<Award size={17} />}
          tone="primary"
        />
      </section>

      {/* ------------------------------------------------------------ Path */}
      <section className="card flex items-start gap-4 p-4 sm:p-5">
        <IconTile tone="primary" size="lg">
          <ArrowRight size={19} />
        </IconTile>
        <div className="min-w-0">
          <p className="eyebrow">The path</p>
          <p className="text-body mt-2 max-w-[70ch] text-[14px]">
            Learn → build → showcase → apply → interview → hired. Your projects already live in this
            workspace, which is why your portfolio and resume can be built from them rather than
            from scratch. Deploy two projects, publish a portfolio, and get your resume past 70% —
            the rest is applying.
          </p>
          <Link href="/projects" className="btn btn-secondary mt-4">
            Go to projects <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}
