import type { GraphDefaults } from "./types";
import type { LayoutAlgorithm } from "~/components/graph/types";
import { SettingRow } from "./theme-setting";

interface GraphDefaultsSettingsProps {
  value: GraphDefaults;
  onChange: (defaults: GraphDefaults) => void;
}

const layouts: { value: LayoutAlgorithm; label: string }[] = [
  { value: "force", label: "Force-directed" },
  { value: "hierarchical", label: "Hierarchical" },
  { value: "circular", label: "Circular" },
  { value: "grid", label: "Grid" },
];

export function GraphDefaultsSettings({ value, onChange }: GraphDefaultsSettingsProps) {
  const update = (patch: Partial<GraphDefaults>) =>
    onChange({ ...value, ...patch });

  return (
    <>
      <SettingRow label="Default layout" description="Graph layout algorithm used on first render">
        <select
          value={value.layout}
          onChange={(e) => update({ layout: e.target.value as LayoutAlgorithm })}
          className="bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700 focus:outline-none focus:border-zinc-500"
        >
          {layouts.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
      </SettingRow>

      <SettingRow label="Max nodes" description="Maximum nodes rendered before truncation">
        <input
          type="number"
          value={value.maxNodes}
          min={10}
          max={10000}
          onChange={(e) => update({ maxNodes: Number(e.target.value) || 1000 })}
          className="w-20 bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700 focus:outline-none focus:border-zinc-500 tabular-nums"
        />
      </SettingRow>

      <SettingRow label="Size property" description="Property key to scale node size (leave blank for fixed)">
        <PropInput value={value.sizeProperty} onChange={(v) => update({ sizeProperty: v })} />
      </SettingRow>

      <SettingRow label="Caption property" description="Property key shown as node label">
        <PropInput value={value.captionProperty} onChange={(v) => update({ captionProperty: v })} />
      </SettingRow>

      <SettingRow label="Thickness property" description="Property key to scale edge thickness">
        <PropInput value={value.thicknessProperty} onChange={(v) => update({ thicknessProperty: v })} />
      </SettingRow>
    </>
  );
}

function PropInput({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <input
      type="text"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      placeholder="(none)"
      className="w-28 bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700 focus:outline-none focus:border-zinc-500 font-mono"
    />
  );
}
