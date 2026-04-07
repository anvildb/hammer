// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
import type { LayoutAlgorithm, VisConfig } from "./types";

interface GraphToolbarProps {
  config: VisConfig;
  onConfigChange: (config: VisConfig) => void;
  onFitToScreen: () => void;
  onExportPng: () => void;
  onExportSvg: () => void;
  nodeCount: number;
  edgeCount: number;
  maxReached: boolean;
}

const layouts: { value: LayoutAlgorithm; label: string }[] = [
  { value: "force", label: "Force" },
  { value: "hierarchical", label: "Hierarchical" },
  { value: "circular", label: "Circular" },
  { value: "grid", label: "Grid" },
];

export function GraphToolbar({
  config,
  onConfigChange,
  onFitToScreen,
  onExportPng,
  onExportSvg,
  nodeCount,
  edgeCount,
  maxReached,
}: GraphToolbarProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 text-xs">
      {/* Layout selector */}
      <label className="flex items-center gap-1.5 text-zinc-500">
        Layout
        <select
          value={config.layout}
          onChange={(e) =>
            onConfigChange({ ...config, layout: e.target.value as LayoutAlgorithm })
          }
          className="bg-zinc-800 text-zinc-300 rounded px-1.5 py-0.5 border border-zinc-700 focus:outline-none focus:border-zinc-500"
        >
          {layouts.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </label>

      <div className="w-px h-4 bg-zinc-700" />

      {/* Viewport controls */}
      <button
        onClick={onFitToScreen}
        className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
      >
        Fit
      </button>

      <div className="w-px h-4 bg-zinc-700" />

      {/* Export */}
      <button
        onClick={onExportPng}
        className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
      >
        PNG
      </button>
      <button
        onClick={onExportSvg}
        className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
      >
        SVG
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Stats */}
      <span className="text-zinc-500">
        {nodeCount} nodes, {edgeCount} edges
      </span>
      {maxReached && (
        <span className="text-amber-500 text-[11px]">
          (limit: {config.maxNodes})
        </span>
      )}
    </div>
  );
}
