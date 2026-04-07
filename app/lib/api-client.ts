/**
 * HTTP client for Anvil DB Cypher and GraphQL APIs.
 */

export interface ApiClientOptions {
  baseUrl: string;
  authToken?: string;
  timeout?: number;
}

export interface CypherRequest {
  query: string;
  params?: Record<string, unknown>;
  database?: string;
}

export interface CypherResult {
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  executionTimeMs?: number;
  plan?: unknown;
}

export interface GraphQLRequest {
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
}

export interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
    extensions?: Record<string, unknown>;
  }>;
}

export interface ServerInfo {
  version: string;
  edition: string;
  databases: string[];
  uptime?: number;
}

export interface TransactionHandle {
  txId: string;
  query: (cypher: CypherRequest) => Promise<CypherResult>;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
}

export interface StatsResponse {
  node_count: number;
  relationship_count: number;
  collection_count: number;
  document_count: number;
  uptime_seconds: number;
  sync_rules: number;
  rls_policies: number;
}

export interface EventEntry {
  id: number;
  timestamp: number;
  type: string;
  name: string;
  duration_ms: number;
  success: boolean;
  error: string | null;
  user: string;
  metadata: Record<string, string>;
}

export interface CollectionResponse {
  name: string;
  id: number;
  composite_keys: boolean;
  default_ttl_ms: number | null;
}

export interface DocumentResponse {
  id: number;
  collection: string;
  key: string;
  body: Record<string, unknown>;
  expires_at: number | null;
  created_at: number;
  updated_at: number;
  version: number;
}

export interface DocumentQuery {
  partition_key?: string;
  sort_key_start?: unknown;
  sort_key_end?: unknown;
  filter?: FilterExpr;
  projection?: string[];
  limit?: number;
}

export interface FilterExpr {
  op: string;
  field?: string;
  value?: unknown;
  values?: unknown[];
  prefix?: string;
  low?: unknown;
  high?: unknown;
  conditions?: FilterExpr[];
}

export interface DocumentQueryResponse {
  documents: DocumentResponse[];
  count: number;
  cursor: string | null;
}

export interface BatchOperation {
  op: "get" | "put" | "delete";
  id: string;
  body?: Record<string, unknown>;
  sort_key?: unknown;
  ttl_ms?: number;
}

export interface BatchResponse {
  results: Array<{
    op: string;
    id: string;
    success: boolean;
    document?: DocumentResponse;
    error?: string;
  }>;
}

