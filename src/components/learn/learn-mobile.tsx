"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronRight, Loader2, Search, Sparkles, TrendingUp } from "lucide-react";
import { activateRoadmap } from "@/lib/actions";
import {
  COURSES,
  PROJECTS,
  CERTIFICATIONS,
  TRACKS,
  lessonCount,
  type Accent,
} from "@/lib/catalog";
import type { RoadmapMeta } from "@/lib/learn-content";
import { ContentIcon } from "./icon";
import { TechLogo, TECH_WITH_LOGO } from "./tech-logo";
import { Reveal } from "@/components/reveal";

/**
 * The mobile Learn experience: tabs over compact, scannable list rows instead
 * of tall one-at-a-time cards. Roadmaps / Courses / Projects / Certifications,
 * each filterable by track, each row a single tap into the real thing. This
 * renders only below lg; desktop keeps the richer hub.
 */

type RoadmapRow = {
  id: string;
  title: string;
  summary?: string;
  origin: string;
  active: boolean;
  lessons: number;
  pct: number;
};

const TABS = ["Roadmaps", "Courses", "Projects", "Certifications"] as const;
type Tab = (typeof TABS)[number];

export function LearnMobile({
  roadmaps,
  metaFor,
  courseProgress = {},
}: {
  roadmaps: RoadmapRow[];
  metaFor: Record<string, RoadmapMeta>;
  /** courseSlug -> lessons completed, for the per-course progress bar. */
  courseProgress?: Record<string, number>;
}) {
  const [tab, setTab] = useState<Tab>("Roadmaps");
  const [track, setTrack] = useState<string>("All");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();

  // Reset the track filter when switching tabs so a Security filter doesn't
  // silently hide every roadmap after you move to Courses.
  function switchTab(t: Tab) {
    setTab(t);
    setTrack("All");
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Page heading */}
      <div className="rise">
        <h1 className="title-page">Learn</h1>
        <p className="text-body mt-1 text-[14px]">Explore roadmaps and start your journey.</p>
      </div>

      {/* Search */}
      <label className="search h-11">
        <Search size={16} style={{ color: "var(--text-faint)" }} />
        <input
          className="search-input text-[14.5px]"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${tab.toLowerCase()}…`}
          aria-label={`Search ${tab}`}
        />
      </label>

      {/* Tabs */}
      <nav className="underlines" aria-label="Learn sections">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            aria-current={tab === t ? "page" : undefined}
            className={`underline-tab ${tab === t ? "underline-tab-active" : ""}`}
          >
            {t}
          </button>
        ))}
      </nav>

      {/* Track chips */}
      <div className="-mt-1 flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
        {["All", ...TRACKS].map((t) => (
          <button
            key={t}
            onClick={() => setTrack(t)}
            aria-pressed={track === t}
            className={`chip chip-sm shrink-0 ${track === t ? "chip-on" : ""}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Lists */}
      {tab === "Roadmaps" && (
        <RoadmapList roadmaps={roadmaps} metaFor={metaFor} track={track} q={q} />
      )}
      {tab === "Courses" && <CourseList track={track} q={q} progress={courseProgress} />}
      {tab === "Projects" && <ProjectList track={track} q={q} />}
      {tab === "Certifications" && <CertList track={track} q={q} />}

      {/* Assessment CTA */}
      <Reveal className="mt-1">
        <Link
          href="#build"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("build-mobile")?.scrollIntoView({ behavior: "smooth" });
          }}
          className="card card-link flex items-center gap-4 p-4"
        >
          <span className="icon-tile icon-tile-lg icon-tile-primary">
            <TrendingUp size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-semibold" style={{ color: "var(--primary)" }}>
              Not sure where to start?
            </p>
            <p className="text-[15px] font-bold tracking-[-0.01em]">Build your path with AI</p>
            <p className="text-meta mt-0.5">Get a personalized roadmap in 2 minutes.</p>
          </div>
          <span className="btn btn-primary btn-icon h-9 w-9 shrink-0">
            <ArrowRight size={16} />
          </span>
        </Link>
      </Reveal>
    </div>
  );
}

/* -------------------------------------------------------------- List row */

