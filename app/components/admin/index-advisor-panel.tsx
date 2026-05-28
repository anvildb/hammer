// Phase 27.5 — IndexAdvisor admin panel.
//
// Lists the live suggestions emitted by `crates/server/src/index_advisor.rs`
// (Phase 27.3.8) and exposes one-click CREATE INDEX, dismiss, and undismiss
// against the existing `/admin/index-suggestions` REST endpoints (27.3.8.4).
// `would_exceed_budget` (27.4.9) renders as an inline badge so operators
// see the budget warning before they accept.

import { useState } from "react";
import type { IndexSuggestion } from "~/lib/api-client";

interface IndexAdvisorPanelProps {
  suggestions: IndexSuggestion[];
  showDismissed: boolean;
  loading: boolean;
  /** Toggle between active-only and dismissed-only views. Triggers a
   *  fresh fetch in the parent (admin route owns the data). */
  onToggleDismissed: (showDismissed: boolean) => void;
  /** Refresh the suggestions list against the server. */
  onRefresh: () => void;
  /** One-click `CREATE INDEX` for the suggestion (handled in the
   *  parent so it can show a confirmation + dispatch the cypher). */
  onAccept: (suggestion: IndexSuggestion) => void;
  /** Dismiss / un-dismiss flip via the REST surface. */
  onDismiss: (id: string) => void;
  onUndismiss: (id: string) => void;
}

export function IndexAdvisorPanel({
  suggestions,
  showDismissed,
  loading,
  onToggleDismissed,
  onRefresh,
  onAccept,
  onDismiss,
  onUndismiss,
}: IndexAdvisorPanelProps) {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
          Index Advisor
          <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 font-normal tabular-nums">
            {suggestions.length}
          </span>
        </h3>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-xs font-medium rounded transition-colors"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
        <label className="flex items-center gap-2 text-xs text-zinc-400 ml-auto">
          <input
            type="checkbox"
            checked={showDismissed}
            onChange={(e) => onToggleDismissed(e.target.checked)}
            className="accent-blue-500"
          />
          Show dismissed
        </label>
      </div>

      <p className="text-xs text-zinc-500">
        Suggestions are derived from slow-query attribution and unindexed
        label-scan probes. Order: highest <code>est_benefit_ms</code> first.
        Accepting one runs <code>CREATE INDEX</code> against the live
        descriptor.
      </p>

      {suggestions.length > 0 ? (
        <div className="overflow-x-auto rounded-md border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-900 border-b border-zinc-800">
                <th className="text-left px-3 py-2 text-zinc-400 font-medium">Label</th>
                <th className="text-left px-3 py-2 text-zinc-400 font-medium">Property</th>
                <th className="text-left px-3 py-2 text-zinc-400 font-medium">Kind</th>
                <th className="text-right px-3 py-2 text-zinc-400 font-medium">Benefit (ms)</th>
                <th className="text-right px-3 py-2 text-zinc-400 font-medium">Mem (bytes)</th>
                <th className="text-right px-3 py-2 text-zinc-400 font-medium">Observed</th>
                <th className="text-left px-3 py-2 text-zinc-400 font-medium">Status</th>
                <th className="text-right px-3 py-2 text-zinc-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((s) => (
                <tr key={s.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                  <td className="px-3 py-1.5 text-xs font-mono text-zinc-200">{s.label}</td>
                  <td className="px-3 py-1.5 text-xs font-mono text-zinc-200">{s.property}</td>
                  <td className="px-3 py-1.5 text-xs text-zinc-300">
                    <span className="inline-block px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                      {s.kind}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-xs text-zinc-300 text-right tabular-nums">
                    {s.est_benefit_ms.toLocaleString()}
                  </td>
                  <td className="px-3 py-1.5 text-xs text-right tabular-nums">
                    {s.est_memory_bytes === null ? (
                      <span className="text-zinc-600">—</span>
                    ) : (
                      <span
                        className={
                          s.would_exceed_budget ? "text-amber-400" : "text-zinc-300"
                        }
                      >
                        {s.est_memory_bytes.toLocaleString()}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-xs text-zinc-400 text-right tabular-nums">
                    {s.observed_count.toLocaleString()}
                  </td>
                  <td className="px-3 py-1.5 text-xs">
                    <div className="flex items-center gap-1.5">
                      {s.dismissed && (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 text-[11px]">
                          dismissed
                        </span>
                      )}
                      {s.would_exceed_budget && (
                        <span
                          title="Accepting this would push past indexes.advisor_memory_budget_bytes"
                          className="inline-block px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300 text-[11px]"
                        >
                          over budget
                        </span>
                      )}
                      {!s.dismissed && !s.would_exceed_budget && (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-900/30 text-emerald-400 text-[11px]">
                          active
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-xs text-right">
                    <div className="inline-flex items-center gap-2">
                      {!s.dismissed && (
                        <button
                          onClick={() => onAccept(s)}
                          className="text-[11px] px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white"
                          title={`CREATE INDEX FOR (n:${s.label}) ON (n.${s.property})`}
                        >
                          accept
                        </button>
                      )}
                      {s.dismissed ? (
                        <button
                          onClick={() => onUndismiss(s.id)}
                          className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                        >
                          undismiss
                        </button>
                      ) : (
                        <button
                          onClick={() => onDismiss(s.id)}
                          className="text-[11px] px-2 py-0.5 rounded text-red-400/80 hover:text-red-300"
                        >
                          dismiss
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">
          {loading
            ? "Loading..."
            : showDismissed
              ? "No dismissed suggestions."
              : "No active suggestions — the advisor hasn't observed unindexed label scans yet, or every probe is already covered by an existing index."}
        </p>
      )}

      {suggestions.some((s) => s.sample_queries.length > 0) && (
        <>
          <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mt-6">
            Sample queries
          </h4>
          <div className="space-y-1.5">
            {suggestions
              .filter((s) => s.sample_queries.length > 0)
              .map((s) => (
                <div key={`${s.id}-sample`} className="text-xs">
                  <span className="text-zinc-500 font-mono">
                    :{s.label}.{s.property}
                  </span>
                  <span className="ml-2 font-mono text-zinc-400">
                    {s.sample_queries[0]}
                  </span>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
