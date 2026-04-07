// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
import { useState, useEffect, useRef, useCallback } from "react";
import { MonitoringDashboard } from "~/components/monitor/monitoring-dashboard";
import type { MonitorData, ThroughputPoint } from "~/components/monitor/types";
import { useConnection } from "~/lib/connection-context";
import type { EventEntry } from "~/lib/api-client";

const EMPTY_DATA: MonitorData = {
  activeQueries: [],
  storeSizes: {
    nodeCount: 0,
    relationshipCount: 0,
    propertyCount: 0,
    indexCount: 0,
    nodeStoreBytes: 0,
    relationshipStoreBytes: 0,
    propertyStoreBytes: 0,
    indexStoreBytes: 0,
    totalBytes: 0,
  },
  memory: {
    pageCacheSize: 0,
    pageCacheUsed: 0,
    pageCacheHitRate: 0,
    heapUsed: 0,
    heapTotal: 0,
  },
  transactions: {
    active: 0,
    committed: 0,
    rolledBack: 0,
    peakConcurrent: 0,
  },
  connectionCount: 0,
  throughput: [],
  slowQueries: [],
};

const POLL_INTERVAL = 5000;
const MAX_THROUGHPUT_POINTS = 60;

export default function MonitorRoute() {
  const { client, status } = useConnection();
  const [data, setData] = useState<MonitorData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const throughputRef = useRef<ThroughputPoint[]>([]);
  const prevNodeCountRef = useRef<number | null>(null);
  const [eventLogEntries, setEventLogEntries] = useState<EventEntry[]>([]);
  const [eventLogLoading, setEventLogLoading] = useState(false);
  const [eventTypeFilter, setEventTypeFilter] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [stats, schema, slowQueryData] = await Promise.all([
        client.stats(),
        client.getSchema("default").catch(() => null),
        client
          .events({ type: "QuerySlow", limit: 20 })
          .catch(() => ({ events: [] as import("~/lib/api-client").EventEntry[] })),
      ]);

      // Build a throughput data point from the current stats snapshot.
      // Since we don't have per-interval query counts from the server,
      // we derive a rough "queries" value from the node_count delta.
      const now = Date.now();
      const nodeCount = stats.node_count ?? 0;
      const relCount = stats.relationship_count ?? 0;
      const prevNodes = prevNodeCountRef.current;
      prevNodeCountRef.current = nodeCount;

      const point: ThroughputPoint = {
        timestamp: now,
        queries: 0,
        reads: prevNodes !== null ? Math.max(0, nodeCount - prevNodes) : 0,
        writes: 0,
      };

      const nextThroughput = [...throughputRef.current, point].slice(
        -MAX_THROUGHPUT_POINTS,
      );
      throughputRef.current = nextThroughput;

      // Parse schema info if available.
      const schemaData = schema as {
        labels?: { name: string }[];
        indexes?: unknown[];
        propertyKeys?: string[];
      } | null;

      const indexCount = schemaData?.indexes?.length ?? 0;
      const propertyCount = schemaData?.propertyKeys?.length ?? 0;

      setData({
        activeQueries: [],
        storeSizes: {
          nodeCount,
          relationshipCount: relCount,
          propertyCount,
          indexCount,
          nodeStoreBytes: 0,
          relationshipStoreBytes: 0,
          propertyStoreBytes: 0,
          indexStoreBytes: 0,
          totalBytes: 0,
        },
        memory: {
          pageCacheSize: 0,
          pageCacheUsed: 0,
          pageCacheHitRate: 0,
          heapUsed: 0,
          heapTotal: 0,
        },
        transactions: {
          active: 0,
          committed: 0,
          rolledBack: 0,
          peakConcurrent: 0,
        },
        connectionCount: 1,
        throughput: nextThroughput,
        slowQueries: slowQueryData.events.map((e) => ({
          query: e.name,
          user: e.user,
          database: "default",
          elapsedMs: e.duration_ms,
          timestamp: e.timestamp,
        })),
      });
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    if (status !== "connected") {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function poll() {
      if (cancelled) return;
      await fetchData();
    }

    poll();
    intervalId = setInterval(poll, POLL_INTERVAL);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [status, fetchData]);

  if (status !== "connected") {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        Waiting for server connection...
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        Loading monitoring data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-400">
        Error loading monitor data: {error}
      </div>
    );
  }

  async function fetchEventLog() {
    setEventLogLoading(true);
    try {
      const params: { type?: string; limit?: number } = { limit: 50 };
      if (eventTypeFilter) params.type = eventTypeFilter;
      const res = await client.events(params);
      setEventLogEntries(res.events);
    } catch {
      setEventLogEntries([]);
    } finally {
      setEventLogLoading(false);
    }
  }

  return (
    <div className="h-full overflow-auto">
      <MonitoringDashboard
        data={data}
        onKillQuery={() => {}}
      />

      {/* Event Log */}
      <div className="border-t border-zinc-800 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
          Event Log
        </h2>
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-xs">
            <label className="block text-xs text-zinc-400 mb-1">Filter by type</label>
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
            >
              <option value="">All</option>
              <option value="TriggerFired">TriggerFired</option>
              <option value="TriggerError">TriggerError</option>
              <option value="FunctionCalled">FunctionCalled</option>
              <option value="FunctionError">FunctionError</option>
              <option value="QueryExecuted">QueryExecuted</option>
              <option value="QuerySlow">QuerySlow</option>
              <option value="AuthEvent">AuthEvent</option>
              <option value="SyncEvent">SyncEvent</option>
            </select>
          </div>
          <button
            onClick={fetchEventLog}
            disabled={eventLogLoading || status !== "connected"}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-md transition-colors"
          >
            {eventLogLoading ? "Loading..." : "Load Events"}
          </button>
        </div>

        {eventLogEntries.length > 0 && (
          <div className="overflow-x-auto rounded-md border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-900 border-b border-zinc-800">
                  <th className="text-left px-3 py-2 text-zinc-400 font-medium">Time</th>
                  <th className="text-left px-3 py-2 text-zinc-400 font-medium">Type</th>
                  <th className="text-left px-3 py-2 text-zinc-400 font-medium">Name</th>
                  <th className="text-left px-3 py-2 text-zinc-400 font-medium">Duration</th>
                  <th className="text-left px-3 py-2 text-zinc-400 font-medium">Status</th>
                  <th className="text-left px-3 py-2 text-zinc-400 font-medium">User</th>
                  <th className="text-left px-3 py-2 text-zinc-400 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {eventLogEntries.map((evt) => (
                  <tr
                    key={evt.id}
                    className={`border-b border-zinc-800/50 hover:bg-zinc-900/50 ${
                      !evt.success ? "bg-red-950/20" : ""
                    }`}
                  >
                    <td className="px-3 py-1.5 text-xs text-zinc-400 font-mono whitespace-nowrap">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-3 py-1.5 text-xs">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${
                        evt.type.includes("Error") ? "bg-red-900/40 text-red-300" :
                        evt.type.includes("Slow") ? "bg-amber-900/40 text-amber-300" :
                        "bg-zinc-800 text-zinc-300"
                      }`}>
                        {evt.type}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-xs font-mono max-w-64 truncate" title={evt.name}>
                      {evt.name}
                    </td>
                    <td className="px-3 py-1.5 text-xs text-zinc-400">{evt.duration_ms}ms</td>
                    <td className="px-3 py-1.5 text-xs">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${
                        evt.success ? "bg-emerald-900/40 text-emerald-300" : "bg-red-900/40 text-red-300"
                      }`}>
                        {evt.success ? "OK" : "FAIL"}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-xs text-zinc-400">{evt.user}</td>
                    <td className="px-3 py-1.5 text-xs text-red-400 max-w-48 truncate" title={evt.error ?? ""}>
                      {evt.error || ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!eventLogLoading && eventLogEntries.length === 0 && (
          <p className="text-sm text-zinc-500">
            Click "Load Events" to fetch recent system events.
          </p>
        )}
      </div>
    </div>
  );
}
