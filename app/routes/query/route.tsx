// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
import { useState, useMemo, useEffect } from "react";
import { useConnection } from "~/lib/connection-context";
import type { CypherResult } from "~/lib/api-client";
import { GraphViewer } from "~/components/graph/graph-viewer";
import type { GraphData, GraphNode, GraphEdge } from "~/components/graph/types";
import { loadSettings } from "~/components/settings/types";

type ResultView = "table" | "json" | "graph" | "plan";

export default function QueryRoute() {
  const { client, status, selectedSchema } = useConnection();
  const [query, setQuery] = useState("MATCH (n) RETURN n");
  const [result, setResult] = useState<CypherResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [view, setView] = useState<ResultView>(() => loadSettings().defaultResultView as ResultView);

  async function executeQuery() {
    if (status !== "connected") return;
    setRunning(true);
    setError(null);
    try {
      const res = await client.cypher({ query, database: selectedSchema });
      setResult(res);
      // If on graph view but result has no node data, fall back to table.
      if (view === "graph") {
        const hasNodes = res.rows.some((row) =>
          row.some((cell) => {
            if (cell && typeof cell === "object" && !Array.isArray(cell)) {
              const obj = cell as Record<string, unknown>;
              return Array.isArray(obj._labels) || Array.isArray(obj.labels);
            }
            return false;
          })
        );
        if (!hasNodes) setView("table");
      }
    } catch (e) {
      setError(String(e));
      setResult(null);
    } finally {
      setRunning(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      executeQuery();
    }
  }

  // Extract nodes from result rows.
  // Extract nodes and edges from query result rows.
  const resultData = useMemo<{ nodes: GraphNode[]; edges: GraphEdge[] }>(() => {
    if (!result) return { nodes: [], edges: [] };

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const seenNodes = new Set<string>();
    const seenEdges = new Set<string>();

    for (const row of result.rows) {
      for (const cell of row) {
        if (cell && typeof cell === "object" && !Array.isArray(cell)) {
          const obj = cell as Record<string, unknown>;

          // Relationship: has _type + _start + _end
          if (obj._type !== undefined && obj._start !== undefined && obj._end !== undefined) {
            const edgeId = String(obj._id ?? "");
            if (edgeId && !seenEdges.has(edgeId)) {
              seenEdges.add(edgeId);
              const { _id: _, _type: __, _start: ___, _end: ____, ...rest } = obj;
              edges.push({
                id: edgeId,
                source: String(obj._start),
                target: String(obj._end),
                type: String(obj._type),
                properties: rest,
              });
            }
            continue;
          }

          // Node: has _labels or labels (but NOT _type)
          if (Array.isArray(obj._labels) || Array.isArray(obj.labels)) {
            const nodeId = String(obj._id ?? obj.id ?? "");
            if (nodeId && !seenNodes.has(nodeId)) {
              seenNodes.add(nodeId);
              const labels = (Array.isArray(obj._labels) ? obj._labels : obj.labels) as string[];
              const { _id: _, _labels: __, _key: ___, _collection: ____, ...rest } = obj;
              nodes.push({ id: nodeId, labels, properties: rest });
            }
          }
        }
      }
    }
    return { nodes, edges };
  }, [result]);

  // Also fetch edges from the server for nodes that had no explicit relationship in the query.
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });

  useEffect(() => {
    if (resultData.nodes.length === 0) {
      setGraphData({ nodes: [], edges: [] });
      return;
    }

    // If the query already returned edges, use them directly.
    if (resultData.edges.length > 0) {
      setGraphData(resultData);
      return;
    }

    // Otherwise, fetch edges from the graph endpoint.
    const nodeIds = new Set(resultData.nodes.map((n) => n.id));
    client
      .getGraph("default")
      .then((full) => {
        const edges: GraphEdge[] = (full.edges ?? [])
          .filter((e: Record<string, unknown>) => {
            const src = String(e.source ?? "");
            const tgt = String(e.target ?? "");
            return nodeIds.has(src) && nodeIds.has(tgt);
          })
          .map((e: Record<string, unknown>) => ({
            id: String(e.id ?? ""),
            source: String(e.source ?? ""),
            target: String(e.target ?? ""),
            type: String(e.type ?? (e as Record<string, unknown>).edge_type ?? ""),
            properties: (e.properties ?? {}) as Record<string, unknown>,
          }));
        setGraphData({ nodes: resultData.nodes, edges });
      })
      .catch(() => {
        setGraphData({ nodes: resultData.nodes, edges: [] });
      });
  }, [resultData, client]);

  const hasGraphData = graphData.nodes.length > 0;

  async function handleExpandNeighbors(nodeId: string): Promise<GraphData> {
    const res = await client.cypher({
      query: `MATCH (n)-[r]-(m) WHERE id(n) = ${nodeId} RETURN n, r, m`,
      database: selectedSchema,
    });
    const nodes: GraphData["nodes"] = [];
    const edges: GraphData["edges"] = [];
    const seenN = new Set<string>();
    const seenE = new Set<string>();
    for (const row of res.rows) {
      for (const cell of row) {
        if (cell && typeof cell === "object" && !Array.isArray(cell)) {
          const obj = cell as Record<string, unknown>;
          if (obj._type !== undefined && obj._start !== undefined && obj._end !== undefined) {
            const eid = String(obj._id ?? "");
            if (eid && !seenE.has(eid)) {
              seenE.add(eid);
              const { _id: _, _type: __, _start: ___, _end: ____, ...rest } = obj;
              edges.push({ id: eid, source: String(obj._start), target: String(obj._end), type: String(obj._type), properties: rest });
            }
          } else if (Array.isArray(obj._labels) || Array.isArray(obj.labels)) {
            const nid = String(obj._id ?? obj.id ?? "");
            if (nid && !seenN.has(nid)) {
              seenN.add(nid);
              const labels = (Array.isArray(obj._labels) ? obj._labels : obj.labels) as string[];
              const { _id: _, _labels: __, ...rest } = obj;
              nodes.push({ id: nid, labels, properties: rest });
            }
          }
        }
      }
    }
    return { nodes, edges };
  }

  async function handleDeleteNode(nodeId: string) {
    await client.cypher({
      query: `MATCH (n) WHERE id(n) = ${nodeId} DETACH DELETE n`,
      database: selectedSchema,
    });
    // Re-run the query to refresh results.
    executeQuery();
  }

  async function handleEditProperties(id: string, kind: "node" | "edge", properties: Record<string, unknown>) {
    const setEntries = Object.entries(properties)
      .map(([k, v]) => `n.${k} = ${JSON.stringify(v)}`)
      .join(", ");
    if (!setEntries) return;
    if (kind === "node") {
      await client.cypher({
        query: `MATCH (n) WHERE id(n) = ${id} SET ${setEntries} RETURN n`,
        database: selectedSchema,
      });
    }
    // Re-run the query to refresh results.
    executeQuery();
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100">
      {/* Query input */}
      <div className="border-b border-zinc-800 p-4">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-lg font-semibold">Query Editor</h1>
          {status !== "connected" && (
            <span className="text-xs text-yellow-500">Disconnected</span>
          )}
        </div>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full h-28 bg-zinc-900 border border-zinc-700 rounded-md p-3 font-mono text-sm text-zinc-100 resize-y focus:outline-none focus:border-blue-500"
          placeholder="Enter Cypher query..."
          spellCheck={false}
        />
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={executeQuery}
            disabled={running || status !== "connected"}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-md transition-colors"
          >
            {running ? "Running..." : "Execute"}
          </button>
          <span className="text-xs text-zinc-500">Cmd+Enter to run</span>

          {/* View toggle */}
          {result && !error && (
            <div className="flex items-center gap-1 ml-auto">
              <ViewToggle label="Table" active={view === "table"} onClick={() => setView("table")} />
              <ViewToggle label="JSON" active={view === "json"} onClick={() => setView("json")} />
              <ViewToggle
                label="Graph"
                active={view === "graph"}
                onClick={() => setView("graph")}
                disabled={!hasGraphData}
                title={hasGraphData ? undefined : "No graph data in result"}
              />
              <ViewToggle label="Plan" active={view === "plan"} onClick={() => setView("plan")} />
              <span className="text-xs text-zinc-500 ml-3">
                {result.rowCount} row{result.rowCount !== 1 ? "s" : ""} in{" "}
                {result.executionTimeMs ?? 0}ms
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className={`flex-1 relative ${view === "graph" ? "overflow-hidden" : "overflow-auto"}`}>
        {error && (
          <div className="m-4 bg-red-900/30 border border-red-800 rounded-md p-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        {result && !error && view === "table" && (
          <div className="overflow-x-auto p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  {result.columns.map((col) => (
                    <th key={col} className="text-left px-3 py-2 text-zinc-400 font-medium">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-2 font-mono text-xs">
                        {formatCell(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result && !error && view === "json" && (
          <pre className="p-4 font-mono text-xs text-zinc-300 overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}

        {result && !error && view === "graph" && hasGraphData && (
          <div className="absolute inset-0">
            <GraphViewer
              key={JSON.stringify(graphData.nodes.map((n) => n.id))}
              initialData={graphData}
              onExpandNeighbors={handleExpandNeighbors}
              onDeleteNode={handleDeleteNode}
              onEditProperties={handleEditProperties}
            />
          </div>
        )}

        {result && !error && view === "graph" && !hasGraphData && (
          <div className="flex items-center justify-center h-full text-zinc-500 text-sm p-4">
            No graph data found in result. Try a query that returns nodes (e.g. MATCH (n) RETURN n).
          </div>
        )}

        {result && !error && view === "plan" && (
          <div className="p-4 space-y-3">
            {/* Execution summary */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Execution Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase">Rows</p>
                  <p className="text-lg font-bold text-zinc-200">{result.rowCount}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase">Time</p>
                  <p className="text-lg font-bold text-zinc-200">{result.executionTimeMs ?? 0}<span className="text-xs text-zinc-500 ml-0.5">ms</span></p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase">Columns</p>
                  <p className="text-lg font-bold text-zinc-200">{result.columns.length}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase">Avg Row</p>
                  <p className="text-lg font-bold text-zinc-200">
                    {result.rowCount > 0 ? ((result.executionTimeMs ?? 0) / result.rowCount).toFixed(2) : "0"}
                    <span className="text-xs text-zinc-500 ml-0.5">ms</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Query */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Query</h3>
              <pre className="text-xs text-emerald-400 font-mono whitespace-pre-wrap">{query}</pre>
            </div>

            {/* Operator pipeline */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Operator Pipeline</h3>
              <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
                {(() => {
                  const upper = query.toUpperCase();
                  const ops: string[] = [];
                  if (upper.includes("MATCH")) ops.push("Scan");
                  if (upper.includes("WHERE")) ops.push("Filter");
                  if (upper.includes("ORDER BY")) ops.push("Sort");
                  if (upper.includes("DISTINCT")) ops.push("Distinct");
                  if (/\b(COUNT|SUM|AVG|MIN|MAX|COLLECT)\s*\(/.test(upper)) ops.push("Aggregate");
                  if (upper.includes("SKIP")) ops.push("Skip");
                  if (upper.includes("LIMIT")) ops.push("Limit");
                  if (upper.includes("RETURN")) ops.push("Projection");
                  if (upper.includes("CREATE")) ops.push("Create");
                  if (upper.includes("MERGE")) ops.push("Merge");
                  if (upper.includes("DELETE")) ops.push("Delete");
                  if (upper.includes("SET ")) ops.push("Update");
                  if (ops.length === 0) ops.push("Execute");
                  return ops.map((op, i) => (
                    <span key={i} className="flex items-center gap-2">
                      {i > 0 && <span className="text-zinc-600">&rarr;</span>}
                      <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">{op}</span>
                    </span>
                  ));
                })()}
              </div>
            </div>

            {/* Column detail */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Output Columns</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-2 py-1.5 text-zinc-500 font-medium">#</th>
                    <th className="text-left px-2 py-1.5 text-zinc-500 font-medium">Column</th>
                    <th className="text-left px-2 py-1.5 text-zinc-500 font-medium">Sample Value</th>
                    <th className="text-left px-2 py-1.5 text-zinc-500 font-medium">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {result.columns.map((col, i) => {
                    const sample = result.rows[0]?.[i];
                    const valType = sample === null ? "null" : Array.isArray(sample) ? "list" : typeof sample;
                    const valStr = sample === null ? "null" : typeof sample === "object" ? JSON.stringify(sample) : String(sample);
                    return (
                      <tr key={col} className="border-b border-zinc-800/50">
                        <td className="px-2 py-1.5 text-zinc-600 font-mono">{i}</td>
                        <td className="px-2 py-1.5 text-zinc-300 font-mono">{col}</td>
                        <td className="px-2 py-1.5 text-zinc-400 font-mono truncate max-w-xs">{valStr.length > 80 ? valStr.slice(0, 80) + "..." : valStr}</td>
                        <td className="px-2 py-1.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400">{valType}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!result && !error && (
          <div className="text-zinc-600 text-sm p-4">Run a query to see results here.</div>
        )}
      </div>
    </div>
  );
}

function ViewToggle({
  label,
  active,
  onClick,
  disabled,
  title,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`px-2.5 py-1 text-xs rounded transition-colors ${
        active
          ? "bg-zinc-700 text-zinc-100"
          : disabled
            ? "text-zinc-600 cursor-not-allowed"
            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
      }`}
    >
      {label}
    </button>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
