// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
import { useState } from "react";
import type { QueryPlan } from "./types";

interface PlanViewProps {
  plan: QueryPlan | undefined;
}

export function PlanView({ plan }: PlanViewProps) {
  if (!plan) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-zinc-600">
        No execution plan available. Run with EXPLAIN or PROFILE.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-3">
      <PlanNode plan={plan} depth={0} />
    </div>
  );
}

function PlanNode({ plan, depth }: { plan: QueryPlan; depth: number }) {
  const [open, setOpen] = useState(true);
  const hasChildren = plan.children && plan.children.length > 0;

  return (
    <div className="text-xs font-mono" style={{ marginLeft: depth > 0 ? 16 : 0 }}>
      <div
        className="flex items-start gap-1.5 py-1 cursor-pointer hover:bg-zinc-800/30 rounded px-1 -mx-1"
        onClick={() => setOpen(!open)}
      >
        {/* Expand toggle */}
        <span className="text-zinc-600 w-3 flex-shrink-0 text-center select-none">
          {hasChildren ? (open ? "\u25BC" : "\u25B6") : "\u00B7"}
        </span>

        {/* Operator name */}
        <span className="text-zinc-200 font-semibold">{plan.operator}</span>

        {/* Stats */}
        <span className="text-zinc-500 flex gap-2 ml-2">
          {plan.estimatedRows != null && (
            <span title="Estimated rows">est: {formatNum(plan.estimatedRows)}</span>
          )}
          {plan.actualRows != null && (
            <span title="Actual rows" className="text-zinc-400">
              rows: {formatNum(plan.actualRows)}
            </span>
          )}
          {plan.dbHits != null && (
            <span title="DB hits" className="text-zinc-400">
              hits: {formatNum(plan.dbHits)}
            </span>
          )}
          {plan.elapsedMs != null && (
            <span title="Elapsed time" className="text-zinc-400">
              {plan.elapsedMs.toFixed(1)}ms
            </span>
          )}
        </span>
      </div>

      {/* Details */}
      {open && plan.details && Object.keys(plan.details).length > 0 && (
        <div className="ml-4 pl-2 border-l border-zinc-800 mb-1">
          {Object.entries(plan.details).map(([key, val]) => (
            <div key={key} className="text-zinc-500 py-0.5">
              <span className="text-zinc-600">{key}:</span>{" "}
              <span className="text-zinc-400">
                {typeof val === "object" ? JSON.stringify(val) : String(val)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Children */}
      {open &&
        hasChildren &&
        plan.children!.map((child, i) => (
          <PlanNode key={i} plan={child} depth={depth + 1} />
        ))}
    </div>
  );
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}
