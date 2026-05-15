import { useMemo, useState } from "react";
import type { StorageFileObject } from "~/lib/api-client";
import { formatBytes } from "~/lib/api-client";

/**
 * "Virtual" folder derived from a path prefix. The server stores objects
 * with flat paths like `users/alice/photo.png` — the UI splits on `/` to
 * fabricate a folder tree on top.
 */
type FolderNode = {
  name: string;
  // Children are either files (leaf) or folders (more nodes).
  files: StorageFileObject[];
  folders: Record<string, FolderNode>;
};

type SortBy = "name" | "size" | "updated";

interface Props {
  files: StorageFileObject[];
  loading: boolean;
  /** Current path prefix (e.g. `"users/alice/"`); `""` for root. */
  prefix: string;
  onChangePrefix: (prefix: string) => void;
  selectedPaths: Set<string>;
  onToggleSelect: (path: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onOpenFile: (file: StorageFileObject) => void;
  onDelete: (path: string) => Promise<void>;
  canWrite: boolean;
  onRefresh: () => void;
}

/**
 * Bucket browser. Computes a virtual folder tree from path prefixes, supports
 * fuzzy filename search, three-column sort (name / size / updated), and
 * row-level checkbox selection for bulk operations. The breadcrumb at the
 * top doubles as a navigation control — clicking a segment scopes the
 * listing to that folder.
 */
export function FileBrowser({
  files,
  loading,
  prefix,
  onChangePrefix,
  selectedPaths,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onOpenFile,
  onDelete,
  canWrite,
  onRefresh,
}: Props) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Derive folder structure scoped to the current prefix.
  const view = useMemo(() => {
    const folders = new Map<string, number>(); // folder name -> file count
    const visibleFiles: StorageFileObject[] = [];
    const lowered = search.toLowerCase();

    for (const f of files) {
      if (!f.path.startsWith(prefix)) continue;
      const remainder = f.path.slice(prefix.length);
      if (remainder.includes("/")) {
        const folder = remainder.split("/", 1)[0];
        folders.set(folder, (folders.get(folder) ?? 0) + 1);
        continue;
      }
      // Leaf at the current level.
      if (lowered && !remainder.toLowerCase().includes(lowered)) continue;
      visibleFiles.push(f);
    }

    const sorted = [...visibleFiles].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") cmp = a.path.localeCompare(b.path);
      else if (sortBy === "size") cmp = a.size - b.size;
      else cmp = a.updated_at - b.updated_at;
      return sortDir === "asc" ? cmp : -cmp;
    });

    return {
      folders: [...folders.entries()].sort((a, b) => a[0].localeCompare(b[0])),
      files: sorted,
    };
  }, [files, prefix, search, sortBy, sortDir]);

  const crumbs = prefix === "" ? [] : prefix.replace(/\/$/, "").split("/");

  function clickColumn(col: SortBy) {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Breadcrumb + toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800 flex-wrap">
        <button
          onClick={() => onChangePrefix("")}
          className={`text-xs font-mono px-1.5 py-0.5 rounded ${
            prefix === ""
              ? "bg-zinc-800 text-zinc-200"
              : "text-zinc-500 hover:text-zinc-200"
          }`}
        >
          /
        </button>
        {crumbs.map((c, i) => {
          const target = `${crumbs.slice(0, i + 1).join("/")}/`;
          return (
            <span key={target} className="flex items-center gap-1 text-xs text-zinc-500">
              <span>›</span>
              <button
                onClick={() => onChangePrefix(target)}
                className="font-mono px-1 py-0.5 rounded hover:text-zinc-200"
              >
                {c}
              </button>
            </span>
          );
        })}
        <div className="ml-auto flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-40 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={onRefresh}
            disabled={loading}
            className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-zinc-200 text-xs font-medium rounded"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Selection / bulk-actions strip */}
      {selectedPaths.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-1.5 bg-zinc-900/60 border-b border-zinc-800 text-xs text-zinc-300">
          <span>{selectedPaths.size} selected</span>
          {canWrite && (
            <button
              onClick={async () => {
                if (!confirm(`Delete ${selectedPaths.size} object(s)?`)) return;
                for (const p of selectedPaths) {
                  // eslint-disable-next-line no-await-in-loop
                  await onDelete(p);
                }
                onClearSelection();
              }}
              className="text-red-400 hover:text-red-300"
            >
              Delete
            </button>
          )}
          <button onClick={onClearSelection} className="text-zinc-500 hover:text-zinc-200">
            Clear
          </button>
        </div>
      )}

      {/* Column headers */}
      <div className="flex items-center gap-2 px-4 py-1.5 border-b border-zinc-800 text-[11px] text-zinc-500 uppercase tracking-wider">
        {canWrite && (
          <input
            type="checkbox"
            checked={view.files.length > 0 && view.files.every((f) => selectedPaths.has(f.path))}
            onChange={() => {
              if (view.files.every((f) => selectedPaths.has(f.path))) {
                onClearSelection();
              } else {
                onSelectAll();
              }
            }}
            className="accent-blue-500"
          />
        )}
        <button
          onClick={() => clickColumn("name")}
          className="flex-1 text-left hover:text-zinc-200 flex items-center gap-1"
        >
          Name {sortBy === "name" && (sortDir === "asc" ? "▲" : "▼")}
        </button>
        <button
          onClick={() => clickColumn("size")}
          className="w-20 text-right hover:text-zinc-200"
        >
          Size {sortBy === "size" && (sortDir === "asc" ? "▲" : "▼")}
        </button>
        <button
          onClick={() => clickColumn("updated")}
          className="w-40 text-right hover:text-zinc-200"
        >
          Modified {sortBy === "updated" && (sortDir === "asc" ? "▲" : "▼")}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {view.folders.map(([name, count]) => (
          <button
            key={`fold-${name}`}
            onClick={() => onChangePrefix(`${prefix}${name}/`)}
            className="w-full flex items-center gap-2 px-4 py-1.5 text-sm text-zinc-300 hover:bg-zinc-900/50 border-b border-zinc-800/40"
          >
            <span className="w-4">▸</span>
            <span className="flex-1 text-left font-mono text-xs">{name}/</span>
            <span className="text-[11px] text-zinc-500">{count} item(s)</span>
          </button>
        ))}

        {!loading && view.folders.length === 0 && view.files.length === 0 && (
          <p className="px-4 py-6 text-xs text-zinc-600 text-center">
            {search ? "No matches." : "Empty folder."}
          </p>
        )}

        {view.files.map((f) => {
          const isSelected = selectedPaths.has(f.path);
          const basename = f.path.slice(prefix.length);
          return (
            <div
              key={f.path}
              className={`group flex items-center gap-2 px-4 py-1.5 border-b border-zinc-800/40 cursor-pointer transition-colors ${
                isSelected ? "bg-blue-900/20" : "hover:bg-zinc-900/50"
              }`}
              onClick={() => onOpenFile(f)}
            >
              {canWrite && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect(f.path)}
                  onClick={(e) => e.stopPropagation()}
                  className="accent-blue-500"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono text-zinc-200 truncate">{basename}</div>
                <div className="text-[10px] text-zinc-600 truncate">{f.mime_type}</div>
              </div>
              <span className="w-20 text-right text-[11px] text-zinc-400">
                {formatBytes(f.size)}
              </span>
              <span className="w-40 text-right text-[11px] text-zinc-500">
                {new Date(f.updated_at).toLocaleString()}
              </span>
            </div>
          );
        })}

        {loading && (
          <p className="px-4 py-4 text-xs text-zinc-500 text-center">Loading...</p>
        )}
      </div>
    </div>
  );
}
