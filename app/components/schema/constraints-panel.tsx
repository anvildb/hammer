import { useState } from "react";
import type { ConstraintInfo } from "./types";

interface ConstraintsPanelProps {
  constraints: ConstraintInfo[];
  onCreateConstraint?: (def: CreateConstraintDef) => void;
  onDropConstraint?: (name: string) => void;
}

export interface CreateConstraintDef {
  name: string;
  type: ConstraintInfo["type"];
  entityType: "node" | "relationship";
  labelOrType: string;
  properties: string[];
}

export function ConstraintsPanel({ constraints, onCreateConstraint, onDropConstraint }: ConstraintsPanelProps) {
  const [showCreate, setShowCreate] = useState(false);

  const typeLabel: Record<ConstraintInfo["type"], string> = {
    unique: "Unique",
    exists: "Exists",
    node_key: "Node Key",
  };

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] text-zinc-500 uppercase tracking-wider">
          {constraints.length} constraint{constraints.length !== 1 ? "s" : ""}
        </p>
        {onCreateConstraint && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
          >
            {showCreate ? "Cancel" : "+ Create"}
          </button>
        )}
      </div>

      {showCreate && onCreateConstraint && (
        <CreateConstraintForm
          onSubmit={(def) => {
            onCreateConstraint(def);
            setShowCreate(false);
          }}
        />
      )}

      {constraints.length === 0 && !showCreate && (
        <p className="py-6 text-xs text-zinc-600 text-center">No constraints</p>
      )}
      <div className="space-y-1">
        {constraints.map((c) => (
          <div
            key={c.name}
            className="px-3 py-2 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-200">{c.name}</span>
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                {typeLabel[c.type]}
              </span>
              <span className="text-[11px] text-zinc-600">{c.entityType}</span>
              {onDropConstraint && (
                <button
                  onClick={() => onDropConstraint(c.name)}
                  className="ml-auto text-[11px] text-red-500/60 hover:text-red-400"
                >
                  drop
                </button>
              )}
            </div>
            <div className="mt-1 text-[11px] text-zinc-500 font-mono">
              :{c.labelOrType} ({c.properties.join(", ")})
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreateConstraintForm({ onSubmit }: { onSubmit: (def: CreateConstraintDef) => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ConstraintInfo["type"]>("unique");
  const [entityType, setEntityType] = useState<"node" | "relationship">("node");
  const [labelOrType, setLabelOrType] = useState("");
  const [properties, setProperties] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !labelOrType || !properties) return;
    onSubmit({
      name,
      type,
      entityType,
      labelOrType: labelOrType.trim(),
      properties: properties.split(",").map((s) => s.trim()).filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mb-3 p-3 rounded bg-zinc-900 border border-zinc-700 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="uniq_person_email"
            className="w-full bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700 focus:outline-none focus:border-zinc-500"
          />
        </Field>
        <Field label="Type">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ConstraintInfo["type"])}
            className="w-full bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700 focus:outline-none focus:border-zinc-500"
          >
            <option value="unique">Unique</option>
            <option value="exists">Exists</option>
            <option value="node_key">Node Key</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Entity">
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value as "node" | "relationship")}
            className="w-full bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700 focus:outline-none focus:border-zinc-500"
          >
            <option value="node">Node</option>
            <option value="relationship">Relationship</option>
          </select>
        </Field>
        <Field label="Label / Type">
          <input
            value={labelOrType}
            onChange={(e) => setLabelOrType(e.target.value)}
            placeholder="Person"
            className="w-full bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700 focus:outline-none focus:border-zinc-500"
          />
        </Field>
      </div>
      <Field label="Properties">
        <input
          value={properties}
          onChange={(e) => setProperties(e.target.value)}
          placeholder="email"
          className="w-full bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700 focus:outline-none focus:border-zinc-500"
        />
      </Field>
      <button
        type="submit"
        className="text-xs px-3 py-1 rounded bg-zinc-700 text-zinc-200 hover:bg-zinc-600"
      >
        Create Constraint
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-0.5">
        {label}
      </label>
      {children}
    </div>
  );
}
