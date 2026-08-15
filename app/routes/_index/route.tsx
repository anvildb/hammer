import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useConnection } from "~/lib/connection-context";
import type { SchemaData } from "~/components/schema/types";
import { ActivityFeed } from "~/components/home/activity-feed";
import { QuickActions } from "~/components/home/quick-actions";
import { QuickConsole } from "~/components/home/quick-console";
import { SchemaGlance } from "~/components/home/schema-glance";
import { StatTile } from "~/components/home/stat-tile";
import {
  MAX_SAMPLES,
  formatAgo,
  formatUptime,
  type StatsSample,
  type StatsSnapshot,
} from "~/components/home/types";

const INTERVALS = [
  { label: "2s", ms: 2000 },
  { label: "5s", ms: 5000 },
  { label: "15s", ms: 15000 },
  { label: "60s", ms: 60000 },
];

const DEFAULT_QUERY = "MATCH (n)\nRETURN n LIMIT 25";

export default function IndexRoute() {
  const { client, status, serverInfo, currentUser, isAdmin, selectedSchema } = useConnection();

  const [stats, setStats] = useState<StatsSnapshot | null>(null);
  const [samples, setSamples] = useState<StatsSample[]>([]);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const [live, setLive] = useState(true);
  const [intervalMs, setIntervalMs] = useState(5000);
  const [now, setNow] = useState(() => 0);

  const [schema, setSchema] = useState<SchemaData | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  const [consoleQuery, setConsoleQuery] = useState(DEFAULT_QUERY);

  /** Read a single numeric cell out of a count query, or null if it fails. */
  const countViaCypher = useCallback(
    async (query: string): Promise<number | null> => {
      try {
        const res = await client.cypher({ query, database: selectedSchema });
        const cell = res.rows?.[0]?.[0];
        return typeof cell === "number" ? cell : null;
      } catch {
        return null;
      }
    },
    [client, selectedSchema],
  );

  const refreshStats = useCallback(async () => {
    try {
      const s = await client.stats();
      setStats({
        nodes: s.node_count,
        relationships: s.relationship_count,
        collections: s.collection_count,
        documents: s.document_count,
        syncRules: s.sync_rules,
        rlsPolicies: s.rls_policies,
      });
      setStatsError(null);
    } catch {
      // `/admin/stats` is admin-only. Everyone else gets what Cypher will
      // tell them and honest blanks for the rest.
      const [nodes, relationships] = await Promise.all([
        countViaCypher("MATCH (n) RETURN count(n) AS c"),
        countViaCypher("MATCH ()-[r]->() RETURN count(r) AS c"),
      ]);
      setStats({
        nodes,
        relationships,
        collections: null,
        documents: null,
        syncRules: null,
        rlsPolicies: null,
      });
      setStatsError(
        nodes === null && relationships === null ? "Server counters are unavailable." : null,
      );
    } finally {
      setLastUpdated(Date.now());
    }
  }, [client, countViaCypher]);

  const refreshSchema = useCallback(async () => {
    setSchemaLoading(true);
    try {
      const data = (await client.getSchema("default")) as SchemaData;
      setSchema(data);
      setSchemaError(null);
    } catch (e) {
      setSchemaError(String(e));
    } finally {
      setSchemaLoading(false);
    }
  }, [client]);

  // Poll the counters. Pausing stops the timer but leaves the last reading up.
  useEffect(() => {
    if (status !== "connected") return;
    let cancelled = false;

    async function poll() {
      if (!cancelled) await refreshStats();
    }

    poll();
    if (!live) return () => { cancelled = true; };

    const id = setInterval(poll, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [status, live, intervalMs, refreshStats]);

  useEffect(() => {
    if (status !== "connected") return;
    refreshSchema();
  }, [status, refreshSchema]);

  // Keep a rolling window of readings so the tiles can show a trend.
  useEffect(() => {
    if (!stats || stats.nodes === null || lastUpdated === null) return;
    setSamples((prev) => {
      const next = [
        ...prev,
        {
          t: lastUpdated,
          nodes: stats.nodes ?? 0,
          relationships: stats.relationships ?? 0,
          documents: stats.documents ?? 0,
        },
      ];
      return next.slice(-MAX_SAMPLES);
    });
  }, [stats, lastUpdated]);

  // Drives the "updated Ns ago" label. Starts after mount so server and
  // client render the same markup.
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  const series = useMemo(
    () => ({
      nodes: samples.map((s) => s.nodes),
      relationships: samples.map((s) => s.relationships),
      documents: samples.map((s) => s.documents),
    }),
    [samples],
  );

  /** Change since the oldest sample still in the window. */
  function delta(key: "nodes" | "relationships" | "documents"): number | null {
    if (samples.length < 2) return null;
    return samples[samples.length - 1][key] - samples[0][key];
  }

  const isEmptyGraph = stats?.nodes === 0 && (stats?.documents ?? 0) === 0;
  const connected = status === "connected";
  /** True once we've fallen back to Cypher counts — the rest is admin-gated. */
  const restricted = stats !== null && stats.collections === null;

  const hint = (normal: string) => (restricted ? "requires admin" : normal);

  return (
    <div className="h-full overflow-y-auto bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        {/* Hero */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Anvil DB</h1>
            <p className="mt-1 text-sm text-zinc-400">
              A graph database{currentUser ? ` — signed in as ${currentUser}` : ""}.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <Pill label="status" value={status} tone={connected ? "good" : "warn"} />
              <Pill label="version" value={serverInfo?.version ?? "—"} />
              <Pill label="edition" value={serverInfo?.edition ?? "—"} />
              <Pill label="uptime" value={formatUptime(serverInfo?.uptime)} />
              <Pill label="schema" value={selectedSchema} />
              <Pill label="api" value={client.baseUrl} mono />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLive((v) => !v)}
              className={`flex items-center gap-1.5 text-xs rounded-md border px-2.5 py-1.5 transition-colors ${
                live
                  ? "border-emerald-700/50 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                  : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
              title={live ? "Pause polling" : "Resume polling"}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${live ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"}`}
              />
              {live ? "Live" : "Paused"}
            </button>

            <select
              value={intervalMs}
              onChange={(e) => setIntervalMs(Number(e.target.value))}
              className="text-xs bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-md px-2 py-1.5 focus:outline-none focus:border-zinc-500"
              title="Polling interval"
            >
              {INTERVALS.map((i) => (
                <option key={i.ms} value={i.ms}>
                  every {i.label}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                refreshStats();
                refreshSchema();
              }}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-md px-2.5 py-1.5 transition-colors"
            >
              Refresh
            </button>

            {lastUpdated !== null && now > 0 && (
              <span className="text-[11px] text-zinc-600 tabular-nums w-20">
                {formatAgo(lastUpdated, now)}
              </span>
            )}
          </div>
        </header>

        {!connected && (
          <div className="rounded-lg border border-amber-800/50 bg-amber-950/20 px-4 py-3 text-sm text-amber-300">
            Not connected to{" "}
            <span className="font-mono text-amber-200">{client.baseUrl}</span> — retrying every 5s.
            Start the server with <code className="font-mono text-amber-200">anvil start</code>, or
            point Hammer elsewhere in{" "}
            <Link to="/settings" className="underline underline-offset-2 hover:text-amber-100">
              Settings
            </Link>
            .
          </div>
        )}

        {statsError && connected && (
          <p className="text-xs text-zinc-500">{statsError}</p>
        )}

        {/* Counters */}
        <div className="grid gap-2 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          <StatTile
            label="Nodes"
            value={stats?.nodes ?? null}
            delta={delta("nodes")}
            series={series.nodes}
            to="/graph"
            hint="graph vertices"
            accent="text-blue-300"
          />
          <StatTile
            label="Relationships"
            value={stats?.relationships ?? null}
            delta={delta("relationships")}
            series={series.relationships}
            to="/graph"
            hint="graph edges"
            accent="text-violet-300"
          />
          <StatTile
            label="Documents"
            value={stats?.documents ?? null}
            delta={delta("documents")}
            // No sparkline when the count is unknown — a flat line at zero
            // would read as a real reading.
            series={stats && stats.documents === null ? [] : series.documents}
            to="/documents"
            hint={hint("across all collections")}
            accent="text-emerald-300"
          />
          <StatTile
            label="Collections"
            value={stats?.collections ?? null}
            to="/documents"
            hint={hint("document stores")}
            accent="text-teal-300"
          />
          <StatTile
            label="RLS policies"
            value={stats?.rlsPolicies ?? null}
            to={isAdmin ? "/policies" : undefined}
            hint={hint("row-level security")}
            accent="text-amber-300"
          />
          <StatTile
            label="Sync rules"
            value={stats?.syncRules ?? null}
            to={isAdmin ? "/settings" : undefined}
            hint={hint("graph ↔ document")}
            accent="text-rose-300"
          />
        </div>

        {connected && isEmptyGraph && <GettingStarted onPickQuery={setConsoleQuery} />}

        {/* Working surfaces */}
        <div className="grid gap-4 xl:grid-cols-2 items-start">
          <QuickConsole
            query={consoleQuery}
            onQueryChange={setConsoleQuery}
            onExecuted={refreshStats}
          />
          <div className="space-y-4">
            <SchemaGlance
              schema={schema}
              loading={schemaLoading}
              error={schemaError}
              onPickQuery={setConsoleQuery}
              onRefresh={refreshSchema}
            />
            {isAdmin && <ActivityFeed live={live} intervalMs={intervalMs} />}
          </div>
        </div>

        <QuickActions isAdmin={isAdmin} />

        <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 pb-4 text-[11px] text-zinc-600">
          <span>
            Press <kbd className="font-mono text-zinc-500">⌘K</kbd> for the command palette
          </span>
          <span>
            <kbd className="font-mono text-zinc-500">⌘↵</kbd> runs the query above
          </span>
          <Link to="/help" className="hover:text-zinc-400 transition-colors">
            Documentation →
          </Link>
        </footer>
      </div>
    </div>
  );
}

function Pill({
  label,
  value,
  tone,
  mono,
}: {
  label: string;
  value: string;
  tone?: "good" | "warn";
  mono?: boolean;
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-300 border-emerald-800/60 bg-emerald-500/5"
      : tone === "warn"
        ? "text-amber-300 border-amber-800/60 bg-amber-500/5"
        : "text-zinc-400 border-zinc-800 bg-zinc-900/60";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${toneClass}`}
    >
      <span className="uppercase tracking-wider text-zinc-600">{label}</span>
      <span className={`${mono ? "font-mono" : ""} max-w-[16rem] truncate`}>{value}</span>
    </span>
  );
}

/** Shown while the database is still empty — three concrete next steps. */
function GettingStarted({ onPickQuery }: { onPickQuery: (query: string) => void }) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
      <h2 className="text-sm font-semibold text-zinc-200">This database is empty</h2>
      <p className="mt-1 text-xs text-zinc-500">Pick a starting point:</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <StepCard
          step="1"
          title="Load the sample dataset"
          body="19 nodes and 51 relationships to poke at."
          action={
            <Link to="/import" className="text-xs text-blue-400 hover:text-blue-300">
              Open Import →
            </Link>
          }
        />
        <StepCard
          step="2"
          title="Create your first node"
          body="Drops a CREATE statement into the console."
          action={
            <button
              onClick={() =>
                onPickQuery('CREATE (n:Person {name: "Alice", age: 30})\nRETURN n')
              }
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Load the query →
            </button>
          }
        />
        <StepCard
          step="3"
          title="Read the docs"
          body="Cypher, documents, triggers, RLS, storage."
          action={
            <Link to="/help" className="text-xs text-blue-400 hover:text-blue-300">
              Open Help →
            </Link>
          }
        />
      </div>
    </section>
  );
}

function StepCard({
  step,
  title,
  body,
  action,
}: {
  step: string;
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950/50 p-3">
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-zinc-800 text-[10px] font-mono text-zinc-400">
          {step}
        </span>
        <span className="text-xs font-medium text-zinc-200">{title}</span>
      </div>
      <p className="mt-1.5 text-[11px] text-zinc-500">{body}</p>
      <div className="mt-2">{action}</div>
    </div>
  );
}
