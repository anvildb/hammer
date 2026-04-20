import { useState } from "react";
import type { SchemaData } from "./types";
import { LabelsPanel } from "./labels-panel";
import { RelTypesPanel } from "./rel-types-panel";
import { PropertyKeysPanel } from "./property-keys-panel";
import { IndexesPanel, type CreateIndexDef } from "./indexes-panel";
import { ConstraintsPanel, type CreateConstraintDef } from "./constraints-panel";
import { SchemaGraph } from "./schema-graph";

type Tab = "labels" | "relTypes" | "propertyKeys" | "indexes" | "constraints" | "graph";

interface SchemaBrowserProps {
  schema: SchemaData;
  onCreateIndex?: (def: CreateIndexDef) => void;
  onDropIndex?: (name: string) => void;
  onCreateConstraint?: (def: CreateConstraintDef) => void;
  onDropConstraint?: (name: string) => void;
}

const tabs: { id: Tab; label: string }[] = [
  { id: "labels", label: "Labels" },
  { id: "relTypes", label: "Rel Types" },
  { id: "propertyKeys", label: "Properties" },
  { id: "indexes", label: "Indexes" },
  { id: "constraints", label: "Constraints" },
  { id: "graph", label: "Meta-Graph" },
];

export function SchemaBrowser({
  schema,
  onCreateIndex,
  onDropIndex,
  onCreateConstraint,
  onDropConstraint,
}: SchemaBrowserProps) {
  const [activeTab, setActiveTab] = useState<Tab>("labels");

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center border-b border-zinc-800 px-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-zinc-400 text-zinc-200"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.label}
            {tab.id === "labels" && (
              <span className="ml-1 text-zinc-600">{schema.labels.length}</span>
            )}
            {tab.id === "relTypes" && (
              <span className="ml-1 text-zinc-600">{schema.relationshipTypes.length}</span>
            )}
            {tab.id === "indexes" && (
              <span className="ml-1 text-zinc-600">{schema.indexes.length}</span>
            )}
            {tab.id === "constraints" && (
              <span className="ml-1 text-zinc-600">{schema.constraints.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {activeTab === "labels" && <LabelsPanel labels={schema.labels} />}
        {activeTab === "relTypes" && <RelTypesPanel relTypes={schema.relationshipTypes} />}
        {activeTab === "propertyKeys" && <PropertyKeysPanel propertyKeys={schema.propertyKeys} />}
        {activeTab === "indexes" && (
          <IndexesPanel
            indexes={schema.indexes}
            onCreateIndex={onCreateIndex}
            onDropIndex={onDropIndex}
          />
        )}
        {activeTab === "constraints" && (
          <ConstraintsPanel
            constraints={schema.constraints}
            onCreateConstraint={onCreateConstraint}
            onDropConstraint={onDropConstraint}
          />
        )}
        {activeTab === "graph" && (
          <SchemaGraph labels={schema.labels} relTypes={schema.relationshipTypes} />
        )}
      </div>
    </div>
  );
}
