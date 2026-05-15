import type { StorageFileObject, StorageUsageResponse } from "~/lib/api-client";
import { formatBytes } from "~/lib/api-client";

interface Props {
  usage: StorageUsageResponse | null;
  /** Files for the currently selected bucket — used to compute top-N. */
  filesInBucket: StorageFileObject[];
}

/**
 * Aggregate usage view: a header summary, per-bucket bar chart (scaled to
 * the largest bucket), per-user leaderboard, and a top-N largest-files
 * panel scoped to the active bucket.
 */
export function UsageDashboard({ usage, filesInBucket }: Props) {
  if (!usage) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
        Loading usage stats...
      </div>
    );
  }

  const maxBucketBytes = Math.max(1, ...usage.buckets.map((b) => b.total_bytes));
  const maxUserBytes = Math.max(1, ...usage.users.map((u) => u.total_bytes));
  const topFiles = [...filesInBucket]
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">Storage usage</h2>
        <p className="text-sm text-zinc-400 mt-1">
          {usage.object_count.toLocaleString()} object(s) · {formatBytes(usage.total_bytes)} stored
          {usage.max_total_storage
            ? ` of ${formatBytes(usage.max_total_storage)} cap`
            : ""}
        </p>
        {usage.max_total_storage && usage.max_total_storage > 0 && (
          <div className="mt-2 h-2 bg-zinc-800 rounded overflow-hidden">
            <div
              className="h-full bg-blue-500"
              style={{
                width: `${Math.min(100, (usage.total_bytes / usage.max_total_storage) * 100)}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* Per-bucket bar chart */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
          Per bucket
        </h3>
        {usage.buckets.length === 0 && (
          <p className="text-sm text-zinc-500 italic">No buckets.</p>
        )}
        <div className="space-y-1.5">
          {usage.buckets
            .slice()
            .sort((a, b) => b.total_bytes - a.total_bytes)
            .map((b) => (
              <div key={b.bucket_id}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-zinc-300">{b.bucket_id}</span>
                  <span className="text-zinc-400">
                    {formatBytes(b.total_bytes)} · {b.object_count} file(s)
                  </span>
                </div>
                <div className="h-2 bg-zinc-800 rounded overflow-hidden mt-0.5">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${(b.total_bytes / maxBucketBytes) * 100}%` }}
                  />
                </div>
                {b.bucket_size_limit && (
                  <p className="text-[10px] text-zinc-600 mt-0.5">
                    cap: {formatBytes(b.bucket_size_limit)}
                  </p>
                )}
              </div>
            ))}
        </div>
      </section>

      {/* Per-user leaderboard */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
          Top owners
        </h3>
        {usage.users.length === 0 ? (
          <p className="text-sm text-zinc-500 italic">No tracked owners.</p>
        ) : (
          <div className="space-y-1.5">
            {usage.users.slice(0, 10).map((u) => (
              <div key={u.owner}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-zinc-300">{u.owner}</span>
                  <span className="text-zinc-400">
                    {formatBytes(u.total_bytes)} · {u.object_count} file(s)
                  </span>
                </div>
                <div className="h-2 bg-zinc-800 rounded overflow-hidden mt-0.5">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${(u.total_bytes / maxUserBytes) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Top-N largest files (scoped to selected bucket) */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
          Largest files (current bucket)
        </h3>
        {topFiles.length === 0 ? (
          <p className="text-sm text-zinc-500 italic">No files in this bucket.</p>
        ) : (
          <div className="border border-zinc-800 rounded overflow-hidden">
            {topFiles.map((f, i) => (
              <div
                key={f.path}
                className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs border-b border-zinc-800/60 last:border-b-0"
              >
                <span className="text-zinc-500 w-6">{i + 1}.</span>
                <span className="flex-1 font-mono text-zinc-300 truncate">{f.path}</span>
                <span className="text-zinc-400 w-20 text-right">{formatBytes(f.size)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
