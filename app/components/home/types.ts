/** Shared types and formatting helpers for the home dashboard. */

/**
 * A single reading of the server's counters.
 *
 * Every field is nullable because the full snapshot comes from
 * `/admin/stats`, which non-admin users can't reach. For them the route
 * falls back to Cypher counts and leaves the rest `null` so the tiles can
 * render an honest "-" instead of a fabricated zero.
 */
export interface StatsSnapshot {
  nodes: number | null;
  relationships: number | null;
  collections: number | null;
  documents: number | null;
  syncRules: number | null;
  rlsPolicies: number | null;
}

/** One polled sample, kept in a rolling window to drive the sparklines. */
export interface StatsSample {
  t: number;
  nodes: number;
  relationships: number;
  documents: number;
}

/** How many samples the rolling window keeps (~3 min at a 5s interval). */
export const MAX_SAMPLES = 40;

/** Compact count: 942, 12.4k, 3.1M. */
export function formatCount(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "-";
  if (Math.abs(n) < 1000) return String(n);
  if (Math.abs(n) < 1_000_000) return `${(n / 1000).toFixed(Math.abs(n) < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(Math.abs(n) < 10_000_000 ? 1 : 0)}M`;
}

/** Coarse uptime: 3d 4h, 4h 12m, 12m 30s, 30s. */
export function formatUptime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) {
    return "-";
  }
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

/** "just now" / "42s ago" / "6m ago" / "2h ago" / "3d ago". */
export function formatAgo(timestamp: number, now: number): string {
  const delta = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (delta < 5) return "just now";
  if (delta < 60) return `${delta}s ago`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
}
