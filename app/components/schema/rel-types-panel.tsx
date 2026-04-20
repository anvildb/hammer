import type { RelTypeInfo } from "./types";
import { schemaColor } from "./types";

interface RelTypesPanelProps {
  relTypes: RelTypeInfo[];
}

export function RelTypesPanel({ relTypes }: RelTypesPanelProps) {
  if (relTypes.length === 0) {
    return <p className="px-3 py-8 text-xs text-zinc-600 text-center">No relationship types found</p>;
  }

  return (
    <div className="space-y-1 p-3">
      {relTypes.map((rt) => {
        const color = schemaColor(rt.name);
        return (
          <div
            key={rt.name}
            className="px-3 py-2 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700"
          >
            <div className="flex items-center gap-3">
              <span
                className="w-2.5 h-0.5 flex-shrink-0 rounded"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs font-mono text-zinc-200 font-medium">
                :{rt.name}
              </span>
              <span className="text-[11px] text-zinc-500 ml-auto tabular-nums">
                {rt.count.toLocaleString()} rel{rt.count !== 1 ? "s" : ""}
              </span>
            </div>
            {(rt.fromLabels.length > 0 || rt.toLabels.length > 0) && (
              <div className="mt-1 ml-5 text-[11px] text-zinc-500 font-mono">
                ({rt.fromLabels.join("|") || "*"}) &rarr; ({rt.toLabels.join("|") || "*"})
              </div>
            )}
            {rt.properties.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1 ml-5">
                {rt.properties.map((p) => (
                  <span
                    key={p}
                    className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono"
                  >
                    {p}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
