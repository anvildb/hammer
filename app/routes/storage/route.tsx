import { useCallback, useEffect, useMemo, useState } from "react";
import { useConnection } from "~/lib/connection-context";
import type {
  StorageBucket,
  StorageBucketUsage,
  StorageFileObject,
  StorageUsageResponse,
} from "~/lib/api-client";
import { formatBytes } from "~/lib/api-client";
import { BucketList } from "~/components/storage/bucket-list";
import { FileBrowser } from "~/components/storage/file-browser";
import { UploadZone } from "~/components/storage/upload-zone";
import { ObjectDrawer } from "~/components/storage/object-drawer";
import { UsageDashboard } from "~/components/storage/usage-dashboard";

type Tab = "files" | "usage" | "settings";

/** Default TUS threshold mirrors the server's `upload_chunk_size` default. */
const TUS_THRESHOLD = 5 * 1024 * 1024;

/**
 * /storage — top-level file storage UI (Phase 25.15).
 *
 * Layout:
 *   - Left rail: bucket list with usage chips (BucketList).
 *   - Center: tabbed view — Files / Usage / Settings.
 *       · Files tab: breadcrumb-driven folder browser + DnD upload zone.
 *       · Usage tab: aggregate stats + per-bucket bar chart + top files.
 *       · Settings tab: bucket-level public/private toggle, size caps,
 *         signed-URL revoke, and a link into /policies for RLS.
 *   - Right drawer: when a file is selected, shows metadata, inline
 *     preview, signed-URL generator, and move/delete controls.
 *
 * All HTTP work goes through `useConnection().client` so the SDK's bearer
 * token + refresh-retry logic is inherited automatically.
 */
