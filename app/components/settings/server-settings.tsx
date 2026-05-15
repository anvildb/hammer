import { useState, useEffect, useCallback } from "react";
import { useConnection } from "~/lib/connection-context";
import type { RuntimeSetting } from "~/lib/api-client";

const CATEGORIES = ["auth", "query", "logging", "server", "storage"] as const;
type Category = (typeof CATEGORIES)[number];

const categoryLabels: Record<Category, string> = {
  auth: "Auth / Email",
  query: "Query Engine",
  logging: "Logging",
  server: "Server",
  storage: "Storage",
};

export function ServerSettings() {
  const { client, isAdmin, status } = useConnection();
  const [settings, setSettings] = useState<RuntimeSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (status !== "connected") return;
    setLoading(true);
    setError(null);
    try {
      const result = await client.listSettings();
      setSettings(result.settings);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [client, status]);

  useEffect(() => {
    if (isAdmin) fetchSettings();
    else setLoading(false);
  }, [isAdmin, fetchSettings]);

  const handleSave = async (key: string) => {
    setSaving(true);
    setError(null);
    try {
      await client.updateSetting(key, editValue);
      setEditingKey(null);
      await fetchSettings();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (key: string) => {
    setSaving(true);
    setError(null);
    try {
      await client.resetSetting(key);
      setEditingKey(null);
      await fetchSettings();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <p className="text-zinc-500 text-xs">
        Server settings require admin role.
      </p>
    );
  }

  if (loading) {
    return <p className="text-zinc-500 text-xs">Loading settings...</p>;
  }

  const filtered = settings.filter(
    (s) =>
      !filter ||
      s.key.toLowerCase().includes(filter.toLowerCase()) ||
      s.description.toLowerCase().includes(filter.toLowerCase())
  );

  const grouped = CATEGORIES.map((cat) => ({
    category: cat,
    label: categoryLabels[cat],
    items: filtered.filter((s) => s.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-red-400 text-xs bg-red-950/30 border border-red-900 rounded px-3 py-2">
          {error}
        </p>
      )}

      <input
        type="text"
        placeholder="Filter settings..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
      />

      {grouped.map((group) => (
        <div key={group.category}>
          <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
            {group.label}
          </h3>
          <div className="border border-zinc-800 rounded divide-y divide-zinc-800">
            {group.items.map((setting) => (
              <div key={setting.key} className="px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-zinc-200 font-mono">
                        {setting.key}
                      </code>
                      <SourceBadge source={setting.source} />
                      {setting.read_only && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-400 border border-amber-800/50">
                          restart
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {setting.description}
                    </p>
                    {setting.updated_at > 0 && (
                      <p className="text-[10px] text-zinc-600 mt-0.5">
                        Changed by {setting.updated_by || "unknown"} at{" "}
                        {new Date(setting.updated_at).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {editingKey === setting.key ? (
                      <>
                        {setting.type === "bool" ? (
                          <select
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="bg-zinc-950 border border-blue-600 rounded px-2 py-0.5 text-xs text-zinc-100 focus:outline-none"
                          >
                            <option value="true">true</option>
                            <option value="false">false</option>
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSave(setting.key);
                              if (e.key === "Escape") setEditingKey(null);
                            }}
                            autoFocus
                            className="bg-zinc-950 border border-blue-600 rounded px-2 py-0.5 text-xs text-zinc-100 font-mono w-40 focus:outline-none"
                          />
                        )}
                        <button
                          onClick={() => handleSave(setting.key)}
                          disabled={saving}
                          className="text-[10px] px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
                        >
                          {saving ? "..." : "Save"}
                        </button>
                        <button
                          onClick={() => setEditingKey(null)}
                          className="text-[10px] px-2 py-0.5 rounded text-zinc-400 hover:text-zinc-200"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <code className="text-xs text-zinc-300 font-mono bg-zinc-800 px-2 py-0.5 rounded max-w-[200px] truncate">
                          {setting.type === "string" && setting.key.includes("pass")
                            ? setting.value ? "***" : ""
                            : setting.value || "\u00A0"}
                        </code>
                        {!setting.read_only && (
                          <button
                            onClick={() => {
                              setEditingKey(setting.key);
                              setEditValue(setting.value);
                            }}
                            className="text-[10px] px-1.5 py-0.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
                          >
                            Edit
                          </button>
                        )}
                        {setting.source === "runtime" && (
                          <button
                            onClick={() => handleReset(setting.key)}
                            disabled={saving}
                            className="text-[10px] px-1.5 py-0.5 rounded text-amber-500 hover:text-amber-300 hover:bg-zinc-800 disabled:opacity-50"
                          >
                            Reset
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {grouped.length === 0 && (
        <p className="text-zinc-500 text-xs">No settings match your filter.</p>
      )}
    </div>
  );
}

function SourceBadge({ source }: { source: string }) {
  const colors: Record<string, string> = {
    default: "bg-zinc-800 text-zinc-400 border-zinc-700",
    file: "bg-indigo-900/40 text-indigo-400 border-indigo-800/50",
    env: "bg-green-900/40 text-green-400 border-green-800/50",
    runtime: "bg-blue-900/40 text-blue-400 border-blue-800/50",
  };
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded border ${colors[source] || colors.default}`}
    >
      {source}
    </span>
  );
}
