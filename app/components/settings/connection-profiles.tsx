import { useState } from "react";
import type { ConnectionProfile } from "./types";

interface ConnectionProfilesProps {
  profiles: ConnectionProfile[];
  activeId: string | null;
  onAdd: (profile: ConnectionProfile) => void;
  onRemove: (id: string) => void;
  onSetActive: (id: string) => void;
  onEdit: (id: string, profile: ConnectionProfile) => void;
}

export function ConnectionProfiles({
  profiles,
  activeId,
  onAdd,
  onRemove,
  onSetActive,
  onEdit,
}: ConnectionProfilesProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] text-zinc-500 uppercase tracking-wider">
          Connection Profiles
        </p>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
        >
          {showCreate ? "Cancel" : "+ Add"}
        </button>
      </div>

      {showCreate && (
        <ProfileForm
          onSubmit={(p) => {
            onAdd(p);
            setShowCreate(false);
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      <div className="space-y-1">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className={`px-3 py-2 rounded border ${
              activeId === profile.id
                ? "bg-zinc-800/50 border-zinc-600"
                : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
            }`}
          >
            {editing === profile.id ? (
              <ProfileForm
                initial={profile}
                onSubmit={(p) => {
                  onEdit(profile.id, p);
                  setEditing(null);
                }}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-zinc-200">{profile.name}</span>
                  {activeId === profile.id && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-green-900/30 text-green-400">
                      active
                    </span>
                  )}
                  <span className="text-[11px] text-zinc-500 ml-auto font-mono tabular-nums">
                    {profile.useTls ? "tls://" : ""}
                    {profile.host}:{profile.port}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-500">
                  <span>user: {profile.username}</span>
                </div>
                <div className="flex gap-2 mt-1.5">
                  {activeId !== profile.id && (
                    <button
                      onClick={() => onSetActive(profile.id)}
                      className="text-[11px] text-zinc-600 hover:text-zinc-300"
                    >
                      connect
                    </button>
                  )}
                  <button
                    onClick={() => setEditing(profile.id)}
                    className="text-[11px] text-zinc-600 hover:text-zinc-300"
                  >
                    edit
                  </button>
                  {profiles.length > 1 && (
                    <button
                      onClick={() => onRemove(profile.id)}
                      className="text-[11px] text-red-500/60 hover:text-red-400"
                    >
                      remove
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: ConnectionProfile;
  onSubmit: (profile: ConnectionProfile) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [host, setHost] = useState(initial?.host ?? "localhost");
  const [port, setPort] = useState(initial?.port ?? 7474);
  const [username, setUsername] = useState(initial?.username ?? "admin");
  const [useTls, setUseTls] = useState(initial?.useTls ?? false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !host) return;
    onSubmit({
      id: initial?.id ?? crypto.randomUUID(),
      name,
      host,
      port,
      username,
      useTls,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-2 rounded bg-zinc-900 border border-zinc-700 space-y-2 mb-2">
      <div className="grid grid-cols-2 gap-2">
        <FormField label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Production"
            className="w-full bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700 focus:outline-none focus:border-zinc-500"
          />
        </FormField>
        <FormField label="Username">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700 focus:outline-none focus:border-zinc-500"
          />
        </FormField>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <FormField label="Host">
          <input
            value={host}
            onChange={(e) => setHost(e.target.value)}
            className="w-full bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700 focus:outline-none focus:border-zinc-500 font-mono"
          />
        </FormField>
        <FormField label="Port">
          <input
            type="number"
            value={port}
            min={1}
            max={65535}
            onChange={(e) => setPort(Number(e.target.value))}
            className="w-full bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700 focus:outline-none focus:border-zinc-500 tabular-nums"
          />
        </FormField>
        <FormField label="TLS">
          <button
            type="button"
            onClick={() => setUseTls(!useTls)}
            className={`text-xs px-2 py-1 rounded border w-full ${
              useTls
                ? "bg-zinc-700 text-zinc-200 border-zinc-600"
                : "bg-zinc-800 text-zinc-500 border-zinc-700"
            }`}
          >
            {useTls ? "Enabled" : "Disabled"}
          </button>
        </FormField>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="text-xs px-3 py-1 rounded bg-zinc-700 text-zinc-200 hover:bg-zinc-600"
        >
          {initial ? "Save" : "Add"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs px-3 py-1 rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-0.5">
        {label}
      </label>
      {children}
    </div>
  );
}
