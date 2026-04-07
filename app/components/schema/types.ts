/** Shared types for schema browser components. */

export interface LabelInfo {
  name: string;
  nodeCount: number;
  properties: string[];
}

export interface RelTypeInfo {
  name: string;
  count: number;
  properties: string[];
  /** Labels on source nodes. */
  fromLabels: string[];
  /** Labels on target nodes. */
  toLabels: string[];
}

export interface PropertyKeyInfo {
  name: string;
  usedOnLabels: string[];
  usedOnRelTypes: string[];
}

export type IndexStatus = "online" | "populating" | "failed";

export interface IndexInfo {
  name: string;
  type: "btree" | "fulltext" | "spatial" | "composite" | "unique";
  entityType: "node" | "relationship";
  labelsOrTypes: string[];
  properties: string[];
  status: IndexStatus;
}

export interface ConstraintInfo {
  name: string;
  type: "unique" | "exists" | "node_key";
  entityType: "node" | "relationship";
  labelOrType: string;
  properties: string[];
}

export interface SchemaData {
  labels: LabelInfo[];
  relationshipTypes: RelTypeInfo[];
  propertyKeys: PropertyKeyInfo[];
  indexes: IndexInfo[];
  constraints: ConstraintInfo[];
}

/** Deterministic color for a label/type name (same palette as graph vis). */
const COLORS = [
  "#4f8fea", "#e05252", "#50c878", "#e8a838", "#9b59b6",
  "#1abc9c", "#e67e22", "#3498db", "#e74c3c", "#2ecc71",
  "#f39c12", "#8e44ad", "#16a085", "#d35400", "#2980b9",
];

export function schemaColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}
