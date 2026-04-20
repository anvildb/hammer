import { useState, useMemo } from "react";
import type { QueryResult, PaginationState, SortState, SortDirection } from "./types";

interface TableViewProps {
  result: QueryResult;
}

const DEFAULT_PAGE_SIZE = 50;

export function TableView({ result }: TableViewProps) {
  const [sort, setSort] = useState<SortState>({ column: -1, direction: null });
  const [filter, setFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    page: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  // Filter rows.
  const filtered = useMemo(() => {
    if (!filter) return result.rows;
    const q = filter.toLowerCase();
    return result.rows.filter((row) =>
      row.some((cell) => String(cell ?? "").toLowerCase().includes(q)),
    );
  }, [result.rows, filter]);

  // Sort rows.
  const sorted = useMemo(() => {
    if (sort.column < 0 || !sort.direction) return filtered;
    const col = sort.column;
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[col];
      const bv = b[col];
      if (av == null && bv == null) return 0;
      if (av == null) return dir;
      if (bv == null) return -dir;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [filtered, sort]);

  // Paginate.
  const totalPages = Math.max(1, Math.ceil(sorted.length / pagination.pageSize));
  const page = Math.min(pagination.page, totalPages - 1);
  const pageRows = sorted.slice(
    page * pagination.pageSize,
    (page + 1) * pagination.pageSize,
  );

  const toggleSort = (colIdx: number) => {
    setSort((prev) => {
      if (prev.column !== colIdx) return { column: colIdx, direction: "asc" };
      const next: SortDirection =
        prev.direction === "asc" ? "desc" : prev.direction === "desc" ? null : "asc";
      return { column: next ? colIdx : -1, direction: next };
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="px-3 py-1.5 border-b border-zinc-800">
        <input
          type="text"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPagination((p) => ({ ...p, page: 0 }));
          }}
          placeholder="Filter rows..."
          className="w-64 text-xs bg-zinc-800 text-zinc-300 rounded px-2 py-1 border border-zinc-700 focus:outline-none focus:border-zinc-500"
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-zinc-900 sticky top-0 z-10">
              {result.columns.map((col, i) => (
                <th
                  key={i}
                  onClick={() => toggleSort(i)}
                  className="px-3 py-2 text-left text-zinc-400 font-medium border-b border-zinc-800 cursor-pointer hover:text-zinc-200 select-none whitespace-nowrap"
                >
                  {col}
                  {sort.column === i && sort.direction === "asc" && " \u25B2"}
                  {sort.column === i && sort.direction === "desc" && " \u25BC"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, ri) => (
              <tr key={ri} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-1.5 text-zinc-300 font-mono whitespace-nowrap">
                    <CellValue value={cell} />
                  </td>
                ))}
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td
                  colSpan={result.columns.length}
                  className="px-3 py-6 text-center text-zinc-600"
                >
                  No results
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-3 px-3 py-1.5 border-t border-zinc-800 text-xs text-zinc-500">
          <button
            disabled={page === 0}
            onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
            className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Prev
          </button>
          <span>
            Page {page + 1} of {totalPages} ({sorted.length} rows)
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
            className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next
          </button>
          <select
            value={pagination.pageSize}
            onChange={(e) =>
              setPagination({ page: 0, pageSize: Number(e.target.value) })
            }
            className="ml-auto bg-zinc-800 text-zinc-300 rounded px-1.5 py-0.5 border border-zinc-700"
          >
            {[25, 50, 100, 250, 500].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function CellValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-zinc-600 italic">null</span>;
  }
  if (typeof value === "boolean") {
    return <span className="text-amber-400">{value ? "true" : "false"}</span>;
  }
  if (typeof value === "number") {
    return <span className="text-blue-400">{value}</span>;
  }
  if (typeof value === "object") {
    return (
      <span className="text-zinc-400" title={JSON.stringify(value)}>
        {JSON.stringify(value)}
      </span>
    );
  }
  return <>{String(value)}</>;
}
