// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
import type { StoreSizes as StoreSizesType } from "./types";

interface StoreSizesProps {
  sizes: StoreSizesType;
}

export function StoreSizes({ sizes }: StoreSizesProps) {
  const items: { label: string; count: number; bytes: number }[] = [
    { label: "Nodes", count: sizes.nodeCount, bytes: sizes.nodeStoreBytes },
    { label: "Relationships", count: sizes.relationshipCount, bytes: sizes.relationshipStoreBytes },
    { label: "Properties", count: sizes.propertyCount, bytes: sizes.propertyStoreBytes },
    { label: "Indexes", count: sizes.indexCount, bytes: sizes.indexStoreBytes },
  ];

  return (
    <div>
      <div className="px-3 py-2 border-b border-zinc-800">
        <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Store Sizes</h3>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="px-3 py-2 rounded bg-zinc-900 border border-zinc-800"
          >
            <p className="text-[11px] text-zinc-500 uppercase tracking-wider">{item.label}</p>
            <p className="text-sm text-zinc-200 font-mono tabular-nums mt-0.5">
              {item.count.toLocaleString()}
            </p>
            <p className="text-[11px] text-zinc-600 font-mono tabular-nums">
              {formatBytes(item.bytes)}
            </p>
          </div>
        ))}
      </div>
      <div className="px-3 pb-3">
        <div className="px-3 py-2 rounded bg-zinc-900 border border-zinc-800">
          <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Total</p>
          <p className="text-sm text-zinc-200 font-mono tabular-nums mt-0.5">
            {formatBytes(sizes.totalBytes)}
          </p>
          {/* Bar breakdown */}
          <div className="flex h-1.5 rounded-full overflow-hidden mt-2 bg-zinc-800">
            <BarSegment bytes={sizes.nodeStoreBytes} total={sizes.totalBytes} color="bg-blue-500" />
            <BarSegment bytes={sizes.relationshipStoreBytes} total={sizes.totalBytes} color="bg-green-500" />
            <BarSegment bytes={sizes.propertyStoreBytes} total={sizes.totalBytes} color="bg-amber-500" />
            <BarSegment bytes={sizes.indexStoreBytes} total={sizes.totalBytes} color="bg-purple-500" />
          </div>
          <div className="flex gap-3 mt-1.5">
            <Legend color="bg-blue-500" label="Nodes" />
            <Legend color="bg-green-500" label="Rels" />
            <Legend color="bg-amber-500" label="Props" />
            <Legend color="bg-purple-500" label="Indexes" />
          </div>
        </div>
      </div>
    </div>
  );
}

function BarSegment({ bytes, total, color }: { bytes: number; total: number; color: string }) {
  const pct = total > 0 ? (bytes / total) * 100 : 0;
  if (pct < 0.5) return null;
  return <div className={`${color} opacity-70`} style={{ width: `${pct}%` }} />;
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className={`w-2 h-2 rounded-sm ${color} opacity-70`} />
      <span className="text-[11px] text-zinc-500">{label}</span>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
