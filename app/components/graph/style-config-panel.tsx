import type { VisConfig } from "./types";

interface StyleConfigPanelProps {
  config: VisConfig;
  onChange: (config: VisConfig) => void;
  propertyKeys: string[];
  open: boolean;
  onClose: () => void;
}

export function StyleConfigPanel({
  config,
  onChange,
  propertyKeys,
  open,
  onClose,
}: StyleConfigPanelProps) {
  if (!open) return null;

  const updateNode = (patch: Partial<typeof config.nodeStyle>) =>
    onChange({ ...config, nodeStyle: { ...config.nodeStyle, ...patch } });

  const updateEdge = (patch: Partial<typeof config.edgeStyle>) =>
    onChange({ ...config, edgeStyle: { ...config.edgeStyle, ...patch } });

  return (
    <div className="absolute left-0 top-0 bottom-0 w-60 bg-zinc-900 border-r border-zinc-800 z-20 overflow-y-auto">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
          Style
        </span>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-sm">
          &times;
        </button>
      </div>

      <div className="p-3 space-y-4">
        {/* Node size */}
        <Field label="Node size by property">
          <PropSelect
            value={config.nodeStyle.sizeProperty}
            options={propertyKeys}
            onChange={(v) => updateNode({ sizeProperty: v })}
          />
        </Field>

        {/* Node caption */}
        <Field label="Node caption property">
          <PropSelect
            value={config.nodeStyle.captionProperty}
            options={propertyKeys}
            onChange={(v) => updateNode({ captionProperty: v })}
          />
        </Field>

        {/* Edge thickness */}
        <Field label="Edge thickness by property">
          <PropSelect
            value={config.edgeStyle.thicknessProperty}
            options={propertyKeys}
            onChange={(v) => updateEdge({ thicknessProperty: v })}
          />
        </Field>

        {/* Max nodes */}
        <Field label="Max rendered nodes">
          <input
            type="number"
            min={10}
            max={10000}
            value={config.maxNodes}
            onChange={(e) => onChange({ ...config, maxNodes: Number(e.target.value) || 1000 })}
            className="w-full bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700 focus:outline-none focus:border-zinc-500"
          />
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function PropSelect({
  value,
  options,
  onChange,
}: {
  value: string | null;
  options: string[];
  onChange: (v: string | null) => void;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="w-full bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700 focus:outline-none focus:border-zinc-500"
    >
      <option value="">(none)</option>
      {options.map((k) => (
        <option key={k} value={k}>
          {k}
        </option>
      ))}
    </select>
  );
}
