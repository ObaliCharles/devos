/**
 * A GitHub-style contribution heatmap. Server component, pure presentation
 * over data the page already fetched, so it ships no JavaScript.
 *
 * Twelve weeks of days, shaded by intensity relative to the busiest day, using
 * the primary token rather than a hard-coded green so the chart follows the
 * theme instead of fighting it.
 */

const SHADES = [
  "var(--surface-3)",
  "color-mix(in srgb, var(--primary) 26%, var(--surface-2))",
  "color-mix(in srgb, var(--primary) 50%, var(--surface-2))",
  "color-mix(in srgb, var(--primary) 76%, var(--surface-2))",
  "var(--primary)",
];

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

export function Heatmap({ days }: { days: { day: string; minutes: number }[] }) {
  const max = Math.max(30, ...days.map((d) => d.minutes));

  // Chunk into weeks of 7, oldest first. The data is already oldest-first.
  const weeks: { day: string; minutes: number }[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  function shade(minutes: number) {
    if (minutes === 0) return SHADES[0];
    const t = minutes / max;
    if (t < 0.25) return SHADES[1];
    if (t < 0.5) return SHADES[2];
    if (t < 0.75) return SHADES[3];
    return SHADES[4];
  }

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {/* Weekday gutter, three labels, not seven, so it reads as an axis
            rather than a second grid competing with the data. */}
        <div className="flex shrink-0 flex-col gap-[3px] pr-0.5">
          {DAY_LABELS.map((label, i) => (
            <span
              key={i}
              className="flex h-[13px] items-center text-[9.5px] leading-none"
              style={{ color: "var(--text-faint)" }}
            >
              {label}
            </span>
          ))}
        </div>

        <div className="flex gap-[3px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((d) => (
                <span
                  key={d.day}
                  className="h-[13px] w-[13px] rounded-[3px]"
                  style={{ background: shade(d.minutes) }}
                  // Native title rather than the CSS tooltip: this grid scrolls
                  // horizontally, and an absolutely-positioned bubble would be
                  // clipped by that same overflow.
                  title={`${d.day}: ${d.minutes} min`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div
        className="mt-3 flex items-center gap-1.5 text-[10.5px]"
        style={{ color: "var(--text-faint)" }}
      >
        Less
        {SHADES.map((c, i) => (
          <span key={i} className="h-[11px] w-[11px] rounded-[3px]" style={{ background: c }} />
        ))}
        More
      </div>
    </div>
  );
}
