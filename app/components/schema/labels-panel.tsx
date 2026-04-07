import type { LabelInfo } from "./types";
import { schemaColor } from "./types";

interface LabelsPanelProps {
  labels: LabelInfo[];
}

export function LabelsPanel({ labels }: LabelsPanelProps) {
  if (labels.length === 0) {
    return <Empty text="No labels found" />;
  }

  return (
    <div className="space-y-1 p-3">
      {labels.map((label) => {
        const color = schemaColor(label.name);
        return (
          <div
            key={label.name}
            className="flex items-center gap-3 px-3 py-2 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700"
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs font-mono text-zinc-200 font-medium">
              :{label.name}
            </span>
            <span className="text-[11px] text-zinc-500 ml-auto tabular-nums">
              {label.nodeCount.toLocaleString()} node{label.nodeCount !== 1 ? "s" : ""}
            </span>
          </div>
        );
      })}
      {labels.length > 0 && (
        <div className="pt-2">
          <p className="text-[11px] text-zinc-600 uppercase tracking-wider mb-1">
            Properties by label
          </p>
          {labels.map((label) => (
            <div key={label.name} className="mb-2">
              <p className="text-xs text-zinc-400 font-mono mb-0.5">:{label.name}</p>
              <div className="flex flex-wrap gap-1 ml-3">
                {label.properties.length === 0 && (
                  <span className="text-[11px] text-zinc-600 italic">none</span>
                )}
                {label.properties.map((p) => (
                  <span
                    key={p}
                    className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="px-3 py-8 text-xs text-zinc-600 text-center">{text}</p>
  );
}
