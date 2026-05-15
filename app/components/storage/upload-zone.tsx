import { useCallback, useRef, useState } from "react";
import type { ApiClient } from "~/lib/api-client";
import { formatBytes } from "~/lib/api-client";

interface QueueItem {
  id: string;
  file: File;
  path: string;
  status: "queued" | "uploading" | "done" | "error";
  loaded: number;
  error?: string;
  /** Whether TUS was used. */
  resumable: boolean;
}

interface Props {
  client: ApiClient;
  bucket: string;
  /** Path prefix to upload into (e.g. `"users/alice/"`). May be empty. */
  prefix: string;
  /** Size in bytes above which TUS is used instead of single-shot. */
  tusThreshold: number;
  upsert: boolean;
  onUploaded: () => void;
}

let _qid = 0;

/**
 * Drag-and-drop upload zone with a visible queue and per-file progress bars.
 *
 * For each dropped file:
 *   - If `file.size <= tusThreshold` -> single-shot `POST/PUT` (one fetch).
 *   - Otherwise -> TUS 1.0.0 resumable PATCH loop.
 *
 * The chunk size for TUS defaults to 5 MiB on the server, but we don't need
 * to mirror it here — the client's TUS implementation already uses the
 * server-side max (`Tus-Max-Size`) implicitly via the PATCH loop.
 */
export function UploadZone({
  client,
  bucket,
  prefix,
  tusThreshold,
  upsert,
  onUploaded,
}: Props) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const updateItem = useCallback((id: string, patch: Partial<QueueItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const startUpload = useCallback(
    async (item: QueueItem) => {
      updateItem(item.id, { status: "uploading", loaded: 0 });
      try {
        const useTus = item.file.size > tusThreshold;
        if (useTus) {
          await client.uploadObjectResumable(bucket, item.path, item.file, {
            onProgress: (loaded) => updateItem(item.id, { loaded }),
          });
        } else {
          await client.uploadObject(bucket, item.path, item.file, {
            upsert,
            onProgress: (loaded) => updateItem(item.id, { loaded }),
          });
        }
        updateItem(item.id, { status: "done", loaded: item.file.size });
        onUploaded();
      } catch (e) {
        updateItem(item.id, { status: "error", error: String(e) });
      }
    },
    [bucket, client, onUploaded, tusThreshold, updateItem, upsert],
  );

  const enqueue = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files);
      const newItems: QueueItem[] = list.map((file) => ({
        id: `q-${++_qid}`,
        file,
        path: `${prefix}${file.name}`,
        status: "queued",
        loaded: 0,
        resumable: file.size > tusThreshold,
      }));
      setItems((prev) => [...prev, ...newItems]);
      // Kick off each upload concurrently. The browser caps total
      // connections so this self-throttles for very large drops.
      for (const it of newItems) {
        void startUpload(it);
      }
    },
    [prefix, startUpload, tusThreshold],
  );

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      enqueue(e.dataTransfer.files);
    }
  }

  return (
    <div className="border-t border-zinc-800">
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`mx-4 my-3 rounded border-2 border-dashed cursor-pointer transition-colors text-center py-4 ${
          dragOver
            ? "border-blue-500 bg-blue-900/10 text-blue-200"
            : "border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"
        }`}
      >
        <p className="text-sm">Drop files here, or click to choose.</p>
        <p className="text-[11px] mt-1 text-zinc-600">
          Files larger than {formatBytes(tusThreshold)} use TUS resumable upload.
        </p>
        <input
          type="file"
          multiple
          ref={inputRef}
          onChange={(e) => {
            if (e.target.files) enqueue(e.target.files);
            e.currentTarget.value = "";
          }}
          className="hidden"
        />
      </div>

      {items.length > 0 && (
        <div className="px-4 pb-3 max-h-48 overflow-y-auto">
          {items.map((it) => {
            const pct = it.file.size === 0 ? 100 : Math.round((it.loaded / it.file.size) * 100);
            return (
              <div key={it.id} className="mb-2 last:mb-0">
                <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-0.5">
                  <span className="font-mono truncate flex-1 min-w-0">{it.path}</span>
                  <span className="ml-2 flex-shrink-0">
                    {it.status === "done" && "✓"}
                    {it.status === "error" && "✗"}
                    {it.status === "uploading" && `${pct}%`}
                    {it.status === "queued" && "queued"}
                    {it.resumable && it.status === "uploading" && " (TUS)"}
                  </span>
                </div>
                {it.status !== "error" && (
                  <div className="h-1 bg-zinc-800 rounded overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        it.status === "done" ? "bg-emerald-500" : "bg-blue-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
                {it.error && (
                  <p className="text-[10px] text-red-400 truncate" title={it.error}>
                    {it.error}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
