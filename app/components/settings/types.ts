/** Shared types for settings & preferences. */

import type { LayoutAlgorithm } from "~/components/graph/types";
import type { ResultViewMode } from "~/components/results/types";

export type ThemeMode = "dark" | "light" | "system";

export interface EditorPreferences {
  fontSize: number;
  tabSize: number;
  lineNumbers: boolean;
  wordWrap: boolean;
  minimap: boolean;
}

export interface GraphDefaults {
  layout: LayoutAlgorithm;
  maxNodes: number;
  sizeProperty: string | null;
  captionProperty: string | null;
  thicknessProperty: string | null;
  /** Per-label display property overrides. Key = label name, value = property key. */
  captionByLabel: Record<string, string>;
}

export interface ConnectionProfile {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  /** Not stored — only kept in-session when the user enters it. */
  password?: string;
  useTls: boolean;
}

export interface UserSettings {
  theme: ThemeMode;
  defaultResultView: ResultViewMode;
  editor: EditorPreferences;
  graphDefaults: GraphDefaults;
  connectionProfiles: ConnectionProfile[];
  activeConnectionId: string | null;
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "dark",
  defaultResultView: "table",
  editor: {
    fontSize: 13,
    tabSize: 2,
    lineNumbers: true,
    wordWrap: false,
    minimap: false,
  },
  graphDefaults: {
    layout: "force",
    maxNodes: 1000,
    sizeProperty: null,
    captionProperty: null,
    thicknessProperty: null,
    captionByLabel: {},
  },
  connectionProfiles: [
    {
      id: "default",
      name: "Local",
      host: "localhost",
      port: 7474,
      username: "admin",
      useTls: false,
    },
  ],
  activeConnectionId: "default",
};

const SETTINGS_KEY = "anvil_settings";

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
