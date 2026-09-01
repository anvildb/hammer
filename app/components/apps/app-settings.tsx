import { useState, useEffect, useCallback } from "react";
import type { ApiClient, AppSettingEntry } from "~/lib/api-client";

interface Props {
  client: ApiClient;
  appId: string;
}

/**
 * App-scoped settings (APPS.md Phase 3): each key shows its effective value
 * and whether it is overridden for this app or inherited from the server.
 */
export function AppSettings({ client, appId }: Props) {
  const [entries, setEntries] = useState<AppSettingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await client.getAppSettings(appId));
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [client, appId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function save(key: string) {
    setBusy(true);
    try {
      setEntries(await client.putAppSettings(appId, { [key]: draft }));
      setEditing(null);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function reset(key: string) {
    setBusy(true);
    try {
      setEntries(await client.deleteAppSetting(appId, key));
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4 space-y-3">
      <p className="text-xs text-zinc-500">
        Overrides apply only to this app (verification / OTP emails, link base
        URL). Anything not overridden inherits the server-wide value. Equivalent
        Cypher:{" "}
        <span className="font-mono">
          SET SETTING 'app.&lt;slug&gt;.&lt;key&gt;' = '…'
        </span>
        .
      </p>

      {error && (
        <div className="p-2 rounded bg-red-900/20 border border-red-900/40 text-red-400 text-xs break-words">
          {error}
        </div>
      )}

      {loading && entries.length === 0 ? (
        <p className="text-xs text-zinc-500">Loading...</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-900 border-b border-zinc-800">
                <th className="text-left px-3 py-2 text-zinc-400 font-medium">
                  Key
                </th>
                <th className="text-left px-3 py-2 text-zinc-400 font-medium">
                  Value
                </th>
                <th className="text-left px-3 py-2 text-zinc-400 font-medium">
                  Source
                </th>
                <th className="px-3 py-2 w-40"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr
                  key={e.key}
                  className="border-b border-zinc-800/50 hover:bg-zinc-900/50"
                >
                  <td className="px-3 py-2 font-mono text-xs text-zinc-200">
                    {e.key}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-zinc-300">
                    {editing === e.key ? (
                      <input
                        autoFocus
                        value={draft}
                        onChange={(ev) => setDraft(ev.target.value)}
                        onKeyDown={(ev) => {
                          if (ev.key === "Enter") save(e.key);
                          if (ev.key === "Escape") setEditing(null);
                        }}
                        type={e.key.endsWith("smtp_pass") ? "password" : "text"}
                        className="w-full bg-zinc-800 text-zinc-200 rounded px-2 py-0.5 border border-zinc-600 focus:border-zinc-400 focus:outline-none"
                      />
                    ) : (
                      <span className="break-all">
                        {e.value || (
                          <span className="text-zinc-600">(empty)</span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        e.source === "app"
                          ? "bg-emerald-900/30 text-emerald-400"
                          : "bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {e.source}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right space-x-1">
                    {editing === e.key ? (
                      <>
                        <button
                          disabled={busy}
                          onClick={() => save(e.key)}
                          className="text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-100 hover:bg-zinc-600 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditing(e.key);
                            setDraft(
                              e.key.endsWith("smtp_pass") ? "" : e.value,
                            );
                          }}
                          className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                        >
                          Override
                        </button>
                        {e.source === "app" && (
                          <button
                            disabled={busy}
                            onClick={() => reset(e.key)}
                            className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-red-300 disabled:opacity-50"
                          >
                            Reset
                          </button>
                        )}
                      </>
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
