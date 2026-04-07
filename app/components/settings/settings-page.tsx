// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
import { useState, useEffect, useCallback } from "react";
import type { UserSettings, ConnectionProfile } from "./types";
import type { ResultViewMode } from "~/components/results/types";
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from "./types";
import { ThemeSetting, SettingRow } from "./theme-setting";
import { EditorSettings } from "./editor-settings";
import { GraphDefaultsSettings } from "./graph-defaults-settings";
import { ConnectionProfiles } from "./connection-profiles";

type Section = "general" | "editor" | "graph" | "connections";

const sections: { id: Section; label: string }[] = [
  { id: "general", label: "General" },
  { id: "editor", label: "Editor" },
  { id: "graph", label: "Graph" },
  { id: "connections", label: "Connections" },
];

const resultViews: { value: ResultViewMode; label: string }[] = [
  { value: "table", label: "Table" },
  { value: "json", label: "JSON" },
  { value: "graph", label: "Graph" },
  { value: "plan", label: "Plan" },
];

export function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [active, setActive] = useState<Section>("general");

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const update = useCallback((patch: Partial<UserSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  return (
    <div className="flex h-full">
      {/* Section nav */}
      <div className="w-40 border-r border-zinc-800 py-2">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className={`w-full text-left px-4 py-1.5 text-xs transition-colors ${
              active === s.id
                ? "text-zinc-200 bg-zinc-800"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 max-w-xl">
        {active === "general" && (
          <>
            <SectionTitle title="General" />
            <ThemeSetting
              value={settings.theme}
              onChange={(theme) => update({ theme })}
            />
            <SettingRow label="Default result view" description="View shown when a query returns results">
              <select
                value={settings.defaultResultView}
                onChange={(e) => update({ defaultResultView: e.target.value as ResultViewMode })}
                className="bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700 focus:outline-none focus:border-zinc-500"
              >
                {resultViews.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </SettingRow>
          </>
        )}

        {active === "editor" && (
          <>
            <SectionTitle title="Editor" />
            <EditorSettings
              value={settings.editor}
              onChange={(editor) => update({ editor })}
            />
          </>
        )}

        {active === "graph" && (
          <>
            <SectionTitle title="Graph Visualization" />
            <GraphDefaultsSettings
              value={settings.graphDefaults}
              onChange={(graphDefaults) => update({ graphDefaults })}
            />
          </>
        )}

        {active === "connections" && (
          <>
            <SectionTitle title="Connection Profiles" />
            <ConnectionProfiles
              profiles={settings.connectionProfiles}
              activeId={settings.activeConnectionId}
              onAdd={(profile) =>
                update({
                  connectionProfiles: [...settings.connectionProfiles, profile],
                })
              }
              onRemove={(id) =>
                update({
                  connectionProfiles: settings.connectionProfiles.filter((p) => p.id !== id),
                  activeConnectionId:
                    settings.activeConnectionId === id
                      ? settings.connectionProfiles[0]?.id ?? null
                      : settings.activeConnectionId,
                })
              }
              onSetActive={(id) => update({ activeConnectionId: id })}
              onEdit={(id, profile) =>
                update({
                  connectionProfiles: settings.connectionProfiles.map((p) =>
                    p.id === id ? profile : p,
                  ),
                })
              }
            />
          </>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <h2 className="text-sm font-semibold text-zinc-200 mb-3">{title}</h2>
  );
}