function Row({
  icon,
  tech,
  accent,
  title,
  meta,
  pct,
  index,
  onClick,
  href,
  busy,
  badge,
}: {
  icon: string;
  tech?: string;
  accent: Accent;
  title: string;
  meta: string;
  pct?: number;
  index: number;
  onClick?: () => void;
  href?: string;
  busy?: boolean;
  badge?: string;
}) {
  const hasLogo = tech && TECH_WITH_LOGO.has(tech);
  const inner = (
    <>
      {hasLogo ? (
        <TechLogo name={tech} mode="plate" size={40} />
      ) : (
        <span className="icon-tile icon-tile-lg">
          <ContentIcon name={icon} size={18} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[14.5px] font-semibold">{title}</span>
          {badge && (
            <span className="badge badge-primary shrink-0">
              <Sparkles size={9} /> {badge}
            </span>
          )}
        </span>
        <span className="text-meta mt-0.5 block truncate text-[12px]">{meta}</span>
        {pct !== undefined && (
          <span className="mt-2 flex items-center gap-2">
            <span className="progress progress-sm flex-1">
              <span className="progress-bar" style={{ width: `${pct}%` }} />
            </span>
            <span className="num text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
              {pct}%
            </span>
          </span>
        )}
      </span>
      <span className="shrink-0" style={{ color: "var(--text-faint)" }}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={18} />}
      </span>
    </>
  );

  const cls =
    "card card-link flex w-full items-center gap-3.5 p-3.5 text-left";

  return (
    <Reveal as="li" index={index}>
      {href ? (
        <Link href={href} className={cls}>
          {inner}
        </Link>
      ) : (
        <button onClick={onClick} className={cls} disabled={busy}>
          {inner}
        </button>
      )}
    </Reveal>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="card p-8 text-center">
      <p className="text-[14px] font-medium">Nothing here yet</p>
      <p className="text-body mt-1 text-[13px]">No {label} match your filter.</p>
    </div>
  );
}

/* ------------------------------------------------------------ Roadmaps */

function RoadmapList({
  roadmaps,
  metaFor,
  track,
  q,
}: {
  roadmaps: RoadmapRow[];
  metaFor: Record<string, RoadmapMeta>;
  track: string;
  q: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const meta = (title: string) => metaFor[title] ?? metaFor._default;

  const filtered = roadmaps.filter((r) => {
    const m = meta(r.title);
    const trackOk = track === "All" || trackForMeta(m).includes(track);
    const qOk = !q || r.title.toLowerCase().includes(q) || (r.summary ?? "").toLowerCase().includes(q);
    return trackOk && qOk;
  });

  function follow(r: RoadmapRow) {
    if (r.active) {
      router.push("/learning/roadmap");
      return;
    }
    setBusyId(r.id);
    start(async () => {
      await activateRoadmap(r.id);
      router.refresh();
      router.push("/learning/roadmap");
    });
  }

  if (filtered.length === 0) return <Empty label="roadmaps" />;

  return (
    <ul className="flex flex-col gap-2.5">
      {filtered.map((r, i) => {
        const m = meta(r.title);
        return (
          <Row
            key={r.id}
            index={i}
            icon={m.icon}
            accent={m.accent}
            title={r.title}
            meta={`${r.lessons} lessons · ${m.difficulty} · ${m.duration}`}
            pct={r.active || r.pct > 0 ? r.pct : undefined}
            badge={r.origin === "ai" ? "AI" : undefined}
            busy={pending && busyId === r.id}
            onClick={() => follow(r)}
          />
        );
      })}
    </ul>
  );
}

// A roadmap's meta doesn't carry a track, so infer a bucket from its accent for
// the chip filter. Loose on purpose — the chips are a coarse filter, not a taxonomy.
function trackForMeta(m: RoadmapMeta): string[] {
  const byAccent: Record<Accent, string[]> = {
    info: ["Development", "Cloud"],
    primary: ["Development", "Data Science"],
    warning: ["Data Science"],
    success: ["Security"],
    danger: ["Development"],
  };
  return byAccent[m.accent] ?? ["Development"];
}

/* -------------------------------------------------------------- Courses */

function CourseList({
  track,
  q,
  progress,
}: {
  track: string;
  q: string;
  progress: Record<string, number>;
}) {
  const filtered = COURSES.filter((c) => {
    const trackOk = track === "All" || c.track === track;
    const qOk = !q || `${c.title} ${c.tagline} ${c.tags.join(" ")}`.toLowerCase().includes(q);
    return trackOk && qOk;
  });
  if (filtered.length === 0) return <Empty label="courses" />;
  return (
    <ul className="flex flex-col gap-2.5">
      {filtered.map((c, i) => {
        const total = lessonCount(c);
        const done = progress[c.slug] ?? 0;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        return (
          <Row
            key={c.slug}
            index={i}
            icon={c.icon}
            tech={c.tech}
            accent={c.accent}
            title={c.title}
            meta={
              done > 0
                ? `${done}/${total} lessons done · ${c.hours}h`
                : `${c.modules.length} modules · ${total} lessons · ${c.hours}h · ${c.level}`
            }
            pct={done > 0 ? pct : undefined}
            href={`/learning/course/${c.slug}`}
          />
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------- Projects */

function ProjectList({ track, q }: { track: string; q: string }) {
  const filtered = PROJECTS.filter((p) => {
    const trackOk = track === "All" || p.track === track;
    const qOk = !q || `${p.title} ${p.tagline} ${p.tags.join(" ")}`.toLowerCase().includes(q);
    return trackOk && qOk;
  });
  if (filtered.length === 0) return <Empty label="projects" />;
  return (
    <ul className="flex flex-col gap-2.5">
      {filtered.map((p, i) => (
        <Row
          key={p.slug}
          index={i}
          icon={p.icon}
          accent={p.accent}
          title={p.title}
          meta={`${p.tagline} · ${p.hours}h · ${p.level}`}
          href="/projects/new"
        />
      ))}
    </ul>
  );
}

/* --------------------------------------------------------- Certifications */

function CertList({ track, q }: { track: string; q: string }) {
  const filtered = CERTIFICATIONS.filter((c) => {
    const trackOk = track === "All" || c.track === track;
    const qOk = !q || `${c.title} ${c.provider} ${c.tags.join(" ")}`.toLowerCase().includes(q);
    return trackOk && qOk;
  });
  if (filtered.length === 0) return <Empty label="certifications" />;
  return (
    <ul className="flex flex-col gap-2.5">
      {filtered.map((c, i) => (
        <Row
          key={c.slug}
          index={i}
          icon={c.icon}
          accent={c.accent}
          title={c.title}
          meta={`${c.provider} · ${c.tagline}`}
          href="/career/certificates"
        />
      ))}
    </ul>
  );
}
