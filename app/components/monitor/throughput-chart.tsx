// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
import { useRef, useEffect, useState } from "react";
import type { ThroughputPoint } from "./types";

interface ThroughputChartProps {
  data: ThroughputPoint[];
}

const SERIES = [
  { key: "queries" as const, label: "Queries", color: "#4f8fea" },
  { key: "reads" as const, label: "Reads", color: "#50c878" },
  { key: "writes" as const, label: "Writes", color: "#e8a838" },
];

export function ThroughputChart({ data }: ThroughputChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

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

  if (data.length === 0) {
    return (
      <div>
        <ChartHeader />
        <p className="px-3 py-8 text-xs text-zinc-600 text-center">No throughput data</p>
      </div>
    );
  }

  // Compute scales.
  const pad = { top: 8, right: 12, bottom: 24, left: 40 };
  const w = size.width - pad.left - pad.right;
  const h = size.height - pad.top - pad.bottom;

  const minT = data[0].timestamp;
  const maxT = data[data.length - 1].timestamp;
  const rangeT = maxT - minT || 1;

  let maxVal = 0;
  for (const pt of data) {
    for (const s of SERIES) {
      if (pt[s.key] > maxVal) maxVal = pt[s.key];
    }
  }
  maxVal = maxVal || 1;

  const scaleX = (t: number) => pad.left + ((t - minT) / rangeT) * w;
  const scaleY = (v: number) => pad.top + h - (v / maxVal) * h;

  return (
    <div>
      <ChartHeader />
      <div ref={containerRef} className="h-40 w-full">
        <svg width={size.width} height={size.height} className="block">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
            const y = pad.top + h - frac * h;
            return (
              <g key={frac}>
                <line
                  x1={pad.left}
                  x2={pad.left + w}
                  y1={y}
                  y2={y}
                  stroke="#27272a"
                  strokeWidth={0.5}
                />
                <text
                  x={pad.left - 4}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[8px] fill-zinc-600"
                  style={{ fontFamily: "var(--font-geist-mono, monospace)" }}
                >
                  {Math.round(maxVal * frac)}
                </text>
              </g>
            );
          })}

          {/* Time labels */}
          {data
            .filter((_, i) => i % Math.max(1, Math.floor(data.length / 5)) === 0)
            .map((pt) => (
              <text
                key={pt.timestamp}
                x={scaleX(pt.timestamp)}
                y={pad.top + h + 14}
                textAnchor="middle"
                className="text-[8px] fill-zinc-600"
                style={{ fontFamily: "var(--font-geist-mono, monospace)" }}
              >
                {new Date(pt.timestamp).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </text>
            ))}

          {/* Series lines */}
          {SERIES.map((s) => {
            const points = data.map((pt) => `${scaleX(pt.timestamp)},${scaleY(pt[s.key])}`).join(" ");
            return (
              <polyline
                key={s.key}
                points={points}
                fill="none"
                stroke={s.color}
                strokeWidth={1.5}
                opacity={0.8}
              />
            );
          })}
        </svg>
      </div>
      {/* Legend */}
      <div className="flex gap-4 px-3 pb-2">
        {SERIES.map((s) => (
          <div key={s.key} className="flex items-center gap-1">
            <div className="w-2.5 h-0.5 rounded" style={{ backgroundColor: s.color }} />
            <span className="text-[11px] text-zinc-500">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartHeader() {
  return (
    <div className="px-3 py-2 border-b border-zinc-800">
      <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
        Query Throughput
      </h3>
    </div>
  );
}
