import { useState } from "react";
import { useConnection } from "~/lib/connection-context";

type ResultView = "data" | "json";

export default function GraphQLRoute() {
  const { client, status } = useConnection();
  const [query, setQuery] = useState(`{
  __schema {
    queryType { name }
    mutationType { name }
    types {
      name
      kind
    }
  }
}`);
  const [variables, setVariables] = useState("{}");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [view, setView] = useState<ResultView>("data");
  const [showVars, setShowVars] = useState(false);

  async function executeQuery() {
    if (status !== "connected") return;
    setRunning(true);
    setError(null);
    try {
      let parsedVars: Record<string, unknown> = {};
      if (variables.trim() && variables.trim() !== "{}") {
        parsedVars = JSON.parse(variables);
      }
      const res = await client.graphql({
        query,
        variables: parsedVars,
      });
      if (res.errors && res.errors.length > 0) {
        setError(res.errors.map((e: { message: string }) => e.message).join("\n"));
        setResult(res as unknown as Record<string, unknown>);
      } else {
        setResult(res as unknown as Record<string, unknown>);
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

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800 p-4">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-lg font-semibold">GraphQL Playground</h1>
          {status !== "connected" && (
            <span className="text-xs text-yellow-500">Disconnected</span>
          )}
        </div>

        {/* Query editor */}
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full h-40 bg-zinc-900 border border-zinc-700 rounded-md p-3 font-mono text-sm text-zinc-100 resize-y focus:outline-none focus:border-blue-500"
          placeholder="Enter GraphQL query..."
          spellCheck={false}
        />

        {/* Variables (collapsible) */}
        <button
          onClick={() => setShowVars(!showVars)}
          className="text-xs text-zinc-500 hover:text-zinc-300 mt-1 mb-1"
        >
          {showVars ? "Hide" : "Show"} Variables
        </button>
        {showVars && (
          <textarea
            value={variables}
            onChange={(e) => setVariables(e.target.value)}
            className="w-full h-20 bg-zinc-900 border border-zinc-700 rounded-md p-3 font-mono text-xs text-zinc-100 resize-y focus:outline-none focus:border-blue-500"
            placeholder='{"key": "value"}'
            spellCheck={false}
          />
        )}

        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={executeQuery}
            disabled={running || status !== "connected"}
            className="px-4 py-1.5 bg-pink-600 hover:bg-pink-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-md transition-colors"
          >
            {running ? "Running..." : "Execute"}
          </button>
          <span className="text-xs text-zinc-500">Cmd+Enter to run</span>

          {result && (
            <div className="flex items-center gap-1 ml-auto">
              <ViewBtn label="Data" active={view === "data"} onClick={() => setView("data")} />
              <ViewBtn label="JSON" active={view === "json"} onClick={() => setView("json")} />
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto p-4">
        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-md p-3 text-red-300 text-sm mb-4 whitespace-pre-wrap">
            {error}
          </div>
        )}

        {result && view === "data" && (
          <DataView data={(result as { data?: unknown }).data} />
        )}

        {result && view === "json" && (
          <pre className="font-mono text-xs text-zinc-300 overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}

        {!result && !error && (
          <div className="text-zinc-600 text-sm">
            Run a GraphQL query to see results here.
          </div>
        )}
      </div>
    </div>
  );
}

function ViewBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 text-xs rounded transition-colors ${
        active ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
      }`}
    >
      {label}
    </button>
  );
}

function DataView({ data }: { data: unknown }) {
  if (data === null || data === undefined) {
    return <p className="text-zinc-500 text-sm italic">No data</p>;
  }

  if (typeof data !== "object") {
    return <pre className="font-mono text-xs text-zinc-300">{String(data)}</pre>;
  }

  return (
    <div className="space-y-3">
      {Object.entries(data as Record<string, unknown>).map(([key, value]) => (
        <div key={key}>
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">{key}</h3>
          {Array.isArray(value) ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {value.length > 0 && typeof value[0] === "object" && value[0] !== null
                      ? Object.keys(value[0] as Record<string, unknown>).map((col) => (
                          <th key={col} className="text-left px-3 py-1.5 text-zinc-500 font-medium text-xs">
                            {col}
                          </th>
                        ))
                      : <th className="text-left px-3 py-1.5 text-zinc-500 text-xs">Value</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  {value.map((item, i) => (
                    <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                      {typeof item === "object" && item !== null
                        ? Object.values(item as Record<string, unknown>).map((v, j) => (
                            <td key={j} className="px-3 py-1.5 font-mono text-xs text-zinc-300">
                              {v === null ? <span className="text-zinc-600">null</span> : typeof v === "object" ? JSON.stringify(v) : String(v)}
                            </td>
                          ))
                        : <td className="px-3 py-1.5 font-mono text-xs text-zinc-300">{String(item)}</td>
                      }
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : typeof value === "object" && value !== null ? (
            <pre className="font-mono text-xs text-zinc-300 bg-zinc-900 rounded p-2">
              {JSON.stringify(value, null, 2)}
            </pre>
          ) : (
            <p className="font-mono text-xs text-zinc-300">{String(value)}</p>
          )}
        </div>
      ))}
    </div>
  );
}
