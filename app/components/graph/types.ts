/** Shared types for graph visualization components. */

export interface GraphNode {
  id: string;
  labels: string[];
  properties: Record<string, unknown>;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
}

export interface GraphEdge {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
  properties: Record<string, unknown>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type LayoutAlgorithm = "force" | "hierarchical" | "circular" | "grid";

export interface NodeStyleConfig {
  /** Property key to determine node size (null = fixed size). */
  sizeProperty: string | null;
  /** How to color nodes: by label (default). */
  colorBy: "label";
  /** Property key to use as node caption. */
  captionProperty: string | null;
}

export interface EdgeStyleConfig {
  /** Property key to scale edge thickness (null = fixed). */
  thicknessProperty: string | null;
}

export interface VisConfig {
  layout: LayoutAlgorithm;
  nodeStyle: NodeStyleConfig;
  edgeStyle: EdgeStyleConfig;
  maxNodes: number;
  /** Per-label caption property overrides. Key = label name, value = property key. */
  captionByLabel: Record<string, string>;
}

export const DEFAULT_VIS_CONFIG: VisConfig = {
  layout: "force",
  nodeStyle: { sizeProperty: null, colorBy: "label", captionProperty: null },
  edgeStyle: { thicknessProperty: null },
  maxNodes: 1000,
  captionByLabel: {},
};

/** Deterministic color for a label string. */
const LABEL_COLORS = [
  "#4f8fea", "#e05252", "#50c878", "#e8a838", "#9b59b6",
  "#1abc9c", "#e67e22", "#3498db", "#e74c3c", "#2ecc71",
  "#f39c12", "#8e44ad", "#16a085", "#d35400", "#2980b9",
];

export function labelColor(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = ((hash << 5) - hash + label.charCodeAt(i)) | 0;
  }
  return LABEL_COLORS[Math.abs(hash) % LABEL_COLORS.length];
}
