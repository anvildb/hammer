import { useEffect, useState } from "react";
import type {
  ApiClient,
  ImageTransform,
  StorageFileObject,
} from "~/lib/api-client";
import { formatBytes } from "~/lib/api-client";

interface Props {
  client: ApiClient;
  bucket: string;
  bucketPublic: boolean;
  file: StorageFileObject;
  onClose: () => void;
  onDeleted: () => void;
  onMoved: (newPath: string) => void;
  canWrite: boolean;
}

/**
 * Right-side drawer with metadata, an inline preview, and a signed-URL
 * generator. Inline previews are MIME-driven:
 *   - `image/*` -> `<img>` with optional transform controls (width / format)
 *   - `video/*` -> `<video controls>`
 *   - `audio/*` -> `<audio controls>`
 *   - `application/pdf` -> `<embed>`
 *   - `text/*`, `application/json` -> fetched and rendered in a `<pre>`
 *
 * The component requests bytes through the authenticated `downloadObject`
 * API so RLS is respected — preview URLs are object-URLs created in-memory
 * (`URL.createObjectURL`) so the bearer token never leaks into the DOM.
 */
export function ObjectDrawer({
  client,
  bucket,
  bucketPublic,
  file,
  onClose,
  onDeleted,
  onMoved,
  canWrite,
}: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [ttl, setTtl] = useState(3600);
  const [transform, setTransform] = useState<ImageTransform>({});
  const [moveTarget, setMoveTarget] = useState(file.path);
  const [moveError, setMoveError] = useState<string | null>(null);

  const isImage = file.mime_type.startsWith("image/");
  const isVideo = file.mime_type.startsWith("video/");
  const isAudio = file.mime_type.startsWith("audio/");
  const isPdf = file.mime_type === "application/pdf";
  const isText =
    file.mime_type.startsWith("text/") ||
    file.mime_type === "application/json" ||
    file.mime_type === "application/javascript";

  // Load a preview when the file (or transform) changes. Object URLs are
  // revoked on cleanup so we don't leak Blob memory.
  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;
    setPreviewError(null);
    setPreviewText(null);
    setPreviewUrl(null);

    async function load() {
      try {
        if (isText) {
          const blob = await client.downloadObject(bucket, file.path);
          if (cancelled) return;
          const text = await blob.text();
          if (!cancelled) {
            // Trim very long bodies to keep the DOM responsive.
            const TRIM = 100_000;
            setPreviewText(
              text.length > TRIM
                ? `${text.slice(0, TRIM)}\n…(${text.length - TRIM} more bytes)`
                : text,
            );
          }
          return;
        }
        if (isImage && bucketPublic && hasTransform(transform)) {
          // Use the server's render endpoint directly so we don't have to
          // re-download the source image just to transform it.
          if (!cancelled) {
            setPreviewUrl(
              client.publicObjectUrl(bucket, file.path, { transform }),
            );
          }
          return;
        }
        if (isImage || isVideo || isAudio || isPdf) {
          const blob = await client.downloadObject(bucket, file.path);
          if (cancelled) return;
          createdUrl = URL.createObjectURL(blob);
          if (!cancelled) setPreviewUrl(createdUrl);
        }
      } catch (e) {
        if (!cancelled) setPreviewError(String(e));
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [bucket, bucketPublic, client, file.path, isAudio, isImage, isPdf, isText, isVideo, transform]);

  async function handleSign() {
    setSigning(true);
    setSignedUrl(null);
    try {
      const result = await client.createSignedUrl(bucket, file.path, ttl);
      setSignedUrl(result.absoluteUrl);
    } catch (e) {
      setSignedUrl(`Error: ${e}`);
    } finally {
      setSigning(false);
    }
  }

  async function handleCopyUrl() {
    if (!signedUrl) return;
    try {
      await navigator.clipboard.writeText(signedUrl);
    } catch {
      // Clipboard API may be unavailable in some contexts; silently ignore.
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete ${file.path}?`)) return;
    await client.deleteObject(bucket, file.path);
    onDeleted();
  }

  async function handleMove() {
    if (moveTarget === file.path) return;
    setMoveError(null);
    try {
      await client.moveObject(bucket, file.path, bucket, moveTarget);
      onMoved(moveTarget);
    } catch (e) {
      setMoveError(String(e));
    }
  }

  return (
    <div className="w-96 flex-shrink-0 border-l border-zinc-800 flex flex-col bg-zinc-950 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800">
        <span className="text-sm font-mono text-zinc-200 truncate flex-1">{file.path}</span>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-200 text-lg leading-none"
          title="Close"
        >
          ×
        </button>
      </div>

      {/* Metadata */}
      <section className="px-4 py-3 border-b border-zinc-800 text-xs">
        <MetaRow label="Size" value={formatBytes(file.size)} />
        <MetaRow label="MIME" value={file.mime_type} />
        <MetaRow label="ETag" value={file.etag} mono />
        <MetaRow label="Hash" value={file.content_hash} mono trunc />
        <MetaRow label="Created" value={new Date(file.created_at).toLocaleString()} />
        <MetaRow label="Updated" value={new Date(file.updated_at).toLocaleString()} />
      </section>

      {/* Preview */}
      <section className="px-4 py-3 border-b border-zinc-800">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
          Preview
        </h3>
        {previewError && (
          <p className="text-xs text-red-400 break-words">{previewError}</p>
        )}
        {isImage && (
          <TransformControls transform={transform} onChange={setTransform} />
        )}
        {previewUrl && isImage && (
          <img
            src={previewUrl}
            alt={file.path}
            className="max-w-full max-h-72 mx-auto rounded"
          />
        )}
        {previewUrl && isVideo && (
          <video src={previewUrl} controls className="max-w-full max-h-72 mx-auto rounded" />
        )}
        {previewUrl && isAudio && <audio src={previewUrl} controls className="w-full" />}
        {previewUrl && isPdf && (
          <embed src={previewUrl} type="application/pdf" className="w-full h-72 rounded" />
        )}
        {previewText !== null && (
          <pre className="text-[11px] font-mono text-zinc-300 whitespace-pre-wrap break-words bg-zinc-900 rounded p-2 max-h-64 overflow-auto">
            {previewText}
          </pre>
        )}
        {!isImage && !isVideo && !isAudio && !isPdf && !isText && !previewError && (
          <p className="text-xs text-zinc-500 italic">No inline preview for this type.</p>
        )}
      </section>

      {/* Signed URL */}
      <section className="px-4 py-3 border-b border-zinc-800">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
          Signed URL
        </h3>
        <label className="block text-[11px] text-zinc-500 mb-1">
          TTL (seconds)
        </label>
        <input
          type="number"
          value={ttl}
          min={1}
          onChange={(e) => setTtl(Number.parseInt(e.target.value, 10) || 0)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleSign}
          disabled={signing}
          className="mt-2 w-full px-2 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 text-white text-xs font-medium rounded transition-colors"
        >
          {signing ? "Signing..." : "Generate"}
        </button>
        {signedUrl && (
          <div className="mt-2 flex items-start gap-1">
            <code className="flex-1 min-w-0 break-all text-[10px] bg-zinc-900 rounded p-1.5 text-zinc-300">
              {signedUrl}
            </code>
            <button
              onClick={handleCopyUrl}
              className="px-1.5 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-[10px] rounded"
              title="Copy"
            >
              Copy
            </button>
          </div>
        )}
      </section>

      {/* Move / delete */}
      {canWrite && (
        <section className="px-4 py-3 border-b border-zinc-800">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
            Actions
          </h3>
          <label className="block text-[11px] text-zinc-500 mb-1">Move to</label>
          <div className="flex gap-1">
            <input
              type="text"
              value={moveTarget}
              onChange={(e) => setMoveTarget(e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-100 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleMove}
              disabled={moveTarget === file.path}
              className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-zinc-200 text-xs rounded"
            >
              Move
            </button>
          </div>
          {moveError && <p className="mt-1 text-[11px] text-red-400">{moveError}</p>}
          <button
            onClick={handleDelete}
            className="mt-3 w-full px-2 py-1 bg-red-900/40 hover:bg-red-900/60 text-red-300 text-xs font-medium rounded border border-red-800"
          >
            Delete object
          </button>
        </section>
      )}

      {/* RLS / relationships placeholder */}
      <section className="px-4 py-3 text-[11px] text-zinc-500">
        <h3 className="font-semibold uppercase tracking-wider mb-1">RLS trace</h3>
        <p>
          Run <code className="font-mono text-zinc-400">MATCH (o:`storage.Object`)</code> in the
          Cypher console for related-node introspection.
        </p>
      </section>
    </div>
  );
}

function hasTransform(t: ImageTransform): boolean {
  return Boolean(t.width || t.height || t.format || t.quality || t.resize);
}

function MetaRow({
  label,
  value,
  mono,
  trunc,
}: {
  label: string;
  value: string;
  mono?: boolean;
  trunc?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-zinc-500">{label}</span>
      <span
        className={`text-zinc-300 text-right ${mono ? "font-mono" : ""} ${
          trunc ? "truncate max-w-[14rem]" : ""
        }`}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

function TransformControls({
  transform,
  onChange,
}: {
  transform: ImageTransform;
  onChange: (t: ImageTransform) => void;
}) {
  return (
    <div className="mb-2 grid grid-cols-2 gap-1 text-[11px]">
      <label className="text-zinc-500">
        Width
        <input
          type="number"
          value={transform.width ?? ""}
          onChange={(e) =>
            onChange({
              ...transform,
              width: e.target.value ? Number.parseInt(e.target.value, 10) : undefined,
            })
          }
          placeholder="auto"
          className="w-full bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-zinc-100"
        />
      </label>
      <label className="text-zinc-500">
        Height
        <input
          type="number"
          value={transform.height ?? ""}
          onChange={(e) =>
            onChange({
              ...transform,
              height: e.target.value ? Number.parseInt(e.target.value, 10) : undefined,
            })
          }
          placeholder="auto"
          className="w-full bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-zinc-100"
        />
      </label>
      <label className="text-zinc-500">
        Resize
        <select
          value={transform.resize ?? ""}
          onChange={(e) =>
            onChange({
              ...transform,
              resize: (e.target.value || undefined) as ImageTransform["resize"],
            })
          }
          className="w-full bg-zinc-900 border border-zinc-700 rounded px-1 py-1 text-zinc-100"
        >
          <option value="">—</option>
          <option value="cover">cover</option>
          <option value="contain">contain</option>
          <option value="fill">fill</option>
        </select>
      </label>
      <label className="text-zinc-500">
        Format
        <select
          value={transform.format ?? ""}
          onChange={(e) =>
            onChange({
              ...transform,
              format: (e.target.value || undefined) as ImageTransform["format"],
            })
          }
          className="w-full bg-zinc-900 border border-zinc-700 rounded px-1 py-1 text-zinc-100"
        >
          <option value="">—</option>
          <option value="webp">webp</option>
          <option value="jpeg">jpeg</option>
          <option value="png">png</option>
          <option value="avif">avif</option>
        </select>
      </label>
    </div>
  );
}
