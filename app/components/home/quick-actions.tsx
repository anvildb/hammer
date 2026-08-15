import { Link } from "react-router";

interface Action {
  to: string;
  title: string;
  description: string;
  /** SVG path data drawn in a 24x24 stroked viewBox. */
  icon: string;
  adminOnly?: boolean;
}

const ACTIONS: Action[] = [
  {
    to: "/query",
    title: "Cypher editor",
    description: "Write, explain and profile queries",
    icon: "M4 17l6-6-6-6M12 19h8",
  },
  {
    to: "/graph",
    title: "Graph view",
    description: "Explore nodes and relationships visually",
    icon: "M18 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zM18 22a3 3 0 100-6 3 3 0 000 6zM8.6 13.5l6.8 3.9M15.4 6.6L8.6 10.5",
  },
  {
    to: "/schema",
    title: "Schema browser",
    description: "Labels, types, indexes, constraints",
    icon: "M12 7c4.4 0 8-1.1 8-2.5S16.4 2 12 2 4 3.1 4 4.5 7.6 7 12 7zM20 4.5v15c0 1.4-3.6 2.5-8 2.5s-8-1.1-8-2.5v-15M20 12c0 1.4-3.6 2.5-8 2.5S4 13.4 4 12",
  },
  {
    to: "/documents",
    title: "Documents",
    description: "Collections, keys and TTLs",
    icon: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M8 13h8M8 17h5",
  },
  {
    to: "/storage",
    title: "Storage",
    description: "Buckets, uploads and signed URLs",
    icon: "M21 8v13H3V8M1 3h22v5H1zM10 12h4",
  },
  {
    to: "/graphql",
    title: "GraphQL",
    description: "Run queries against the GraphQL API",
    icon: "M12 2l8.7 5v10L12 22 3.3 17V7L12 2zM3.3 7L12 12l8.7-5M12 12v10",
  },
  {
    to: "/import",
    title: "Import & export",
    description: "Load a snapshot or sample dataset",
    icon: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
    adminOnly: true,
  },
  {
    to: "/monitor",
    title: "Monitor",
    description: "Throughput, slow queries, event log",
    icon: "M22 12h-4l-3 9L9 3l-3 9H2",
    adminOnly: true,
  },
];

export function QuickActions({ isAdmin }: { isAdmin: boolean }) {
  const visible = ACTIONS.filter((a) => !a.adminOnly || isAdmin);

  return (
    <section>
      <h2 className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">Jump to</h2>
      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {visible.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="group flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 hover:border-zinc-600 hover:bg-zinc-900 transition-colors"
          >
            <svg
              className="w-4 h-4 mt-0.5 shrink-0 text-zinc-500 group-hover:text-zinc-200 transition-colors"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d={action.icon} />
            </svg>
            <span className="min-w-0">
              <span className="block text-sm text-zinc-200 group-hover:text-white">
                {action.title}
              </span>
              <span className="block text-[11px] text-zinc-500 truncate">
                {action.description}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
