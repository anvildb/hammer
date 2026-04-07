// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
import type { ActiveQuery } from "./types";

interface ActiveQueriesProps {
  queries: ActiveQuery[];
  onKill: (id: string) => void;
}

export function ActiveQueries({ queries, onKill }: ActiveQueriesProps) {
  return (
    <div>
      <SectionHeader title="Active Queries" count={queries.length} />
      {queries.length === 0 ? (
        <p className="px-3 py-4 text-xs text-zinc-600 text-center">No active queries</p>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-900">
                <th className="px-3 py-1.5 text-left text-zinc-500 font-medium">Query</th>
                <th className="px-3 py-1.5 text-left text-zinc-500 font-medium">User</th>
                <th className="px-3 py-1.5 text-left text-zinc-500 font-medium">DB</th>
                <th className="px-3 py-1.5 text-right text-zinc-500 font-medium">Elapsed</th>
                <th className="px-3 py-1.5 text-left text-zinc-500 font-medium">Status</th>
                <th className="px-3 py-1.5 w-12" />
              </tr>
            </thead>
            <tbody>
              {queries.map((q) => (
                <tr key={q.id} className="border-t border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="px-3 py-1.5 text-zinc-300 font-mono max-w-xs truncate">
                    {q.query}
                  </td>
                  <td className="px-3 py-1.5 text-zinc-400">{q.user}</td>
                  <td className="px-3 py-1.5 text-zinc-400">{q.database}</td>
                  <td className="px-3 py-1.5 text-zinc-400 text-right tabular-nums">
                    {formatMs(q.elapsedMs)}
                  </td>
                  <td className="px-3 py-1.5">
                    <StatusBadge status={q.status} />
                  </td>
                  <td className="px-3 py-1.5">
                    <button
                      onClick={() => onKill(q.id)}
                      className="text-[11px] px-2 py-0.5 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50"
                    >
                      Kill
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ActiveQuery["status"] }) {
  const styles = {
    running: "bg-green-900/30 text-green-400",
    waiting: "bg-amber-900/30 text-amber-400",
  };
  return (
    <span className={`text-[11px] px-1.5 py-0.5 rounded ${styles[status]}`}>
      {status}
    </span>
  );
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800">
      <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">{title}</h3>
      {count != null && (
        <span className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 tabular-nums">
          {count}
        </span>
      )}
    </div>
  );
}
