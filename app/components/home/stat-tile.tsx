import { Link } from "react-router";
import { Sparkline } from "./sparkline";
import { formatCount } from "./types";

interface StatTileProps {
  label: string;
  value: number | null;
  /** Change since the oldest sample in the current window. */
  delta?: number | null;
  /** Route to open when the tile is clicked. Omit for a static tile. */
  to?: string;
  /** Secondary line under the value. */
  hint?: string;
  /** Rolling history for the sparkline. */
  series?: number[];
  /** Tailwind text-color class driving both the value and the sparkline. */
  accent?: string;
}

export function StatTile({
  label,
  value,
  delta,
  to,
  hint,
  series = [],
  accent = "text-zinc-300",
}: StatTileProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</span>
        {delta !== null && delta !== undefined && delta !== 0 && (
          <span
            className={`text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded ${
              delta > 0
                ? "text-emerald-300 bg-emerald-500/10"
                : "text-red-300 bg-red-500/10"
            }`}
            title="Change since this page loaded"
          >
            {delta > 0 ? "+" : ""}
            {formatCount(delta)}
          </span>
        )}
      </div>

      {/* A missing counter is dimmed so "-" reads as "no reading", not as a
          value rendered in the tile's accent color. */}
      <div
        className={`text-2xl font-semibold tabular-nums ${
          value === null || value === undefined ? "text-zinc-700" : accent
        }`}
      >
        {formatCount(value)}
      </div>

      {hint && <div className="text-[11px] text-zinc-600 truncate">{hint}</div>}

      <Sparkline values={series} className={`h-7 w-full mt-auto ${accent}`} />
    </>
  );

  const shell =
    "flex flex-col gap-1.5 min-h-[7.5rem] rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 transition-colors";

  if (!to) {
    return <div className={shell}>{body}</div>;
  }

  return (
    <Link
      to={to}
      className={`${shell} hover:border-zinc-600 hover:bg-zinc-900 focus:outline-none focus-visible:border-zinc-500`}
    >
      {body}
    </Link>
  );
}
