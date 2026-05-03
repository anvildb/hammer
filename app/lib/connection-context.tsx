import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { ApiClient, type ServerInfo } from "./api-client";

export type ConnectionStatus = "connected" | "disconnected" | "connecting";

export const SCHEMAS = ["public", "auth"] as const;
export type Schema = (typeof SCHEMAS)[number];

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
  login: (username: string, password: string) => Promise<void>;
  otpRequest: (email: string) => Promise<{ message: string; expires_in_seconds: number }>;
  otpVerify: (email: string, code: string) => Promise<void>;
  resendVerification: (email: string) => Promise<{ message: string }>;
  logout: () => void;
  clearMustChangePassword: () => void;
}

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

const TOKENS_KEY = "anvil_tokens";
const ANVIL_PORT = "7474";

function resolveBaseUrl(anvilApiUrl?: string): string {
  if (anvilApiUrl) return anvilApiUrl;
  if (typeof window === "undefined") return "http://localhost:7474";
  // Derive from current page: keep protocol (http/https), use Anvil's API port.
  return `${window.location.protocol}//${window.location.hostname}:${ANVIL_PORT}`;
}

let client = new ApiClient({ baseUrl: resolveBaseUrl() });

export function ConnectionProvider({ children, anvilApiUrl }: { children: ReactNode; anvilApiUrl?: string }) {
  // Update client base URL if provided via loader.
  if (anvilApiUrl && client.baseUrl !== anvilApiUrl.replace(/\/$/, "")) {
    client = new ApiClient({ baseUrl: anvilApiUrl });
  }
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [selectedSchema, setSelectedSchema] = useState<Schema>("public");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Restore tokens from localStorage on mount.
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
            setUserRoles(Array.isArray(payload.roles) ? (payload.roles as string[]) : []);
          }
        }
      }
    } catch {
      // Ignore.
    }
  }, []);

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
  }, []);

  // When tokens are refreshed, persist to localStorage.
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
  };

  const login = useCallback(async (username: string, password: string) => {
    const result = await client.login(username, password);
    client.refreshToken = result.refreshToken;
    localStorage.setItem(TOKENS_KEY, JSON.stringify(result));
    setIsAuthenticated(true);
    setCurrentUser(username);
    setMustChangePassword(result.mustChangePassword ?? false);
    const payload = parseJwtPayload(result.accessToken);
    setUserRoles(Array.isArray(payload?.roles) ? (payload.roles as string[]) : []);
  }, []);

  const otpRequest = useCallback(async (email: string) => {
    return client.otpRequest(email);
  }, []);

  const otpVerify = useCallback(async (email: string, code: string) => {
    const result = await client.otpVerify(email, code);
    client.refreshToken = result.refreshToken;
    localStorage.setItem(TOKENS_KEY, JSON.stringify(result));
    setIsAuthenticated(true);
    const payload = parseJwtPayload(result.accessToken);
    setCurrentUser(payload?.username as string ?? email.split("@")[0]);
    setUserRoles(Array.isArray(payload?.roles) ? (payload.roles as string[]) : []);
    setMustChangePassword(false);
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    return client.resendVerification(email);
  }, []);

  const clearMustChangePassword = useCallback(() => {
    setMustChangePassword(false);
  }, []);

  const logout = useCallback(() => {
    // Delete the refresh token from the server to clean up the session.
    if (client.refreshToken) {
      client.deleteDocument("auth.refresh_tokens", client.refreshToken).catch(() => {});
    }
    client.authToken = undefined;
    client.refreshToken = undefined;
    localStorage.removeItem(TOKENS_KEY);
    setIsAuthenticated(false);
    setCurrentUser(null);
    setUserRoles([]);
  }, []);

  const isAdmin = userRoles.includes("admin");

  return (
    <ConnectionContext.Provider
      value={{ client, status, serverInfo, isAuthenticated, mustChangePassword, currentUser, userRoles, isAdmin, selectedSchema, setSelectedSchema, login, otpRequest, otpVerify, resendVerification, logout, clearMustChangePassword }}
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
