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

type Cell = { day: string; minutes: number } | null;

export function Heatmap({ days }: { days: { day: string; minutes: number }[] }) {
  const max = Math.max(30, ...days.map((d) => d.minutes));

  /* Columns are calendar weeks, so row 0 must be Sunday for the Mon/Wed/Fri
     gutter beside it to mean anything.

     Chunking the array in naive sevens does not do that — the range starts 83
     days ago, which is whatever weekday it happens to be, so every label was
     wrong by that offset and the grid drifted by one row each time the page was
     opened on a different day. Padding the head to the first day's real weekday
     is what pins the rows; padding the tail keeps the last column full height so
     it does not read as a short week. */
  const first = days[0] ? new Date(`${days[0].day}T00:00:00`).getDay() : 0;
  const cells: Cell[] = [...Array<Cell>(first).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: Cell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

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
              className="flex h-[13px] items-center text-[12px] leading-none"
              style={{ color: "var(--text-faint)" }}
            >
              {label}
            </span>
          ))}
        </div>

        <div className="flex gap-[3px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((d, di) =>
                d === null ? (
                  // A day outside the range. It holds the row open so the grid
                  // stays square, but draws nothing — an empty square here would
                  // read as "studied nothing", which is a different claim.
                  <span key={`pad-${di}`} className="h-[13px] w-[13px]" />
                ) : (
                  <span
                    key={d.day}
                    className="h-[13px] w-[13px] rounded-[3px]"
                    style={{ background: shade(d.minutes) }}
                    // Native title rather than the CSS tooltip: this grid scrolls
                    // horizontally, and an absolutely-positioned bubble would be
                    // clipped by that same overflow.
                    title={`${d.day}: ${d.minutes} min`}
                  />
                ),
              )}
            </div>
          ))}
        </div>
      </div>

      <div
        className="mt-3 flex items-center gap-1.5 text-[12px]"
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
