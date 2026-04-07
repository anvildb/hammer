// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
import type { EditorPreferences } from "./types";
import { SettingRow } from "./theme-setting";

interface EditorSettingsProps {
  value: EditorPreferences;
  onChange: (prefs: EditorPreferences) => void;
}

export function EditorSettings({ value, onChange }: EditorSettingsProps) {
  const update = (patch: Partial<EditorPreferences>) =>
    onChange({ ...value, ...patch });

  return (
    <>
      <SettingRow label="Font size" description="Editor font size in pixels">
        <NumberInput
          value={value.fontSize}
          min={8}
          max={32}
          onChange={(v) => update({ fontSize: v })}
        />
      </SettingRow>

      <SettingRow label="Tab size" description="Number of spaces per tab">
        <select
          value={value.tabSize}
          onChange={(e) => update({ tabSize: Number(e.target.value) })}
          className="bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700 focus:outline-none focus:border-zinc-500"
        >
          {[2, 4, 8].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </SettingRow>

      <SettingRow label="Line numbers" description="Show line numbers in the editor">
        <Toggle checked={value.lineNumbers} onChange={(v) => update({ lineNumbers: v })} />
      </SettingRow>

      <SettingRow label="Word wrap" description="Wrap long lines instead of scrolling">
        <Toggle checked={value.wordWrap} onChange={(v) => update({ wordWrap: v })} />
      </SettingRow>

      <SettingRow label="Minimap" description="Show code minimap in the editor">
        <Toggle checked={value.minimap} onChange={(v) => update({ minimap: v })} />
      </SettingRow>
    </>
  );
}

function NumberInput({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => {
        const n = Number(e.target.value);
        if (n >= min && n <= max) onChange(n);
      }}
      className="w-16 bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700 focus:outline-none focus:border-zinc-500 tabular-nums"
    />
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-8 h-4 rounded-full transition-colors ${
        checked ? "bg-zinc-500" : "bg-zinc-700"
      }`}
    >
      <span
        className={`absolute top-0.5 w-3 h-3 rounded-full bg-zinc-200 transition-transform ${
          checked ? "left-4" : "left-0.5"
        }`}
      />
    </button>
  );
}
