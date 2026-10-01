import { useEffect, useMemo, useState } from "react";

export const PAGE_SIZES = [10, 25, 50, 100];

/**
 * Client-side paging over rows a page already holds in full. `resetKey`
 * changes (a filter edit, say) jump back to the first page; a refetch that
 * keeps the key leaves the reader where they were.
 */
export function usePager<T>(rows: T[], resetKey: string, defaultSize = 25) {
  const [pageSize, setPageSize] = useState(defaultSize);
  const [requestedPage, setPage] = useState(0);
  useEffect(() => {
    setPage(0);
  }, [resetKey]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  // Rows can shrink under the current page (a drop on the last page).
  const page = Math.min(requestedPage, totalPages - 1);
  const pageRows = useMemo(
    () => rows.slice(page * pageSize, (page + 1) * pageSize),
    [rows, page, pageSize],
  );
  return {
    pageRows,
    page,
    totalPages,
    pageSize,
    total: rows.length,
    setPage,
    setPageSize: (size: number) => {
      setPageSize(size);
      setPage(0);
    },
  };
}

type PagerProps = Omit<ReturnType<typeof usePager>, "pageRows">;

/** The bar under a paged table. Renders nothing while everything fits on one page. */
export function Pager({
  page,
  totalPages,
  pageSize,
  total,
  setPage,
  setPageSize,
}: PagerProps) {
  if (totalPages <= 1) return null;
  const first = page * pageSize + 1;
  const last = Math.min(total, (page + 1) * pageSize);
  return (
    <div className="flex items-center gap-3 px-3 py-1.5 border-t border-zinc-800 text-xs text-zinc-500">
      <button
        type="button"
        disabled={page === 0}
        onClick={() => setPage(page - 1)}
        className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Prev
      </button>
      <span>
        Page {page + 1} of {totalPages}{" "}
        <span className="text-zinc-600">
          ({first}–{last} of {total})
        </span>
      </span>
      <button
        type="button"
        disabled={page >= totalPages - 1}
        onClick={() => setPage(page + 1)}
        className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Next
      </button>
      <select
        value={pageSize}
        onChange={(e) => setPageSize(Number(e.target.value))}
        aria-label="Rows per page"
        className="ml-auto bg-zinc-800 text-zinc-300 rounded px-1.5 py-0.5 border border-zinc-700"
      >
        {PAGE_SIZES.map((n) => (
          <option key={n} value={n}>
            {n} / page
          </option>
        ))}
      </select>
    </div>
  );
}
