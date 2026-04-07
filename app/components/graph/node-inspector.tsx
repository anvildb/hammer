import type { GraphNode, GraphEdge, VisConfig } from "./types";
import { labelColor } from "./types";

interface NodeInspectorProps {
  node: GraphNode | null;
  edge: GraphEdge | null;
  onClose: () => void;
  onExpand?: (nodeId: string) => void;
  onDelete?: (id: string, kind: "node" | "edge") => void;
  config?: VisConfig;
  onConfigChange?: (config: VisConfig) => void;
  allPropertyKeys?: string[];
}

export function NodeInspector({ node, edge, onClose, onExpand, onDelete, config, onConfigChange, allPropertyKeys }: NodeInspectorProps) {
  if (!node && !edge) return null;

  return (
    <div className="absolute right-0 top-0 bottom-0 w-72 bg-zinc-900 border-l border-zinc-800 overflow-y-auto z-20">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
          {node ? "Node" : "Relationship"}
        </span>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-sm">
          &times;
        </button>
      </div>

      {node && (
        <div className="p-3 space-y-3">
          <div>
            <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">ID</p>
            <p className="text-xs text-zinc-300 font-mono">{node.id}</p>
          </div>
          <div>
            <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Labels</p>
            <div className="flex flex-wrap gap-1 mb-2">
              {node.labels.map((l) => (
                <span
                  key={l}
                  className="text-[11px] px-1.5 py-0.5 rounded font-medium"
                  style={{ backgroundColor: labelColor(l) + "20", color: labelColor(l) }}
                >
                  :{l}
                </span>
              ))}
            </div>
            {config && onConfigChange && node.labels.map((label) => {
              const propKeys = allPropertyKeys ?? Object.keys(node.properties);
              const current = config.captionByLabel[label] ?? "";
              return (
                <div key={label} className="mb-1.5">
                  <label className="text-[11px] text-zinc-500 block mb-0.5">
                    Display property for <span style={{ color: labelColor(label) }}>:{label}</span>
                  </label>
                  <select
                    value={current}
                    onChange={(e) => {
                      const next = { ...config.captionByLabel };
                      if (e.target.value) {
                        next[label] = e.target.value;
                      } else {
                        delete next[label];
                      }
                      onConfigChange({ ...config, captionByLabel: next });
                    }}
                    className="w-full bg-zinc-800 text-zinc-300 text-[11px] rounded px-1.5 py-1 border border-zinc-700 focus:outline-none focus:border-zinc-500"
                  >
                    <option value="">(default)</option>
                    {propKeys.map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
          <PropertyTable properties={node.properties} />
          <div className="flex gap-2 pt-1">
            {onExpand && (
              <button
                onClick={() => onExpand(node.id)}
                className="text-[11px] px-2 py-1 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              >
                Expand neighbors
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(node.id, "node")}
                className="text-[11px] px-2 py-1 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      )}

      {edge && (
        <div className="p-3 space-y-3">
          <div>
            <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">ID</p>
            <p className="text-xs text-zinc-300 font-mono">{edge.id}</p>
          </div>
          <div>
            <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Type</p>
            <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
              :{edge.type}
            </span>
          </div>
          <div>
            <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Source &rarr; Target</p>
            <p className="text-xs text-zinc-400 font-mono">
              {typeof edge.source === "string" ? edge.source : edge.source.id}
              {" → "}
              {typeof edge.target === "string" ? edge.target : edge.target.id}
            </p>
          </div>
          <PropertyTable properties={edge.properties} />
          {onDelete && (
            <button
              onClick={() => onDelete(edge.id, "edge")}
              className="text-[11px] px-2 py-1 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PropertyTable({ properties }: { properties: Record<string, unknown> }) {
  const entries = Object.entries(properties);
  if (entries.length === 0) {
    return <p className="text-xs text-zinc-600 italic">No properties</p>;
  }
  return (
    <div>
      <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Properties</p>
      <table className="w-full text-xs">
        <tbody>
          {entries.map(([key, val]) => (
            <tr key={key} className="border-t border-zinc-800/50">
              <td className="py-1 pr-2 text-zinc-500 font-mono whitespace-nowrap">{key}</td>
              <td className="py-1 text-zinc-300 font-mono break-all">
                {typeof val === "object" ? JSON.stringify(val) : String(val)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
