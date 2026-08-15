import { useState } from "react";
import { Link } from "react-router";
import { useConnection } from "~/lib/connection-context";
import type { CypherResult } from "~/lib/api-client";
import { formatCell } from "./types";

interface QuickConsoleProps {
  query: string;
  onQueryChange: (query: string) => void;
  /** Fires after a successful run so the dashboard can refresh its counters. */
  onExecuted?: () => void;
}

/** Read-only starters — safe to fire at any database without side effects. */
const PRESETS: { label: string; query: string }[] = [
  { label: "Sample nodes", query: "MATCH (n) RETURN n LIMIT 25" },
  { label: "Node count", query: "MATCH (n) RETURN count(n) AS nodes" },
  {
    label: "Relationships",
    query: "MATCH ()-[r]->()\nRETURN type(r) AS type, count(r) AS count\nORDER BY count DESC",
  },
  { label: "Functions", query: "SHOW FUNCTIONS" },
  { label: "Triggers", query: "SHOW TRIGGERS" },
  { label: "Policies", query: "SHOW POLICIES" },
];

const MAX_HISTORY = 5;
const MAX_PREVIEW_ROWS = 8;

/**
 * A miniature Cypher console for the home page: type or pick a query, run it
 * with ⌘↵, skim the first few rows, then hand the same text off to the full
 * editor via `/query?q=`.
 */
export function QuickConsole({ query, onQueryChange, onExecuted }: QuickConsoleProps) {
  const { client, status, selectedSchema } = useConnection();
  const [result, setResult] = useState<CypherResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  const disabled = running || status !== "connected" || query.trim().length === 0;

  async function run() {
    if (disabled) return;
    setRunning(true);
    setError(null);
    const started = performance.now();
    try {
      const res = await client.cypher({ query, database: selectedSchema });
      setResult(res);
      setElapsedMs(res.executionTimeMs ?? Math.round(performance.now() - started));
      setHistory((prev) => [query, ...prev.filter((q) => q !== query)].slice(0, MAX_HISTORY));
      onExecuted?.();
    } catch (e) {
      setError(String(e));
      setResult(null);
      setElapsedMs(null);
    } finally {
      setRunning(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      run();
    }
  }

  const columns = result?.columns ?? [];
  const rows = result?.rows ?? [];
  const previewRows = rows.slice(0, MAX_PREVIEW_ROWS);

  return (
    <section className="flex flex-col rounded-lg border border-zinc-800 bg-zinc-900/40">
      <header className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-zinc-200">Quick query</h2>
          <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">
            {selectedSchema}
          </span>
        </div>
        <Link
          to={`/query?q=${encodeURIComponent(query)}`}
          className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
        >
          Open in editor →
        </Link>
      </header>

      <div className="p-4 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => onQueryChange(preset.query)}
              className="text-xs text-zinc-400 bg-zinc-800/70 hover:bg-zinc-700 hover:text-zinc-100 border border-zinc-700/60 rounded-full px-2.5 py-1 transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <textarea
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          rows={4}
          placeholder="MATCH (n) RETURN n LIMIT 25"
          className="w-full resize-y bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
        />

        <div className="flex items-center gap-3">
          <button
            onClick={run}
            disabled={disabled}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-medium rounded-md transition-colors"
          >
            {running ? "Running..." : "Run"}
          </button>
          <kbd className="text-[11px] text-zinc-600 font-mono">⌘↵</kbd>
          {result && !error && (
            <span className="text-xs text-zinc-500 tabular-nums">
              {result.rowCount ?? rows.length} row
              {(result.rowCount ?? rows.length) === 1 ? "" : "s"}
              {elapsedMs !== null && ` · ${elapsedMs}ms`}
            </span>
          )}
          {status !== "connected" && (
            <span className="text-xs text-amber-500">server unreachable</span>
          )}
        </div>

        {error && (
          <pre className="text-xs text-red-300 bg-red-950/30 border border-red-900/50 rounded-md p-3 whitespace-pre-wrap break-words max-h-32 overflow-auto">
            {error}
          </pre>
        )}

        {result && !error && rows.length > 0 && (
          <div className="overflow-auto max-h-64 rounded-md border border-zinc-800">
            <table className="w-full text-xs">
              <thead className="sticky top-0">
                <tr className="bg-zinc-900 border-b border-zinc-800">
                  {columns.map((col) => (
                    <th key={col} className="text-left px-3 py-1.5 text-zinc-400 font-medium whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    {row.map((cell, j) => {
                      const text = formatCell(cell);
                      return (
                        <td
                          key={j}
                          title={text}
                          className="px-3 py-1.5 font-mono text-zinc-300 max-w-xs truncate"
                        >
                          {text}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result && !error && rows.length === 0 && (
          <p className="text-xs text-zinc-500">Query returned no rows.</p>
        )}

        {rows.length > MAX_PREVIEW_ROWS && (
          <p className="text-[11px] text-zinc-600">
            Showing {MAX_PREVIEW_ROWS} of {rows.length} rows —{" "}
            <Link
              to={`/query?q=${encodeURIComponent(query)}`}
              className="text-zinc-400 hover:text-zinc-200 underline underline-offset-2"
            >
              open in the editor
            </Link>{" "}
            for the full result.
          </p>
        )}

        {history.length > 0 && (
          <div className="pt-1 border-t border-zinc-800/70">
            <p className="text-[10px] uppercase tracking-wider text-zinc-600 mt-2 mb-1">Recent</p>
            <div className="space-y-0.5">
              {history.map((h) => (
                <button
                  key={h}
                  onClick={() => onQueryChange(h)}
                  title={h}
                  className="block w-full text-left text-[11px] font-mono text-zinc-500 hover:text-zinc-200 truncate transition-colors"
                >
                  {h.replace(/\s+/g, " ")}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
