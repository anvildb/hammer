import type { AppSummary } from "~/lib/api-client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { ApiClient, type ServerInfo } from "./api-client";
import {
  type SavedServer,
  loadActiveServerUrl,
  loadSavedServers,
  saveActiveServerUrl,
  saveSavedServers,
  upsertSavedServer,
} from "./saved-servers";

export type ConnectionStatus = "connected" | "disconnected" | "connecting";

/** Built-in schemas; app schemas (`app_<slug>`) are appended at runtime. */
export const SCHEMAS = ["public", "auth", "system"] as const;
export type Schema = string;

/** The schema name owned by an app (mirrors the server's `app_<slug>`). */
export function appSchemaName(slug: string): string {
  return `app_${slug}`;
}

interface ConnectionContextValue {
  client: ApiClient;
  status: ConnectionStatus;
  serverInfo: ServerInfo | null;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  currentUser: string | null;
  userRoles: string[];
  isAdmin: boolean;
  selectedSchema: Schema;
  setSelectedSchema: (schema: Schema) => void;
  /** Apps the current user can access (server admins: all). */
  apps: AppSummary[];
  refreshApps: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  otpRequest: (
    email: string,
  ) => Promise<{ message: string; expires_in_seconds: number }>;
  otpVerify: (email: string, code: string) => Promise<void>;
  resendVerification: (email: string) => Promise<{ message: string }>;
  /** Social-login providers usable for the current server (discovery). */
  oauthProviders: { linkedin: boolean };
  /** Redirect the browser into a provider's OAuth flow. */
  startOAuthLogin: (provider: "linkedin") => void;
  /** Error carried back in the callback fragment, if the last attempt failed. */
  oauthError: string | null;
  logout: () => void;
  clearMustChangePassword: () => void;
  /** True when VITE_ANVIL_ALLOW_SERVER_ADD lets visitors pick/add servers on the login page. */
  allowServerAdd: boolean;
  /** The server this instance talks to right now. */
  baseUrl: string;
  /** The server this Hammer instance is configured with (loader/env or page origin). */
  defaultServerUrl: string;
  /** Servers remembered by a previous successful login on this browser. */
  savedServers: SavedServer[];
  /** Point the client at another server (login page only; drops any session). */
  selectServer: (url: string, name?: string) => void;
  /** Forget a remembered server. */
  removeSavedServer: (id: string) => void;
}

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

const TOKENS_KEY = "anvil_tokens";
const ANVIL_PORT = "7474";

function resolveBaseUrl(anvilApiUrl?: string): string {
  if (anvilApiUrl) return anvilApiUrl.replace(/\/$/, "");
  if (typeof window === "undefined") return "http://localhost:7474";
  // Desktop (Tauri) builds run on a tauri:// origin — deriving a server
  // from it is meaningless, so default to a local Anvil instance and let
  // the login screen's server picker take it from there.
  if (!window.location.protocol.startsWith("http")) {
    return "http://localhost:7474";
  }
  // Derive from current page: keep protocol (http/https), use Anvil's API port.
  return `${window.location.protocol}//${window.location.hostname}:${ANVIL_PORT}`;
}

