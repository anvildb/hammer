// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
interface TopBarProps {
  connectionStatus: "connected" | "disconnected" | "connecting";
  username: string;
  readOnly?: boolean;
  onOpenCommandPalette: () => void;
  onLogout?: () => void;
}

export function TopBar({ connectionStatus, username, readOnly, onOpenCommandPalette, onLogout }: TopBarProps) {
  const statusColor = {
    connected: "bg-emerald-500",
    disconnected: "bg-red-500",
    connecting: "bg-amber-500",
  }[connectionStatus];

  return (
    <header className="flex items-center justify-between h-10 px-4 bg-zinc-900 border-b border-zinc-800">
      {/* Left: Command palette trigger + read-only badge */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-800 rounded px-3 py-1 hover:text-zinc-300 hover:bg-zinc-700 transition-colors"
        >
          <span>Search or run command...</span>
          <kbd className="text-[11px] bg-zinc-700 rounded px-1 py-0.5 font-mono">⌘K</kbd>
        </button>
        {readOnly && (
          <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-0.5">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Read Only
          </span>
        )}
      </div>

      {/* Right: Connection status + user */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <div className={`w-2 h-2 rounded-full ${statusColor}`} />
          <span>{connectionStatus}</span>
        </div>
        <div className="text-xs text-zinc-400">{username}</div>
        {onLogout && (
          <button
            onClick={onLogout}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  );
}
