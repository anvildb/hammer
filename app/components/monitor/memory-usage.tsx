import type { MemoryUsage as MemoryUsageType } from "./types";

interface MemoryUsageProps {
  memory: MemoryUsageType;
}

export function MemoryUsage({ memory }: MemoryUsageProps) {
  const cacheUsedPct = memory.pageCacheSize > 0
    ? (memory.pageCacheUsed / memory.pageCacheSize) * 100
    : 0;
  const heapUsedPct = memory.heapTotal > 0
    ? (memory.heapUsed / memory.heapTotal) * 100
    : 0;

  return (
    <div>
      <div className="px-3 py-2 border-b border-zinc-800">
        <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Memory</h3>
      </div>
      <div className="p-3 space-y-3">
        {/* Page cache */}
        <div className="px-3 py-2 rounded bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Page Cache</p>
            <span className="text-[11px] text-zinc-400 tabular-nums">
              Hit rate: {(memory.pageCacheHitRate * 100).toFixed(1)}%
            </span>
          </div>
          <UsageBar
            used={memory.pageCacheUsed}
            total={memory.pageCacheSize}
            pct={cacheUsedPct}
            color="bg-blue-500"
          />
        </div>

        {/* Heap */}
        <div className="px-3 py-2 rounded bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Heap</p>
          </div>
          <UsageBar
            used={memory.heapUsed}
            total={memory.heapTotal}
            pct={heapUsedPct}
            color="bg-amber-500"
          />
        </div>
      </div>
    </div>
  );
}

function UsageBar({
  used,
  total,
  pct,
  color,
}: {
  used: number;
  total: number;
  pct: number;
  color: string;
}) {
  return (
    <>
      <div className="flex h-2 rounded-full overflow-hidden bg-zinc-800">
        <div
          className={`${color} opacity-70 transition-all`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[11px] text-zinc-500 font-mono tabular-nums">
          {formatBytes(used)} / {formatBytes(total)}
        </span>
        <span className="text-[11px] text-zinc-400 tabular-nums">{pct.toFixed(1)}%</span>
      </div>
    </>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
