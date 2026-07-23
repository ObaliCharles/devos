import Link from "next/link";
import { Bookmark, Check, Dumbbell, Zap } from "lucide-react";
import { requireUser } from "@/lib/user";
import { getChallenges } from "@/lib/queries";
import { Badge, EmptyState, PageHeader, type Tone } from "@/components/ui";

export const dynamic = "force-dynamic";

const TONE_BY_LEVEL: Record<string, Tone> = {
  easy: "success",
  medium: "warning",
  hard: "danger",
};

const FILTERS = [
  { key: "", label: "All" },
  { key: "unsolved", label: "Unsolved" },
  { key: "solved", label: "Solved" },
  { key: "bookmarked", label: "Bookmarked" },
];

export default async function ChallengesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const user = await requireUser();
  const all = await getChallenges(user._id);

  const challenges =
    filter === "solved"
      ? all.filter((c) => c.solved)
      : filter === "unsolved"
        ? all.filter((c) => !c.solved)
        : filter === "bookmarked"
          ? all.filter((c) => c.bookmarked)
          : all;

  const current = filter ?? "";

  return (
    <div className="page-body">
      <PageHeader
        back={{ href: "/practice", label: "Practice" }}
        eyebrow="Practice"
        title="All challenges"
        description="Every exercise in the workspace, filtered however you like."
      />

      <div className="section-stack">
        {/* A segmented control, not a row of outlined pills — this filters the
            list in place, so it should look like a control, not a link. */}
        <nav className="segmented w-fit" aria-label="Filter challenges">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key ? `/practice/challenges?filter=${f.key}` : "/practice/challenges"}
              aria-current={current === f.key ? "page" : undefined}
              className={`segment ${current === f.key ? "segment-active" : ""}`}
            >
              {f.label}
            </Link>
          ))}
        </nav>

        {challenges.length === 0 ? (
          <EmptyState
            compact
            icon={current === "bookmarked" ? <Bookmark size={20} /> : <Dumbbell size={20} />}
            title={
              current === "bookmarked"
                ? "Nothing bookmarked"
                : current === "solved"
                  ? "Nothing solved yet"
                  : "No challenges here"
            }
            body={
              current === "bookmarked"
                ? "Bookmark a challenge from its page and it waits for you here."
                : "Try a different filter, or start with something unsolved."
            }
            action={
              <Link href="/practice/challenges" className="btn btn-primary">
                Show all challenges
              </Link>
            }
          />
        ) : (
          <ul className="flex flex-col gap-1.5">
            {challenges.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/practice/challenges/${c.id}`}
                  className="card card-link flex items-center gap-3.5 p-3.5"
                >
                  <span className={`icon-tile h-8 w-8 ${c.solved ? "icon-tile-success" : ""}`}>
                    {c.solved ? <Check size={15} strokeWidth={2.6} /> : <Dumbbell size={14} />}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-medium">{c.title}</span>
                      {c.bookmarked && (
                        <Bookmark
                          size={12}
                          className="shrink-0"
                          style={{ color: "var(--primary)", fill: "var(--primary)" }}
                        />
                      )}
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge tone={TONE_BY_LEVEL[c.difficulty] ?? "neutral"}>{c.difficulty}</Badge>
                      {c.technology.slice(0, 3).map((t) => (
                        <Badge key={t}>{t}</Badge>
                      ))}
                    </span>
                  </span>

                  <span
                    className="num flex shrink-0 items-center gap-1 text-[12px]"
                    style={{ color: "var(--text-faint)" }}
                  >
                    <Zap size={12} style={{ color: "var(--warning)" }} /> {c.xp}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
