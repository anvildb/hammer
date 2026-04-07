import { useState, useEffect, type ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./topbar";
import { CommandPalette } from "./command-palette";
import { useConnection } from "~/lib/connection-context";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { status, currentUser, logout } = useConnection();

  // Global Cmd+K shortcut.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <Sidebar favorites={[]} />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar
          connectionStatus={status}
          username={currentUser ?? "anonymous"}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onLogout={logout}
        />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  );
}