export function ConnectionProvider({
  children,
  anvilApiUrl,
  allowServerAdd = false,
}: {
  children: ReactNode;
  anvilApiUrl?: string;
  allowServerAdd?: boolean;
}) {
  const defaultServerUrl = resolveBaseUrl(anvilApiUrl);
  const [baseUrl, setBaseUrl] = useState(defaultServerUrl);
  // One client per server; a new instance drops in-flight refresh state.
  const client = useMemo(() => new ApiClient({ baseUrl }), [baseUrl]);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [selectedSchema, setSelectedSchema] = useState<Schema>("public");
  const [apps, setApps] = useState<AppSummary[]>([]);
  const [savedServers, setSavedServers] = useState<SavedServer[]>([]);
  const [oauthProviders, setOauthProviders] = useState<{ linkedin: boolean }>({
    linkedin: false,
  });
  const [oauthError, setOauthError] = useState<string | null>(null);
  /** Name the visitor gave the not-yet-remembered server they added, if any. */
  const pendingNameRef = useRef<string | undefined>(undefined);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Restore remembered servers and the last active server on mount.
  useEffect(() => {
    if (!allowServerAdd) return;
    setSavedServers(loadSavedServers());
    const active = loadActiveServerUrl();
    if (active && active !== defaultServerUrl) setBaseUrl(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowServerAdd]);

  // Restore tokens from localStorage on mount (and re-apply them to the
  // client for the restored active server once it exists).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TOKENS_KEY);
      if (raw) {
        const tokens = JSON.parse(raw);
        if (tokens.accessToken) {
          client.authToken = tokens.accessToken;
          client.refreshToken = tokens.refreshToken;
          // Decode username from JWT payload (base64).
          const payload = parseJwtPayload(tokens.accessToken);
          if (payload?.username) {
            setIsAuthenticated(true);
            setCurrentUser(String(payload.username));
            setUserRoles(
              Array.isArray(payload.roles) ? (payload.roles as string[]) : [],
            );
          }
        }
      }
    } catch {
      // Ignore.
    }
  }, [client]);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const info = await client.serverInfo();
        if (!cancelled) {
          setServerInfo(info);
          setStatus("connected");
        }
      } catch {
        if (!cancelled) {
          setStatus("disconnected");
          setServerInfo(null);
        }
      }
    }

    check();
    intervalRef.current = setInterval(check, 5000);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [client]);

  // When tokens are refreshed, persist BOTH new values to localStorage and
  // update the React-visible username/roles from the rotated access token.
  // (Roles can change if an admin granted or revoked one mid-session, and
  // the next page navigation would otherwise still gate UI on stale roles.)
  client.onTokenRefresh = (accessToken, refreshToken) => {
    try {
      const raw = localStorage.getItem(TOKENS_KEY);
      const tokens = raw ? JSON.parse(raw) : {};
      tokens.accessToken = accessToken;
      tokens.refreshToken = refreshToken;
      localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
    } catch {
      // Ignore.
    }
    const payload = parseJwtPayload(accessToken);
    if (payload?.username) setCurrentUser(String(payload.username));
    if (Array.isArray(payload?.roles)) setUserRoles(payload.roles as string[]);
  };

  // When refresh fails permanently, drop the session and bounce the user
  // back to the login screen instead of leaving them stuck on a page where
  // every API call silently 401s.
  client.onTokenRefreshFailure = () => {
    try {
      localStorage.removeItem(TOKENS_KEY);
    } catch {
      // Ignore.
    }
    setIsAuthenticated(false);
    setCurrentUser(null);
    setUserRoles([]);
  };

  /** After a successful login: remember the server this instance now uses. */
  const rememberCurrentServer = useCallback(() => {
    if (!allowServerAdd) return;
    // Capture the pending name NOW: state updaters run lazily, after the ref
    // below has already been cleared.
    const pendingName = pendingNameRef.current;
    pendingNameRef.current = undefined;
    if (baseUrl !== defaultServerUrl) {
      setSavedServers((prev) => {
        const next = upsertSavedServer(prev, baseUrl, pendingName);
        saveSavedServers(next);
        return next;
      });
      saveActiveServerUrl(baseUrl);
    } else {
      saveActiveServerUrl(null);
    }
  }, [allowServerAdd, baseUrl, defaultServerUrl]);

  const login = useCallback(
    async (username: string, password: string) => {
      const result = await client.login(username, password);
      client.refreshToken = result.refreshToken;
      localStorage.setItem(TOKENS_KEY, JSON.stringify(result));
      setIsAuthenticated(true);
      setCurrentUser(username);
      setMustChangePassword(result.mustChangePassword ?? false);
      const payload = parseJwtPayload(result.accessToken);
      setUserRoles(
        Array.isArray(payload?.roles) ? (payload.roles as string[]) : [],
      );
      rememberCurrentServer();
    },
    [client, rememberCurrentServer],
  );

  const otpRequest = useCallback(
    async (email: string) => {
      return client.otpRequest(email);
    },
    [client],
  );

  const otpVerify = useCallback(
    async (email: string, code: string) => {
      const result = await client.otpVerify(email, code);
      client.refreshToken = result.refreshToken;
      localStorage.setItem(TOKENS_KEY, JSON.stringify(result));
      setIsAuthenticated(true);
      const payload = parseJwtPayload(result.accessToken);
      setCurrentUser((payload?.username as string) ?? email.split("@")[0]);
      setUserRoles(
        Array.isArray(payload?.roles) ? (payload.roles as string[]) : [],
      );
      setMustChangePassword(false);
      rememberCurrentServer();
    },
    [client, rememberCurrentServer],
  );

  const resendVerification = useCallback(
    async (email: string) => {
      return client.resendVerification(email);
    },
    [client],
  );

  // Apply a token trio handed back by a social-login callback — the OAuth
  // analogue of otpVerify's token-application (no client.login round-trip,
  // so we set client.authToken ourselves, exactly as the restore path does).
  const completeOAuthLogin = useCallback(
    (tokens: {
      accessToken: string;
      idToken?: string;
      refreshToken: string;
    }) => {
      client.authToken = tokens.accessToken;
      client.refreshToken = tokens.refreshToken;
      const stored = {
        accessToken: tokens.accessToken,
        idToken: tokens.idToken ?? "",
        refreshToken: tokens.refreshToken,
        mustChangePassword: false,
      };
      try {
        localStorage.setItem(TOKENS_KEY, JSON.stringify(stored));
      } catch {
        // Ignore.
      }
      setIsAuthenticated(true);
      const payload = parseJwtPayload(tokens.accessToken);
      setCurrentUser((payload?.username as string) ?? null);
      setUserRoles(
        Array.isArray(payload?.roles) ? (payload.roles as string[]) : [],
      );
      setMustChangePassword(false);
      rememberCurrentServer();
    },
    [client, rememberCurrentServer],
  );

  // Send the browser into the provider's authorize page. The callback comes
  // back to *this* page URL with tokens in the fragment (read on mount below).
  const startOAuthLogin = useCallback(
    (provider: "linkedin") => {
      if (typeof window === "undefined") return;
      const redirect = window.location.origin + window.location.pathname;
      const url = new URL(`${baseUrl}/auth/oauth/${provider}/start`);
      url.searchParams.set("redirect", redirect);
      window.location.assign(url.toString());
    },
    [baseUrl],
  );

  // Discover which social-login providers this server actually has configured,
  // so the login screen only offers buttons that will work.
  useEffect(() => {
    let cancelled = false;
    fetch(`${baseUrl}/auth/oauth/providers`)
      .then((r) => (r.ok ? r.json() : { linkedin: false }))
      .then((p) => {
        if (!cancelled) setOauthProviders({ linkedin: !!p?.linkedin });
      })
      .catch(() => {
        if (!cancelled) setOauthProviders({ linkedin: false });
      });
    return () => {
      cancelled = true;
    };
  }, [baseUrl]);

  // On mount, complete a social login if we were redirected back with tokens
  // (or an error) in the URL fragment, then scrub the fragment from the URL so
  // the tokens don't linger in the address bar or a bookmark.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash.length < 2) return;
    const params = new URLSearchParams(hash.slice(1));
    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");
    const err = params.get("error");
    const scrub = () =>
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    if (err) {
      setOauthError(err);
      scrub();
      return;
    }
    if (accessToken && refreshToken) {
      completeOAuthLogin({
        accessToken,
        idToken: params.get("idToken") ?? undefined,
        refreshToken,
      });
      scrub();
    }
    // Mount-only: the fragment is consumed once, right after the redirect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearMustChangePassword = useCallback(() => {
    setMustChangePassword(false);
  }, []);

  const logout = useCallback(() => {
    // Delete the refresh token from the server to clean up the session.
    if (client.refreshToken) {
      client
        .deleteDocument("auth.refresh_tokens", client.refreshToken)
        .catch(() => {});
    }
    client.authToken = undefined;
    client.refreshToken = undefined;
    localStorage.removeItem(TOKENS_KEY);
    setIsAuthenticated(false);
    setCurrentUser(null);
    setUserRoles([]);
  }, [client]);

  /** Login-page server switch: drop any stored session, re-point the client. */
  const selectServer = useCallback(
    (url: string, name?: string) => {
      if (!allowServerAdd) return;
      const target = url.replace(/\/$/, "");
      pendingNameRef.current = name;
      if (target === baseUrl) return;
      try {
        localStorage.removeItem(TOKENS_KEY);
      } catch {
        // Ignore.
      }
      setIsAuthenticated(false);
      setCurrentUser(null);
      setUserRoles([]);
      setMustChangePassword(false);
      setServerInfo(null);
      setStatus("connecting");
      setBaseUrl(target);
    },
    [allowServerAdd, baseUrl],
  );

  const removeSavedServer = useCallback((id: string) => {
    setSavedServers((prev) => {
      const removed = prev.find((s) => s.id === id);
      const next = prev.filter((s) => s.id !== id);
      saveSavedServers(next);
      if (removed && loadActiveServerUrl() === removed.url)
        saveActiveServerUrl(null);
      return next;
    });
  }, []);

  const isAdmin = userRoles.includes("admin");

  // Apps drive the dynamic schema list (APPS.md Phase 4).
  const refreshApps = useCallback(async () => {
    try {
      setApps(await client.listApps());
    } catch {
      setApps([]);
    }
  }, [client]);

  useEffect(() => {
    if (status !== "connected" || !isAuthenticated) {
      setApps([]);
      return;
    }
    refreshApps();
  }, [status, isAuthenticated, refreshApps]);

  // Drop a selected app schema that no longer exists.
  useEffect(() => {
    if (
      selectedSchema.startsWith("app_") &&
      status === "connected" &&
      isAuthenticated &&
      !apps.some((a) => appSchemaName(a.slug) === selectedSchema)
    ) {
      setSelectedSchema("public");
    }
  }, [apps, selectedSchema, status, isAuthenticated]);

  return (
    <ConnectionContext.Provider
      value={{
        client,
        status,
        serverInfo,
        isAuthenticated,
        mustChangePassword,
        currentUser,
        userRoles,
        isAdmin,
        selectedSchema,
        setSelectedSchema,
        apps,
        refreshApps,
        login,
        otpRequest,
        otpVerify,
        resendVerification,
        oauthProviders,
        startOAuthLogin,
        oauthError,
        logout,
        clearMustChangePassword,
        allowServerAdd,
        baseUrl,
        defaultServerUrl,
        savedServers,
        selectServer,
        removeSavedServer,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection(): ConnectionContextValue {
  const ctx = useContext(ConnectionContext);
  if (!ctx) {
    throw new Error("useConnection must be used within a ConnectionProvider");
  }
  return ctx;
}

/** Decode JWT payload without validation (client-side only). */
function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(payload);
  } catch {
    return null;
  }
}
