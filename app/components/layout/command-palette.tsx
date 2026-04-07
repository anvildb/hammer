// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";

interface CommandItem {
  id: string;
  label: string;
  category: string;
  action: () => void;
  shortcut?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

const defaultCommands: Omit<CommandItem, "action">[] = [
  { id: "nav-query", label: "Go to Query Editor", category: "Navigation", shortcut: "⌘1" },
  { id: "nav-graph", label: "Go to Graph Visualization", category: "Navigation", shortcut: "⌘2" },
  { id: "nav-schema", label: "Go to Schema Browser", category: "Navigation", shortcut: "⌘3" },
  { id: "nav-monitor", label: "Go to Monitoring", category: "Navigation", shortcut: "⌘4" },
  { id: "nav-admin", label: "Go to Administration", category: "Navigation" },
  { id: "nav-settings", label: "Go to Settings", category: "Navigation" },
  { id: "action-new-tab", label: "New Query Tab", category: "Actions", shortcut: "⌘T" },
  { id: "action-run-query", label: "Run Current Query", category: "Actions", shortcut: "⌘↵" },
  { id: "action-explain", label: "Explain Query", category: "Actions" },
  { id: "action-profile", label: "Profile Query", category: "Actions" },
  { id: "action-clear", label: "Clear Editor", category: "Actions" },
];

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setSearch("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Global keyboard shortcut.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const commands: CommandItem[] = defaultCommands.map((cmd) => ({
    ...cmd,
    action: () => {
      if (cmd.id.startsWith("nav-")) {
        navigate(`/${cmd.id.replace("nav-", "")}`);
      }
      onClose();
    },
  }));

  const filtered = commands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(search.toLowerCase()) ||
      cmd.category.toLowerCase().includes(search.toLowerCase()),
  );

  const categories = [...new Set(filtered.map((c) => c.category))];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Type a command or search..."
          className="w-full px-4 py-3 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 border-b border-zinc-700 focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "Enter" && filtered.length > 0) {
              filtered[0].action();
            }
          }}
        />
        <div className="max-h-72 overflow-y-auto py-2">
          {categories.map((cat) => (
            <div key={cat}>
              <div className="px-4 py-1 text-[11px] uppercase tracking-wider text-zinc-600">{cat}</div>
              {filtered
                .filter((c) => c.category === cat)
                .map((cmd) => (
                  <button
                    key={cmd.id}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors text-left"
                    onClick={cmd.action}
                  >
                    <span>{cmd.label}</span>
                    {cmd.shortcut && (
                      <kbd className="text-[11px] text-zinc-600 font-mono">{cmd.shortcut}</kbd>
                    )}
                  </button>
                ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-sm text-zinc-600 text-center">No results found</div>
          )}
        </div>
      </div>
    </div>
  );
}
