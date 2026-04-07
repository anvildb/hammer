import { useState } from "react";

interface ParamPanelProps {
  params: Record<string, string>;
  onChange: (params: Record<string, string>) => void;
}

export function ParamPanel({ params, onChange }: ParamPanelProps) {
  const [newKey, setNewKey] = useState("");

  const addParam = () => {
    if (newKey && !params[newKey]) {
      onChange({ ...params, [newKey]: "" });
      setNewKey("");
    }
  };

  const updateParam = (key: string, value: string) => {
    onChange({ ...params, [key]: value });
  };

  const removeParam = (key: string) => {
    const next = { ...params };
    delete next[key];
    onChange(next);
  };

  const entries = Object.entries(params);

  return (
    <div className="border-t border-zinc-800 bg-zinc-900 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-zinc-500 uppercase tracking-wider">Parameters</span>
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addParam()}
            placeholder="$param"
            className="w-24 text-xs bg-zinc-800 text-zinc-300 rounded px-2 py-1 border border-zinc-700 focus:outline-none focus:border-zinc-500"
          />
          <button onClick={addParam} className="text-xs text-zinc-500 hover:text-zinc-300 px-1">+</button>
        </div>
      </div>
      {entries.length === 0 && (
        <p className="text-xs text-zinc-600">No parameters defined</p>
      )}
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-center gap-2 mb-1">
          <span className="text-xs text-zinc-400 font-mono w-24 truncate">${key}</span>
          <input
            type="text"
            value={value}
            onChange={(e) => updateParam(key, e.target.value)}
            className="flex-1 text-xs bg-zinc-800 text-zinc-300 rounded px-2 py-1 border border-zinc-700 focus:outline-none focus:border-zinc-500 font-mono"
          />
          <button onClick={() => removeParam(key)} className="text-xs text-zinc-600 hover:text-red-400">&times;</button>
        </div>
      ))}
    </div>
  );
}
