// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
/** Shared types for monitoring dashboard components. */

export interface ActiveQuery {
  id: string;
  query: string;
  user: string;
  database: string;
  elapsedMs: number;
  status: "running" | "waiting";
}

export interface StoreSizes {
  nodeCount: number;
  relationshipCount: number;
  propertyCount: number;
  indexCount: number;
  nodeStoreBytes: number;
  relationshipStoreBytes: number;
  propertyStoreBytes: number;
  indexStoreBytes: number;
  totalBytes: number;
}

export interface MemoryUsage {
  pageCacheSize: number;
  pageCacheUsed: number;
  pageCacheHitRate: number;
  heapUsed: number;
  heapTotal: number;
}

export interface TransactionStats {
  active: number;
  committed: number;
  rolledBack: number;
  peakConcurrent: number;
}

export interface ThroughputPoint {
  timestamp: number;
  queries: number;
  reads: number;
  writes: number;
}

export interface SlowQueryEntry {
  query: string;
  user: string;
  database: string;
  elapsedMs: number;
  timestamp: number;
  plan?: string;
}

export interface MonitorData {
  activeQueries: ActiveQuery[];
  storeSizes: StoreSizes;
  memory: MemoryUsage;
  transactions: TransactionStats;
  connectionCount: number;
  throughput: ThroughputPoint[];
  slowQueries: SlowQueryEntry[];
}
