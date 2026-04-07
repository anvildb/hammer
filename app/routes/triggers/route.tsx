import { useState, useEffect, useCallback } from "react";
import { useConnection } from "~/lib/connection-context";
import type { CypherResult, EventEntry } from "~/lib/api-client";

interface StoredTrigger {
  name: string;
  timing: string;
  event: string;
  target: string;
  priority: number;
  enabled: boolean;
  body: string;
  created_by: string;
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function parseTriggers(result: CypherResult): StoredTrigger[] {
  return result.rows.map((row) => {
    const obj: Record<string, unknown> = {};
    result.columns.forEach((col, i) => {
      obj[col.toLowerCase()] = row[i];
    });
    return {
      name: formatCell(obj.name),
      timing: formatCell(obj.timing),
      event: formatCell(obj.event),
      target: formatCell(obj.target),
      priority: Number(obj.priority ?? 100),
      enabled: obj.enabled === true,
      body: formatCell(obj.body),
      created_by: formatCell(obj.created_by),
    };
  });
}

export default function TriggersRoute() {
  const { client, status } = useConnection();

  // Trigger list
  const [triggers, setTriggers] = useState<StoredTrigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [formName, setFormName] = useState("");
  const [formTiming, setFormTiming] = useState("AFTER");
  const [formEvent, setFormEvent] = useState("INSERT");
  const [formTargetType, setFormTargetType] = useState<"label" | "collection">(
    "collection"
  );
  const [formTarget, setFormTarget] = useState("");
  const [formPriority, setFormPriority] = useState("100");
  const [formBody, setFormBody] = useState("");
  const [formReplace, setFormReplace] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Expanded body viewer
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  // Activity log
  const [activityEvents, setActivityEvents] = useState<EventEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityFilter, setActivityFilter] = useState("");

  // Dependencies
  const [depRows, setDepRows] = useState<Array<Record<string, string>>>([]);
  const [depColumns, setDepColumns] = useState<string[]>([]);
  const [depLoading, setDepLoading] = useState(false);

