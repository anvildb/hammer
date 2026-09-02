import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router";
import type {
  ApiClient,
  AppSummary,
  AppMember,
  AppPrivilege,
} from "~/lib/api-client";
import { appSchemaName } from "~/lib/connection-context";
import { AppSettings } from "./app-settings";
import { AppEmailTemplates } from "./app-email-templates";

type Tab = "overview" | "members" | "labels" | "settings" | "email";

const PRIVILEGES: AppPrivilege[] = ["reader", "editor", "admin"];

interface Props {
  client: ApiClient;
  app: AppSummary;
  isServerAdmin: boolean;
  onChanged: () => Promise<void>;
  onDeleted: () => Promise<void>;
  onOpenSchema: () => void;
}

export function AppDetail({
  client,
  app,
  isServerAdmin,
  onChanged,
  onDeleted,
  onOpenSchema,
}: Props) {
  const isAppAdmin = app.privilege === "admin" || isServerAdmin;
  const [tab, setTab] = useState<Tab>("overview");

  const tabs: { id: Tab; label: string; adminOnly: boolean }[] = [
    { id: "overview", label: "Overview", adminOnly: false },
    { id: "members", label: "Members", adminOnly: false },
    { id: "labels", label: "Labels", adminOnly: false },
    { id: "settings", label: "Settings", adminOnly: true },
    { id: "email", label: "Email Templates", adminOnly: true },
  ];

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-zinc-100">{app.name}</h2>
          <span className="text-[11px] font-mono text-zinc-500">
            {appSchemaName(app.slug)}
          </span>
          {!app.enabled && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/30 text-red-400">
              disabled
            </span>
          )}
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
            your privilege: {app.privilege ?? "—"}
          </span>
        </div>
        <div className="flex gap-1 mt-3">
          {tabs
            .filter((t) => !t.adminOnly || isAppAdmin)
            .map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`text-xs px-2.5 py-1 rounded transition-colors ${
                  tab === t.id
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                }`}
              >
                {t.label}
              </button>
            ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === "overview" && (
          <Overview
            client={client}
            app={app}
            isAppAdmin={isAppAdmin}
            isServerAdmin={isServerAdmin}
            onChanged={onChanged}
            onDeleted={onDeleted}
            onOpenSchema={onOpenSchema}
          />
        )}
        {tab === "members" && (
          <Members client={client} app={app} isAppAdmin={isAppAdmin} />
        )}
        {tab === "labels" && <Labels client={client} app={app} />}
        {tab === "settings" && isAppAdmin && (
          <AppSettings client={client} appId={app.id} />
        )}
        {tab === "email" && isAppAdmin && (
          <AppEmailTemplates client={client} appId={app.id} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

function Overview({
  client,
  app,
  isAppAdmin,
  isServerAdmin,
  onChanged,
  onDeleted,
  onOpenSchema,
}: {
  client: ApiClient;
  app: AppSummary;
  isAppAdmin: boolean;
  isServerAdmin: boolean;
  onChanged: () => Promise<void>;
  onDeleted: () => Promise<void>;
  onOpenSchema: () => void;
}) {
  const [name, setName] = useState(app.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState("");

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4 space-y-5 max-w-2xl">
      {error && (
        <div className="p-2 rounded bg-red-900/20 border border-red-900/40 text-red-400 text-xs break-words">
          {error}
        </div>
      )}

      <dl className="grid grid-cols-[120px_1fr] gap-y-1.5 text-xs">
        <dt className="text-zinc-500">App ID</dt>
        <dd className="font-mono text-zinc-300 break-all">{app.id}</dd>
        <dt className="text-zinc-500">Slug</dt>
        <dd className="font-mono text-zinc-300">{app.slug}</dd>
        <dt className="text-zinc-500">Schema</dt>
        <dd className="font-mono text-zinc-300">
          {appSchemaName(app.slug)}
          <button
            onClick={onOpenSchema}
            className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200"
          >
            switch to this schema
          </button>
          <Link
            to="/query"
            className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200"
          >
            open Cypher
          </Link>
        </dd>
        <dt className="text-zinc-500">Created by</dt>
        <dd className="text-zinc-300">{app.created_by || "—"}</dd>
        <dt className="text-zinc-500">Created</dt>
        <dd className="text-zinc-300">
          {app.created_on ? new Date(app.created_on).toLocaleString() : "—"}
        </dd>
        <dt className="text-zinc-500">Request header</dt>
        <dd className="font-mono text-zinc-300">X-Anvil-App: {app.slug}</dd>
      </dl>

      {isAppAdmin && (
        <div className="space-y-2 border-t border-zinc-800 pt-4">
          <label className="block text-[10px] text-zinc-500 uppercase tracking-wider">
            Name
          </label>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 bg-zinc-800 text-zinc-200 text-xs rounded px-2 py-1 border border-zinc-700 focus:border-zinc-500 focus:outline-none"
            />
            <button
              disabled={busy || name.trim() === app.name || !name.trim()}
              onClick={() =>
                run(async () => {
                  await client.updateApp(app.id, { name: name.trim() });
                  await onChanged();
                })
              }
              className="text-xs px-3 py-1 rounded bg-zinc-700 text-zinc-100 hover:bg-zinc-600 disabled:opacity-50"
            >
              Rename
            </button>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await client.updateApp(app.id, { enabled: !app.enabled });
                  await onChanged();
                })
              }
              className="text-xs px-3 py-1 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
            >
              {app.enabled ? "Disable app" : "Enable app"}
            </button>
          </div>
        </div>
      )}

      {isAppAdmin && (
        <div className="space-y-2 border-t border-zinc-800 pt-4">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
            Backup
          </p>
          <p className="text-xs text-zinc-500">
            Downloads a JSON snapshot of everything the app owns: members, label
            bindings, settings overrides, email templates, collections with
            their documents, the app-schema subgraph, sync rules, RLS policies
            and triggers.
          </p>
          <button
            disabled={busy}
            onClick={() =>
              run(async () => {
                const data = await client.exportApp(app.id);
                const blob = new Blob([JSON.stringify(data, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                const stamp = new Date().toISOString().slice(0, 10);
                a.download = `${app.slug}-backup-${stamp}.json`;
                a.click();
                URL.revokeObjectURL(url);
              })
            }
            className="text-xs px-3 py-1 rounded bg-zinc-700 text-zinc-100 hover:bg-zinc-600 disabled:opacity-50"
          >
            Download backup (.json)
          </button>
        </div>
      )}

      {isServerAdmin && (
        <div className="space-y-2 border-t border-zinc-800 pt-4">
          <p className="text-[10px] text-red-400 uppercase tracking-wider">
            Danger zone
          </p>
          <p className="text-xs text-zinc-500">
            Deleting the app DETACH-deletes every node bound to{" "}
            <span className="font-mono">{appSchemaName(app.slug)}</span>, drops
            its collections, sync rules, label bindings, settings overrides, and
            memberships. Type the slug to confirm.
          </p>
          <div className="flex gap-2">
            <input
              value={confirmDelete}
              onChange={(e) => setConfirmDelete(e.target.value)}
              placeholder={app.slug}
              className="flex-1 bg-zinc-800 text-zinc-200 text-xs font-mono rounded px-2 py-1 border border-zinc-700 focus:border-red-700 focus:outline-none"
            />
            <button
              disabled={busy || confirmDelete !== app.slug}
              onClick={() =>
                run(async () => {
                  await client.deleteApp(app.id);
                  await onDeleted();
                })
              }
              className="text-xs px-3 py-1 rounded bg-red-900/40 text-red-300 hover:bg-red-900/60 disabled:opacity-40"
            >
              Delete app
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

type MemberSortKey = "username" | "privilege" | "added_by" | "added_on";

function Members({
  client,
  app,
  isAppAdmin,
}: {
  client: ApiClient;
  app: AppSummary;
  isAppAdmin: boolean;
}) {
  const [members, setMembers] = useState<AppMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState("");
  const [privilege, setPrivilege] = useState<AppPrivilege>("reader");
  const [sortBy, setSortBy] = useState<MemberSortKey>("username");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setMembers(await client.listAppMembers(app.id));
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [client, app.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sorted = useMemo(() => {
    const list = [...members];
    const rank = (p: string) => PRIVILEGES.indexOf(p as AppPrivilege);
    list.sort((a, b) => {
      let cmp: number;
      if (sortBy === "added_on") cmp = a.added_on - b.added_on;
      else if (sortBy === "privilege")
        cmp = rank(a.privilege) - rank(b.privilege);
      else
        cmp = a[sortBy].localeCompare(b[sortBy], undefined, {
          sensitivity: "base",
        });
      if (cmp === 0) cmp = a.username.localeCompare(b.username);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [members, sortBy, sortDir]);

  const clickColumn = (key: MemberSortKey) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    try {
      await client.putAppMember(app.id, user.trim(), privilege);
      setUser("");
      await refresh();
    } catch (err) {
      setError(String(err));
    }
  }

  const header = (key: MemberSortKey, label: string) => (
    <th
      className="text-left px-3 py-2 text-zinc-400 font-medium"
      aria-sort={
        sortBy === key
          ? sortDir === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      <button
        type="button"
        onClick={() => clickColumn(key)}
        className="hover:text-zinc-200"
      >
        {label} {sortBy === key && (sortDir === "asc" ? "▲" : "▼")}
      </button>
    </th>
  );

  return (
    <div className="p-4 space-y-3">
      {isAppAdmin && (
        <form onSubmit={addMember} className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">
              Username or user id
            </label>
            <input
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="alice"
              required
              className="w-full bg-zinc-800 text-zinc-200 text-xs rounded px-2 py-1 border border-zinc-700 focus:border-zinc-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">
              Privilege
            </label>
            <select
              value={privilege}
              onChange={(e) => setPrivilege(e.target.value as AppPrivilege)}
              className="bg-zinc-800 text-zinc-200 text-xs rounded px-2 py-1 border border-zinc-700 focus:border-zinc-500 focus:outline-none"
            >
              {PRIVILEGES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="text-xs px-3 py-1 rounded bg-zinc-700 text-zinc-100 hover:bg-zinc-600"
          >
            Add member
          </button>
        </form>
      )}

      {error && (
        <div className="p-2 rounded bg-red-900/20 border border-red-900/40 text-red-400 text-xs break-words">
          {error}
        </div>
      )}

      {loading && members.length === 0 ? (
        <p className="text-xs text-zinc-500">Loading...</p>
      ) : members.length === 0 ? (
        <p className="text-xs text-zinc-500">No members yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-900 border-b border-zinc-800">
                {header("username", "User")}
                {header("privilege", "Privilege")}
                {header("added_by", "Added By")}
                {header("added_on", "Added")}
                {isAppAdmin && <th className="px-3 py-2 w-24"></th>}
              </tr>
            </thead>
            <tbody>
              {sorted.map((m) => (
                <tr
                  key={m.user_id}
                  className="border-b border-zinc-800/50 hover:bg-zinc-900/50"
                >
                  <td className="px-3 py-2">
                    <span className="text-zinc-200">
                      {m.username || m.user_id}
                    </span>
                    <span className="ml-2 text-[10px] font-mono text-zinc-600">
                      {m.user_id}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {isAppAdmin ? (
                      <select
                        value={m.privilege}
                        onChange={async (e) => {
                          try {
                            await client.putAppMember(
                              app.id,
                              m.user_id,
                              e.target.value as AppPrivilege,
                            );
                            await refresh();
                          } catch (err) {
                            setError(String(err));
                          }
                        }}
                        className="bg-zinc-800 text-zinc-200 text-xs rounded px-2 py-0.5 border border-zinc-700"
                      >
                        {PRIVILEGES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-zinc-300">{m.privilege}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-zinc-400">
                    {m.added_by || "—"}
                  </td>
                  <td className="px-3 py-2 text-zinc-400 text-xs">
                    {m.added_on ? new Date(m.added_on).toLocaleString() : "—"}
                  </td>
                  {isAppAdmin && (
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={async () => {
                          try {
                            await client.deleteAppMember(app.id, m.user_id);
                            await refresh();
                          } catch (err) {
                            setError(String(err));
                          }
                        }}
                        className="text-xs px-2 py-0.5 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50"
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

function Labels({ client, app }: { client: ApiClient; app: AppSummary }) {
  const canEdit = app.privilege === "editor" || app.privilege === "admin";
  const canUnbind = app.privilege === "admin";
  const [labels, setLabels] = useState<string[]>([]);
  const [schema, setSchema] = useState(appSchemaName(app.slug));
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("");

  const refresh = useCallback(async () => {
    try {
      const res = await client.listAppLabels(app.id);
      setLabels(res.labels);
      setSchema(res.schema);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, [client, app.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function bind(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await client.putAppLabel(app.id, label.trim());
      setLabels(res.labels);
      setLabel("");
      setError(null);
    } catch (err) {
      setError(String(err));
    }
  }

  return (
    <div className="p-4 space-y-3 max-w-2xl">
      <p className="text-xs text-zinc-500">
        Labels bound to <span className="font-mono">{schema}</span> can only be
        created inside this app's schema, and their nodes are invisible to other
        schemas. Binding is explicit: create
        <span className="font-mono"> (:Lead)</span> in the app schema only after
        binding <span className="font-mono">Lead</span> here.
      </p>

      {canEdit && (
        <form onSubmit={bind} className="flex gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Lead"
            pattern="[A-Za-z_][A-Za-z0-9_]*"
            required
            className="flex-1 bg-zinc-800 text-zinc-200 text-xs font-mono rounded px-2 py-1 border border-zinc-700 focus:border-zinc-500 focus:outline-none"
          />
          <button
            type="submit"
            className="text-xs px-3 py-1 rounded bg-zinc-700 text-zinc-100 hover:bg-zinc-600"
          >
            Bind label
          </button>
        </form>
      )}

      {error && (
        <div className="p-2 rounded bg-red-900/20 border border-red-900/40 text-red-400 text-xs break-words">
          {error}
        </div>
      )}

      {labels.length === 0 ? (
        <p className="text-xs text-zinc-500">No labels bound yet.</p>
      ) : (
        <ul className="divide-y divide-zinc-800/50 rounded-md border border-zinc-800">
          {labels.map((l) => (
            <li key={l} className="flex items-center justify-between px-3 py-2">
              <span className="text-xs font-mono text-zinc-200">:{l}</span>
              {canUnbind && (
                <button
                  onClick={async () => {
                    try {
                      const res = await client.deleteAppLabel(app.id, l);
                      setLabels(res.labels);
                    } catch (err) {
                      setError(String(err));
                    }
                  }}
                  className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-red-300 hover:bg-red-900/30"
                >
                  Unbind
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
