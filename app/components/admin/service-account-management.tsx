import { useState, useEffect, useCallback } from "react";
import { canAutoFocus } from "~/lib/utils";
import type {
  ApiClient,
  AppSummary,
  ServiceAccount,
  ApiKey,
  CreatedApiKey,
} from "~/lib/api-client";

interface Props {
  client: ApiClient;
  availableRoles: string[];
}

// The roles that double as app privileges, lowest to highest. An app-scoped
// account is granted its apps at the highest of these it holds.
const APP_PRIVILEGE_ROLES = ["reader", "editor", "admin"] as const;

function highestAppPrivilege(roles: string[]): string | null {
  for (let i = APP_PRIVILEGE_ROLES.length - 1; i >= 0; i--) {
    if (roles.includes(APP_PRIVILEGE_ROLES[i])) return APP_PRIVILEGE_ROLES[i];
  }
  return null;
}

/** Accounts created before app scoping: no service_role, yet server-wide. */
function isLegacyServerWide(acc: ServiceAccount): boolean {
  return !acc.app_scoped && !acc.service_role;
}

function sameIds(a: string[], b: string[]): boolean {
  return a.length === b.length && [...a].sort().join() === [...b].sort().join();
}

export function ServiceAccountManagement({ client, availableRoles }: Props) {
  const [accounts, setAccounts] = useState<ServiceAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [apps, setApps] = useState<AppSummary[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Server admins see every app, which is what can be granted.
      const [accts, appList] = await Promise.all([
        client.listServiceAccounts(),
        client.listApps(),
      ]);
      setAccounts(accts);
      setApps(appList);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const selected = accounts.find((a) => a.id === selectedId) ?? null;

  return (
    <div className="flex h-full min-h-0">
      {/* Left: accounts list */}
      <div className="w-96 shrink-0 border-r border-zinc-800 flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
          <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            Service Accounts
            <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 font-normal tabular-nums">
              {accounts.length}
            </span>
          </h3>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
          >
            {showCreate ? "Cancel" : "+ Create"}
          </button>
        </div>

        {showCreate && (
          <CreateAccountForm
            availableRoles={availableRoles}
            apps={apps}
            onSubmit={async (req) => {
              try {
                const created = await client.createServiceAccount(req);
                setShowCreate(false);
                await refresh();
                setSelectedId(created.id);
              } catch (e) {
                setError(String(e));
              }
            }}
          />
        )}

        {error && (
          <div className="mx-3 mt-2 p-2 rounded bg-red-900/20 border border-red-900/40 text-red-400 text-xs break-words">
            {error}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-zinc-800/50">
          {loading && accounts.length === 0 && (
            <p className="px-3 py-4 text-xs text-zinc-500">Loading...</p>
          )}
          {!loading && accounts.length === 0 && (
            <p className="px-3 py-6 text-xs text-zinc-500 text-center">
              No service accounts yet. Click{" "}
              <span className="font-mono">+ Create</span> to add one.
            </p>
          )}
          {accounts.map((acc) => (
            <button
              key={acc.id}
              onClick={() => setSelectedId(acc.id)}
              className={`block w-full text-left px-3 py-2 transition-colors ${
                selectedId === acc.id ? "bg-zinc-800" : "hover:bg-zinc-800/40"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-zinc-200 truncate">
                  {acc.name}
                </span>
                {acc.disabled && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/30 text-red-400 shrink-0">
                    disabled
                  </span>
                )}
                {acc.service_role && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-400 shrink-0">
                    service_role
                  </span>
                )}
                {isLegacyServerWide(acc) && (
                  <span
                    title="Created before app scoping: its roles apply to the whole server"
                    className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-400 shrink-0"
                  >
                    server-wide
                  </span>
                )}
              </div>
              {acc.app_scoped && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {acc.apps.length === 0 && (
                    <span className="text-[10px] text-zinc-600 italic">
                      no apps granted
                    </span>
                  )}
                  {acc.apps.map((g) => (
                    <span
                      key={g.app_id}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-sky-900/30 text-sky-400 font-mono"
                    >
                      {g.slug} · {g.privilege}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-1 mt-1">
                {acc.roles.length === 0 && (
                  <span className="text-[10px] text-zinc-600 italic">
                    no roles
                  </span>
                )}
                {acc.roles.map((r) => (
                  <span
                    key={r}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400"
                  >
                    {r}
                  </span>
                ))}
              </div>
              {acc.description && (
                <p className="mt-1 text-[10px] text-zinc-500 truncate">
                  {acc.description}
                </p>
              )}
              <p className="mt-0.5 text-[10px] text-zinc-600 font-mono truncate">
                {acc.id}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Right: details */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {selected ? (
          <AccountDetail
            client={client}
            account={selected}
            availableRoles={availableRoles}
            apps={apps}
            onChanged={async () => {
              await refresh();
            }}
            onDeleted={async () => {
              setSelectedId(null);
              await refresh();
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
            Select a service account to view keys and details.
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create account form
// ---------------------------------------------------------------------------

/**
 * Pick the apps an app-scoped account is confined to. `roles` decides the
 * privilege shown, since every granted app gets the account's highest role.
 */
function AppGrantPicker({
  apps,
  selected,
  roles,
  onChange,
}: {
  apps: AppSummary[];
  selected: string[];
  roles: string[];
  onChange: (next: string[]) => void;
}) {
  const privilege = highestAppPrivilege(roles);
  return (
    <div>
      <p className="text-[11px] text-zinc-500 mb-1">Apps</p>
      {apps.length === 0 ? (
        <p className="text-[11px] text-zinc-600 italic">
          No apps exist yet - create one under Apps first.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {apps.map((a) => {
            const on = selected.includes(a.id);
            return (
              <button
                key={a.id}
                title={a.name}
                onClick={() =>
                  onChange(
                    on ? selected.filter((x) => x !== a.id) : [...selected, a.id],
                  )
                }
                className={`text-[11px] px-1.5 py-0.5 rounded font-mono transition-colors ${
                  on
                    ? "bg-sky-900/40 text-sky-300 border border-sky-700"
                    : "bg-zinc-800 text-zinc-400 border border-transparent hover:text-zinc-200"
                }`}
              >
                {a.slug}
              </button>
            );
          })}
        </div>
      )}
      <p className="mt-1.5 text-[11px] text-zinc-500 leading-snug">
        {selected.length === 0 ? (
          <>
            With no app selected this account cannot access anything until it
            is granted one.
          </>
        ) : privilege === null ? (
          <span className="text-amber-400">
            Select reader, editor or admin - it becomes the account&apos;s
            privilege in the selected apps.
          </span>
        ) : privilege === "admin" ? (
          <>
            <span className="font-mono text-zinc-300">admin</span> of the
            selected apps only: their data, members and settings. It is not a
            server admin and cannot reach any other app or schema.
          </>
        ) : (
          <>
            <span className="font-mono text-zinc-300">{privilege}</span> in the
            selected apps only. It cannot reach any other app or schema.
          </>
        )}
      </p>
    </div>
  );
}

function CreateAccountForm({
  availableRoles,
  apps,
  onSubmit,
}: {
  availableRoles: string[];
  apps: AppSummary[];
  onSubmit: (req: {
    name: string;
    description?: string;
    roles?: string[];
    service_role?: boolean;
    apps?: string[];
  }) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [serviceRole, setServiceRole] = useState(false);
  const [appIds, setAppIds] = useState<string[]>([]);

  // Granting apps needs a role that names the privilege to grant.
  const missingPrivilege =
    !serviceRole && appIds.length > 0 && highestAppPrivilege(roles) === null;
  const canSubmit = name.trim() !== "" && !missingPrivilege;

  return (
    <div className="px-3 py-3 border-b border-zinc-800 bg-zinc-900/50 space-y-2">
      <input
        autoFocus={canAutoFocus()}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Account name (e.g. ci-bot)"
        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
      />
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
      />
      <div>
        <p className="text-[11px] text-zinc-500 mb-1">Roles</p>
        <div className="flex flex-wrap gap-1">
          {availableRoles.map((r) => {
            const on = roles.includes(r);
            return (
              <button
                key={r}
                onClick={() =>
                  setRoles((prev) =>
                    on ? prev.filter((x) => x !== r) : [...prev, r],
                  )
                }
                className={`text-[11px] px-1.5 py-0.5 rounded transition-colors ${
                  on
                    ? "bg-blue-900/40 text-blue-300 border border-blue-700"
                    : "bg-zinc-800 text-zinc-400 border border-transparent hover:text-zinc-200"
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>
      <label className="flex items-center gap-2 text-[11px] text-zinc-400 cursor-pointer">
        <input
          type="checkbox"
          checked={serviceRole}
          onChange={(e) => setServiceRole(e.target.checked)}
        />
        Grant <span className="font-mono">service_role</span> (server-wide,
        bypasses RLS)
      </label>
      {serviceRole ? (
        <p className="text-[11px] text-amber-400/80 leading-snug">
          Server-wide: the roles above apply to the entire server, so{" "}
          <span className="font-mono">admin</span> here is a full server admin.
        </p>
      ) : (
        <AppGrantPicker
          apps={apps}
          selected={appIds}
          roles={roles}
          onChange={setAppIds}
        />
      )}
      <button
        onClick={() => {
          if (!canSubmit) return;
          onSubmit({
            name: name.trim(),
            description: description.trim() || undefined,
            roles,
            service_role: serviceRole,
            apps: serviceRole ? [] : appIds,
          });
        }}
        disabled={!canSubmit}
        className="w-full px-2 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-xs font-medium rounded transition-colors"
      >
        Create Account
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Account detail (right pane): metadata + keys
// ---------------------------------------------------------------------------

function AccountDetail({
  client,
  account,
  availableRoles,
  apps,
  onChanged,
  onDeleted,
}: {
  client: ApiClient;
  account: ServiceAccount;
  availableRoles: string[];
  apps: AppSummary[];
  onChanged: () => Promise<void>;
  onDeleted: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(account.name);
  const [editDescription, setEditDescription] = useState(account.description);
  const [editRoles, setEditRoles] = useState<string[]>(account.roles);
  const [editDisabled, setEditDisabled] = useState(account.disabled);
  const grantedIds = account.apps.map((g) => g.app_id);
  const [editApps, setEditApps] = useState<string[]>(grantedIds);
  const [error, setError] = useState<string | null>(null);

  // Re-seed the edit form whenever the selected account changes.
  useEffect(() => {
    setEditing(false);
    setEditName(account.name);
    setEditDescription(account.description);
    setEditRoles(account.roles);
    setEditDisabled(account.disabled);
    setEditApps(account.apps.map((g) => g.app_id));
    setError(null);
  }, [
    account.id,
    account.name,
    account.description,
    account.disabled,
    account.roles,
    account.apps,
  ]);

  const appsChanged = !sameIds(editApps, grantedIds);
  // Apps held (or about to be) need a role naming their privilege.
  const missingPrivilege =
    !account.service_role &&
    editApps.length > 0 &&
    (account.app_scoped || appsChanged) &&
    highestAppPrivilege(editRoles) === null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-lg font-semibold text-zinc-100 font-mono">
            {account.name}
          </h2>
          {account.service_role && (
            <span className="text-[11px] px-2 py-0.5 rounded bg-amber-900/30 text-amber-400">
              service_role
            </span>
          )}
          {account.disabled && (
            <span className="text-[11px] px-2 py-0.5 rounded bg-red-900/30 text-red-400">
              disabled
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 font-mono">{account.id}</p>
        {account.description && (
          <p className="mt-2 text-sm text-zinc-400">{account.description}</p>
        )}
        <p className="mt-2 text-[11px] text-zinc-600">
          Created by <span className="text-zinc-400">{account.created_by}</span>{" "}
          on {new Date(account.created_on).toLocaleString()}
        </p>
      </div>

      {/* Access: how far this account's roles reach */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
          Access
        </h3>
        {account.service_role ? (
          <p className="text-xs text-zinc-400">
            Server-wide. Its roles ({account.roles.join(", ") || "none"}) apply
            to the entire server and it bypasses RLS.
          </p>
        ) : isLegacyServerWide(account) ? (
          <p className="text-xs text-amber-400/90 leading-relaxed">
            Server-wide. This account was created before app scoping, so its
            roles ({account.roles.join(", ") || "none"}) still apply to the
            entire server
            {account.roles.includes("admin") && " - including full server admin"}
            . Edit it and grant it apps to confine it to them.
          </p>
        ) : account.apps.length === 0 ? (
          <p className="text-xs text-zinc-500 italic">
            No apps granted - this account cannot access anything yet.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {account.apps.map((g) => (
                <span
                  key={g.app_id}
                  title={g.name}
                  className="text-[11px] px-2 py-0.5 rounded bg-sky-900/30 text-sky-300 font-mono"
                >
                  {g.slug} · {g.privilege}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-zinc-500">
              Confined to these apps. It has no access to other apps, the
              public schema, storage, or server administration.
            </p>
          </>
        )}
      </div>

      {/* Edit form */}
      {!editing ? (
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(true)}
            className="text-xs px-3 py-1 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
          >
            Edit
          </button>
          <button
            onClick={async () => {
              if (
                !confirm(
                  `Delete service account "${account.name}"? This will revoke every API key it owns. This cannot be undone.`,
                )
              )
                return;
              setError(null);
              try {
                await client.deleteServiceAccount(account.id);
                await onDeleted();
              } catch (e) {
                setError(String(e));
              }
            }}
            className="text-xs px-3 py-1 rounded bg-red-900/40 text-red-300 hover:bg-red-900/60"
          >
            Delete
          </button>
        </div>
      ) : (
        <div className="space-y-2 p-3 rounded border border-zinc-800 bg-zinc-900/50">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Name"
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
          />
          <input
            type="text"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Description"
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
          />
          <div>
            <p className="text-[11px] text-zinc-500 mb-1">Roles</p>
            <div className="flex flex-wrap gap-1">
              {availableRoles.map((r) => {
                const on = editRoles.includes(r);
                return (
                  <button
                    key={r}
                    onClick={() =>
                      setEditRoles((prev) =>
                        on ? prev.filter((x) => x !== r) : [...prev, r],
                      )
                    }
                    className={`text-[11px] px-1.5 py-0.5 rounded transition-colors ${
                      on
                        ? "bg-blue-900/40 text-blue-300 border border-blue-700"
                        : "bg-zinc-800 text-zinc-400 border border-transparent hover:text-zinc-200"
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>
          {!account.service_role && (
            <AppGrantPicker
              apps={apps}
              selected={editApps}
              roles={editRoles}
              onChange={setEditApps}
            />
          )}
          {isLegacyServerWide(account) && appsChanged && (
            <p className="text-[11px] text-amber-400/90 leading-snug">
              Saving confines this account to the selected apps. Keys that rely
              on its server-wide access will stop working outside them.
            </p>
          )}
          <label className="flex items-center gap-2 text-[11px] text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={editDisabled}
              onChange={(e) => setEditDisabled(e.target.checked)}
            />
            Disabled (account cannot be used to authenticate)
          </label>
          <div className="flex gap-2 pt-1">
            <button
              onClick={async () => {
                setError(null);
                try {
                  await client.updateServiceAccount(account.id, {
                    name:
                      editName.trim() !== account.name
                        ? editName.trim()
                        : undefined,
                    description:
                      editDescription !== account.description
                        ? editDescription
                        : undefined,
                    roles:
                      JSON.stringify(editRoles) !==
                      JSON.stringify(account.roles)
                        ? editRoles
                        : undefined,
                    disabled:
                      editDisabled !== account.disabled
                        ? editDisabled
                        : undefined,
                    apps: appsChanged ? editApps : undefined,
                  });
                  setEditing(false);
                  await onChanged();
                } catch (e) {
                  setError(String(e));
                }
              }}
              disabled={missingPrivilege}
              className="text-xs px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="text-xs px-3 py-1 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-2 rounded bg-red-900/20 border border-red-900/40 text-red-400 text-xs break-words">
          {error}
        </div>
      )}

      <ApiKeysPanel client={client} account={account} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// API keys subpanel
// ---------------------------------------------------------------------------

function ApiKeysPanel({
  client,
  account,
}: {
  client: ApiClient;
  account: ServiceAccount;
}) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [justCreated, setJustCreated] = useState<CreatedApiKey | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setKeys(await client.listApiKeys(account.id));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [client, account.id]);

  // Reload whenever the selected account changes; clear the
  // just-created secret so it doesn't bleed across accounts.
  useEffect(() => {
    setJustCreated(null);
    setShowCreate(false);
    refresh();
  }, [refresh]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
          API Keys
          <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 font-normal tabular-nums">
            {keys.length}
          </span>
        </h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
        >
          {showCreate ? "Cancel" : "+ Create Key"}
        </button>
      </div>

      {showCreate && (
        <CreateKeyForm
          accountRoles={account.roles}
          onSubmit={async (req) => {
            setError(null);
            try {
              const created = await client.createApiKey(account.id, req);
              setJustCreated(created);
              setShowCreate(false);
              await refresh();
            } catch (e) {
              setError(String(e));
            }
          }}
        />
      )}

      {justCreated && (
        <NewKeyDisplay
          created={justCreated}
          onDismiss={() => setJustCreated(null)}
        />
      )}

      {error && (
        <div className="mb-3 p-2 rounded bg-red-900/20 border border-red-900/40 text-red-400 text-xs break-words">
          {error}
        </div>
      )}

      {keys.length === 0 && !loading && (
        <p className="text-xs text-zinc-500 italic">
          No API keys for this account. Click{" "}
          <span className="font-mono">+ Create Key</span>.
        </p>
      )}

      {keys.length > 0 && (
        <div className="overflow-x-auto rounded border border-zinc-800">
          <table className="w-full text-xs">
            <thead className="bg-zinc-900">
              <tr className="border-b border-zinc-800">
                <th className="text-left px-3 py-2 text-zinc-400 font-medium">
                  Name
                </th>
                <th className="text-left px-3 py-2 text-zinc-400 font-medium">
                  Prefix
                </th>
                <th className="text-left px-3 py-2 text-zinc-400 font-medium">
                  Scopes
                </th>
                <th className="text-left px-3 py-2 text-zinc-400 font-medium">
                  Created
                </th>
                <th className="text-left px-3 py-2 text-zinc-400 font-medium">
                  Last used
                </th>
                <th className="text-left px-3 py-2 text-zinc-400 font-medium">
                  Expires
                </th>
                <th className="text-left px-3 py-2 text-zinc-400 font-medium">
                  Status
                </th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr
                  key={k.id}
                  className="border-b border-zinc-800/50 hover:bg-zinc-900/50"
                >
                  <td className="px-3 py-1.5 text-zinc-200">{k.name}</td>
                  <td className="px-3 py-1.5 text-zinc-400 font-mono">
                    {k.prefix}…
                  </td>
                  <td className="px-3 py-1.5 text-zinc-400">
                    {k.scopes.length === 0 ? (
                      <span className="text-zinc-600 italic">all roles</span>
                    ) : (
                      <span className="font-mono">{k.scopes.join(", ")}</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-zinc-400 whitespace-nowrap">
                    {new Date(k.created_on).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-1.5 text-zinc-400 whitespace-nowrap">
                    {k.last_used_on
                      ? new Date(k.last_used_on).toLocaleString()
                      : "never"}
                  </td>
                  <td className="px-3 py-1.5 text-zinc-400 whitespace-nowrap">
                    {k.expires_on
                      ? new Date(k.expires_on).toLocaleDateString()
                      : "never"}
                  </td>
                  <td className="px-3 py-1.5">
                    {k.revoked ? (
                      <span className="px-1.5 py-0.5 rounded bg-red-900/40 text-red-300">
                        revoked
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-900/40 text-emerald-300">
                        active
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    {!k.revoked && (
                      <button
                        onClick={async () => {
                          if (
                            !confirm(
                              `Revoke key "${k.name}"? This cannot be undone.`,
                            )
                          )
                            return;
                          try {
                            await client.revokeApiKey(account.id, k.id);
                            await refresh();
                          } catch (e) {
                            setError(String(e));
                          }
                        }}
                        className="text-[11px] px-2 py-0.5 rounded bg-red-900/40 text-red-300 hover:bg-red-900/60"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
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
// Create-key form
// ---------------------------------------------------------------------------

const EXPIRY_OPTIONS: { label: string; secs: number | null }[] = [
  { label: "1 hour", secs: 3600 },
  { label: "1 day", secs: 86400 },
  { label: "7 days", secs: 7 * 86400 },
  { label: "30 days", secs: 30 * 86400 },
  { label: "90 days", secs: 90 * 86400 },
  { label: "1 year", secs: 365 * 86400 },
  { label: "Never", secs: null },
];

function CreateKeyForm({
  accountRoles,
  onSubmit,
}: {
  accountRoles: string[];
  onSubmit: (req: {
    name: string;
    scopes?: string[];
    expires_on?: number | null;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>([]);
  const [expirySecs, setExpirySecs] = useState<number | null>(30 * 86400);

  return (
    <div className="px-3 py-3 mb-3 rounded border border-zinc-800 bg-zinc-900/50 space-y-2">
      <input
        autoFocus={canAutoFocus()}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Key name (e.g. github-actions)"
        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
      />
      <div>
        <p className="text-[11px] text-zinc-500 mb-1">
          Scope (subset of account roles; leave empty for full account roles)
        </p>
        <div className="flex flex-wrap gap-1">
          {accountRoles.length === 0 && (
            <span className="text-[11px] text-zinc-600 italic">
              account has no roles - key will inherit none
            </span>
          )}
          {accountRoles.map((r) => {
            const on = scopes.includes(r);
            return (
              <button
                key={r}
                onClick={() =>
                  setScopes((prev) =>
                    on ? prev.filter((x) => x !== r) : [...prev, r],
                  )
                }
                className={`text-[11px] px-1.5 py-0.5 rounded transition-colors ${
                  on
                    ? "bg-blue-900/40 text-blue-300 border border-blue-700"
                    : "bg-zinc-800 text-zinc-400 border border-transparent hover:text-zinc-200"
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className="text-[11px] text-zinc-500 mb-1">Expires</p>
        <select
          value={expirySecs === null ? "never" : String(expirySecs)}
          onChange={(e) =>
            setExpirySecs(
              e.target.value === "never" ? null : Number(e.target.value),
            )
          }
          className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
        >
          {EXPIRY_OPTIONS.map((o) => (
            <option
              key={o.label}
              value={o.secs === null ? "never" : String(o.secs)}
            >
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={() => {
          if (!name.trim()) return;
          const expires_on =
            expirySecs === null ? null : Date.now() + expirySecs * 1000;
          onSubmit({ name: name.trim(), scopes, expires_on });
        }}
        disabled={!name.trim()}
        className="w-full px-2 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-xs font-medium rounded transition-colors"
      >
        Create Key
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// One-time secret display - the server returns the plaintext key only once
// at creation, so the user MUST copy it now or never get it back.
// ---------------------------------------------------------------------------

function NewKeyDisplay({
  created,
  onDismiss,
}: {
  created: CreatedApiKey;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="mb-3 p-3 rounded border border-amber-700 bg-amber-950/30 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-amber-300">
          Save this key now - it won't be shown again.
        </span>
      </div>
      <div className="flex gap-2 items-center">
        <code className="flex-1 min-w-0 break-all bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs font-mono text-zinc-100">
          {created.secret}
        </code>
        <button
          onClick={() => {
            navigator.clipboard.writeText(created.secret);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white whitespace-nowrap"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
        <button
          onClick={onDismiss}
          className="text-xs px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
        >
          Dismiss
        </button>
      </div>
      <p className="text-[11px] text-amber-300/70">
        Key <span className="font-mono">{created.name}</span> · prefix{" "}
        <span className="font-mono">{created.prefix}</span> · use as{" "}
        <span className="font-mono">Authorization: Bearer &lt;key&gt;</span>
      </p>
    </div>
  );
}
