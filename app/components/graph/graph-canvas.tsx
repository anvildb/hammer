// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { select } from "d3-selection";
import { zoom as d3Zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import type { GraphNode, GraphEdge, VisConfig } from "./types";
import { labelColor } from "./types";
import { useGraphSimulation } from "./use-graph-simulation";
import { Minimap } from "./minimap";
import { ContextMenu, type ContextMenuAction } from "./context-menu";

interface GraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  config: VisConfig;
  selectedNodes: Set<string>;
  onSelectNode: (id: string | null, add?: boolean) => void;
  onSelectEdge: (id: string | null) => void;
  onExpandNode: (id: string) => void;
  onHideNode: (id: string) => void;
  onDeleteNode: (id: string) => void;
  onDeleteEdge: (id: string) => void;
  onInspectNode: (node: GraphNode) => void;
  onInspectEdge: (edge: GraphEdge) => void;
  onEditNode?: (node: GraphNode) => void;
  onEditEdge?: (edge: GraphEdge) => void;
  onFitRef: React.MutableRefObject<(() => void) | null>;
  onExportPngRef: React.MutableRefObject<(() => void) | null>;
  onExportSvgRef: React.MutableRefObject<(() => void) | null>;
}

export function GraphCanvas({
  nodes,
  edges,
  config,
  selectedNodes,
  onSelectNode,
  onSelectEdge,
  onExpandNode,
  onHideNode,
  onDeleteNode,
  onDeleteEdge,
  onInspectNode,
  onInspectEdge,
  onEditNode,
  onEditEdge,
  onFitRef,
  onExportPngRef,
  onExportSvgRef,
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [, setTick] = useState(0);

  // Node drag state (React-managed, not d3-drag).
  const dragRef = useRef<{
    node: GraphNode;
    startedDrag: boolean;
  } | null>(null);

  // Lasso state
  const [lassoActive, setLassoActive] = useState(false);
  const [lassoPoints, setLassoPoints] = useState<{ x: number; y: number }[]>([]);

  // Context menu state
  const [ctxMenu, setCtxMenu] = useState<{
    x: number;
    y: number;
    actions: ContextMenuAction[];
  } | null>(null);

  // Observe container size.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ width, height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Derive focus node: only when exactly one node is selected.
  const focusNodeId = selectedNodes.size === 1 ? [...selectedNodes][0] : null;

  // Force simulation.
  const { reheat } = useGraphSimulation({
    nodes,
    edges,
    layout: config.layout,
    width: size.width,
    height: size.height,
    onTick: () => setTick((t) => t + 1),
    focusNodeId,
  });

  // Set up d3-zoom on the SVG, filtered to ignore drags on nodes.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.05, 8])
      .filter((event) => {
        // Don't zoom/pan when the target is a node circle (let drag handle it).
        const target = event.target as Element;
        if (target.classList?.contains("graph-node")) return false;
        return true;
      })
      .on("zoom", (event) => {
        setTransform(event.transform);
      });

    select(svg).call(zoomBehavior);
    zoomRef.current = zoomBehavior;

    return () => {
      select(svg).on(".zoom", null);
    };
  }, []);

  // Convert screen coordinates to graph coordinates (accounting for zoom/pan).
  const screenToGraph = useCallback(
    (clientX: number, clientY: number): [number, number] => {
      const svg = svgRef.current;
      if (!svg) return [0, 0];
      const rect = svg.getBoundingClientRect();
      return transform.invert([clientX - rect.left, clientY - rect.top]) as [number, number];
    },
    [transform],
  );

  // Fit to screen.
  const fitToScreen = useCallback(() => {
    const svg = svgRef.current;
    const zb = zoomRef.current;
    if (!svg || !zb || nodes.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      const nx = n.x ?? 0;
      const ny = n.y ?? 0;
      if (nx < minX) minX = nx;
      if (ny < minY) minY = ny;
      if (nx > maxX) maxX = nx;
      if (ny > maxY) maxY = ny;
    }
    const pad = 60;
    const bw = maxX - minX + pad * 2 || 1;
    const bh = maxY - minY + pad * 2 || 1;
    const scale = Math.min(size.width / bw, size.height / bh, 2);
    const tx = size.width / 2 - ((minX + maxX) / 2) * scale;
    const ty = size.height / 2 - ((minY + maxY) / 2) * scale;

    select(svg).call(zb.transform, zoomIdentity.translate(tx, ty).scale(scale));
  }, [nodes, size]);

  onFitRef.current = fitToScreen;

  // Export PNG.
  onExportPngRef.current = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = size.width * 2;
    canvas.height = size.height * 2;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const a = document.createElement("a");
      a.download = "graph.png";
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);
  }, [size]);

  // Export SVG.
  onExportSvgRef.current = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.download = "graph.svg";
    a.href = URL.createObjectURL(blob);
    a.click();
    URL.revokeObjectURL(a.href);
  }, []);

  // Node size helper.
  const nodeRadius = useCallback(
    (node: GraphNode) => {
      if (!config.nodeStyle.sizeProperty) return 16;
      const val = Number(node.properties[config.nodeStyle.sizeProperty]);
      if (!isFinite(val)) return 16;
      return Math.max(8, Math.min(40, 10 + val * 0.5));
    },
    [config.nodeStyle.sizeProperty],
  );

  // Edge thickness helper.
  const edgeWidth = useCallback(
    (edge: GraphEdge) => {
      if (!config.edgeStyle.thicknessProperty) return 1.5;
      const val = Number(edge.properties[config.edgeStyle.thicknessProperty]);
      if (!isFinite(val)) return 1.5;
      return Math.max(0.5, Math.min(8, val));
    },
    [config.edgeStyle.thicknessProperty],
  );

  // Node caption helper — checks per-label override first, then global.
  const nodeCaption = useCallback(
    (node: GraphNode) => {
      // Check per-label caption property.
      for (const label of node.labels) {
        const prop = config.captionByLabel[label];
        if (prop) {
          const val = node.properties[prop];
          if (val != null) return String(val);
        }
      }
      // Fall back to global caption property.
      if (config.nodeStyle.captionProperty) {
        const val = node.properties[config.nodeStyle.captionProperty];
        if (val != null) return String(val);
      }
      return node.labels[0] ?? node.id;
    },
    [config.nodeStyle.captionProperty, config.captionByLabel],
  );

  // -- Mouse handlers: background click, node drag, lasso --

  const handleBackgroundMouseDown = (e: ReactMouseEvent) => {
    if (e.button !== 0 || e.ctrlKey || e.metaKey) return;
    if (e.shiftKey) {
      setLassoActive(true);
      setLassoPoints([]);
      return;
    }
    setCtxMenu(null);
  };

  const handleBackgroundClick = (e: ReactMouseEvent) => {
    // Deselect when clicking empty space (not a node or edge).
    const target = e.target as Element;
    if (
      !target.classList?.contains("graph-node") &&
      !target.classList?.contains("cursor-pointer")
    ) {
      onSelectNode(null);
      onSelectEdge(null);
    }
  };

  const handleNodeMouseDown = (e: ReactMouseEvent, node: GraphNode) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    // Start tracking a potential drag. We don't select yet — wait for mouseUp
    // without drag to select (so dragging doesn't toggle selection).
    dragRef.current = { node, startedDrag: false };
    node.fx = node.x;
    node.fy = node.y;
  };

  const handleMouseMove = (e: ReactMouseEvent) => {
    // Node drag in progress?
    if (dragRef.current) {
      dragRef.current.startedDrag = true;
      const [gx, gy] = screenToGraph(e.clientX, e.clientY);
      const node = dragRef.current.node;
      node.fx = gx;
      node.fy = gy;
      reheat();
      return;
    }
    // Lasso.
    if (lassoActive) {
      const [gx, gy] = screenToGraph(e.clientX, e.clientY);
      setLassoPoints((prev) => [...prev, { x: gx, y: gy }]);
    }
  };

  const handleMouseUp = (e: ReactMouseEvent) => {
    // Finish node drag.
    if (dragRef.current) {
      const { node, startedDrag } = dragRef.current;
      dragRef.current = null;
      if (!startedDrag) {
        // Was a click, not a drag — select/inspect the node.
        onSelectNode(node.id, e.shiftKey);
        onInspectNode(node);
      }
      // Node stays pinned where it was dropped (fx/fy kept).
      return;
    }
    // Finish lasso.
    if (lassoActive) {
      setLassoActive(false);
      if (lassoPoints.length > 2) {
        for (const node of nodes) {
          if (pointInPolygon(node.x ?? 0, node.y ?? 0, lassoPoints)) {
            onSelectNode(node.id, true);
          }
        }
      }
      setLassoPoints([]);
    }
  };

  // Double-click node to unpin it (let simulation reposition) and expand.
  const handleNodeDoubleClick = (node: GraphNode) => {
    node.fx = null;
    node.fy = null;
    reheat();
    onExpandNode(node.id);
  };

  // Right-click context menu for nodes.
  const handleNodeContextMenu = (e: ReactMouseEvent, node: GraphNode) => {
    e.preventDefault();
    setCtxMenu({
      x: e.clientX,
      y: e.clientY,
      actions: [
        { label: "Inspect", onClick: () => onInspectNode(node) },
        ...(onEditNode ? [{ label: "Edit", onClick: () => onEditNode(node) }] : []),
        { label: "Expand neighbors", onClick: () => onExpandNode(node.id) },
        { label: "Hide", onClick: () => onHideNode(node.id) },
        { label: "Delete", danger: true, onClick: () => onDeleteNode(node.id) },
      ],
    });
  };

  // Right-click context menu for edges.
  const handleEdgeContextMenu = (e: ReactMouseEvent, edge: GraphEdge) => {
    e.preventDefault();
    setCtxMenu({
      x: e.clientX,
      y: e.clientY,
      actions: [
        { label: "Inspect", onClick: () => onInspectEdge(edge) },
        ...(onEditEdge ? [{ label: "Edit", onClick: () => onEditEdge(edge) }] : []),
        { label: "Delete", danger: true, onClick: () => onDeleteEdge(edge.id) },
      ],
    });
  };

  // Viewbox for minimap.
  const viewBox = {
    x: -transform.x / transform.k,
    y: -transform.y / transform.k,
    w: size.width / transform.k,
    h: size.height / transform.k,
  };

  return (
    <div ref={containerRef} className="relative flex-1 overflow-hidden bg-zinc-950">
      <svg
        ref={svgRef}
        width={size.width}
        height={size.height}
        className="block"
        onMouseDown={handleBackgroundMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleBackgroundClick}
      >
        <defs>
          <marker
            id="arrowhead"
            viewBox="0 0 10 7"
            refX="10"
            refY="3.5"
            markerWidth="8"
            markerHeight="6"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#52525b" />
          </marker>
          <marker
            id="arrowhead-focus"
            viewBox="0 0 10 7"
            refX="10"
            refY="3.5"
            markerWidth="8"
            markerHeight="6"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#fef9c3" />
          </marker>
        </defs>
        <g ref={gRef} transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
          {/* Edges */}
          {(() => {
            // Group edges by node pair to detect parallel edges.
            const pairIndex = new Map<string, number>();
            const pairCount = new Map<string, number>();
            for (const edge of edges) {
              const sid = typeof edge.source === "string" ? edge.source : edge.source.id;
              const tid = typeof edge.target === "string" ? edge.target : edge.target.id;
              const pairKey = sid < tid ? `${sid}|${tid}` : `${tid}|${sid}`;
              pairCount.set(pairKey, (pairCount.get(pairKey) ?? 0) + 1);
            }
            const pairSeen = new Map<string, number>();

            return edges.map((edge) => {
              const src = typeof edge.source === "string" ? null : edge.source;
              const tgt = typeof edge.target === "string" ? null : edge.target;
              if (!src || !tgt) return null;
              const sx = src.x ?? 0;
              const sy = src.y ?? 0;
              const tx = tgt.x ?? 0;
              const ty = tgt.y ?? 0;
              const r = nodeRadius(tgt);
              const dx = tx - sx;
              const dy = ty - sy;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;

              // Compute curve offset for parallel edges.
              const pairKey = src.id < tgt.id ? `${src.id}|${tgt.id}` : `${tgt.id}|${src.id}`;
              const total = pairCount.get(pairKey) ?? 1;
              const idx = pairSeen.get(pairKey) ?? 0;
              pairSeen.set(pairKey, idx + 1);

              // Perpendicular unit vector — always computed from the normalized
              // pair direction (lower ID → higher ID) so parallel edges curve
              // consistently regardless of which node is source vs target.
              const normFlip = src.id < tgt.id ? 1 : -1;
              const px = (-dy / dist) * normFlip;
              const py = (dx / dist) * normFlip;
              // Spread: center the offsets around 0.
              const spread = 40;
              const offset = total <= 1 ? 0 : (idx - (total - 1) / 2) * spread;

              // Control point for quadratic bezier.
              const cpx = (sx + tx) / 2 + px * offset;
              const cpy = (sy + ty) / 2 + py * offset;

              // Shorten end to account for node radius + arrowhead.
              const endDx = tx - cpx;
              const endDy = ty - cpy;
              const endDist = Math.sqrt(endDx * endDx + endDy * endDy) || 1;
              const endX = tx - (endDx / endDist) * (r + 4);
              const endY = ty - (endDy / endDist) * (r + 4);

              // Label position: shift along the curve so opposite-side labels
              // don't sit at the same horizontal level. Edges curving one way
              // place their label at t=0.35, the other at t=0.65.
              const t = offset >= 0 ? 0.35 : 0.65;
              const mt = 1 - t;
              const lx = mt * mt * sx + 2 * mt * t * cpx + t * t * tx;
              const ly = mt * mt * sy + 2 * mt * t * cpy + t * t * ty;

              const isFocusEdge = focusNodeId != null && (src.id === focusNodeId || tgt.id === focusNodeId);

              const pathD = total <= 1
                ? `M ${sx} ${sy} L ${endX} ${endY}`
                : `M ${sx} ${sy} Q ${cpx} ${cpy} ${endX} ${endY}`;

              return (
                <g key={edge.id} style={focusNodeId && !isFocusEdge ? { opacity: 0.2 } : undefined}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isFocusEdge ? "#fef9c3" : "#3f3f46"}
                    strokeWidth={edgeWidth(edge)}
                    markerEnd={isFocusEdge ? "url(#arrowhead-focus)" : "url(#arrowhead)"}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEdge(edge.id);
                      onInspectEdge(edge);
                    }}
                    onContextMenu={(e) => handleEdgeContextMenu(e, edge)}
                  />
                  {(isFocusEdge || !focusNodeId) && <text
                    x={lx}
                    y={ly - 4}
                    textAnchor="middle"
                    className={`text-[8px] pointer-events-none select-none ${isFocusEdge ? "fill-yellow-400" : "fill-zinc-600"}`}
                    style={{ fontFamily: "var(--font-geist-mono, monospace)" }}
                  >
                    {edge.type}
                  </text>}
                </g>
              );
            });
          })()}

          {/* Nodes */}
          {(() => {
            // Build set of neighbor IDs for all selected nodes.
            const neighborIds = new Set<string>();
            if (selectedNodes.size > 0) {
              for (const edge of edges) {
                const sid = typeof edge.source === "string" ? edge.source : edge.source.id;
                const tid = typeof edge.target === "string" ? edge.target : edge.target.id;
                if (selectedNodes.has(sid) && !selectedNodes.has(tid)) neighborIds.add(tid);
                if (selectedNodes.has(tid) && !selectedNodes.has(sid)) neighborIds.add(sid);
              }
            }
            return nodes.map((node) => {
            const nx = node.x ?? 0;
            const ny = node.y ?? 0;
            const r = nodeRadius(node);
            const color = labelColor(node.labels[0] ?? "");
            const isSelected = selectedNodes.has(node.id);
            const isNeighbor = neighborIds.has(node.id);

            const dimmed = focusNodeId != null && !isSelected && !isNeighbor;

            return (
              <g key={node.id} style={dimmed ? { opacity: 0.5 } : undefined}>
                {/* Neighbor highlight ring */}
                {isNeighbor && !isSelected && (
                  <circle cx={nx} cy={ny} r={r + 4} fill="none" stroke="#facc15" strokeWidth={1.5} strokeDasharray="3 2" />
                )}
                {/* Selection ring */}
                {isSelected && (
                  <circle cx={nx} cy={ny} r={r + 4} fill="none" stroke="#facc15" strokeWidth={2} />
                )}
                <circle
                  className="graph-node cursor-pointer"
                  cx={nx}
                  cy={ny}
                  r={r}
                  fill={color + "30"}
                  stroke={color}
                  strokeWidth={2}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleNodeDoubleClick(node);
                  }}
                  onContextMenu={(e) => handleNodeContextMenu(e, node)}
                />
                {(isSelected || isNeighbor || !focusNodeId) && <text
                  x={nx}
                  y={ny + r + 12}
                  textAnchor="middle"
                  className={`text-[9px] pointer-events-none select-none ${isSelected || isNeighbor ? "fill-yellow-400" : "fill-zinc-400"}`}
                  style={{ fontFamily: "var(--font-geist-mono, monospace)" }}
                >
                  {nodeCaption(node)}
                </text>}
              </g>
            );
          });
          })()}

          {/* Lasso polygon */}
          {lassoActive && lassoPoints.length > 1 && (
            <polygon
              points={lassoPoints.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="rgba(250,204,21,0.08)"
              stroke="#facc15"
              strokeWidth={1}
              strokeDasharray="4 2"
            />
          )}
        </g>
      </svg>

      <Minimap
        nodes={nodes}
        width={size.width}
        height={size.height}
        viewBox={viewBox}
      />

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          actions={ctxMenu.actions}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  );
}

/** Point-in-polygon (ray casting). */
function pointInPolygon(px: number, py: number, polygon: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}