export default function StorageRoute() {
  const { client, status, isAdmin, userRoles } = useConnection();
  const canWrite = isAdmin || userRoles.includes("editor");

  const [buckets, setBuckets] = useState<StorageBucket[]>([]);
  const [usage, setUsage] = useState<StorageUsageResponse | null>(null);
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);
  const [files, setFiles] = useState<StorageFileObject[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [prefix, setPrefix] = useState("");
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [openFile, setOpenFile] = useState<StorageFileObject | null>(null);
  const [tab, setTab] = useState<Tab>("files");
  const [bucketError, setBucketError] = useState<string | null>(null);

  const usageByBucket = useMemo(() => {
    const map: Record<string, StorageBucketUsage> = {};
    if (usage) {
      for (const b of usage.buckets) map[b.bucket_id] = b;
    }
    return map;
  }, [usage]);

  const selectedBucket = useMemo(
    () => buckets.find((b) => b.id === selectedBucketId) ?? null,
    [buckets, selectedBucketId],
  );

  // -- Initial load ------------------------------------------------------

  const reloadBuckets = useCallback(async () => {
    if (status !== "connected") return;
    try {
      const list = await client.listBuckets();
      list.sort((a, b) => a.id.localeCompare(b.id));
      setBuckets(list);
      if (!selectedBucketId && list.length > 0) {
        setSelectedBucketId(list[0].id);
      }
    } catch (e) {
      setBucketError(String(e));
    }
  }, [client, selectedBucketId, status]);

  const reloadUsage = useCallback(async () => {
    if (status !== "connected") return;
    try {
      const u = await client.storageUsage();
      setUsage(u);
    } catch {
      // The endpoint is admin-gated; viewers will see no usage chips and
      // the dashboard tab will fail gracefully. Ignore here.
    }
  }, [client, status]);

  const reloadFiles = useCallback(
    async (bucket: string) => {
      setFilesLoading(true);
      setFilesError(null);
      try {
        // Pull a generous page so the folder tree has enough to derive
        // prefixes from. The server caps at 1000 per call which is
        // plenty for the demo workloads in this phase.
        const resp = await client.listObjects(bucket, { limit: 1000 });
        setFiles(resp.items);
      } catch (e) {
        setFilesError(String(e));
        setFiles([]);
      } finally {
        setFilesLoading(false);
      }
    },
    [client],
  );

  useEffect(() => {
    if (status !== "connected") return;
    void reloadBuckets();
    void reloadUsage();
  }, [reloadBuckets, reloadUsage, status]);

  useEffect(() => {
    if (!selectedBucketId) return;
    setPrefix("");
    setSelectedPaths(new Set());
    setOpenFile(null);
    void reloadFiles(selectedBucketId);
  }, [reloadFiles, selectedBucketId]);

  // -- Bucket actions ----------------------------------------------------

  const handleCreateBucket = useCallback(
    async (id: string, opts: { public: boolean; fileSizeLimit?: number }) => {
      await client.createBucket(id, {
        public: opts.public,
        file_size_limit: opts.fileSizeLimit,
      });
      await reloadBuckets();
      await reloadUsage();
      setSelectedBucketId(id);
    },
    [client, reloadBuckets, reloadUsage],
  );

  const handleDeleteBucket = useCallback(
    async (id: string) => {
      try {
        await client.deleteBucket(id);
        if (selectedBucketId === id) {
          setSelectedBucketId(null);
          setFiles([]);
        }
        await reloadBuckets();
        await reloadUsage();
      } catch (e) {
        setBucketError(String(e));
      }
    },
    [client, reloadBuckets, reloadUsage, selectedBucketId],
  );

  // -- File actions ------------------------------------------------------

  const handleDeleteFile = useCallback(
    async (path: string) => {
      if (!selectedBucketId) return;
      await client.deleteObject(selectedBucketId, path);
      setFiles((prev) => prev.filter((f) => f.path !== path));
      setSelectedPaths((prev) => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
      if (openFile?.path === path) setOpenFile(null);
      await reloadUsage();
    },
    [client, openFile, reloadUsage, selectedBucketId],
  );

  const handleToggleSelect = useCallback((path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedPaths(new Set(files.filter((f) => f.path.startsWith(prefix)).map((f) => f.path)));
  }, [files, prefix]);

  const handleClearSelection = useCallback(() => setSelectedPaths(new Set()), []);

  // -- Render guards ------------------------------------------------------

  if (status !== "connected") {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        Waiting for server connection...
      </div>
    );
  }

  return (
    <div className="flex h-full bg-zinc-950 text-zinc-100">
      <BucketList
        buckets={buckets}
        usageByBucket={usageByBucket}
        selected={selectedBucketId}
        onSelect={setSelectedBucketId}
        canWrite={canWrite}
        onCreate={handleCreateBucket}
        onDelete={handleDeleteBucket}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Tab bar */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-zinc-800">
          {([
            ["files", "Files"],
            ["usage", "Usage"],
            ["settings", "Settings"],
          ] as [Tab, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-3 py-1 text-xs font-medium rounded ${
                tab === id
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-200"
              }`}
            >
              {label}
            </button>
          ))}
          {bucketError && (
            <span className="ml-3 text-[11px] text-red-400 truncate">{bucketError}</span>
          )}
        </div>

        {/* Body */}
        {!selectedBucket ? (
          <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
            Select or create a bucket to get started.
          </div>
        ) : (
          <div className="flex flex-1 min-h-0">
            {/* Main pane */}
            <div className="flex-1 flex flex-col min-w-0">
              {tab === "files" && (
                <>
                  <FileBrowser
                    files={files}
                    loading={filesLoading}
                    prefix={prefix}
                    onChangePrefix={setPrefix}
                    selectedPaths={selectedPaths}
                    onToggleSelect={handleToggleSelect}
                    onSelectAll={handleSelectAll}
                    onClearSelection={handleClearSelection}
                    onOpenFile={setOpenFile}
                    onDelete={handleDeleteFile}
                    canWrite={canWrite}
                    onRefresh={() => selectedBucketId && reloadFiles(selectedBucketId)}
                  />
                  {filesError && (
                    <div className="mx-4 my-2 p-2 bg-red-900/30 border border-red-800 rounded text-red-300 text-xs">
                      {filesError}
                    </div>
                  )}
                  {canWrite && (
                    <UploadZone
                      client={client}
                      bucket={selectedBucket.id}
                      prefix={prefix}
                      tusThreshold={TUS_THRESHOLD}
                      upsert
                      onUploaded={async () => {
                        await reloadFiles(selectedBucket.id);
                        await reloadUsage();
                      }}
                    />
                  )}
                </>
              )}

              {tab === "usage" && (
                <UsageDashboard usage={usage} filesInBucket={files} />
              )}

              {tab === "settings" && (
                <BucketSettings
                  bucket={selectedBucket}
                  canWrite={canWrite}
                  onUpdate={async (patch) => {
                    await client.updateBucket(selectedBucket.id, patch);
                    await reloadBuckets();
                  }}
                  onEmpty={async () => {
                    if (!confirm(`Empty bucket "${selectedBucket.id}"? Every object will be deleted.`)) return;
                    await client.emptyBucket(selectedBucket.id);
                    await reloadFiles(selectedBucket.id);
                    await reloadUsage();
                  }}
                  onRevokeSignedUrls={async () => {
                    if (!confirm(`Revoke every existing signed URL for "${selectedBucket.id}"?`)) return;
                    await client.revokeBucketSignedUrls(selectedBucket.id);
                  }}
                />
              )}
            </div>

            {/* Right drawer */}
            {openFile && tab === "files" && (
              <ObjectDrawer
                client={client}
                bucket={selectedBucket.id}
                bucketPublic={selectedBucket.public}
                file={openFile}
                canWrite={canWrite}
                onClose={() => setOpenFile(null)}
                onDeleted={async () => {
                  await handleDeleteFile(openFile.path);
                  setOpenFile(null);
                }}
                onMoved={async (newPath) => {
                  await reloadFiles(selectedBucket.id);
                  const moved = files.find((f) => f.path === newPath);
                  setOpenFile(moved ?? null);
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bucket settings tab
// ---------------------------------------------------------------------------

function BucketSettings({
  bucket,
  canWrite,
  onUpdate,
  onEmpty,
  onRevokeSignedUrls,
}: {
  bucket: StorageBucket;
  canWrite: boolean;
  onUpdate: (patch: { public?: boolean; file_size_limit?: number | null; bucket_size_limit?: number | null; allowed_mime_types?: string[] }) => Promise<void>;
  onEmpty: () => Promise<void>;
  onRevokeSignedUrls: () => Promise<void>;
}) {
  const [pub, setPub] = useState(bucket.public);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function applyVisibility() {
    setBusy(true);
    setErr(null);
    try {
      await onUpdate({ public: pub });
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">Bucket: {bucket.id}</h2>
        <p className="text-xs text-zinc-500 mt-1">
          Owner: <span className="font-mono">{bucket.owner || "—"}</span> · Created{" "}
          {new Date(bucket.created_at).toLocaleString()}
        </p>
      </div>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Visibility
        </h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={pub}
            disabled={!canWrite}
            onChange={(e) => setPub(e.target.checked)}
            className="accent-blue-500"
          />
          Public — anonymous downloads via{" "}
          <code className="font-mono text-xs">/storage/v1/object/public/...</code>
        </label>
        {canWrite && (
          <button
            onClick={applyVisibility}
            disabled={busy || pub === bucket.public}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-xs font-medium rounded"
          >
            {busy ? "Saving..." : "Save"}
          </button>
        )}
        {err && <p className="text-xs text-red-400">{err}</p>}
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Limits
        </h3>
        <p className="text-sm text-zinc-400">
          File size limit:{" "}
          <span className="font-mono">
            {bucket.file_size_limit ? formatBytes(bucket.file_size_limit) : "no limit"}
          </span>
        </p>
        <p className="text-sm text-zinc-400">
          Bucket size limit:{" "}
          <span className="font-mono">
            {bucket.bucket_size_limit ? formatBytes(bucket.bucket_size_limit) : "no limit"}
          </span>
        </p>
        <p className="text-sm text-zinc-400">
          Allowed MIME types:{" "}
          <span className="font-mono">
            {bucket.allowed_mime_types.length === 0
              ? "any"
              : bucket.allowed_mime_types.join(", ")}
          </span>
        </p>
        <p className="text-[11px] text-zinc-600 italic">
          Edit limits in <code className="font-mono">anvil.toml</code> or via the API. UI editing is
          deferred to a follow-up phase.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Row-level security
        </h3>
        <p className="text-sm text-zinc-400">
          Storage RLS reuses the standard policy editor.
        </p>
        <a
          href="/policies"
          className="inline-block px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs font-medium rounded"
        >
          Open Policies →
        </a>
      </section>

      {canWrite && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Destructive actions
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onRevokeSignedUrls}
              className="px-3 py-1 bg-amber-900/40 hover:bg-amber-900/60 text-amber-300 text-xs font-medium rounded border border-amber-800"
            >
              Revoke signed URLs
            </button>
            <button
              onClick={onEmpty}
              className="px-3 py-1 bg-red-900/40 hover:bg-red-900/60 text-red-300 text-xs font-medium rounded border border-red-800"
            >
              Empty bucket
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
