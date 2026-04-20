import { useState } from "react";
import type { IndexInfo, IndexStatus } from "./types";

interface IndexesPanelProps {
  indexes: IndexInfo[];
  onCreateIndex?: (def: CreateIndexDef) => void;
  onDropIndex?: (name: string) => void;
}

export interface CreateIndexDef {
  name: string;
  type: IndexInfo["type"];
  entityType: "node" | "relationship";
  labelsOrTypes: string[];
  properties: string[];
}

export function IndexesPanel({ indexes, onCreateIndex, onDropIndex }: IndexesPanelProps) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="p-3">
      {/* Header with create button */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] text-zinc-500 uppercase tracking-wider">
          {indexes.length} index{indexes.length !== 1 ? "es" : ""}
        </p>
        {onCreateIndex && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
          >
            {showCreate ? "Cancel" : "+ Create"}
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && onCreateIndex && (
        <CreateIndexForm
          onSubmit={(def) => {
            onCreateIndex(def);
            setShowCreate(false);
          }}
        />
      )}

      {/* Index list */}
      {indexes.length === 0 && !showCreate && (
        <p className="py-6 text-xs text-zinc-600 text-center">No indexes</p>
      )}
      <div className="space-y-1">
        {indexes.map((idx) => (
          <div
            key={idx.name}
            className="px-3 py-2 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-200">{idx.name}</span>
              <StatusBadge status={idx.status} />
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                {idx.type}
              </span>
              <span className="text-[11px] text-zinc-600">{idx.entityType}</span>
              {onDropIndex && (
                <button
                  onClick={() => onDropIndex(idx.name)}
                  className="ml-auto text-[11px] text-red-500/60 hover:text-red-400"
                >
                  drop
                </button>
              )}
            </div>
            <div className="mt-1 text-[11px] text-zinc-500 font-mono">
              {idx.labelsOrTypes.map((l) => ":" + l).join(", ")}
              {" ("}
              {idx.properties.join(", ")}
              {")"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: IndexStatus }) {
  const styles: Record<IndexStatus, string> = {
    online: "bg-green-900/30 text-green-400",
    populating: "bg-amber-900/30 text-amber-400",
    failed: "bg-red-900/30 text-red-400",
  };
  return (
    <span className={`text-[11px] px-1.5 py-0.5 rounded ${styles[status]}`}>
      {status}
    </span>
  );
}

function CreateIndexForm({ onSubmit }: { onSubmit: (def: CreateIndexDef) => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<IndexInfo["type"]>("btree");
  const [entityType, setEntityType] = useState<"node" | "relationship">("node");
  const [labelsOrTypes, setLabelsOrTypes] = useState("");
  const [properties, setProperties] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !labelsOrTypes || !properties) return;
    onSubmit({
      name,
      type,
      entityType,
      labelsOrTypes: labelsOrTypes.split(",").map((s) => s.trim()).filter(Boolean),
      properties: properties.split(",").map((s) => s.trim()).filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mb-3 p-3 rounded bg-zinc-900 border border-zinc-700 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <FormField label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="idx_person_name"
            className="w-full bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700 focus:outline-none focus:border-zinc-500"
          />
        </FormField>
        <FormField label="Type">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as IndexInfo["type"])}
            className="w-full bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700 focus:outline-none focus:border-zinc-500"
          >
            <option value="btree">B-Tree</option>
            <option value="unique">Unique</option>
            <option value="composite">Composite</option>
            <option value="fulltext">Full-text</option>
            <option value="spatial">Spatial</option>
          </select>
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <FormField label="Entity">
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value as "node" | "relationship")}
            className="w-full bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700 focus:outline-none focus:border-zinc-500"
          >
            <option value="node">Node</option>
            <option value="relationship">Relationship</option>
          </select>
        </FormField>
        <FormField label="Labels / Types">
          <input
            value={labelsOrTypes}
            onChange={(e) => setLabelsOrTypes(e.target.value)}
            placeholder="Person, Movie"
            className="w-full bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700 focus:outline-none focus:border-zinc-500"
          />
        </FormField>
      </div>
      <FormField label="Properties">
        <input
          value={properties}
          onChange={(e) => setProperties(e.target.value)}
          placeholder="name, age"
          className="w-full bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700 focus:outline-none focus:border-zinc-500"
        />
      </FormField>
      <button
        type="submit"
        className="text-xs px-3 py-1 rounded bg-zinc-700 text-zinc-200 hover:bg-zinc-600"
      >
        Create Index
      </button>
    </form>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-0.5">
        {label}
      </label>
      {children}
    </div>
  );
}
