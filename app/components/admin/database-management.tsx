import { useState } from "react";
import type { DatabaseInfo, DatabaseStatus } from "./types";

interface DatabaseManagementProps {
  databases: DatabaseInfo[];
  onCreateDatabase: (name: string) => void;
  onStartDatabase: (name: string) => void;
  onStopDatabase: (name: string) => void;
  onDropDatabase: (name: string) => void;
}

export function DatabaseManagement({
  databases,
  onCreateDatabase,
  onStartDatabase,
  onStopDatabase,
  onDropDatabase,
}: DatabaseManagementProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    onCreateDatabase(newName.trim());
    setNewName("");
    setShowCreate(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
          Databases
          <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 font-normal tabular-nums">
            {databases.length}
          </span>
        </h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
        >
          {showCreate ? "Cancel" : "+ Create"}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="p-3 border-b border-zinc-700 bg-zinc-900/50 flex items-end gap-2">
          <div className="flex-1">
            <label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-0.5">
              Database name
            </label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="mydb"
              className="w-full bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700 focus:outline-none focus:border-zinc-500"
            />
          </div>
          <button
            type="submit"
            className="text-xs px-3 py-1 rounded bg-zinc-700 text-zinc-200 hover:bg-zinc-600"
          >
            Create
          </button>
        </form>
      )}

      <div className="divide-y divide-zinc-800/50">
        {databases.map((db) => (
          <div key={db.name} className="px-3 py-2 hover:bg-zinc-800/20">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-200">{db.name}</span>
              {db.isDefault && (
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                  default
                </span>
              )}
              <DbStatusBadge status={db.status} />
              <span className="text-[11px] text-zinc-600 ml-auto tabular-nums">
                {formatBytes(db.sizeBytes)}
              </span>
            </div>

            <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-500 tabular-nums">
              <span>{db.nodeCount.toLocaleString()} nodes</span>
              <span>{db.relationshipCount.toLocaleString()} rels</span>
            </div>

            <div className="flex gap-2 mt-1.5">
              {db.status === "offline" && (
                <button
                  onClick={() => onStartDatabase(db.name)}
                  className="text-[11px] text-green-500/70 hover:text-green-400"
                >
                  start
                </button>
              )}
              {db.status === "online" && !db.isDefault && (
                <button
                  onClick={() => onStopDatabase(db.name)}
                  className="text-[11px] text-amber-500/70 hover:text-amber-400"
                >
                  stop
                </button>
              )}
              {!db.isDefault && (
                <button
                  onClick={() => onDropDatabase(db.name)}
                  className="text-[11px] text-red-500/60 hover:text-red-400"
                >
                  drop
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DbStatusBadge({ status }: { status: DatabaseStatus }) {
  const styles: Record<DatabaseStatus, string> = {
    online: "bg-green-900/30 text-green-400",
    offline: "bg-zinc-800 text-zinc-500",
    starting: "bg-blue-900/30 text-blue-400",
    stopping: "bg-amber-900/30 text-amber-400",
    error: "bg-red-900/30 text-red-400",
  };
  return (
    <span className={`text-[11px] px-1.5 py-0.5 rounded ${styles[status]}`}>
      {status}
    </span>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
