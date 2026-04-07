// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
interface TopBarProps {
  connectionStatus: "connected" | "disconnected" | "connecting";
  username: string;
  onOpenCommandPalette: () => void;
  onLogout?: () => void;
}

export function TopBar({ connectionStatus, username, onOpenCommandPalette, onLogout }: TopBarProps) {
  const statusColor = {
    connected: "bg-emerald-500",
    disconnected: "bg-red-500",
    connecting: "bg-amber-500",
  }[connectionStatus];

  return (
    <header className="flex items-center justify-between h-10 px-4 bg-zinc-900 border-b border-zinc-800">
      {/* Left: Command palette trigger */}
      <button
        onClick={onOpenCommandPalette}
        className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-800 rounded px-3 py-1 hover:text-zinc-300 hover:bg-zinc-700 transition-colors"
      >
        <span>Search or run command...</span>
        <kbd className="text-[11px] bg-zinc-700 rounded px-1 py-0.5 font-mono">⌘K</kbd>
      </button>

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
