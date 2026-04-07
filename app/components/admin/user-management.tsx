// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
import { useState } from "react";
import type { User } from "./types";

interface UserManagementProps {
  users: User[];
  availableRoles: string[];
  onCreateUser: (username: string, password: string, roles: string[]) => void;
  onEditUser: (username: string, patch: { roles?: string[]; active?: boolean }) => void;
  onDeleteUser: (username: string) => void;
}

export function UserManagement({
  users,
  availableRoles,
  onCreateUser,
  onEditUser,
  onDeleteUser,
}: UserManagementProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
          Users
          <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 font-normal tabular-nums">
            {users.length}
          </span>
        </h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
        >
          {showCreate ? "Cancel" : "+ Create User"}
        </button>
      </div>

      {showCreate && (
        <CreateUserForm
          availableRoles={availableRoles}
          onSubmit={(u, p, r) => {
            onCreateUser(u, p, r);
            setShowCreate(false);
          }}
        />
      )}

      <div className="divide-y divide-zinc-800/50">
        {users.map((user) => (
          <div key={user.username} className="px-3 py-2 hover:bg-zinc-800/20">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-200">{user.username}</span>
              {!user.active && (
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-red-900/30 text-red-400">
                  disabled
                </span>
              )}
              {user.passwordChangeRequired && (
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-400">
                  pwd change
                </span>
              )}
              <span className="text-[11px] text-zinc-600 ml-auto">
                {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>

            {/* Roles */}
            <div className="flex items-center gap-1 mt-1">
              {user.roles.map((role) => (
                <span
                  key={role}
                  className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400"
                >
                  {role}
                </span>
              ))}
            </div>

            {/* Actions */}
            {editing === user.username ? (
              <EditUserInline
                user={user}
                availableRoles={availableRoles}
                onSave={(patch) => {
                  onEditUser(user.username, patch);
                  setEditing(null);
                }}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <div className="flex gap-2 mt-1.5">
                <button
                  onClick={() => setEditing(user.username)}
                  className="text-[11px] text-zinc-600 hover:text-zinc-300"
                >
                  edit
                </button>
                <button
                  onClick={() => onEditUser(user.username, { active: !user.active })}
                  className="text-[11px] text-zinc-600 hover:text-zinc-300"
                >
                  {user.active ? "disable" : "enable"}
                </button>
                <button
                  onClick={() => onDeleteUser(user.username)}
                  className="text-[11px] text-red-500/60 hover:text-red-400"
                >
                  delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CreateUserForm({
  availableRoles,
  onSubmit,
}: {
  availableRoles: string[];
  onSubmit: (username: string, password: string, roles: string[]) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    onSubmit(username, password, [...selectedRoles]);
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 border-b border-zinc-700 bg-zinc-900/50 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Username">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700 focus:outline-none focus:border-zinc-500"
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700 focus:outline-none focus:border-zinc-500"
          />
        </Field>
      </div>
      <Field label="Roles">
        <div className="flex flex-wrap gap-1">
          {availableRoles.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() =>
                setSelectedRoles((prev) => {
                  const next = new Set(prev);
                  next.has(role) ? next.delete(role) : next.add(role);
                  return next;
                })
              }
              className={`text-[11px] px-1.5 py-0.5 rounded border ${
                selectedRoles.has(role)
                  ? "bg-zinc-700 text-zinc-200 border-zinc-600"
                  : "bg-zinc-800 text-zinc-500 border-zinc-700"
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </Field>
      <button
        type="submit"
        className="text-xs px-3 py-1 rounded bg-zinc-700 text-zinc-200 hover:bg-zinc-600"
      >
        Create
      </button>
    </form>
  );
}

function EditUserInline({
  user,
  availableRoles,
  onSave,
  onCancel,
}: {
  user: User;
  availableRoles: string[];
  onSave: (patch: { roles: string[] }) => void;
  onCancel: () => void;
}) {
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set(user.roles));

  return (
    <div className="mt-2 p-2 rounded bg-zinc-900 border border-zinc-700 space-y-2">
      <Field label="Roles">
        <div className="flex flex-wrap gap-1">
          {availableRoles.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() =>
                setSelectedRoles((prev) => {
                  const next = new Set(prev);
                  next.has(role) ? next.delete(role) : next.add(role);
                  return next;
                })
              }
              className={`text-[11px] px-1.5 py-0.5 rounded border ${
                selectedRoles.has(role)
                  ? "bg-zinc-700 text-zinc-200 border-zinc-600"
                  : "bg-zinc-800 text-zinc-500 border-zinc-700"
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </Field>
      <div className="flex gap-2">
        <button
          onClick={() => onSave({ roles: [...selectedRoles] })}
          className="text-[11px] px-2 py-0.5 rounded bg-zinc-700 text-zinc-200 hover:bg-zinc-600"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-0.5">
        {label}
      </label>
      {children}
    </div>
  );
}
