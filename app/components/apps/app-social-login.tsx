import { useState, useEffect, useCallback } from "react";
import type { ApiClient, AppSettingEntry } from "~/lib/api-client";

interface Props {
  client: ApiClient;
  appId: string;
}

/** The app-scoped settings keys this panel drives (a friendlier face over the
 *  raw Settings tab). All are in the server's `APP_SCOPABLE_KEYS`. */
const K = {
  enabled: "auth.oauth.linkedin.enabled",
  clientId: "auth.oauth.linkedin.client_id",
  clientSecret: "auth.oauth.linkedin.client_secret",
  redirectUrl: "auth.oauth.linkedin.redirect_url",
  allowlist: "auth.oauth.redirect_allowlist",
  allowReg: "auth.allow_oauth_registration",
  baseUrl: "server.base_url",
} as const;

/** LinkedIn keys this panel resets when "Reset to server default" is used. */
const LINKEDIN_KEYS = [
  K.enabled,
  K.clientId,
  K.clientSecret,
  K.redirectUrl,
  K.allowlist,
  K.allowReg,
];

/**
 * Social login (OAuth) configuration for one app. Presents the LinkedIn
 * provider's app-scoped settings as a form rather than a raw key list; unset
 * fields inherit the server-wide value. Only fields the admin actually changes
 * are written, so inherited values don't silently become app overrides.
 */
