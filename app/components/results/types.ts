/** Shared types for result view components. */

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  executionTimeMs?: number;
  plan?: QueryPlan;
  error?: string;
}

export interface QueryPlan {
  operator: string;
  estimatedRows?: number;
  actualRows?: number;
  dbHits?: number;
  elapsedMs?: number;
  children?: QueryPlan[];
  details?: Record<string, unknown>;
}

export type ResultViewMode = "table" | "json" | "graph" | "plan";

export interface PaginationState {
  page: number;
  pageSize: number;
}

export type SortDirection = "asc" | "desc" | null;

export interface SortState {
  column: number;
  direction: SortDirection;
}
