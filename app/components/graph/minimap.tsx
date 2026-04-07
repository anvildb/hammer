// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
import type { GraphNode } from "./types";
import { labelColor } from "./types";

interface MinimapProps {
  nodes: GraphNode[];
  width: number;
  height: number;
  viewBox: { x: number; y: number; w: number; h: number };
}

const MINIMAP_W = 160;
const MINIMAP_H = 100;

export function Minimap({ nodes, width, height, viewBox }: MinimapProps) {
  if (nodes.length === 0 || !width || !height) return null;

  // Compute bounding box of all nodes.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    const nx = n.x ?? 0;
    const ny = n.y ?? 0;
    if (nx < minX) minX = nx;
    if (ny < minY) minY = ny;
    if (nx > maxX) maxX = nx;
    if (ny > maxY) maxY = ny;
  }
  const pad = 40;
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;
  const bw = maxX - minX || 1;
  const bh = maxY - minY || 1;

  const sx = MINIMAP_W / bw;
  const sy = MINIMAP_H / bh;
  const s = Math.min(sx, sy);

  // Viewport rect in minimap coords.
  const vx = (viewBox.x - minX) * s;
  const vy = (viewBox.y - minY) * s;
  const vw = viewBox.w * s;
  const vh = viewBox.h * s;

  return (
    <div className="absolute bottom-2 left-2 z-20 border border-zinc-700 rounded bg-zinc-900/80 backdrop-blur-sm overflow-hidden">
      <svg width={MINIMAP_W} height={MINIMAP_H}>
        {nodes.map((n) => (
          <circle
            key={n.id}
            cx={((n.x ?? 0) - minX) * s}
            cy={((n.y ?? 0) - minY) * s}
            r={2}
            fill={labelColor(n.labels[0] ?? "")}
            opacity={0.8}
          />
        ))}
        <rect
          x={vx}
          y={vy}
          width={vw}
          height={vh}
          fill="none"
          stroke="#71717a"
          strokeWidth={1}
        />
      </svg>
    </div>
  );
}
