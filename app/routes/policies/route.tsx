import { useState, useEffect, useCallback } from "react";
import { useConnection } from "~/lib/connection-context";
import type { CypherResult } from "~/lib/api-client";

interface Policy {
  name: string;
  target: string;
  operation: string;
  role: string;
  mode: string;
  using: string;
  check: string;
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function parsePolicies(result: CypherResult): Policy[] {
  return result.rows.map((row) => {
    const obj: Record<string, string> = {};
    result.columns.forEach((col, i) => {
      obj[col.toLowerCase()] = formatCell(row[i]);
    });
    return {
      name: obj.name ?? "",
      target: obj.target ?? "",
      operation: obj.operation ?? "",
      role: obj.role ?? "",
      mode: obj.mode ?? "",
      using: obj.using ?? "",
      check: obj.check ?? "",
    };
  });
}

export default function PoliciesRoute() {
  const { client, status, selectedSchema } = useConnection();

  // Policy list
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [formName, setFormName] = useState("");
  const [formTarget, setFormTarget] = useState("");
  const [formOperation, setFormOperation] = useState("ALL");
  const [formRole, setFormRole] = useState("");
  const [formUsing, setFormUsing] = useState("");
  const [formCheck, setFormCheck] = useState("");
  const [formMode, setFormMode] = useState("PERMISSIVE");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // RLS status
  const [rlsLabel, setRlsLabel] = useState("");
  const [rlsMessage, setRlsMessage] = useState<string | null>(null);
  const [rlsError, setRlsError] = useState<string | null>(null);

  // Simulate
  const [simUser, setSimUser] = useState("");
  const [simRole, setSimRole] = useState("");
  const [simTarget, setSimTarget] = useState("");
  const [simResult, setSimResult] = useState<CypherResult | null>(null);
  const [simError, setSimError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  const AUTH_TARGETS = ["User", "Role", "auth.users", "auth.roles", "auth.user_roles", "auth.refresh_tokens"];

  const isAuthPolicy = (p: Policy) => {
    const t = p.target.replace(/^[:]/, "").replace(/^COLLECTION /, "");
    return AUTH_TARGETS.some((a) => t === a);
  };

  const fetchPolicies = useCallback(async () => {
    if (status !== "connected") return;
    try {
      setLoading(true);
      const res = await client.cypher({ query: "SHOW POLICIES" });
      const all = parsePolicies(res);
      setPolicies(
        all.filter((p) => (selectedSchema === "auth" ? isAuthPolicy(p) : !isAuthPolicy(p)))
      );
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [client, status, selectedSchema]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (status !== "connected") return;
    setCreating(true);
    setCreateError(null);
    try {
      const target = formTarget.startsWith(":") ? formTarget : `:${formTarget}`;
      let query = `CREATE POLICY ${formName} ON ${target} FOR ${formOperation} TO ${formRole}`;
      if (formMode === "RESTRICTIVE") {
        query += ` RESTRICTIVE`;
      }
      query += ` USING (${formUsing})`;
      if (formCheck.trim()) {
        query += ` WITH CHECK (${formCheck})`;
      }
      await client.cypher({ query });
      setFormName("");
      setFormTarget("");
      setFormOperation("ALL");
      setFormRole("");
      setFormUsing("");
      setFormCheck("");
      setFormMode("PERMISSIVE");
      await fetchPolicies();
    } catch (e) {
      setCreateError(String(e));
    } finally {
      setCreating(false);
    }
  }

  async function handleDrop(name: string, target: string) {
    if (status !== "connected") return;
    try {
      const t = target.startsWith(":") ? target : `:${target}`;
      await client.cypher({ query: `DROP POLICY ${name} ON ${t}` });
      await fetchPolicies();
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleRls(action: "enable" | "disable") {
    if (status !== "connected" || !rlsLabel.trim()) return;
    setRlsError(null);
    setRlsMessage(null);
    try {
      const label = rlsLabel.startsWith(":") ? rlsLabel : `:${rlsLabel}`;
      const verb = action === "enable" ? "ENABLE" : "DISABLE";
      await client.cypher({ query: `${verb} ROW LEVEL SECURITY ON ${label}` });
      setRlsMessage(`Row level security ${action}d on ${label}`);
    } catch (e) {
      setRlsError(String(e));
    }
  }

  async function handleSimulate() {
    if (status !== "connected") return;
    setSimulating(true);
    setSimError(null);
    setSimResult(null);
    try {
      const target = simTarget.startsWith(":") ? simTarget : `:${simTarget}`;
      const query = `SIMULATE POLICY AS ${simUser} WITH ROLE ${simRole} ON ${target}`;
      const res = await client.cypher({ query });
      setSimResult(res);
    } catch (e) {
      setSimError(String(e));
    } finally {
      setSimulating(false);
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
        <h1 className="text-lg font-semibold">RLS Policies</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Manage row-level security policies for fine-grained access control.
        </p>
      </div>

      <div className="flex-1 p-6 space-y-8">
        {/* Policy table */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
            Active Policies
          </h2>
          {loading && (
            <p className="text-sm text-zinc-500">Loading policies...</p>
          )}
          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-md p-3 text-red-300 text-sm mb-3">
              {error}
            </div>
          )}
          {!loading && !error && policies.length === 0 && (
            <p className="text-sm text-zinc-500">
              No policies defined yet.
            </p>
          )}
          {!loading && policies.length > 0 && (
            <div className="overflow-x-auto rounded-md border border-zinc-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-900 border-b border-zinc-800">
                    <th className="text-left px-3 py-2 text-zinc-400 font-medium">Name</th>
                    <th className="text-left px-3 py-2 text-zinc-400 font-medium">Target</th>
                    <th className="text-left px-3 py-2 text-zinc-400 font-medium">Operation</th>
                    <th className="text-left px-3 py-2 text-zinc-400 font-medium">Role</th>
                    <th className="text-left px-3 py-2 text-zinc-400 font-medium">Mode</th>
                    <th className="text-left px-3 py-2 text-zinc-400 font-medium">Using</th>
                    <th className="text-left px-3 py-2 text-zinc-400 font-medium">Check</th>
                    <th className="px-3 py-2 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {policies.map((p, i) => (
                    <tr
                      key={`${p.name}-${p.target}-${i}`}
                      className="border-b border-zinc-800/50 hover:bg-zinc-900/50"
                    >
                      <td className="px-3 py-2 font-mono text-xs">{p.name}</td>
                      <td className="px-3 py-2 font-mono text-xs">{p.target}</td>
                      <td className="px-3 py-2 text-xs">{p.operation}</td>
                      <td className="px-3 py-2 text-xs">{p.role}</td>
                      <td className="px-3 py-2 text-xs">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-xs ${
                            p.mode === "RESTRICTIVE"
                              ? "bg-amber-900/40 text-amber-300"
                              : "bg-emerald-900/40 text-emerald-300"
                          }`}
                        >
                          {p.mode}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs max-w-48 truncate" title={p.using}>
                        {p.using}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs max-w-48 truncate" title={p.check}>
                        {p.check || "--"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => handleDrop(p.name, p.target)}
                          className="px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Create policy form */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
            Create Policy
          </h2>
          {createError && (
            <div className="bg-red-900/30 border border-red-800 rounded-md p-3 text-red-300 text-sm mb-3">
              {createError}
            </div>
          )}
          <form onSubmit={handleCreate} className="bg-zinc-900 border border-zinc-800 rounded-md p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Policy Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  placeholder="my_policy"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Target Label</label>
                <input
                  type="text"
                  value={formTarget}
                  onChange={(e) => setFormTarget(e.target.value)}
                  required
                  placeholder=":Person"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Operation</label>
                <select
                  value={formOperation}
                  onChange={(e) => setFormOperation(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="ALL">ALL</option>
                  <option value="SELECT">SELECT</option>
                  <option value="INSERT">INSERT</option>
                  <option value="UPDATE">UPDATE</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Role</label>
                <input
                  type="text"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  required
                  placeholder="admin"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Mode</label>
                <select
                  value={formMode}
                  onChange={(e) => setFormMode(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="PERMISSIVE">PERMISSIVE</option>
                  <option value="RESTRICTIVE">RESTRICTIVE</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">USING Predicate</label>
              <input
                type="text"
                value={formUsing}
                onChange={(e) => setFormUsing(e.target.value)}
                required
                placeholder="n.owner = current_user()"
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">
                CHECK Predicate <span className="text-zinc-600">(optional, for INSERT/UPDATE)</span>
              </label>
              <input
                type="text"
                value={formCheck}
                onChange={(e) => setFormCheck(e.target.value)}
                placeholder="n.owner = current_user()"
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={creating || status !== "connected"}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-md transition-colors"
              >
                {creating ? "Creating..." : "Create Policy"}
              </button>
            </div>
          </form>
        </section>

        {/* RLS status section */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
            RLS Status
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4">
            {rlsMessage && (
              <div className="bg-emerald-900/30 border border-emerald-800 rounded-md p-3 text-emerald-300 text-sm mb-3">
                {rlsMessage}
              </div>
            )}
            {rlsError && (
              <div className="bg-red-900/30 border border-red-800 rounded-md p-3 text-red-300 text-sm mb-3">
                {rlsError}
              </div>
            )}
            <div className="flex items-end gap-3">
              <div className="flex-1 max-w-xs">
                <label className="block text-xs text-zinc-400 mb-1">Label</label>
                <input
                  type="text"
                  value={rlsLabel}
                  onChange={(e) => setRlsLabel(e.target.value)}
                  placeholder=":Person"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                onClick={() => handleRls("enable")}
                disabled={!rlsLabel.trim() || status !== "connected"}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-md transition-colors"
              >
                Enable RLS
              </button>
              <button
                onClick={() => handleRls("disable")}
                disabled={!rlsLabel.trim() || status !== "connected"}
                className="px-3 py-1.5 bg-amber-700 hover:bg-amber-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-md transition-colors"
              >
                Disable RLS
              </button>
            </div>
          </div>
        </section>

        {/* Simulate section */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
            Policy Simulator
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">User</label>
                <input
                  type="text"
                  value={simUser}
                  onChange={(e) => setSimUser(e.target.value)}
                  placeholder="alice"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Role</label>
                <input
                  type="text"
                  value={simRole}
                  onChange={(e) => setSimRole(e.target.value)}
                  placeholder="viewer"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Target Label</label>
                <input
                  type="text"
                  value={simTarget}
                  onChange={(e) => setSimTarget(e.target.value)}
                  placeholder=":Person"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <button
                onClick={handleSimulate}
                disabled={simulating || !simUser.trim() || !simRole.trim() || !simTarget.trim() || status !== "connected"}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-md transition-colors"
              >
                {simulating ? "Simulating..." : "Run Simulation"}
              </button>
            </div>

            {simError && (
              <div className="bg-red-900/30 border border-red-800 rounded-md p-3 text-red-300 text-sm">
                {simError}
              </div>
            )}

            {simResult && !simError && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      {simResult.columns.map((col) => (
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
                    {simResult.rows.map((row, i) => (
                      <tr
                        key={i}
                        className="border-b border-zinc-800/50 hover:bg-zinc-900/50"
                      >
                        {row.map((cell, j) => (
                          <td key={j} className="px-3 py-2 font-mono text-xs">
                            {formatCell(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-zinc-500 mt-2">
                  {simResult.rowCount} row{simResult.rowCount !== 1 ? "s" : ""} returned
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