export class ApiClient {
  public baseUrl: string;
  public authToken?: string;
  public refreshToken?: string;
  private timeout: number;
  private refreshing: Promise<boolean> | null = null;
  /** Called when tokens are refreshed so the context can update localStorage. */
  public onTokenRefresh?: (accessToken: string, refreshToken: string) => void;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.authToken = options.authToken;
    this.timeout = options.timeout ?? 30000;
  }

  /** Update the auth token (e.g., after login). */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  // -- Cypher API --

  /** Execute a Cypher query. */
  async cypher(request: CypherRequest): Promise<CypherResult> {
    return this.post<CypherResult>("/db/query", {
      query: request.query,
      params: request.params ?? {},
      database: request.database,
    });
  }

  /** Begin a transaction and return a handle for query/commit/rollback. */
  async beginTransaction(database?: string): Promise<TransactionHandle> {
    const { txId } = await this.post<{ txId: string }>("/db/transaction/begin", { database });

    return {
      txId,
      query: (req) =>
        this.post<CypherResult>(`/db/transaction/${txId}/query`, {
          query: req.query,
          params: req.params ?? {},
        }),
      commit: () => this.post(`/db/transaction/${txId}/commit`, {}),
      rollback: () => this.post(`/db/transaction/${txId}/rollback`, {}),
    };
  }

  // -- GraphQL API --

  /** Execute a GraphQL query or mutation. */
  async graphql<T = unknown>(request: GraphQLRequest): Promise<GraphQLResponse<T>> {
    return this.post<GraphQLResponse<T>>("/graphql", {
      query: request.query,
      variables: request.variables,
      operationName: request.operationName,
    });
  }

  // -- Server info --

  /** Get server info (version, databases, uptime). */
  async serverInfo(): Promise<ServerInfo> {
    return this.get<ServerInfo>("/");
  }

  /** Health check. */
  async health(): Promise<{ status: string }> {
    return this.get<{ status: string }>("/health");
  }

  // -- Admin --

  /** Get server statistics. */
  async stats(): Promise<StatsResponse> {
    return this.get<StatsResponse>("/admin/stats");
  }

  /** Query event log. */
  async events(params?: { type?: string; name?: string; success?: string; limit?: number }): Promise<{ events: EventEntry[]; count: number; total: number }> {
    const query = new URLSearchParams();
    if (params?.type) query.set("type", params.type);
    if (params?.name) query.set("name", params.name);
    if (params?.success) query.set("success", params.success);
    if (params?.limit) query.set("limit", String(params.limit));
    const qs = query.toString();
    return this.get(`/admin/events${qs ? `?${qs}` : ""}`);
  }

  /** List all users. */
  async listUsers(): Promise<Array<{ username: string; roles: string[]; must_change_password: boolean }>> {
    return this.get("/admin/users");
  }

  /** List all roles. */
  async listRoles(): Promise<Array<{ name: string; privileges: string[] }>> {
    return this.get("/admin/roles");
  }

  // -- Document Store --

  /** List all document collections. */
  async listCollections(): Promise<CollectionResponse[]> {
    return this.get<CollectionResponse[]>("/docs");
  }

  /** Create a new document collection. */
  async createCollection(name: string, options?: { composite_keys?: boolean; default_ttl_ms?: number }): Promise<CollectionResponse> {
    return this.post<CollectionResponse>(`/docs/${name}`, options ?? {});
  }

  /** Drop a document collection. */
  async dropCollection(name: string): Promise<void> {
    await this.delete(`/docs/${name}`);
  }

  /** Get a single document by collection and id. */
  async getDocument(collection: string, id: string): Promise<DocumentResponse> {
    return this.get<DocumentResponse>(`/docs/${collection}/${id}`);
  }

  /** Create or update a document. */
  async putDocument(collection: string, id: string, body: Record<string, unknown>, options?: { ttl_ms?: number; if_not_exists?: boolean }): Promise<DocumentResponse> {
    return this.put<DocumentResponse>(`/docs/${collection}/${id}`, { body, ...options });
  }

  /** Delete a document. */
  async deleteDocument(collection: string, id: string): Promise<void> {
    await this.delete(`/docs/${collection}/${id}`);
  }

  /** Query documents in a collection. */
  async queryDocuments(collection: string, query: DocumentQuery): Promise<DocumentQueryResponse> {
    return this.post<DocumentQueryResponse>(`/docs/${collection}/query`, query);
  }

  /** Scan documents in a collection. */
  async scanDocuments(collection: string, params?: { limit?: number; cursor?: string; projection?: string }): Promise<DocumentQueryResponse> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.cursor) searchParams.set("cursor", params.cursor);
    if (params?.projection) searchParams.set("projection", params.projection);
    const qs = searchParams.toString();
    return this.get<DocumentQueryResponse>(`/docs/${collection}/scan${qs ? `?${qs}` : ""}`);
  }

  /** Execute a batch of document operations. */
  async batchDocuments(collection: string, operations: BatchOperation[]): Promise<BatchResponse> {
    return this.post<BatchResponse>(`/docs/${collection}/batch`, { operations });
  }

  // -- Database management --

  /** List databases. */
  async listDatabases(): Promise<string[]> {
    const result = await this.get<{ databases: string[] }>("/db");
    return result.databases;
  }

  /** Get database schema. */
  async getSchema(database: string): Promise<unknown> {
    return this.get(`/db/${encodeURIComponent(database)}/schema`);
  }

  /** Get full graph data for visualization. */
  async getGraph(database: string): Promise<{ nodes: Array<Record<string, unknown>>; edges: Array<Record<string, unknown>> }> {
    return this.get(`/db/${encodeURIComponent(database)}/graph`);
  }

  // -- Auth --

  /** Login and store auth tokens. */
  async login(username: string, password: string): Promise<{
    idToken: string;
    refreshToken: string;
    accessToken: string;
    mustChangePassword: boolean;
  }> {
    const result = await this.post<{
      idToken: string;
      refreshToken: string;
      accessToken: string;
      mustChangePassword: boolean;
    }>("/auth/login", { username, password });
    this.authToken = result.accessToken;
    return result;
  }

  /** Refresh access token using a refresh token. */
  async refreshAccessToken(refreshToken: string): Promise<{
    idToken: string;
    refreshToken: string;
    accessToken: string;
  }> {
    const result = await this.post<{
      idToken: string;
      refreshToken: string;
      accessToken: string;
    }>("/auth/refresh", { refresh_token: refreshToken });
    this.authToken = result.accessToken;
    return result;
  }

  /** Attempt to refresh the access token. Returns true if successful. Deduplicates concurrent refresh calls. */
  private async tryRefresh(): Promise<boolean> {
    if (this.refreshing) return this.refreshing;

    this.refreshing = (async () => {
      try {
        const result = await this.refreshAccessToken(this.refreshToken!);
        this.authToken = result.accessToken;
        if (this.onTokenRefresh) {
          this.onTokenRefresh(result.accessToken, this.refreshToken!);
        }
        return true;
      } catch {
        return false;
      } finally {
        this.refreshing = null;
      }
    })();

    return this.refreshing;
  }

  /** Register a new user. */
  async register(username: string, email: string, password: string, roles?: string[]): Promise<Record<string, unknown>> {
    return this.post("/auth/register", { username, email, password, roles: roles ?? [] });
  }

  /** Change password. */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.post("/auth/change-password", { current_password: currentPassword, new_password: newPassword });
  }

  // -- HTTP helpers --

  private async get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  private async put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("PUT", path, body);
  }

  private async delete<T = void>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (this.authToken) {
      headers["Authorization"] = `Bearer ${this.authToken}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        // On 401, attempt to refresh the token and retry once.
        if (response.status === 401 && this.refreshToken && path !== "/auth/refresh" && path !== "/auth/login") {
          const refreshed = await this.tryRefresh();
          if (refreshed) {
            // Retry the original request with the new token.
            headers["Authorization"] = `Bearer ${this.authToken}`;
            const retryResponse = await fetch(url, {
              method,
              headers,
              body: body ? JSON.stringify(body) : undefined,
            });
            if (retryResponse.ok) {
              return (await retryResponse.json()) as T;
            }
          }
        }
        const text = await response.text().catch(() => "");
        throw new ApiError(response.status, response.statusText, text);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ApiError(0, "Request timeout", `Request to ${path} timed out after ${this.timeout}ms`);
      }
      throw new ApiError(0, "Network error", String(error));
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/** API error with HTTP status info. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: string,
  ) {
    super(`${status} ${statusText}: ${body}`);
    this.name = "ApiError";
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isTimeout(): boolean {
    return this.status === 0 && this.statusText === "Request timeout";
  }
}

/** Create a default client pointing at localhost. */
export function createDefaultClient(): ApiClient {
  return new ApiClient({ baseUrl: "http://localhost:7474" });
}
