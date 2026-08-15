import { useState } from "react";
import { Link } from "react-router";
import { schemaColor, type SchemaData } from "~/components/schema/types";
import { useConnection } from "~/lib/connection-context";
import { formatCount } from "./types";

interface SchemaGlanceProps {
  schema: SchemaData | null;
  loading: boolean;
  error: string | null;
  /** Push a query into the quick console. */
  onPickQuery: (query: string) => void;
  onRefresh: () => void;
}

type Tab = "labels" | "relationships" | "indexes";

const TABS: { id: Tab; label: string }[] = [
  { id: "labels", label: "Labels" },
  { id: "relationships", label: "Relationships" },
  { id: "indexes", label: "Indexes" },
];

const STATUS_COLOR: Record<string, string> = {
  online: "bg-emerald-500",
  populating: "bg-amber-500",
  failed: "bg-red-500",
};

/**
 * Compact schema explorer. Every label and relationship type is a button that
 * loads a matching query into the quick console, so the page doubles as a
 * launcher for the graph you actually have.
 */
export function SchemaGlance({ schema, loading, error, onPickQuery, onRefresh }: SchemaGlanceProps) {
  const { status } = useConnection();
  const [tab, setTab] = useState<Tab>("labels");

  // While the server is unreachable the fetch never starts, so `loading`
  // would otherwise sit at "Reading schema..." indefinitely.
  const waiting = status !== "connected" && !schema;

  const labels = schema?.labels ?? [];
  const relTypes = schema?.relationshipTypes ?? [];
  const indexes = schema?.indexes ?? [];

  const counts: Record<Tab, number> = {
    labels: labels.length,
    relationships: relTypes.length,
    indexes: indexes.length,
  };

  return (
    <section className="flex flex-col rounded-lg border border-zinc-800 bg-zinc-900/40">
      <header className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-200">Schema</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="text-xs text-zinc-500 hover:text-zinc-200 disabled:text-zinc-700 transition-colors"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
          <Link to="/schema" className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors">
            Browse →
          </Link>
        </div>
      </header>

      <div className="flex border-b border-zinc-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? "text-zinc-100 border-zinc-400"
                : "text-zinc-500 border-transparent hover:text-zinc-300"
            }`}
          >
            <span>{t.label}</span>
            <span className="text-[10px] font-mono text-zinc-600">{counts[t.id]}</span>
          </button>
        ))}
      </div>

      <div className="p-4 min-h-[8rem]">
        {waiting && <p className="text-xs text-zinc-500">Waiting for the server connection.</p>}

        {!waiting && error && (
          <p className="text-xs text-red-400">Could not load schema: {error}</p>
        )}

        {!waiting && !error && loading && !schema && (
          <p className="text-xs text-zinc-500">Reading schema...</p>
        )}

        {!error && schema && tab === "labels" && (
          labels.length === 0 ? (
            <EmptyHint
              text="No labels yet."
              actionLabel="Create a node"
              onAction={() =>
                onPickQuery('CREATE (n:Person {name: "Alice", age: 30})\nRETURN n')
              }
            />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {labels.map((label) => (
                <button
                  key={label.name}
                  onClick={() => onPickQuery(`MATCH (n:${label.name})\nRETURN n LIMIT 25`)}
                  title={
                    label.properties.length
                      ? `Properties: ${label.properties.join(", ")}`
                      : "No properties recorded"
                  }
                  className="group flex items-center gap-1.5 text-xs bg-zinc-800/70 hover:bg-zinc-700 border border-zinc-700/60 rounded-full pl-2 pr-2.5 py-1 transition-colors"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: schemaColor(label.name) }}
                  />
                  <span className="text-zinc-300 group-hover:text-zinc-100">{label.name}</span>
                  <span className="text-[10px] font-mono text-zinc-500 tabular-nums">
                    {formatCount(label.nodeCount)}
                  </span>
                </button>
              ))}
            </div>
          )
        )}

        {!error && schema && tab === "relationships" && (
          relTypes.length === 0 ? (
            <EmptyHint
              text="No relationship types yet."
              actionLabel="Connect two nodes"
              onAction={() =>
                onPickQuery(
                  'MATCH (a:Person {name: "Alice"}), (b:Person {name: "Bob"})\nMERGE (a)-[:FRIEND]->(b)',
                )
              }
            />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {relTypes.map((rel) => (
                <button
                  key={rel.name}
                  onClick={() =>
                    onPickQuery(`MATCH p = ()-[r:${rel.name}]->()\nRETURN p LIMIT 25`)
                  }
                  title={
                    rel.fromLabels.length || rel.toLabels.length
                      ? `${rel.fromLabels.join("|") || "*"} → ${rel.toLabels.join("|") || "*"}`
                      : undefined
                  }
                  className="group flex items-center gap-1.5 text-xs bg-zinc-800/70 hover:bg-zinc-700 border border-zinc-700/60 rounded-full px-2.5 py-1 transition-colors"
                >
                  <span className="font-mono text-zinc-300 group-hover:text-zinc-100">
                    {rel.name}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 tabular-nums">
                    {formatCount(rel.count)}
                  </span>
                </button>
              ))}
            </div>
          )
        )}

        {!error && schema && tab === "indexes" && (
          indexes.length === 0 ? (
            <EmptyHint
              text="No indexes defined."
              actionLabel="Create one"
              onAction={() => onPickQuery("CREATE INDEX ON :Person(name)")}
            />
          ) : (
            <ul className="space-y-1">
              {indexes.map((index) => (
                <li
                  key={index.name}
                  className="flex items-center gap-2 text-xs text-zinc-400 py-1 border-b border-zinc-800/50 last:border-0"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      STATUS_COLOR[index.status] ?? "bg-zinc-600"
                    }`}
                    title={index.status}
                  />
                  <span className="font-mono text-zinc-300 truncate">
                    {index.labelsOrTypes.join(", ")}({index.properties.join(", ")})
                  </span>
                  <span className="ml-auto text-[10px] uppercase tracking-wider text-zinc-600 shrink-0">
                    {index.type}
                  </span>
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </section>
  );
}

function EmptyHint({
  text,
  actionLabel,
  onAction,
}: {
  text: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <p className="text-xs text-zinc-500">
      {text}{" "}
      <button
        onClick={onAction}
        className="text-zinc-300 hover:text-white underline underline-offset-2"
      >
        {actionLabel}
      </button>
    </p>
  );
}
