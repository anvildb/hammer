// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
import { useRef, useEffect, useState } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
} from "d3-force";
import { select } from "d3-selection";
import { zoom as d3Zoom, type ZoomTransform, zoomIdentity } from "d3-zoom";
import type { LabelInfo, RelTypeInfo } from "./types";
import { schemaColor } from "./types";

interface SchemaGraphProps {
  labels: LabelInfo[];
  relTypes: RelTypeInfo[];
}

interface MetaNode {
  id: string;
  label: string;
  nodeCount: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface MetaEdge {
  source: string | MetaNode;
  target: string | MetaNode;
  type: string;
  count: number;
}

export function SchemaGraph({ labels, relTypes }: SchemaGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);
  const [, setTick] = useState(0);
  const nodesRef = useRef<MetaNode[]>([]);
  const edgesRef = useRef<MetaEdge[]>([]);

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

  // Build meta-graph nodes and edges.
  useEffect(() => {
    const nodes: MetaNode[] = labels.map((l) => ({
      id: l.name,
      label: l.name,
      nodeCount: l.nodeCount,
    }));

    const labelSet = new Set(labels.map((l) => l.name));
    const edges: MetaEdge[] = [];

    for (const rt of relTypes) {
      const froms = rt.fromLabels.filter((l) => labelSet.has(l));
      const tos = rt.toLabels.filter((l) => labelSet.has(l));
      if (froms.length === 0 || tos.length === 0) continue;
      for (const from of froms) {
        for (const to of tos) {
          edges.push({ source: from, target: to, type: rt.name, count: rt.count });
        }
      }
    }

    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [labels, relTypes]);

  // Force simulation.
  useEffect(() => {
    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    if (!size.width || !size.height || nodes.length === 0) return;

    const sim = forceSimulation(nodes as any)
      .force(
        "link",
        forceLink(edges as any)
          .id((d: any) => d.id)
          .distance(140),
      )
      .force("charge", forceManyBody().strength(-400))
      .force("center", forceCenter(size.width / 2, size.height / 2))
      .force("collide", forceCollide(40))
      .on("tick", () => setTick((t) => t + 1));

    return () => { sim.stop(); };
  }, [labels, relTypes, size]);

  // Zoom.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 6])
      .on("zoom", (event) => setTransform(event.transform));
    select(svg).call(zoomBehavior);
    return () => { select(svg).on(".zoom", null); };
  }, []);

  const nodes = nodesRef.current;
  const edges = edgesRef.current;

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden bg-zinc-950">
      <svg ref={svgRef} width={size.width} height={size.height} className="block">
        <defs>
          <marker
            id="schema-arrow"
            viewBox="0 0 10 7"
            refX="10"
            refY="3.5"
            markerWidth="8"
            markerHeight="6"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#52525b" />
          </marker>
        </defs>
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
          {/* Edges */}
          {edges.map((edge, i) => {
            const src = typeof edge.source === "string" ? null : edge.source;
            const tgt = typeof edge.target === "string" ? null : edge.target;
            if (!src || !tgt) return null;
            const sx = src.x ?? 0;
            const sy = src.y ?? 0;
            const tx = tgt.x ?? 0;
            const ty = tgt.y ?? 0;
            const mx = (sx + tx) / 2;
            const my = (sy + ty) / 2;
            const dx = tx - sx;
            const dy = ty - sy;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const r = 24;
            const endX = tx - (dx / dist) * (r + 4);
            const endY = ty - (dy / dist) * (r + 4);

            return (
              <g key={i}>
                <line
                  x1={sx}
                  y1={sy}
                  x2={endX}
                  y2={endY}
                  stroke="#3f3f46"
                  strokeWidth={1.5}
                  markerEnd="url(#schema-arrow)"
                />
                <text
                  x={mx}
                  y={my - 6}
                  textAnchor="middle"
                  className="text-[8px] fill-zinc-500 select-none"
                  style={{ fontFamily: "var(--font-geist-mono, monospace)" }}
                >
                  :{edge.type}
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const nx = node.x ?? 0;
            const ny = node.y ?? 0;
            const color = schemaColor(node.label);
            return (
              <g key={node.id}>
                <circle
                  cx={nx}
                  cy={ny}
                  r={24}
                  fill={color + "25"}
                  stroke={color}
                  strokeWidth={2}
                />
                <text
                  x={nx}
                  y={ny + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-[9px] fill-zinc-200 select-none font-medium"
                  style={{ fontFamily: "var(--font-geist-mono, monospace)" }}
                >
                  :{node.label}
                </text>
                <text
                  x={nx}
                  y={ny + 36}
                  textAnchor="middle"
                  className="text-[8px] fill-zinc-500 select-none"
                  style={{ fontFamily: "var(--font-geist-mono, monospace)" }}
                >
                  {node.nodeCount.toLocaleString()}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