  const fetchTriggers = useCallback(async () => {
    if (status !== "connected") return;
    try {
      setLoading(true);
      const res = await client.cypher({ query: "SHOW TRIGGERS" });
      setTriggers(parseTriggers(res));
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [client, status]);

  useEffect(() => {
    fetchTriggers();
  }, [fetchTriggers]);

  async function fetchActivity() {
    if (status !== "connected") return;
    setActivityLoading(true);
    try {
      const params: { type?: string; name?: string; limit?: number } = {
        type: "TriggerFired",
        limit: 50,
      };
      if (activityFilter.trim()) {
        params.name = activityFilter.trim();
      }
      const res = await client.events(params);
      // Also fetch errors.
      const errParams = { ...params, type: "TriggerError" };
      const errRes = await client.events(errParams);
      // Merge and sort by timestamp desc.
      const all = [...res.events, ...errRes.events].sort(
        (a, b) => b.timestamp - a.timestamp
      );
      setActivityEvents(all.slice(0, 50));
    } catch {
      // Silently fail — activity log is optional.
      setActivityEvents([]);
    } finally {
      setActivityLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (status !== "connected") return;
    setCreating(true);
    setCreateError(null);
    try {
      const prefix = formReplace ? "CREATE OR REPLACE" : "CREATE";
      const target =
        formTargetType === "label"
          ? `:${formTarget.replace(/^:/, "")}`
          : `COLLECTION ${formTarget}`;
      const priority =
        formPriority && formPriority !== "100"
          ? ` PRIORITY ${formPriority}`
          : "";
      const query = `${prefix} TRIGGER ${formName} ${formTiming} ${formEvent} ON ${target}${priority} FOR EACH ROW AS { ${formBody} }`;
      await client.cypher({ query });
      setFormName("");
      setFormTiming("AFTER");
      setFormEvent("INSERT");
      setFormTarget("");
      setFormPriority("100");
      setFormBody("");
      setFormReplace(false);
      await fetchTriggers();
    } catch (e) {
      setCreateError(String(e));
    } finally {
      setCreating(false);
    }
  }

  async function handleDrop(name: string) {
    if (status !== "connected") return;
    try {
      await client.cypher({ query: `DROP TRIGGER ${name}` });
      await fetchTriggers();
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleToggle(name: string, currentlyEnabled: boolean) {
    if (status !== "connected") return;
    try {
      const action = currentlyEnabled ? "DISABLE" : "ENABLE";
      await client.cypher({ query: `${action} TRIGGER ${name}` });
      await fetchTriggers();
    } catch (e) {
      setError(String(e));
    }
  }

  if (status !== "connected") {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        Waiting for server connection...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 overflow-y-auto">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4">
        <h1 className="text-lg font-semibold">Triggers</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Event-driven logic that fires automatically on data changes.
        </p>
      </div>

      <div className="flex-1 p-6 space-y-8">
        {/* Trigger table */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
            Registered Triggers
          </h2>
          {loading && (
            <p className="text-sm text-zinc-500">Loading triggers...</p>
          )}
          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-md p-3 text-red-300 text-sm mb-3">
              {error}
            </div>
          )}
          {!loading && !error && triggers.length === 0 && (
            <p className="text-sm text-zinc-500">No triggers defined yet.</p>
          )}
          {!loading && triggers.length > 0 && (
            <div className="overflow-x-auto rounded-md border border-zinc-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-900 border-b border-zinc-800">
                    <th className="text-left px-3 py-2 text-zinc-400 font-medium">
                      Name
                    </th>
                    <th className="text-left px-3 py-2 text-zinc-400 font-medium">
                      Timing
                    </th>
                    <th className="text-left px-3 py-2 text-zinc-400 font-medium">
                      Event
                    </th>
                    <th className="text-left px-3 py-2 text-zinc-400 font-medium">
                      Target
                    </th>
                    <th className="text-left px-3 py-2 text-zinc-400 font-medium">
                      Priority
                    </th>
                    <th className="text-left px-3 py-2 text-zinc-400 font-medium">
                      Status
                    </th>
                    <th className="text-left px-3 py-2 text-zinc-400 font-medium">
                      Created By
                    </th>
                    <th className="px-3 py-2 w-40"></th>
                  </tr>
                </thead>
                <tbody>
                  {triggers.map((t, i) => (
                    <tr
                      key={`${t.name}-${i}`}
                      className={`border-b border-zinc-800/50 hover:bg-zinc-900/50 ${
                        !t.enabled ? "opacity-50" : ""
                      }`}
                    >
                      <td className="px-3 py-2 font-mono text-xs">
                        {t.name}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-xs ${
                            t.timing === "BEFORE"
                              ? "bg-amber-900/40 text-amber-300"
                              : "bg-blue-900/40 text-blue-300"
                          }`}
                        >
                          {t.timing}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-xs ${
                            t.event === "DELETE"
                              ? "bg-red-900/40 text-red-300"
                              : t.event === "UPDATE"
                                ? "bg-yellow-900/40 text-yellow-300"
                                : "bg-emerald-900/40 text-emerald-300"
                          }`}
                        >
                          {t.event}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs max-w-40 truncate" title={t.target}>
                        {t.target}
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-400">
                        {t.priority}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-xs ${
                            t.enabled
                              ? "bg-emerald-900/40 text-emerald-300"
                              : "bg-zinc-800 text-zinc-500"
                          }`}
                        >
                          {t.enabled ? "enabled" : "disabled"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-400">
                        {t.created_by}
                      </td>
                      <td className="px-3 py-2 text-right space-x-1">
                        <button
                          onClick={() =>
                            setExpandedIdx(expandedIdx === i ? null : i)
                          }
                          className="px-2 py-1 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded transition-colors"
                        >
                          {expandedIdx === i ? "Hide" : "Body"}
                        </button>
                        <button
                          onClick={() => handleToggle(t.name, t.enabled)}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            t.enabled
                              ? "text-amber-400 hover:text-amber-300 hover:bg-amber-900/30"
                              : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/30"
                          }`}
                        >
                          {t.enabled ? "Disable" : "Enable"}
                        </button>
                        <button
                          onClick={() => handleDrop(t.name)}
                          className="px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors"
                        >
                          Drop
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Expanded body viewer */}
              {expandedIdx !== null && triggers[expandedIdx] && (
                <div className="border-t border-zinc-800 bg-zinc-900/80 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="text-xs text-zinc-400">
                      Trigger body:{" "}
                      <span className="font-mono text-zinc-300">
                        {triggers[expandedIdx].name}
                      </span>
                    </p>
                    <span className="text-[10px] text-zinc-600">
                      Available variables:{" "}
                      {triggers[expandedIdx].event === "INSERT"
                        ? "NEW"
                        : triggers[expandedIdx].event === "DELETE"
                          ? "OLD"
                          : "OLD, NEW"}
                    </span>
                  </div>
                  <pre className="bg-zinc-950 border border-zinc-800 rounded p-3 font-mono text-xs text-zinc-300 overflow-x-auto whitespace-pre-wrap">
                    {triggers[expandedIdx].body}
                  </pre>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Create trigger form */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
            Create Trigger
          </h2>
          {createError && (
            <div className="bg-red-900/30 border border-red-800 rounded-md p-3 text-red-300 text-sm mb-3">
              {createError}
            </div>
          )}
          <form
            onSubmit={handleCreate}
            className="bg-zinc-900 border border-zinc-800 rounded-md p-4 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Trigger Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  placeholder="on_user_create"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Timing
                </label>
                <select
                  value={formTiming}
                  onChange={(e) => setFormTiming(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="BEFORE">BEFORE</option>
                  <option value="AFTER">AFTER</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Event
                </label>
                <select
                  value={formEvent}
                  onChange={(e) => setFormEvent(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="INSERT">INSERT</option>
                  <option value="UPDATE">UPDATE</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Priority
                </label>
                <input
                  type="number"
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value)}
                  placeholder="100"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Target Type
                </label>
                <select
                  value={formTargetType}
                  onChange={(e) =>
                    setFormTargetType(
                      e.target.value as "label" | "collection"
                    )
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="collection">Collection</option>
                  <option value="label">Label</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Target{" "}
                  <span className="text-zinc-600">
                    ({formTargetType === "label" ? "e.g. Person" : "e.g. auth.users"})
                  </span>
                </label>
                <input
                  type="text"
                  value={formTarget}
                  onChange={(e) => setFormTarget(e.target.value)}
                  required
                  placeholder={
                    formTargetType === "label" ? "Person" : "auth.users"
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">
                Trigger Body{" "}
                <span className="text-zinc-600">
                  (available:{" "}
                  {formEvent === "INSERT"
                    ? "NEW"
                    : formEvent === "DELETE"
                      ? "OLD"
                      : "OLD, NEW"}
                  {formTiming === "BEFORE" && " | RAISE | SET NEW.field"})
                </span>
              </label>
              <textarea
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                required
                rows={5}
                placeholder={`CREATE DOCUMENT IN profiles NEW.username {\n  username: NEW.username,\n  email: NEW.email\n}`}
                spellCheck={false}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 font-mono resize-y focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={creating || status !== "connected"}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-md transition-colors"
              >
                {creating ? "Creating..." : "Create Trigger"}
              </button>
              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formReplace}
                  onChange={(e) => setFormReplace(e.target.checked)}
                  className="rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500"
                />
                OR REPLACE
              </label>
            </div>
          </form>
        </section>

        {/* Activity Log */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
            Activity Log
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4 space-y-4">
            <div className="flex items-end gap-3">
              <div className="flex-1 max-w-xs">
                <label className="block text-xs text-zinc-400 mb-1">
                  Filter by trigger name
                </label>
                <input
                  type="text"
                  value={activityFilter}
                  onChange={(e) => setActivityFilter(e.target.value)}
                  placeholder="All triggers"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                onClick={fetchActivity}
                disabled={activityLoading || status !== "connected"}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-md transition-colors"
              >
                {activityLoading ? "Loading..." : "Load Activity"}
              </button>
            </div>

            {activityEvents.length > 0 && (
              <div className="overflow-x-auto rounded-md border border-zinc-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-zinc-950 border-b border-zinc-800">
                      <th className="text-left px-3 py-2 text-zinc-400 font-medium">
                        Time
                      </th>
                      <th className="text-left px-3 py-2 text-zinc-400 font-medium">
                        Trigger
                      </th>
                      <th className="text-left px-3 py-2 text-zinc-400 font-medium">
                        Timing
                      </th>
                      <th className="text-left px-3 py-2 text-zinc-400 font-medium">
                        Event
                      </th>
                      <th className="text-left px-3 py-2 text-zinc-400 font-medium">
                        Target
                      </th>
                      <th className="text-left px-3 py-2 text-zinc-400 font-medium">
                        Duration
                      </th>
                      <th className="text-left px-3 py-2 text-zinc-400 font-medium">
                        Status
                      </th>
                      <th className="text-left px-3 py-2 text-zinc-400 font-medium">
                        Error
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityEvents.map((evt) => (
                      <tr
                        key={evt.id}
                        className={`border-b border-zinc-800/50 hover:bg-zinc-900/50 ${
                          !evt.success ? "bg-red-950/20" : ""
                        }`}
                      >
                        <td className="px-3 py-1.5 text-xs text-zinc-400 font-mono whitespace-nowrap">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="px-3 py-1.5 text-xs font-mono">
                          {evt.name}
                        </td>
                        <td className="px-3 py-1.5 text-xs">
                          {evt.metadata?.timing ?? ""}
                        </td>
                        <td className="px-3 py-1.5 text-xs">
                          {evt.metadata?.event ?? ""}
                        </td>
                        <td className="px-3 py-1.5 text-xs font-mono max-w-32 truncate">
                          {evt.metadata?.target ?? ""}
                        </td>
                        <td className="px-3 py-1.5 text-xs text-zinc-400">
                          {evt.duration_ms}ms
                        </td>
                        <td className="px-3 py-1.5 text-xs">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-xs ${
                              evt.success
                                ? "bg-emerald-900/40 text-emerald-300"
                                : "bg-red-900/40 text-red-300"
                            }`}
                          >
                            {evt.success ? "OK" : "FAIL"}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-xs text-red-400 max-w-48 truncate" title={evt.error ?? ""}>
                          {evt.error || ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!activityLoading && activityEvents.length === 0 && (
              <p className="text-sm text-zinc-500">
                No trigger activity recorded. Click "Load Activity" to fetch recent trigger firings.
              </p>
            )}
          </div>
        </section>

        {/* Dependency Analysis */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
            Dependency Analysis
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4 space-y-4">
            <button
              onClick={async () => {
                setDepLoading(true);
                try {
                  const res = await client.cypher({ query: "SHOW DEPENDENCIES" });
                  setDepColumns(res.columns);
                  setDepRows(
                    res.rows.map((row) => {
                      const obj: Record<string, string> = {};
                      res.columns.forEach((col, i) => {
                        obj[col] = String(row[i] ?? "");
                      });
                      return obj;
                    })
                  );
                } catch {
                  setDepRows([]);
                  setDepColumns([]);
                } finally {
                  setDepLoading(false);
                }
              }}
              disabled={depLoading || status !== "connected"}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-md transition-colors"
            >
              {depLoading ? "Analyzing..." : "Analyze Dependencies"}
            </button>

            {depRows.length > 0 && (
              <div className="overflow-x-auto rounded-md border border-zinc-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-zinc-950 border-b border-zinc-800">
                      {depColumns.map((col) => (
                        <th
                          key={col}
                          className="text-left px-3 py-2 text-zinc-400 font-medium"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {depRows.map((row, i) => {
                      const isWarning = Object.values(row).some((v) =>
                        v.startsWith("\u26a0")
                      );
                      return (
                        <tr
                          key={i}
                          className={`border-b border-zinc-800/50 hover:bg-zinc-900/50 ${
                            isWarning ? "bg-amber-950/20" : ""
                          }`}
                        >
                          {depColumns.map((col) => (
                            <td
                              key={col}
                              className={`px-3 py-1.5 text-xs font-mono max-w-64 truncate ${
                                isWarning ? "text-amber-300" : ""
                              }`}
                              title={row[col]}
                            >
                              {row[col]}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!depLoading && depRows.length === 0 && (
              <p className="text-sm text-zinc-500">
                Click "Analyze Dependencies" to map trigger, function, and sync rule relationships.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
