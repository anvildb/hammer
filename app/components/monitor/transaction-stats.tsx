// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
import type { TransactionStats as TxStatsType } from "./types";

interface TransactionStatsProps {
  stats: TxStatsType;
  connectionCount: number;
}

export function TransactionStats({ stats, connectionCount }: TransactionStatsProps) {
  const items: { label: string; value: number; color?: string }[] = [
    { label: "Active", value: stats.active, color: "text-green-400" },
    { label: "Committed", value: stats.committed },
    { label: "Rolled Back", value: stats.rolledBack, color: "text-amber-400" },
    { label: "Peak Concurrent", value: stats.peakConcurrent },
    { label: "Connections", value: connectionCount },
  ];

  return (
    <div>
      <div className="px-3 py-2 border-b border-zinc-800">
        <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Transactions</h3>
      </div>
      <div className="grid grid-cols-3 gap-2 p-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="px-3 py-2 rounded bg-zinc-900 border border-zinc-800"
          >
            <p className="text-[11px] text-zinc-500 uppercase tracking-wider">{item.label}</p>
            <p className={`text-sm font-mono tabular-nums mt-0.5 ${item.color ?? "text-zinc-200"}`}>
              {item.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
