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

export interface RuntimeSetting {
  key: string;
  value: string;
  type: string;
  description: string;
  category: string;
  source: string;
  read_only: boolean;
  updated_at: number;
  updated_by: string;
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

// -- File storage (Phase 25.13/25.15) ----------------------------------------

export interface StorageBucket {
  id: string;
  name: string;
  public: boolean;
  file_size_limit: number | null;
  bucket_size_limit: number | null;
  allowed_mime_types: string[];
  owner: string;
  created_at: number;
  updated_at: number;
}

export interface CreateBucketOptions {
  public?: boolean;
  file_size_limit?: number;
  bucket_size_limit?: number;
  allowed_mime_types?: string[];
}

export interface UpdateBucketOptions {
  public?: boolean;
  /** `null` clears the limit. */
  file_size_limit?: number | null;
  /** `null` clears the limit. */
  bucket_size_limit?: number | null;
  allowed_mime_types?: string[];
}

export interface UploadObjectResponse {
  id: string;
  bucket_id: string;
  path: string;
  name: string;
  mime_type: string;
  size: number;
  etag: string;
  content_hash: string;
  version: number;
  deduped: boolean;
  created_at: number;
  updated_at: number;
}

export interface StorageFileObject {
  path: string;
  name: string;
  size: number;
  mime_type: string;
  etag: string;
  content_hash: string;
  created_at: number;
  updated_at: number;
}

export interface ListObjectsResponse {
  bucket_id: string;
  items: StorageFileObject[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListObjectsOptions {
  prefix?: string;
  limit?: number;
  offset?: number;
  sort_by?: "name" | "size" | "created_at" | "updated_at";
  order?: "asc" | "desc";
}

export interface ObjectMetadataResponse extends UploadObjectResponse {
  metadata: Record<string, unknown>;
  owner: string;
  last_accessed_at: number;
}

export interface ImageTransform {
  width?: number;
  height?: number;
  resize?: "cover" | "contain" | "fill";
  format?: "webp" | "jpeg" | "png" | "avif";
  quality?: number;
}

export interface SignedUrlResponse {
  token: string;
  url: string;
  expires_at: number;
  expires_in: number;
}

export interface StorageBucketUsage {
  bucket_id: string;
  object_count: number;
  total_bytes: number;
  bucket_size_limit?: number;
}

export interface StorageUserUsage {
  owner: string;
  object_count: number;
  total_bytes: number;
}

export interface StorageUsageResponse {
  object_count: number;
  total_bytes: number;
  buckets: StorageBucketUsage[];
  users: StorageUserUsage[];
  max_total_storage?: number;
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

  // -- Runtime Settings --

  /** List all runtime settings (admin only). */
  async listSettings(): Promise<{ settings: RuntimeSetting[] }> {
    return this.get("/system/settings");
  }

  /** Get a single runtime setting. */
  async getSetting(key: string): Promise<RuntimeSetting> {
    return this.get(`/system/settings/${encodeURIComponent(key)}`);
  }

  /** Update a runtime setting (admin only). */
  async updateSetting(key: string, value: string): Promise<{ key: string; value: string; result: string }> {
    return this.put(`/system/settings/${encodeURIComponent(key)}`, { value });
  }

  /** Reset a runtime setting to default (admin only). */
  async resetSetting(key: string): Promise<{ key: string; value: string; result: string }> {
    return this.delete(`/system/settings/${encodeURIComponent(key)}`);
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

  /** Request an OTP code to be sent to the given email. */
  async otpRequest(email: string): Promise<{ message: string; expires_in_seconds: number }> {
    return this.post("/auth/otp/request", { email });
  }

  /** Verify an OTP code and get JWT tokens. */
  async otpVerify(email: string, code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    idToken: string;
    mustChangePassword: boolean;
  }> {
    return this.post("/auth/otp/verify", { email, code });
  }

  /** Resend email verification. */
  async resendVerification(email: string): Promise<{ message: string }> {
    return this.post("/auth/resend-verification", { email });
  }

  // -- File storage (Phase 25.13/25.15) ---------------------------------

  /** List all buckets visible to the caller. */
  async listBuckets(): Promise<StorageBucket[]> {
    return this.get<StorageBucket[]>("/storage/v1/bucket");
  }

  /** Create a new bucket. */
  async createBucket(id: string, options: CreateBucketOptions = {}): Promise<StorageBucket> {
    return this.post<StorageBucket>("/storage/v1/bucket", { id, ...options });
  }

  /** Fetch a single bucket. */
  async getBucket(id: string): Promise<StorageBucket> {
    return this.get<StorageBucket>(`/storage/v1/bucket/${encodeURIComponent(id)}`);
  }

  /** Update bucket settings. Pass `null` for limits to explicitly clear. */
  async updateBucket(id: string, options: UpdateBucketOptions): Promise<StorageBucket> {
    return this.put<StorageBucket>(`/storage/v1/bucket/${encodeURIComponent(id)}`, options);
  }

  /** Delete a bucket. Must be empty first. */
  async deleteBucket(id: string): Promise<void> {
    await this.delete(`/storage/v1/bucket/${encodeURIComponent(id)}`);
  }

  /** Delete every object in a bucket without removing the bucket itself. */
  async emptyBucket(id: string): Promise<void> {
    await this.post(`/storage/v1/bucket/${encodeURIComponent(id)}/empty`, {});
  }

  /** Revoke all signed URLs previously issued for this bucket. */
  async revokeBucketSignedUrls(id: string): Promise<void> {
    await this.post(`/storage/v1/bucket/${encodeURIComponent(id)}/sign-revoke`, {});
  }

  /**
   * Upload an object via the single-shot endpoint. Reports progress via the
   * standard `XMLHttpRequest.upload.onprogress` callback because `fetch`
   * doesn't expose upload progress yet.
   *
   * @param bucket - Target bucket id.
   * @param path   - Object path within the bucket (may contain `/`).
   * @param body   - File / Blob to upload.
   * @param options - Optional MIME type, upsert flag, and progress callback.
   */
  async uploadObject(
    bucket: string,
    path: string,
    body: Blob | File,
    options: {
      contentType?: string;
      upsert?: boolean;
      cacheControl?: string;
      onProgress?: (loaded: number, total: number) => void;
      signal?: AbortSignal;
    } = {},
  ): Promise<UploadObjectResponse> {
    const url = `${this.baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodePathSegments(path)}`;
    const method = options.upsert ? "PUT" : "POST";
    const contentType =
      options.contentType ||
      (body instanceof File ? body.type : "") ||
      guessMime(path) ||
      "application/octet-stream";
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, url, true);
      xhr.setRequestHeader("Content-Type", contentType);
      if (options.cacheControl) xhr.setRequestHeader("Cache-Control", options.cacheControl);
      if (this.authToken) xhr.setRequestHeader("Authorization", `Bearer ${this.authToken}`);
      if (options.onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) options.onProgress!(e.loaded, e.total);
        };
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText) as UploadObjectResponse);
          } catch (e) {
            reject(new ApiError(xhr.status, xhr.statusText, String(e)));
          }
        } else {
          reject(new ApiError(xhr.status, xhr.statusText, xhr.responseText));
        }
      };
      xhr.onerror = () => reject(new ApiError(0, "Network error", "upload failed"));
      xhr.onabort = () => reject(new ApiError(0, "Aborted", "upload aborted"));
      if (options.signal) {
        options.signal.addEventListener("abort", () => xhr.abort());
      }
      xhr.send(body);
    });
  }

  /**
   * Upload via TUS 1.0.0 resumable protocol. Splits the body into `chunkSize`
   * (default 5 MiB) chunks and PATCHes each one in sequence. The progress
   * callback fires after every successful chunk.
   */
  async uploadObjectResumable(
    bucket: string,
    path: string,
    body: Blob | File,
    options: {
      contentType?: string;
      chunkSize?: number;
      onProgress?: (loaded: number, total: number) => void;
      signal?: AbortSignal;
    } = {},
  ): Promise<{ contentHash: string; size: number; sessionUrl: string }> {
    const total = body.size;
    const chunkSize = options.chunkSize ?? 5 * 1024 * 1024;
    const mime =
      options.contentType ||
      (body instanceof File ? body.type : "") ||
      guessMime(path) ||
      "application/octet-stream";
    const metadata = encodeUploadMetadata({ bucket, path, mime });

    // Create session.
    const createResp = await fetch(`${this.baseUrl}/storage/v1/upload/resumable`, {
      method: "POST",
      headers: this.tusHeaders({
        "Tus-Resumable": "1.0.0",
        "Upload-Length": String(total),
        "Upload-Metadata": metadata,
      }),
      signal: options.signal,
    });
    if (createResp.status !== 201) {
      throw new ApiError(createResp.status, createResp.statusText, await createResp.text());
    }
    const sessionUrl = createResp.headers.get("Location");
    if (!sessionUrl) {
      throw new ApiError(0, "Bad TUS response", "no Location header");
    }
    const absSession = sessionUrl.startsWith("http") ? sessionUrl : `${this.baseUrl}${sessionUrl}`;

    // Stream chunks.
    let offset = 0;
    let contentHash = "";
    while (offset < total) {
      const end = Math.min(offset + chunkSize, total);
      const chunk = body.slice(offset, end);
      const patchResp = await fetch(absSession, {
        method: "PATCH",
        headers: this.tusHeaders({
          "Tus-Resumable": "1.0.0",
          "Content-Type": "application/offset+octet-stream",
          "Upload-Offset": String(offset),
        }),
        body: chunk,
        signal: options.signal,
      });
      if (!patchResp.ok) {
        throw new ApiError(patchResp.status, patchResp.statusText, await patchResp.text());
      }
      const newOffset = patchResp.headers.get("Upload-Offset");
      if (!newOffset) {
        throw new ApiError(0, "Bad TUS response", "no Upload-Offset header");
      }
      offset = Number.parseInt(newOffset, 10);
      contentHash = patchResp.headers.get("X-Anvil-Content-Hash") ?? contentHash;
      options.onProgress?.(offset, total);
    }
    return { contentHash, size: total, sessionUrl: absSession };
  }

  /** Build TUS headers including the bearer token. */
  private tusHeaders(extra: Record<string, string>): Record<string, string> {
    const h: Record<string, string> = { ...extra };
    if (this.authToken) h["Authorization"] = `Bearer ${this.authToken}`;
    return h;
  }

  /** Download an object's bytes. */
  async downloadObject(bucket: string, path: string, signal?: AbortSignal): Promise<Blob> {
    const url = `${this.baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodePathSegments(path)}`;
    const headers: Record<string, string> = {};
    if (this.authToken) headers["Authorization"] = `Bearer ${this.authToken}`;
    const resp = await fetch(url, { headers, signal });
    if (!resp.ok) {
      throw new ApiError(resp.status, resp.statusText, await resp.text());
    }
    return resp.blob();
  }

  /** Delete one object. */
  async deleteObject(bucket: string, path: string): Promise<void> {
    const url = `/storage/v1/object/${encodeURIComponent(bucket)}/${encodePathSegments(path)}`;
    await this.delete(url);
  }

  /** Build a public URL (no HTTP request). Bucket must be public. */
  publicObjectUrl(
    bucket: string,
    path: string,
    options: { transform?: ImageTransform; download?: boolean | string } = {},
  ): string {
    const encoded = `${encodeURIComponent(bucket)}/${encodePathSegments(path)}`;
    const route = options.transform
      ? `/storage/v1/render/image/public/${encoded}`
      : `/storage/v1/object/public/${encoded}`;
    const query: string[] = [];
    if (options.transform) {
      if (options.transform.width !== undefined) query.push(`width=${options.transform.width}`);
      if (options.transform.height !== undefined) query.push(`height=${options.transform.height}`);
      if (options.transform.resize) query.push(`resize=${encodeURIComponent(options.transform.resize)}`);
      if (options.transform.format) query.push(`format=${encodeURIComponent(options.transform.format)}`);
      if (options.transform.quality !== undefined) query.push(`quality=${options.transform.quality}`);
    }
    if (options.download) {
      query.push(typeof options.download === "string" ? `download=${encodeURIComponent(options.download)}` : "download");
    }
    return `${this.baseUrl}${route}${query.length ? `?${query.join("&")}` : ""}`;
  }

  /** Mint a signed download URL. */
  async createSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number,
    options: { transform?: ImageTransform } = {},
  ): Promise<SignedUrlResponse & { absoluteUrl: string }> {
    const useRender = !!options.transform;
    const route = useRender
      ? `/storage/v1/render/image/sign/${encodeURIComponent(bucket)}/${encodePathSegments(path)}`
      : `/storage/v1/object/sign/${encodeURIComponent(bucket)}/${encodePathSegments(path)}`;
    const body: Record<string, unknown> = { expires_in: expiresIn };
    if (options.transform) body.transform = options.transform;
    const resp = await this.post<SignedUrlResponse>(route, body);
    return { ...resp, absoluteUrl: `${this.baseUrl}${resp.url}` };
  }

  /** List objects in a bucket with pagination and sorting. */
  async listObjects(bucket: string, options: ListObjectsOptions = {}): Promise<ListObjectsResponse> {
    return this.post<ListObjectsResponse>(`/storage/v1/object/list/${encodeURIComponent(bucket)}`, options);
  }

  /** Move (rename) an object within or between buckets. */
  async moveObject(
    sourceBucket: string,
    sourcePath: string,
    destBucket: string,
    destPath: string,
  ): Promise<ObjectMetadataResponse> {
    return this.post<ObjectMetadataResponse>("/storage/v1/object/move", {
      source_bucket: sourceBucket,
      source_path: sourcePath,
      dest_bucket: destBucket,
      dest_path: destPath,
    });
  }

  /** Copy an object within or between buckets. */
  async copyObject(
    sourceBucket: string,
    sourcePath: string,
    destBucket: string,
    destPath: string,
  ): Promise<ObjectMetadataResponse> {
    return this.post<ObjectMetadataResponse>("/storage/v1/object/copy", {
      source_bucket: sourceBucket,
      source_path: sourcePath,
      dest_bucket: destBucket,
      dest_path: destPath,
    });
  }

  /** Aggregate storage usage across buckets and per-user totals. */
  async storageUsage(): Promise<StorageUsageResponse> {
    return this.get<StorageUsageResponse>("/storage/v1/usage");
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

      if (response.status === 204 || response.headers.get("content-length") === "0") {
        return undefined as T;
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

// ---------------------------------------------------------------------------
// Storage helpers (exported so route code can reuse them)
// ---------------------------------------------------------------------------

/**
 * Percent-encode each `/`-separated path segment independently. Slashes
 * stay literal because the server captures via axum's `{*path}` wildcard.
 */
export function encodePathSegments(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

/**
 * Encode a TUS `Upload-Metadata` header. Per spec each value is a
 * base64-encoded UTF-8 string and key/value pairs are joined with commas.
 */
export function encodeUploadMetadata(meta: Record<string, string>): string {
  return Object.entries(meta)
    .map(([k, v]) => `${k} ${utf8Base64(v)}`)
    .join(",");
}

function utf8Base64(s: string): string {
  // btoa works on ASCII; force UTF-8 -> binary string roundtrip. Falls
  // back to Node's `Buffer` during SSR.
  const bytes = new TextEncoder().encode(s);
  if (typeof btoa !== "undefined") {
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const NodeBuffer = (globalThis as any).Buffer;
  return NodeBuffer.from(bytes).toString("base64");
}

/** Map a file extension to a MIME type. Returns `undefined` on miss. */
export function guessMime(path: string): string | undefined {
  const ext = path.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  if (!ext) return undefined;
  const map: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    avif: "image/avif",
    pdf: "application/pdf",
    txt: "text/plain",
    json: "application/json",
    js: "application/javascript",
    css: "text/css",
    html: "text/html",
    htm: "text/html",
    csv: "text/csv",
    md: "text/markdown",
    mp4: "video/mp4",
    webm: "video/webm",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    zip: "application/zip",
  };
  return map[ext];
}

/** Format a byte count as a human-readable size. */
export function formatBytes(n: number | undefined | null): string {
  if (n === undefined || n === null) return "—";
  if (n < 1024) return `${n} B`;
  const units = ["KiB", "MiB", "GiB", "TiB"];
  let val = n / 1024;
  let i = 0;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(val < 10 ? 2 : 1)} ${units[i]}`;
}

/** Parse a size hint string (e.g. `"5MB"`, `"1GiB"`) into bytes. */
export function parseSizeHint(value: string): number | null {
  const m = value.trim().match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB|KIB|MIB|GIB|TIB)?$/i);
  if (!m) return null;
  const n = Number.parseFloat(m[1]);
  const unit = (m[2] ?? "B").toUpperCase();
  const mult: Record<string, number> = {
    B: 1, KB: 1_000, MB: 1_000_000, GB: 1_000_000_000, TB: 1_000_000_000_000,
    KIB: 1024, MIB: 1024 ** 2, GIB: 1024 ** 3, TIB: 1024 ** 4,
  };
  const m2 = mult[unit];
  if (m2 === undefined) return null;
  return Math.floor(n * m2);
}
