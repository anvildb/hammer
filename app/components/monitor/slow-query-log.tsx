// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
import { useState } from "react";
import type { SlowQueryEntry } from "./types";

interface SlowQueryLogProps {
  entries: SlowQueryEntry[];
}

export function SlowQueryLog({ entries }: SlowQueryLogProps) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div>
      <div className="px-3 py-2 border-b border-zinc-800">
        <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
          Slow Query Log
          <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 tabular-nums font-normal">
            {entries.length}
          </span>
        </h3>
      </div>
      {entries.length === 0 ? (
        <p className="px-3 py-4 text-xs text-zinc-600 text-center">No slow queries recorded</p>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-900">
                <th className="px-3 py-1.5 text-left text-zinc-500 font-medium">Time</th>
                <th className="px-3 py-1.5 text-left text-zinc-500 font-medium">Query</th>
                <th className="px-3 py-1.5 text-left text-zinc-500 font-medium">User</th>
                <th className="px-3 py-1.5 text-left text-zinc-500 font-medium">DB</th>
                <th className="px-3 py-1.5 text-right text-zinc-500 font-medium">Duration</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr
                  key={i}
                  className="border-t border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer"
                  onClick={() => setExpanded(expanded === i ? null : i)}
                >
                  <td className="px-3 py-1.5 text-zinc-500 whitespace-nowrap tabular-nums">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-3 py-1.5 text-zinc-300 font-mono max-w-sm">
                    {expanded === i ? (
                      <pre className="whitespace-pre-wrap break-all">{entry.query}</pre>
                    ) : (
                      <span className="truncate block max-w-sm">{entry.query}</span>
                    )}
                    {expanded === i && entry.plan && (
                      <pre className="mt-1 text-zinc-500 whitespace-pre-wrap text-[11px]">
                        {entry.plan}
                      </pre>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-zinc-400">{entry.user}</td>
                  <td className="px-3 py-1.5 text-zinc-400">{entry.database}</td>
                  <td className="px-3 py-1.5 text-amber-400 text-right tabular-nums whitespace-nowrap">
                    {formatMs(entry.elapsedMs)}
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

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}
