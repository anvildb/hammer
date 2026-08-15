import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { useConnection } from "~/lib/connection-context";
import type { EventEntry } from "~/lib/api-client";
import { formatAgo } from "./types";

interface ActivityFeedProps {
  /** Follow the dashboard's live/paused toggle. */
  live: boolean;
  intervalMs: number;
}

const LIMIT = 12;

function badgeClass(type: string): string {
  if (type.includes("Error")) return "bg-red-900/40 text-red-300";
  if (type.includes("Slow")) return "bg-amber-900/40 text-amber-300";
  if (type.includes("Auth")) return "bg-blue-900/40 text-blue-300";
  return "bg-zinc-800 text-zinc-400";
}

/**
 * Recent server events, straight off `/admin/events`. Admin-only — the route
 * renders it only for admins, since the endpoint 403s for everyone else.
 */
export function ActivityFeed({ live, intervalMs }: ActivityFeedProps) {
  const { client, status } = useConnection();
  const [entries, setEntries] = useState<EventEntry[]>([]);
  const [failuresOnly, setFailuresOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const res = await client.events({
        limit: LIMIT,
        ...(failuresOnly ? { success: "false" } : {}),
      });
      // Defensive `?? []`: a proxy or an older server can answer 200 with a
      // body that has no `events`, and an undefined list here would take the
      // whole dashboard down through the error boundary.
      setEntries(res.events ?? []);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
      setNow(Date.now());
    }
  }, [client, failuresOnly]);

  useEffect(() => {
    if (status !== "connected") return;
    let cancelled = false;

    async function poll() {
      if (!cancelled) await load();
    }

    poll();
    if (!live) return () => { cancelled = true; };

    const id = setInterval(poll, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [status, live, intervalMs, load]);

  // Keep the relative timestamps honest while the feed sits idle.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  // Nothing is fetched while the server is unreachable, so don't sit on a
  // "Loading..." that will never resolve.
  const waiting = status !== "connected" && entries.length === 0;

  return (
    <section className="flex flex-col rounded-lg border border-zinc-800 bg-zinc-900/40">
      <header className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-200">Recent activity</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setFailuresOnly((v) => !v)}
            className={`text-xs transition-colors ${
              failuresOnly ? "text-red-300" : "text-zinc-500 hover:text-zinc-200"
            }`}
          >
            {failuresOnly ? "Failures only" : "All events"}
          </button>
          <button
            onClick={load}
            className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            Refresh
          </button>
          <Link to="/monitor" className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors">
            Monitor →
          </Link>
        </div>
      </header>

      <div className="px-4 py-2 min-h-[8rem]">
        {waiting && (
          <p className="text-xs text-zinc-500 py-2">Waiting for the server connection.</p>
        )}

        {!waiting && error && (
          <p className="text-xs text-red-400 py-2">Could not load events: {error}</p>
        )}

        {!waiting && !error && loading && entries.length === 0 && (
          <p className="text-xs text-zinc-500 py-2">Loading events...</p>
        )}

        {!waiting && !error && !loading && entries.length === 0 && (
          <p className="text-xs text-zinc-500 py-2">
            {failuresOnly ? "No failures recorded." : "No events yet — run a query to see one here."}
          </p>
        )}

        <ul className="divide-y divide-zinc-800/60">
          {entries.map((event) => (
            <li key={event.id} className="flex items-center gap-2 py-1.5 text-xs">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  event.success ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
              <span
                className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] ${badgeClass(event.type)}`}
              >
                {event.type}
              </span>
              <span
                className="font-mono text-zinc-400 truncate"
                title={event.error ? `${event.name}\n${event.error}` : event.name}
              >
                {event.name}
              </span>
              <span className="ml-auto shrink-0 text-[10px] text-zinc-600 tabular-nums">
                {event.duration_ms}ms · {formatAgo(event.timestamp, now)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
