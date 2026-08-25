/**
 * Additional-server support for the login screen (VITE_ANVIL_ALLOW_SERVER_ADD).
 *
 * A visitor on the login page can point this Hammer instance at another Anvil
 * server before authenticating. The server is only *remembered* (persisted to
 * localStorage) once a login against it succeeds; until then it lives purely
 * in React state. A successful login also records the active server so a
 * reload reconnects to it.
 */

export interface SavedServer {
  id: string;
  /** Display name; defaults to the host when the user doesn't provide one. */
  name: string;
  /** Normalized origin, e.g. "https://db.example.com:7474" (no trailing slash). */
  url: string;
}

const SERVERS_KEY = "anvil_saved_servers";
const ACTIVE_SERVER_KEY = "anvil_active_server";
const DEFAULT_PORT = "7474";

/**
 * Normalize user input into an origin URL.
 *
 * - Scheme optional: localhost/127.x/[::1] default to http, everything else https.
 * - Port optional: defaults to Anvil's 7474.
 * - Path, query, credentials are rejected-by-stripping down to the origin.
 *
 * Throws with a human-readable message when the input can't be a server URL.
 */
export function normalizeServerUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Enter a server URL");

  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    if (/^[a-z]+:\/\//i.test(candidate)) {
      throw new Error("Only http:// and https:// servers are supported");
    }
    const bareHost = candidate.split(/[/:]/)[0].toLowerCase();
    const isLocal =
      bareHost === "localhost" || bareHost.startsWith("127.") || candidate.startsWith("[::1]");
    candidate = `${isLocal ? "http" : "https"}://${candidate}`;
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error(`Not a valid server URL: ${trimmed}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http:// and https:// servers are supported");
  }
  if (!url.hostname) throw new Error(`Not a valid server URL: ${trimmed}`);

  const port = url.port || DEFAULT_PORT;
  return `${url.protocol}//${url.hostname}:${port}`;
}

export function loadSavedServers(): SavedServer[] {
  try {
    const raw = localStorage.getItem(SERVERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is SavedServer =>
        s && typeof s.id === "string" && typeof s.name === "string" && typeof s.url === "string",
    );
  } catch {
    return [];
  }
}

export function saveSavedServers(servers: SavedServer[]): void {
  try {
    localStorage.setItem(SERVERS_KEY, JSON.stringify(servers));
  } catch {
    // Ignore (private mode, quota).
  }
}

/** Add or refresh a server in the list; returns the updated list. */
export function upsertSavedServer(servers: SavedServer[], url: string, name?: string): SavedServer[] {
  const existing = servers.find((s) => s.url === url);
  if (existing) {
    if (name && name !== existing.name) {
      return servers.map((s) => (s.url === url ? { ...s, name } : s));
    }
    return servers;
  }
  const fallbackName = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  })();
  return [...servers, { id: crypto.randomUUID(), name: name?.trim() || fallbackName, url }];
}

export function loadActiveServerUrl(): string | null {
  try {
    return localStorage.getItem(ACTIVE_SERVER_KEY);
  } catch {
    return null;
  }
}

export function saveActiveServerUrl(url: string | null): void {
  try {
    if (url === null) localStorage.removeItem(ACTIVE_SERVER_KEY);
    else localStorage.setItem(ACTIVE_SERVER_KEY, url);
  } catch {
    // Ignore.
  }
}
