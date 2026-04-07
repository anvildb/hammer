// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
import type { ThemeMode } from "./types";

interface ThemeSettingProps {
  value: ThemeMode;
  onChange: (theme: ThemeMode) => void;
}

const options: { value: ThemeMode; label: string }[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
];

export function ThemeSetting({ value, onChange }: ThemeSettingProps) {
  return (
    <SettingRow label="Theme" description="Controls the UI color scheme">
      <div className="flex gap-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`text-xs px-3 py-1 rounded border transition-colors ${
              value === opt.value
                ? "bg-zinc-700 text-zinc-200 border-zinc-600"
                : "bg-zinc-800 text-zinc-500 border-zinc-700 hover:text-zinc-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </SettingRow>
  );
}

export function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-800/50">
      <div>
        <p className="text-xs text-zinc-300">{label}</p>
        {description && <p className="text-[11px] text-zinc-600 mt-0.5">{description}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}
