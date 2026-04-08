// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
import { useState, useEffect, useCallback } from "react";
import { UserManagement } from "~/components/admin/user-management";
import { RoleManagement } from "~/components/admin/role-management";
import { DatabaseManagement } from "~/components/admin/database-management";
import type { User, Role, DatabaseInfo } from "~/components/admin/types";
import { useConnection } from "~/lib/connection-context";
import type { EventEntry } from "~/lib/api-client";

type Tab = "users" | "roles" | "databases" | "events" | "alerts";

const tabs: { id: Tab; label: string }[] = [
  { id: "users", label: "Users" },
  { id: "roles", label: "Roles" },
  { id: "databases", label: "Databases" },
  { id: "events", label: "Event Log" },
  { id: "alerts", label: "Alerts" },
];

export default function AdminRoute() {
  const { client, status } = useConnection();
  const [activeTab, setActiveTab] = useState<Tab>("databases");
  const [databases, setDatabases] = useState<DatabaseInfo[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Event log state
  const [eventEntries, setEventEntries] = useState<EventEntry[]>([]);
  const [eventLoading, setEventLoading] = useState(false);
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [eventNameFilter, setEventNameFilter] = useState("");

  // Alerts state
  const [alertRows, setAlertRows] = useState<Array<Record<string, unknown>>>([]);
  const [alertLoading, setAlertLoading] = useState(false);
  const [alertHistory, setAlertHistory] = useState<EventEntry[]>([]);

  const fetchDatabases = useCallback(async () => {
    try {
      const dbNames = await client.listDatabases();

      const dbInfos: DatabaseInfo[] = await Promise.all(
        dbNames.map(async (name, i) => {
          try {
            const schema = (await client.getSchema(name)) as {
              labels?: { name: string; count?: number }[];
              relationshipTypes?: { name: string; count?: number }[];
            } | null;

            const nodeCount =
              schema?.labels?.reduce((sum, l) => sum + (l.count ?? 0), 0) ?? 0;
            const relCount =
              schema?.relationshipTypes?.reduce(
                (sum, r) => sum + (r.count ?? 0),
                0,
              ) ?? 0;

            return {
              name,
              status: "online" as const,
              isDefault: i === 0,
              nodeCount,
              relationshipCount: relCount,
              sizeBytes: 0,
            };
          } catch {
            return {
              name,
              status: "online" as const,
              isDefault: i === 0,
              nodeCount: 0,
              relationshipCount: 0,
              sizeBytes: 0,
            };
          }
        }),
      );

      setDatabases(dbInfos);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    if (status !== "connected") {
      setLoading(false);
      return;
    }

    fetchDatabases();

    // Fetch users and roles.
    client
      .listUsers()
      .then((serverUsers) => {
        setUsers(
          serverUsers.map((u) => ({
            username: u.username,
            roles: u.roles,
            active: true,
            createdAt: Date.now(),
            passwordChangeRequired: u.must_change_password,
          }))
        );
      })
      .catch(() => {});

    client
      .listRoles()
      .then((serverRoles) => {
        setRoles(
          serverRoles.map((r) => ({
            name: r.name,
            builtIn: ["admin", "editor", "reader"].includes(r.name),
            privileges: r.privileges.map((p) => ({
              action: p,
              resource: "graph",
              grant: "granted" as const,
            })),
          }))
        );
      })
      .catch(() => {});
  }, [status, fetchDatabases, client]);

  if (status !== "connected") {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        Waiting for server connection...
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        Loading admin data...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center border-b border-zinc-800 px-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-zinc-400 text-zinc-200"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-3 py-2 bg-red-900/20 border-b border-red-900/40 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {activeTab === "users" && (
          <UserManagement
            users={users}
            availableRoles={roles.map((r) => r.name)}
            onCreateUser={async (username, password, selectedRoles) => {
              try {
                await client.register(username, "", password, selectedRoles);
                // Refresh user list.
                const serverUsers = await client.listUsers();
                setUsers(
                  serverUsers.map((u) => ({
                    username: u.username,
                    roles: u.roles,
                    active: true,
                    createdAt: Date.now(),
                    passwordChangeRequired: u.must_change_password,
                  }))
                );
              } catch (e) {
                alert(String(e));
              }
            }}
            onEditUser={() => {}}
            onDeleteUser={() => {}}
          />
        )}
        {activeTab === "roles" && (
          <RoleManagement
            roles={roles}
            onCreateRole={() => {}}
            onDeleteRole={() => {}}
            onGrantPrivilege={() => {}}
            onRevokePrivilege={() => {}}
          />
        )}
        {activeTab === "databases" && (
          <DatabaseManagement
            databases={databases}
            onCreateDatabase={(name) => {
              console.log("Create db:", name);
            }}
            onStartDatabase={(name) => {
              console.log("Start db:", name);
            }}
            onStopDatabase={(name) => {
              console.log("Stop db:", name);
            }}
            onDropDatabase={(name) => {
              console.log("Drop db:", name);
            }}
          />
        )}
        {activeTab === "events" && (
          <EventLogExplorer
            client={client}
            status={status}
            entries={eventEntries}
            loading={eventLoading}
            typeFilter={eventTypeFilter}
            nameFilter={eventNameFilter}
            onTypeFilterChange={setEventTypeFilter}
            onNameFilterChange={setEventNameFilter}
            onFetch={async () => {
              setEventLoading(true);
              try {
                const params: { type?: string; name?: string; limit?: number } = { limit: 100 };
                if (eventTypeFilter) params.type = eventTypeFilter;
                if (eventNameFilter) params.name = eventNameFilter;
                const res = await client.events(params);
                setEventEntries(res.events);
              } catch { setEventEntries([]); }
              finally { setEventLoading(false); }
            }}
          />
        )}
        {activeTab === "alerts" && (
          <AlertsPanel
            client={client}
            status={status}
            rules={alertRows}
            history={alertHistory}
            loading={alertLoading}
            onFetch={async () => {
              setAlertLoading(true);
              try {
                const res = await client.cypher({ query: "SHOW ALERTS" });
                const rows = res.rows.map((row) => {
                  const obj: Record<string, unknown> = {};
                  res.columns.forEach((col, i) => { obj[col] = row[i]; });
                  return obj;
                });
                setAlertRows(rows);
                // Fetch recent alert-type events as history.
                const hist = await client.events({ type: "TriggerError", limit: 20 });
                setAlertHistory(hist.events);
              } catch { setAlertRows([]); setAlertHistory([]); }
              finally { setAlertLoading(false); }
            }}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Event Log Explorer sub-component
// ---------------------------------------------------------------------------
function EventLogExplorer({
  status,
  entries,
  loading,
  typeFilter,
  nameFilter,
  onTypeFilterChange,
  onNameFilterChange,
  onFetch,
}: {
  client: unknown;
  status: string;
  entries: EventEntry[];
  loading: boolean;
  typeFilter: string;
  nameFilter: string;
  onTypeFilterChange: (v: string) => void;
  onNameFilterChange: (v: string) => void;
  onFetch: () => void;
}) {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Event Type</label>
          <select
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
          >
            <option value="">All</option>
            {["TriggerFired","TriggerError","FunctionCalled","FunctionError","QueryExecuted","QuerySlow","AuthEvent","SyncEvent"].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Name contains</label>
          <input
            type="text"
            value={nameFilter}
            onChange={(e) => onNameFilterChange(e.target.value)}
            placeholder="filter..."
            className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          onClick={onFetch}
          disabled={loading || status !== "connected"}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-md transition-colors"
        >
          {loading ? "Loading..." : "Search Events"}
        </button>
      </div>

      {entries.length > 0 ? (
        <div className="overflow-x-auto rounded-md border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-900 border-b border-zinc-800">
                <th className="text-left px-3 py-2 text-zinc-400 font-medium">ID</th>
                <th className="text-left px-3 py-2 text-zinc-400 font-medium">Time</th>
                <th className="text-left px-3 py-2 text-zinc-400 font-medium">Type</th>
                <th className="text-left px-3 py-2 text-zinc-400 font-medium">Name</th>
                <th className="text-left px-3 py-2 text-zinc-400 font-medium">Duration</th>
                <th className="text-left px-3 py-2 text-zinc-400 font-medium">Status</th>
                <th className="text-left px-3 py-2 text-zinc-400 font-medium">User</th>
                <th className="text-left px-3 py-2 text-zinc-400 font-medium">Error</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((evt) => (
                <tr key={evt.id} className={`border-b border-zinc-800/50 hover:bg-zinc-900/50 ${!evt.success ? "bg-red-950/20" : ""}`}>
                  <td className="px-3 py-1.5 text-xs text-zinc-500 font-mono group">
                    <span className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => { navigator.clipboard.writeText(evt.name); }}
                        className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-200 transition-opacity shrink-0"
                        title="Copy name to clipboard"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                          <path d="M5.5 3.5A1.5 1.5 0 0 1 7 2h5.5A1.5 1.5 0 0 1 14 3.5V11a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 11V3.5Z" />
                          <path d="M3 5a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 3 14h6a1.5 1.5 0 0 0 1.5-1.5V13H7a2.5 2.5 0 0 1-2.5-2.5V5H3Z" />
                        </svg>
                      </button>
                      <span>{evt.id}</span>
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-xs text-zinc-400 font-mono whitespace-nowrap">{new Date(evt.timestamp).toLocaleString()}</td>
                  <td className="px-3 py-1.5 text-xs">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${
                      evt.type.includes("Error") ? "bg-red-900/40 text-red-300" :
                      evt.type.includes("Slow") ? "bg-amber-900/40 text-amber-300" :
                      "bg-zinc-800 text-zinc-300"
                    }`}>{evt.type}</span>
                  </td>
                  <td className="px-3 py-1.5 text-xs font-mono max-w-80 truncate" title={evt.name}>{evt.name}</td>
                  <td className="px-3 py-1.5 text-xs text-zinc-400">{evt.duration_ms}ms</td>
                  <td className="px-3 py-1.5 text-xs">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${evt.success ? "bg-emerald-900/40 text-emerald-300" : "bg-red-900/40 text-red-300"}`}>
                      {evt.success ? "OK" : "FAIL"}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-xs text-zinc-400">{evt.user}</td>
                  <td className="px-3 py-1.5 text-xs text-red-400 max-w-48 truncate" title={evt.error ?? ""}>{evt.error || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">{loading ? "Loading..." : "Click \"Search Events\" to query the event log."}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alerts Panel sub-component
// ---------------------------------------------------------------------------
function AlertsPanel({
  status,
  rules,
  history,
  loading,
  onFetch,
}: {
  client: unknown;
  status: string;
  rules: Array<Record<string, unknown>>;
  history: EventEntry[];
  loading: boolean;
  onFetch: () => void;
}) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Alert Rules</h3>
        <button
          onClick={onFetch}
          disabled={loading || status !== "connected"}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-xs font-medium rounded transition-colors"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {rules.length > 0 ? (
        <div className="overflow-x-auto rounded-md border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-900 border-b border-zinc-800">
                <th className="text-left px-3 py-2 text-zinc-400 font-medium">Name</th>
                <th className="text-left px-3 py-2 text-zinc-400 font-medium">Event Type</th>
                <th className="text-left px-3 py-2 text-zinc-400 font-medium">Threshold</th>
                <th className="text-left px-3 py-2 text-zinc-400 font-medium">Window</th>
                <th className="text-left px-3 py-2 text-zinc-400 font-medium">Action</th>
                <th className="text-left px-3 py-2 text-zinc-400 font-medium">Enabled</th>
                <th className="text-left px-3 py-2 text-zinc-400 font-medium">Last Fired</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r, i) => (
                <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                  <td className="px-3 py-1.5 text-xs font-mono">{String(r.name ?? "")}</td>
                  <td className="px-3 py-1.5 text-xs">{String(r.event_type ?? "")}</td>
                  <td className="px-3 py-1.5 text-xs text-zinc-400">{String(r.threshold ?? "")}</td>
                  <td className="px-3 py-1.5 text-xs text-zinc-400">{String(r.window ?? "")}</td>
                  <td className="px-3 py-1.5 text-xs">{String(r.action ?? "")}</td>
                  <td className="px-3 py-1.5 text-xs">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${
                      r.enabled ? "bg-emerald-900/40 text-emerald-300" : "bg-zinc-800 text-zinc-500"
                    }`}>{r.enabled ? "yes" : "no"}</span>
                  </td>
                  <td className="px-3 py-1.5 text-xs text-zinc-400">{String(r.last_fired ?? "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">{loading ? "Loading..." : "Click \"Refresh\" to load alert rules."}</p>
      )}

      {history.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Recent Alert Activity</h3>
          <div className="overflow-x-auto rounded-md border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-900 border-b border-zinc-800">
                  <th className="text-left px-3 py-2 text-zinc-400 font-medium">Time</th>
                  <th className="text-left px-3 py-2 text-zinc-400 font-medium">Type</th>
                  <th className="text-left px-3 py-2 text-zinc-400 font-medium">Name</th>
                  <th className="text-left px-3 py-2 text-zinc-400 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {history.map((evt) => (
                  <tr key={evt.id} className="border-b border-zinc-800/50 bg-red-950/10">
                    <td className="px-3 py-1.5 text-xs text-zinc-400 font-mono">{new Date(evt.timestamp).toLocaleTimeString()}</td>
                    <td className="px-3 py-1.5 text-xs"><span className="bg-red-900/40 text-red-300 px-1.5 py-0.5 rounded text-xs">{evt.type}</span></td>
                    <td className="px-3 py-1.5 text-xs font-mono">{evt.name}</td>
                    <td className="px-3 py-1.5 text-xs text-red-400 max-w-64 truncate">{evt.error || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
