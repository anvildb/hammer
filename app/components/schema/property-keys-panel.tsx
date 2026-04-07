// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
import type { PropertyKeyInfo } from "./types";

interface PropertyKeysPanelProps {
  propertyKeys: PropertyKeyInfo[];
}

export function PropertyKeysPanel({ propertyKeys }: PropertyKeysPanelProps) {
  if (propertyKeys.length === 0) {
    return <p className="px-3 py-8 text-xs text-zinc-600 text-center">No property keys found</p>;
  }

  return (
    <div className="space-y-1 p-3">
      {propertyKeys.map((pk) => (
        <div
          key={pk.name}
          className="px-3 py-2 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700"
        >
          <span className="text-xs font-mono text-zinc-200">{pk.name}</span>
          <div className="flex gap-4 mt-1">
            {pk.usedOnLabels.length > 0 && (
              <div className="text-[11px] text-zinc-500">
                Labels:{" "}
                {pk.usedOnLabels.map((l, i) => (
                  <span key={l}>
                    {i > 0 && ", "}
                    <span className="text-zinc-400">:{l}</span>
                  </span>
                ))}
              </div>
            )}
            {pk.usedOnRelTypes.length > 0 && (
              <div className="text-[11px] text-zinc-500">
                Types:{" "}
                {pk.usedOnRelTypes.map((r, i) => (
                  <span key={r}>
                    {i > 0 && ", "}
                    <span className="text-zinc-400">:{r}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
