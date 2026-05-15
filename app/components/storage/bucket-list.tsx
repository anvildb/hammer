import { useState } from "react";
import type { StorageBucket, StorageBucketUsage } from "~/lib/api-client";
import { formatBytes, parseSizeHint } from "~/lib/api-client";

interface Props {
  buckets: StorageBucket[];
  usageByBucket: Record<string, StorageBucketUsage>;
  selected: string | null;
  onSelect: (id: string) => void;
  canWrite: boolean;
  onCreate: (id: string, opts: { public: boolean; fileSizeLimit?: number }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

/**
 * Left-rail bucket browser. Each row shows the bucket id, a visibility chip
 * (Public / Private), an object count, and the bucket's total size — pulled
 * from the global usage report so we don't issue one request per bucket.
 *
 * The create form lives at the top, gated on `canWrite`. The size hint
 * accepts the same suffixes as the server config (`5MB`, `1GiB`, bare bytes).
 */
export function BucketList({
  buckets,
  usageByBucket,
  selected,
  onSelect,
  canWrite,
  onCreate,
  onDelete,
}: Props) {
  const [newId, setNewId] = useState("");
  const [newPublic, setNewPublic] = useState(false);
  const [newMaxSize, setNewMaxSize] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!newId.trim()) return;
    setError(null);
    let fileSizeLimit: number | undefined;
    if (newMaxSize.trim()) {
      const parsed = parseSizeHint(newMaxSize.trim());
      if (parsed === null) {
        setError(`Cannot parse size "${newMaxSize}". Try "5MB", "1GiB", or a byte count.`);
        return;
      }
      fileSizeLimit = parsed;
    }
    setCreating(true);
    try {
      await onCreate(newId.trim(), { public: newPublic, fileSizeLimit });
      setNewId("");
      setNewPublic(false);
      setNewMaxSize("");
    } catch (e) {
      setError(String(e));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="w-64 flex-shrink-0 border-r border-zinc-800 flex flex-col">
      <div className="p-3 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-300 mb-2">Buckets</h2>
        {canWrite ? (
          <>
            <input
              type="text"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
              placeholder="bucket id..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
            />
            <div className="flex gap-2 mt-1.5 items-center">
              <label className="flex items-center gap-1 text-xs text-zinc-400">
                <input
                  type="checkbox"
                  checked={newPublic}
                  onChange={(e) => setNewPublic(e.target.checked)}
                  className="accent-blue-500"
                />
                Public
              </label>
              <input
                type="text"
                value={newMaxSize}
                onChange={(e) => setNewMaxSize(e.target.value)}
                placeholder="max-size (5MB)"
                className="flex-1 min-w-0 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[11px] text-zinc-100 focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={!newId.trim() || creating}
              className="mt-1.5 w-full px-2 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-xs font-medium rounded transition-colors"
            >
              {creating ? "Creating..." : "Create bucket"}
            </button>
            {error && <p className="mt-1.5 text-xs text-red-400 break-words">{error}</p>}
          </>
        ) : (
          <p className="text-xs text-zinc-600">Read-only access</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {buckets.length === 0 && (
          <p className="px-3 py-4 text-xs text-zinc-600 text-center">No buckets yet.</p>
        )}
        {buckets.map((b) => {
          const usage = usageByBucket[b.id];
          const isActive = selected === b.id;
          return (
            <div
              key={b.id}
              onClick={() => onSelect(b.id)}
              className={`group flex flex-col gap-1 px-3 py-2 text-sm cursor-pointer border-l-2 transition-colors ${
                isActive
                  ? "bg-zinc-800 text-zinc-100 border-blue-500"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border-transparent"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs truncate">{b.id}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    b.public
                      ? "bg-emerald-900/40 text-emerald-300 border border-emerald-800"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                  }`}
                >
                  {b.public ? "Public" : "Private"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[10px] text-zinc-500">
                <span>{usage?.object_count ?? 0} files</span>
                <span>{formatBytes(usage?.total_bytes ?? 0)}</span>
                {canWrite && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete bucket "${b.id}"? It must be empty.`)) {
                        onDelete(b.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition-opacity"
                    title="Delete bucket"
                  >
                    Del
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
