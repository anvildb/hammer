import { useNavigate } from "react-router";
import { useConnection } from "~/lib/connection-context";

interface QuickConsoleProps {
  query: string;
  onQueryChange: (query: string) => void;
}

/** Read-only starters - safe to fire at any database without side effects. */
const PRESETS: { label: string; query: string }[] = [
  { label: "Sample nodes", query: "MATCH (n) RETURN n LIMIT 25" },
  { label: "Node count", query: "MATCH (n) RETURN count(n) AS nodes" },
  {
    label: "Relationships",
    query: "MATCH p = ()-[r]->()\nRETURN p LIMIT 25",
  },
  { label: "Functions", query: "SHOW FUNCTIONS" },
  { label: "Triggers", query: "SHOW TRIGGERS" },
  { label: "Policies", query: "SHOW POLICIES" },
];

/**
 * A launcher for the full editor: type or pick a query here, then Run hands it
 * to `/query`, which executes it on arrival and renders the result as a graph.
 * Nothing runs on this page, so there is one place results ever appear.
 */
export function QuickConsole({ query, onQueryChange }: QuickConsoleProps) {
  const { status, selectedSchema } = useConnection();
  const navigate = useNavigate();

  const disabled = query.trim().length === 0;

  function run() {
    if (disabled) return;
    navigate(`/query?q=${encodeURIComponent(query)}&view=graph`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      run();
    }
  }

  return (
    <section className="flex flex-col rounded-lg border border-zinc-800 bg-zinc-900/40">
      <header className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-zinc-200">Quick query</h2>
          <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">
            {selectedSchema}
          </span>
        </div>
        <span className="text-[11px] text-zinc-600">runs in the editor</span>
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
          rows={6}
          placeholder="MATCH (n) RETURN n LIMIT 25"
          className="w-full resize-y bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
        />

        <div className="flex items-center gap-3">
          <button
            onClick={run}
            disabled={disabled}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-medium rounded-md transition-colors"
          >
            Run
          </button>
          <kbd className="text-[11px] text-zinc-600 font-mono">⌘↵</kbd>
          <span className="text-xs text-zinc-500">opens the graph view</span>
          {status !== "connected" && (
            <span className="text-xs text-amber-500">server unreachable</span>
          )}
        </div>
      </div>
    </section>
  );
}
