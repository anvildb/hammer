// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
import { useState, useEffect, useCallback } from "react";
import { useConnection } from "~/lib/connection-context";
import type { CypherResult, EventEntry } from "~/lib/api-client";

interface StoredFunction {
  name: string;
  signature: string;
  return_type: string;
  mutating: boolean;
  schema: string;
  body: string;
  created_by: string;
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function parseFunctions(result: CypherResult): StoredFunction[] {
  return result.rows.map((row) => {
    const obj: Record<string, unknown> = {};
    result.columns.forEach((col, i) => {
      obj[col.toLowerCase()] = row[i];
    });
    return {
      name: formatCell(obj.name),
      signature: formatCell(obj.signature),
      return_type: formatCell(obj.return_type),
      mutating: obj.mutating === true,
      schema: formatCell(obj.schema),
      body: formatCell(obj.body),
      created_by: formatCell(obj.created_by),
    };
  });
}

export default function FunctionsRoute() {
  const { client, status, selectedSchema } = useConnection();

  // Function list
  const [functions, setFunctions] = useState<StoredFunction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [formName, setFormName] = useState("");
  const [formParams, setFormParams] = useState("");
  const [formReturns, setFormReturns] = useState("STRING");
  const [formMutating, setFormMutating] = useState(false);
  const [formBody, setFormBody] = useState("");
  const [formReplace, setFormReplace] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Test panel
  const [testName, setTestName] = useState("");
  const [testArgs, setTestArgs] = useState("");
  const [testResult, setTestResult] = useState<CypherResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  // Expanded function body viewer
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  // Call log
  const [callEvents, setCallEvents] = useState<EventEntry[]>([]);
  const [callLogLoading, setCallLogLoading] = useState(false);

  const fetchFunctions = useCallback(async () => {
    if (status !== "connected") return;
    try {
      setLoading(true);
      const res = await client.cypher({ query: "SHOW FUNCTIONS" });
      const all = parseFunctions(res);
      setFunctions(all.filter((f) => f.schema === selectedSchema));
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [client, status, selectedSchema]);

  useEffect(() => {
    fetchFunctions();
  }, [fetchFunctions]);

  async function fetchCallLog() {
    if (status !== "connected") return;
    setCallLogLoading(true);
    try {
      const res = await client.events({ type: "FunctionCalled", limit: 50 });
      const errRes = await client.events({ type: "FunctionError", limit: 50 });
      const all = [...res.events, ...errRes.events].sort(
        (a, b) => b.timestamp - a.timestamp
      );
      setCallEvents(all.slice(0, 50));
    } catch {
      setCallEvents([]);
    } finally {
      setCallLogLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (status !== "connected") return;
    setCreating(true);
    setCreateError(null);
    try {
      const prefix = formReplace ? "CREATE OR REPLACE" : "CREATE";
      const name =
        selectedSchema === "public" ? formName : `${selectedSchema}.${formName}`;
      const mutating = formMutating ? " MUTATING" : "";
      const query = `${prefix} FUNCTION ${name}(${formParams}) RETURNS ${formReturns}${mutating} AS { ${formBody} }`;
      await client.cypher({ query });
      setFormName("");
      setFormParams("");
      setFormReturns("STRING");
      setFormMutating(false);
      setFormBody("");
      setFormReplace(false);
      await fetchFunctions();
    } catch (e) {
      setCreateError(String(e));
    } finally {
      setCreating(false);
    }
  }

  async function handleDrop(name: string) {
    if (status !== "connected") return;
    try {
      await client.cypher({ query: `DROP FUNCTION ${name}` });
      await fetchFunctions();
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleTest() {
    if (status !== "connected" || !testName.trim()) return;
    setTesting(true);
    setTestError(null);
    setTestResult(null);
    try {
      const query = `CALL ${testName}(${testArgs}) YIELD result`;
      const res = await client.cypher({ query });
      setTestResult(res);
    } catch (e) {
      setTestError(String(e));
    } finally {
      setTesting(false);
    }
  }

  function handleTestFromList(fn: StoredFunction) {
    // Strip schema prefix for display.
    setTestName(fn.name);
    setTestArgs("");
    setTestResult(null);
    setTestError(null);
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
        <h1 className="text-lg font-semibold">Functions</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Create and manage stored database functions.
        </p>
      </div>

      <div className="flex-1 p-6 space-y-8">
        {/* Function table */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
            Registered Functions
          </h2>
          {loading && <p className="text-sm text-zinc-500">Loading functions...</p>}
          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-md p-3 text-red-300 text-sm mb-3">
              {error}
            </div>
          )}
          {!loading && !error && functions.length === 0 && (
            <p className="text-sm text-zinc-500">No functions defined yet.</p>
          )}
          {!loading && functions.length > 0 && (
            <div className="overflow-x-auto rounded-md border border-zinc-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-900 border-b border-zinc-800">
                    <th className="text-left px-3 py-2 text-zinc-400 font-medium">
                      Name
                    </th>
                    <th className="text-left px-3 py-2 text-zinc-400 font-medium">
                      Signature
                    </th>
                    <th className="text-left px-3 py-2 text-zinc-400 font-medium">
                      Returns
                    </th>
                    <th className="text-left px-3 py-2 text-zinc-400 font-medium">
                      Mutating
                    </th>
                    <th className="text-left px-3 py-2 text-zinc-400 font-medium">
                      Created By
                    </th>
                    <th className="px-3 py-2 w-32"></th>
                  </tr>
                </thead>
                <tbody>
                  {functions.map((fn, i) => (
                    <tr
                      key={`${fn.name}-${i}`}
                      className="border-b border-zinc-800/50 hover:bg-zinc-900/50"
                    >
                      <td className="px-3 py-2 font-mono text-xs">{fn.name}</td>
                      <td className="px-3 py-2 font-mono text-xs max-w-64 truncate" title={fn.signature}>
                        {fn.signature}
                      </td>
                      <td className="px-3 py-2 text-xs">{fn.return_type}</td>
                      <td className="px-3 py-2 text-xs">
                        {fn.mutating ? (
                          <span className="inline-block px-1.5 py-0.5 rounded text-xs bg-amber-900/40 text-amber-300">
                            MUTATING
                          </span>
                        ) : (
                          <span className="inline-block px-1.5 py-0.5 rounded text-xs bg-zinc-800 text-zinc-400">
                            READ
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-400">
                        {fn.created_by}
                      </td>
                      <td className="px-3 py-2 text-right space-x-1">
                        <button
                          onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                          className="px-2 py-1 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded transition-colors"
                        >
                          {expandedIdx === i ? "Hide" : "Body"}
                        </button>
                        <button
                          onClick={() => handleTestFromList(fn)}
                          className="px-2 py-1 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/30 rounded transition-colors"
                        >
                          Test
                        </button>
                        <button
                          onClick={() => handleDrop(fn.name)}
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
              {expandedIdx !== null && functions[expandedIdx] && (
                <div className="border-t border-zinc-800 bg-zinc-900/80 p-4">
                  <p className="text-xs text-zinc-400 mb-2">
                    Function body:{" "}
                    <span className="font-mono text-zinc-300">
                      {functions[expandedIdx].name}
                    </span>
                  </p>
                  <pre className="bg-zinc-950 border border-zinc-800 rounded p-3 font-mono text-xs text-zinc-300 overflow-x-auto whitespace-pre-wrap">
                    {functions[expandedIdx].body}
                  </pre>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Create function form */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
            Create Function
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Function Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  placeholder="my_function"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Returns
                </label>
                <select
                  value={formReturns}
                  onChange={(e) => setFormReturns(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                >
                  {["STRING", "INT", "FLOAT", "BOOL", "LIST", "MAP", "ANY", "VOID"].map(
                    (t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div className="flex items-end gap-4">
                <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formMutating}
                    onChange={(e) => setFormMutating(e.target.checked)}
                    className="rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500"
                  />
                  Mutating
                </label>
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
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">
                Parameters{" "}
                <span className="text-zinc-600">
                  (e.g. name: STRING, age: INT = 0)
                </span>
              </label>
              <input
                type="text"
                value={formParams}
                onChange={(e) => setFormParams(e.target.value)}
                placeholder="x: STRING, y: INT"
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">
                Function Body
              </label>
              <textarea
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                required
                rows={4}
                placeholder="RETURN toUpper(x)"
                spellCheck={false}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 font-mono resize-y focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={creating || status !== "connected"}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-md transition-colors"
              >
                {creating ? "Creating..." : "Create Function"}
              </button>
            </div>
          </form>
        </section>

        {/* Test execution panel */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
            Test Function
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Function Name
                </label>
                <input
                  type="text"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder="my_function"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Arguments{" "}
                  <span className="text-zinc-600">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={testArgs}
                  onChange={(e) => setTestArgs(e.target.value)}
                  placeholder="'hello', 42"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <button
                onClick={handleTest}
                disabled={testing || !testName.trim() || status !== "connected"}
                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-md transition-colors"
              >
                {testing ? "Running..." : "Run Function"}
              </button>
            </div>

            {testError && (
              <div className="bg-red-900/30 border border-red-800 rounded-md p-3 text-red-300 text-sm">
                {testError}
              </div>
            )}

            {testResult && !testError && (
              <div>
                <p className="text-xs text-zinc-400 mb-2">Result:</p>
                <pre className="bg-zinc-950 border border-zinc-800 rounded p-3 font-mono text-xs text-zinc-300 overflow-x-auto">
                  {JSON.stringify(testResult.rows[0]?.[0] ?? null, null, 2)}
                </pre>
                <p className="text-xs text-zinc-500 mt-2">
                  Executed in {testResult.executionTimeMs ?? 0}ms
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Call Log */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
            Call Log
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4 space-y-4">
            <button
              onClick={fetchCallLog}
              disabled={callLogLoading || status !== "connected"}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-md transition-colors"
            >
              {callLogLoading ? "Loading..." : "Load Call Log"}
            </button>

            {callEvents.length > 0 && (
              <div className="overflow-x-auto rounded-md border border-zinc-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-zinc-950 border-b border-zinc-800">
                      <th className="text-left px-3 py-2 text-zinc-400 font-medium">Time</th>
                      <th className="text-left px-3 py-2 text-zinc-400 font-medium">Function</th>
                      <th className="text-left px-3 py-2 text-zinc-400 font-medium">Duration</th>
                      <th className="text-left px-3 py-2 text-zinc-400 font-medium">Status</th>
                      <th className="text-left px-3 py-2 text-zinc-400 font-medium">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {callEvents.map((evt) => (
                      <tr
                        key={evt.id}
                        className={`border-b border-zinc-800/50 hover:bg-zinc-900/50 ${
                          !evt.success ? "bg-red-950/20" : ""
                        }`}
                      >
                        <td className="px-3 py-1.5 text-xs text-zinc-400 font-mono whitespace-nowrap">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="px-3 py-1.5 text-xs font-mono">{evt.name}</td>
                        <td className="px-3 py-1.5 text-xs text-zinc-400">{evt.duration_ms}ms</td>
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

            {!callLogLoading && callEvents.length === 0 && (
              <p className="text-sm text-zinc-500">
                No function calls recorded. Click "Load Call Log" to fetch recent calls.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
