// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
import { useState, useCallback } from "react";
import type { QueryResult, ResultViewMode } from "./types";
import { TableView } from "./table-view";
import { JsonView } from "./json-view";
import { PlanView } from "./plan-view";

interface ResultPanelProps {
  result: QueryResult | null;
}

export function ResultPanel({ result }: ResultPanelProps) {
  const [mode, setMode] = useState<ResultViewMode>("table");

  // Auto-select best mode when result changes.
  // (Graph mode is a stub — the full graph view lives in the graph route;
  //  here we just offer the tab for result sets containing nodes/rels.)

  if (!result) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-zinc-600">
        Run a query to see results
      </div>
    );
  }

  if (result.error) {
    return (
      <div className="p-4">
        <div className="rounded border border-red-900/50 bg-red-950/30 p-3">
          <p className="text-xs font-semibold text-red-400 mb-1">Query Error</p>
          <pre className="text-xs text-red-300 font-mono whitespace-pre-wrap">
            {result.error}
          </pre>
        </div>
        <ResultStats result={result} />
      </div>
    );
  }

  const tabs: { mode: ResultViewMode; label: string; available: boolean }[] = [
    { mode: "table", label: "Table", available: true },
    { mode: "json", label: "JSON", available: true },
    { mode: "graph", label: "Graph", available: hasGraphData(result) },
    { mode: "plan", label: "Plan", available: result.plan != null },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar + stats */}
      <div className="flex items-center border-b border-zinc-800 px-3">
        <div className="flex gap-0.5">
          {tabs
            .filter((t) => t.available)
            .map((tab) => (
              <button
                key={tab.mode}
                onClick={() => setMode(tab.mode)}
                className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                  mode === tab.mode
                    ? "border-zinc-400 text-zinc-200"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
        </div>
        <div className="ml-auto">
          <ResultStats result={result} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {mode === "table" && <TableView result={result} />}
        {mode === "json" && <JsonView result={result} />}
        {mode === "graph" && <GraphResultPlaceholder result={result} />}
        {mode === "plan" && <PlanView plan={result.plan} />}
      </div>

      {/* Export bar */}
      <ExportBar result={result} />
    </div>
  );
}

function ResultStats({ result }: { result: QueryResult }) {
  return (
    <div className="flex items-center gap-3 text-[11px] text-zinc-500 py-1.5">
      <span>{result.rowCount} row{result.rowCount !== 1 ? "s" : ""}</span>
      {result.executionTimeMs != null && <span>{result.executionTimeMs}ms</span>}
    </div>
  );
}

function ExportBar({ result }: { result: QueryResult }) {
  const exportCsv = useCallback(() => {
    const header = result.columns.join(",");
    const rows = result.rows.map((row) =>
      row
        .map((cell) => {
          const s = cell == null ? "" : String(cell);
          return s.includes(",") || s.includes('"') || s.includes("\n")
            ? '"' + s.replace(/"/g, '""') + '"'
            : s;
        })
        .join(","),
    );
    const csv = [header, ...rows].join("\n");
    download("results.csv", csv, "text/csv");
  }, [result]);

  const exportJson = useCallback(() => {
    const data = result.rows.map((row) => {
      const obj: Record<string, unknown> = {};
      result.columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });
    download("results.json", JSON.stringify(data, null, 2), "application/json");
  }, [result]);

  return (
    <div className="flex items-center gap-2 px-3 py-1 border-t border-zinc-800">
      <span className="text-[11px] text-zinc-600">Export:</span>
      <button
        onClick={exportCsv}
        className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
      >
        CSV
      </button>
      <button
        onClick={exportJson}
        className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
      >
        JSON
      </button>
    </div>
  );
}

/** Placeholder for inline graph rendering of result nodes/edges. */
function GraphResultPlaceholder({ result }: { result: QueryResult }) {
  return (
    <div className="flex items-center justify-center h-full text-xs text-zinc-500">
      Graph view: {result.rowCount} results contain nodes/relationships.
      <br />
      Open in the Graph tab for full visualization.
    </div>
  );
}

/** Check if result contains node/relationship objects. */
function hasGraphData(result: QueryResult): boolean {
  for (const row of result.rows) {
    for (const cell of row) {
      if (cell && typeof cell === "object" && ("labels" in (cell as object) || "type" in (cell as object))) {
        return true;
      }
    }
  }
  return false;
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement("a");
  a.download = filename;
  a.href = URL.createObjectURL(blob);
  a.click();
  URL.revokeObjectURL(a.href);
}
