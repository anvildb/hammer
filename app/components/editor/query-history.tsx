// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
import { useState } from "react";

export interface HistoryEntry {
  id: string;
  query: string;
  timestamp: number;
  duration?: number;
  rowCount?: number;
  error?: string;
}

interface QueryHistoryProps {
  entries: HistoryEntry[];
  onSelect: (query: string) => void;
  onSave: (entry: HistoryEntry) => void;
}

export function QueryHistory({ entries, onSelect, onSave }: QueryHistoryProps) {
  const [search, setSearch] = useState("");

  const filtered = search
    ? entries.filter((e) => e.query.toLowerCase().includes(search.toLowerCase()))
    : entries;

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-l border-zinc-800">
      <div className="px-3 py-2 border-b border-zinc-800">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search history..."
          className="w-full text-xs bg-zinc-800 text-zinc-300 rounded px-2 py-1 border border-zinc-700 focus:outline-none focus:border-zinc-500"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="px-3 py-4 text-xs text-zinc-600 text-center">No history</p>
        )}
        {filtered.map((entry) => (
          <div
            key={entry.id}
            className="px-3 py-2 border-b border-zinc-800/50 hover:bg-zinc-800/50 cursor-pointer group"
            onClick={() => onSelect(entry.query)}
          >
            <pre className="text-xs text-zinc-400 font-mono truncate whitespace-pre-wrap line-clamp-2">
              {entry.query}
            </pre>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] text-zinc-600">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
              {entry.duration != null && (
                <span className="text-[11px] text-zinc-600">{entry.duration}ms</span>
              )}
              {entry.rowCount != null && (
                <span className="text-[11px] text-zinc-600">{entry.rowCount} rows</span>
              )}
              {entry.error && (
                <span className="text-[11px] text-red-500">error</span>
              )}
              <button
                className="text-[11px] text-zinc-700 hover:text-zinc-400 opacity-0 group-hover:opacity-100 ml-auto"
                onClick={(e) => { e.stopPropagation(); onSave(entry); }}
              >
                save
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Persistence helpers using localStorage.

const HISTORY_KEY = "anvil_query_history";
const SAVED_KEY = "anvil_saved_queries";
const MAX_HISTORY = 100;

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveHistoryEntry(entry: HistoryEntry): void {
  const history = loadHistory();
  history.unshift(entry);
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function loadSavedQueries(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveFavoriteQuery(entry: HistoryEntry): void {
  const saved = loadSavedQueries();
  if (!saved.some((s) => s.query === entry.query)) {
    saved.unshift(entry);
    localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
  }
}
