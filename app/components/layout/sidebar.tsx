// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
import { Link, useLocation } from "react-router";
import { useConnection, SCHEMAS } from "~/lib/connection-context";

const navItems = [
  { path: "/query", label: "Cypher", icon: "terminal", schemaAware: false, adminOnly: false },
  { path: "/graphql", label: "GraphQL", icon: "code", schemaAware: false, adminOnly: false },
  { path: "/graph", label: "Graph", icon: "share-2", schemaAware: false, adminOnly: false },
  { path: "/schema", label: "Schema", icon: "database", schemaAware: true, adminOnly: false },
  { path: "/documents", label: "Documents", icon: "file-text", schemaAware: true, adminOnly: false },
  { path: "/policies", label: "Policies", icon: "shield", schemaAware: true, adminOnly: true },
  { path: "/functions", label: "Functions", icon: "zap", schemaAware: true, adminOnly: true },
  { path: "/triggers", label: "Triggers", icon: "bolt", schemaAware: false, adminOnly: true },
  { path: "/import", label: "Import", icon: "upload", schemaAware: false, adminOnly: false },
  { path: "/monitor", label: "Monitor", icon: "activity", schemaAware: false, adminOnly: false },
  { path: "/admin", label: "Admin", icon: "users", schemaAware: false, adminOnly: true },
  { path: "/settings", label: "Settings", icon: "settings", schemaAware: false, adminOnly: false },
  { path: "/help", label: "Help", icon: "help-circle", schemaAware: false, adminOnly: false },
];

interface SidebarProps {
  favorites: string[];
}

export function Sidebar({ favorites }: SidebarProps) {
  const location = useLocation();
  const { selectedSchema, setSelectedSchema, isAdmin } = useConnection();

  const visibleSchemas = isAdmin ? SCHEMAS : SCHEMAS.filter((s) => s !== "auth");
  const visibleNav = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside className="flex flex-col w-56 h-full bg-zinc-900 border-r border-zinc-800">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
        <img src="anvil.webp" className="" />
      </div>

      {/* Schema selector */}
      <div className="px-3 py-2 border-b border-zinc-800">
        <label className="text-xs text-zinc-500 uppercase tracking-wider">Schema</label>
        <select
          value={selectedSchema}
          onChange={(e) => setSelectedSchema(e.target.value as typeof selectedSchema)}
          className="mt-1 w-full bg-zinc-800 text-zinc-200 text-sm rounded px-2 py-1 border border-zinc-700 focus:border-zinc-500 focus:outline-none"
        >
          {visibleSchemas.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {visibleNav.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center justify-between gap-3 px-4 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-zinc-800 text-zinc-100 border-l-2 border-zinc-400"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border-l-2 border-transparent"
              }`}
            >
              <span>{item.label}</span>
              {item.schemaAware && (
                <span className="text-[9px] text-zinc-600 font-mono">{selectedSchema}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Favorites */}
      {favorites.length > 0 && (
        <div className="px-3 py-2 border-t border-zinc-800">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Favorites</p>
          {favorites.map((fav, i) => (
            <div key={i} className="text-xs text-zinc-400 truncate py-0.5 cursor-pointer hover:text-zinc-200">
              {fav}
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