export function AppSocialLogin({ client, appId }: Props) {
  const [entries, setEntries] = useState<AppSettingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form state. `clientSecret` stays empty unless the admin types a new one —
  // the stored secret is masked and must never be echoed back or re-saved.
  const [enabled, setEnabled] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [allowlist, setAllowlist] = useState("");
  const [allowReg, setAllowReg] = useState(true);

  const valOf = (list: AppSettingEntry[], k: string) =>
    list.find((e) => e.key === k)?.value ?? "";
  const srcOf = (k: string) =>
    entries.find((e) => e.key === k)?.source ?? "global";

  // Push a fresh settings list into both the entries cache and the form.
  const applyEntries = useCallback((list: AppSettingEntry[]) => {
    setEntries(list);
    setEnabled(valOf(list, K.enabled) === "true");
    setClientId(valOf(list, K.clientId));
    setClientSecret("");
    setRedirectUrl(valOf(list, K.redirectUrl));
    setAllowlist(valOf(list, K.allowlist));
    // allow_oauth_registration defaults to true server-side.
    setAllowReg(valOf(list, K.allowReg) !== "false");
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      applyEntries(await client.getAppSettings(appId));
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [client, appId, applyEntries]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // A stored secret shows up masked; that tells us one exists without leaking it.
  const secretIsSet = valOf(entries, K.clientSecret) === "********";

  // The callback (`redirect_uri`) LinkedIn returns to. This is where Anvil
  // exchanges the code, so it MUST live on the Anvil server — which, from this
  // client, is authoritatively the server we make API calls to (client.baseUrl).
  const anvilServer = (client.baseUrl || "").replace(/\/$/, "");
  const recommendedCallback = `${anvilServer}/auth/oauth/linkedin/callback`;

  // What Anvil will actually send: the override if set, else derived from the
  // app's effective base URL (server.base_url) — which may be misconfigured to
  // a client origin, the classic "404 on the client" mistake.
  const derivedBase = (
    valOf(entries, K.baseUrl) ||
    client.baseUrl ||
    ""
  ).replace(/\/$/, "");
  const effectiveCallback = redirectUrl.trim()
    ? redirectUrl.trim()
    : `${derivedBase}/auth/oauth/linkedin/callback`;

  const originOf = (u: string): string => {
    try {
      return new URL(u).origin;
    } catch {
      return "";
    }
  };
  // Warn when the callback doesn't point at the Anvil server this client talks
  // to (e.g. it resolves to the Hammer/client origin).
  const callbackMismatch =
    !!anvilServer &&
    !!effectiveCallback &&
    originOf(effectiveCallback) !== originOf(anvilServer);

  const configured = enabled && clientId.trim() !== "" && secretIsSet;

  // Only send what actually changed, so inherited values stay inherited.
  function changedValues(): Record<string, string> {
    const out: Record<string, string> = {};
    if ((enabled ? "true" : "false") !== (valOf(entries, K.enabled) || "false"))
      out[K.enabled] = enabled ? "true" : "false";
    if (clientId !== valOf(entries, K.clientId)) out[K.clientId] = clientId;
    if (clientSecret.trim() !== "") out[K.clientSecret] = clientSecret.trim();
    if (redirectUrl !== valOf(entries, K.redirectUrl))
      out[K.redirectUrl] = redirectUrl;
    if (allowlist !== valOf(entries, K.allowlist)) out[K.allowlist] = allowlist;
    const regNow = allowReg ? "true" : "false";
    if (regNow !== (valOf(entries, K.allowReg) || "true"))
      out[K.allowReg] = regNow;
    return out;
  }

  const dirty = Object.keys(changedValues()).length > 0;

  async function save() {
    const changes = changedValues();
    if (Object.keys(changes).length === 0) return;
    setBusy(true);
    try {
      applyEntries(await client.putAppSettings(appId, changes));
      setError(null);
      setInfo("Saved. LinkedIn settings for this app updated.");
    } catch (e) {
      setError(String(e));
      setInfo(null);
    } finally {
      setBusy(false);
    }
  }

  async function resetToGlobal() {
    setBusy(true);
    try {
      // Drop each LinkedIn override this app currently sets.
      const overridden = LINKEDIN_KEYS.filter(
        (k) => entries.find((e) => e.key === k)?.source === "app",
      );
      let latest = entries;
      for (const k of overridden) {
        latest = await client.deleteAppSetting(appId, k);
      }
      applyEntries(latest);
      setError(null);
      setInfo("Reset — this app now inherits the server-wide LinkedIn config.");
    } catch (e) {
      setError(String(e));
      setInfo(null);
    } finally {
      setBusy(false);
    }
  }

  const anyOverride = LINKEDIN_KEYS.some((k) => srcOf(k) === "app");

  function copyCallback() {
    navigator.clipboard?.writeText(effectiveCallback).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {},
    );
  }

  const SourceBadge = ({ k }: { k: string }) => (
    <span
      className={`ml-2 text-[10px] px-1.5 py-0.5 rounded align-middle ${
        srcOf(k) === "app"
          ? "bg-emerald-900/30 text-emerald-400"
          : "bg-zinc-800 text-zinc-500"
      }`}
    >
      {srcOf(k) === "app" ? "app" : "inherited"}
    </span>
  );

  if (loading && entries.length === 0) {
    return <p className="p-4 text-xs text-zinc-500">Loading...</p>;
  }

  return (
    <div className="p-4 space-y-4 max-w-xl">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#0a66c2]">
              <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
            </svg>
            Sign in with LinkedIn
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Configure LinkedIn OAuth for this app. Blank fields inherit the
            server-wide value. Callers reach it as{" "}
            <span className="font-mono">
              /auth/oauth/linkedin/start?app={"{slug}"}
            </span>
            .
          </p>
        </div>
        <span
          className={`shrink-0 text-[10px] px-2 py-0.5 rounded ${
            configured
              ? "bg-emerald-900/30 text-emerald-400"
              : "bg-zinc-800 text-zinc-400"
          }`}
        >
          {configured ? "configured" : "not configured"}
        </span>
      </div>

      {error && (
        <div className="p-2 rounded bg-red-900/20 border border-red-900/40 text-red-400 text-xs break-words">
          {error}
        </div>
      )}
      {info && (
        <div className="p-2 rounded bg-emerald-900/20 border border-emerald-900/40 text-emerald-400 text-xs break-words">
          {info}
        </div>
      )}

      {/* Enable toggle */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="accent-[#0a66c2]"
        />
        <span className="text-sm text-zinc-200">Enable for this app</span>
        <SourceBadge k={K.enabled} />
      </label>

      {/* Client ID */}
      <div>
        <label className="block text-xs text-zinc-400 mb-1">
          Client ID
          <SourceBadge k={K.clientId} />
        </label>
        <input
          type="text"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          placeholder="LinkedIn app client id"
          className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Client Secret */}
      <div>
        <label className="block text-xs text-zinc-400 mb-1">
          Client Secret
          <SourceBadge k={K.clientSecret} />
        </label>
        <input
          type="password"
          value={clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
          placeholder={
            secretIsSet ? "•••••••• (set — type to replace)" : "not set"
          }
          autoComplete="new-password"
          className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
        />
        <p className="text-[11px] text-zinc-600 mt-1">
          Stored server-side and never shown again. Leave blank to keep the
          current secret.
        </p>
      </div>

      {/* LinkedIn callback URL (redirect_uri) — editable */}
      <div>
        <label className="block text-xs text-zinc-400 mb-1">
          LinkedIn callback URL (redirect_uri)
          <SourceBadge k={K.redirectUrl} />
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={redirectUrl}
            onChange={(e) => setRedirectUrl(e.target.value)}
            placeholder={recommendedCallback}
            className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
          />
          <button
            type="button"
            onClick={copyCallback}
            className="shrink-0 text-xs px-2 py-2 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="text-[11px] text-zinc-600 mt-1">
          Anvil will send{" "}
          <span className="font-mono text-zinc-400 break-all">
            {effectiveCallback}
          </span>{" "}
          to LinkedIn. Register that exact URL in your LinkedIn app (scopes{" "}
          <span className="font-mono">openid profile email</span>). Leave blank
          to derive it from the server base URL.
        </p>
        {callbackMismatch && (
          <div className="mt-2 p-2 rounded bg-amber-900/20 border border-amber-800/50 text-amber-300 text-xs">
            <p>
              This callback points at{" "}
              <span className="font-mono">{originOf(effectiveCallback)}</span>,
              not your Anvil server (
              <span className="font-mono">{originOf(anvilServer)}</span>). The
              sign-in is completed <em>on the Anvil server</em>, so a client
              origin (e.g. the Hammer UI) will 404. This is usually because the
              app's <span className="font-mono">server.base_url</span> is set to
              a client URL.
            </p>
            <button
              type="button"
              onClick={() => setRedirectUrl(recommendedCallback)}
              className="mt-2 text-xs px-2 py-1 rounded bg-amber-800/40 text-amber-100 hover:bg-amber-800/60"
            >
              Use my Anvil server ({originOf(anvilServer)})
            </button>
          </div>
        )}
      </div>

      {/* Redirect allowlist */}
      <div>
        <label className="block text-xs text-zinc-400 mb-1">
          Client redirect allowlist
          <SourceBadge k={K.allowlist} />
        </label>
        <input
          type="text"
          value={allowlist}
          onChange={(e) => setAllowlist(e.target.value)}
          placeholder="https://app.example.com, https://other.example.com"
          className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
        />
        <p className="text-[11px] text-zinc-600 mt-1">
          Extra origins allowed to receive tokens. Loopback and the same origin
          as the base URL are always allowed; comma-separated.
        </p>
      </div>

      {/* Allow registration */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={allowReg}
          onChange={(e) => setAllowReg(e.target.checked)}
          className="accent-[#0a66c2]"
        />
        <span className="text-sm text-zinc-200">
          Auto-create an account on first login
        </span>
        <SourceBadge k={K.allowReg} />
      </label>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
        <button
          type="button"
          disabled={busy || !dirty}
          onClick={save}
          className="text-sm px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500"
        >
          {busy ? "Saving..." : "Save changes"}
        </button>
        {anyOverride && (
          <button
            type="button"
            disabled={busy}
            onClick={resetToGlobal}
            className="text-xs px-3 py-1.5 rounded bg-zinc-800 text-zinc-400 hover:text-red-300 disabled:opacity-50"
          >
            Reset to server default
          </button>
        )}
        {dirty && (
          <span className="text-[11px] text-zinc-500">unsaved changes</span>
        )}
      </div>
    </div>
  );
}
