import { useState, useEffect } from "react";
import type { GraphNode, GraphEdge } from "./types";

interface EditModalProps {
  node?: GraphNode | null;
  edge?: GraphEdge | null;
  onSave: (id: string, kind: "node" | "edge", properties: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}

export function EditModal({ node, edge, onSave, onClose }: EditModalProps) {
  const item = node ?? edge;
  const kind = node ? "node" : "edge";
  if (!item) return null;

  const [json, setJson] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setJson(JSON.stringify(item.properties, null, 2));
    setError(null);
  }, [item]);

  async function handleSave() {
    setError(null);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(json);
    } catch {
      setError("Invalid JSON");
      return;
    }
    setSaving(true);
    try {
      await onSave(item!.id, kind, parsed);
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  const title = node
    ? `Edit Node ${node.id}${node.labels.length ? ` :${node.labels.join(":")}` : ""}`
    : `Edit Relationship ${edge!.id} :${edge!.type}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
          <h2 className="text-sm font-medium text-zinc-200">{title}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-lg leading-none">
            &times;
          </button>
        </div>

        <div className="p-4">
          <label className="block text-xs text-zinc-400 mb-1">Properties (JSON)</label>
          <textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            rows={12}
            spellCheck={false}
            className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-blue-500 resize-y"
          />
          {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-zinc-700">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
