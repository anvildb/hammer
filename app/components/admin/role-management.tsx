// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
import { useState } from "react";
import type { Role, Privilege } from "./types";

interface RoleManagementProps {
  roles: Role[];
  onCreateRole: (name: string, privileges: Privilege[]) => void;
  onDeleteRole: (name: string) => void;
  onGrantPrivilege: (role: string, privilege: Privilege) => void;
  onRevokePrivilege: (role: string, action: string, resource: string) => void;
}

const ACTIONS = ["read", "write", "execute", "admin", "access"];
const RESOURCES = ["graph", "schema", "index", "constraint", "user", "role", "database", "all"];

export function RoleManagement({
  roles,
  onCreateRole,
  onDeleteRole,
  onGrantPrivilege,
  onRevokePrivilege,
}: RoleManagementProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
          Roles
          <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 font-normal tabular-nums">
            {roles.length}
          </span>
        </h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
        >
          {showCreate ? "Cancel" : "+ Create Role"}
        </button>
      </div>

      {showCreate && (
        <CreateRoleForm
          onSubmit={(name, privs) => {
            onCreateRole(name, privs);
            setShowCreate(false);
          }}
        />
      )}

      <div className="divide-y divide-zinc-800/50">
        {roles.map((role) => (
          <div key={role.name} className="px-3 py-2 hover:bg-zinc-800/20">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-200">{role.name}</span>
              {role.builtIn && (
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                  built-in
                </span>
              )}
              <span className="text-[11px] text-zinc-600 ml-auto">
                {role.privileges.length} privilege{role.privileges.length !== 1 ? "s" : ""}
              </span>
              <button
                onClick={() => setExpanded(expanded === role.name ? null : role.name)}
                className="text-[11px] text-zinc-600 hover:text-zinc-300"
              >
                {expanded === role.name ? "collapse" : "expand"}
              </button>
              {!role.builtIn && (
                <button
                  onClick={() => onDeleteRole(role.name)}
                  className="text-[11px] text-red-500/60 hover:text-red-400"
                >
                  delete
                </button>
              )}
            </div>

            {expanded === role.name && (
              <div className="mt-2 space-y-1">
                {role.privileges.length === 0 && (
                  <p className="text-[11px] text-zinc-600 italic">No privileges</p>
                )}
                {role.privileges.map((priv, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-[11px] px-2 py-1 rounded bg-zinc-900 border border-zinc-800"
                  >
                    <span className={priv.grant === "granted" ? "text-green-400" : "text-red-400"}>
                      {priv.grant === "granted" ? "GRANT" : "DENY"}
                    </span>
                    <span className="text-zinc-300 font-mono">{priv.action}</span>
                    <span className="text-zinc-600">on</span>
                    <span className="text-zinc-300 font-mono">{priv.resource}</span>
                    {!role.builtIn && (
                      <button
                        onClick={() => onRevokePrivilege(role.name, priv.action, priv.resource)}
                        className="ml-auto text-red-500/60 hover:text-red-400"
                      >
                        revoke
                      </button>
                    )}
                  </div>
                ))}

                {!role.builtIn && (
                  <GrantPrivilegeInline
                    onGrant={(priv) => onGrantPrivilege(role.name, priv)}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CreateRoleForm({
  onSubmit,
}: {
  onSubmit: (name: string, privileges: Privilege[]) => void;
}) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    onSubmit(name, []);
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 border-b border-zinc-700 bg-zinc-900/50 flex items-end gap-2">
      <div className="flex-1">
        <label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-0.5">
          Role name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="editor"
          className="w-full bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700 focus:outline-none focus:border-zinc-500"
        />
      </div>
      <button
        type="submit"
        className="text-xs px-3 py-1 rounded bg-zinc-700 text-zinc-200 hover:bg-zinc-600"
      >
        Create
      </button>
    </form>
  );
}

function GrantPrivilegeInline({ onGrant }: { onGrant: (priv: Privilege) => void }) {
  const [action, setAction] = useState(ACTIONS[0]);
  const [resource, setResource] = useState(RESOURCES[0]);
  const [grant, setGrant] = useState<"granted" | "denied">("granted");

  return (
    <div className="flex items-center gap-1.5 mt-1">
      <select
        value={grant}
        onChange={(e) => setGrant(e.target.value as "granted" | "denied")}
        className="bg-zinc-800 text-zinc-300 text-[11px] rounded px-1 py-0.5 border border-zinc-700"
      >
        <option value="granted">GRANT</option>
        <option value="denied">DENY</option>
      </select>
      <select
        value={action}
        onChange={(e) => setAction(e.target.value)}
        className="bg-zinc-800 text-zinc-300 text-[11px] rounded px-1 py-0.5 border border-zinc-700"
      >
        {ACTIONS.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>
      <span className="text-[11px] text-zinc-600">on</span>
      <select
        value={resource}
        onChange={(e) => setResource(e.target.value)}
        className="bg-zinc-800 text-zinc-300 text-[11px] rounded px-1 py-0.5 border border-zinc-700"
      >
        {RESOURCES.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      <button
        onClick={() => onGrant({ action, resource, grant })}
        className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
      >
        +
      </button>
    </div>
  );
}
