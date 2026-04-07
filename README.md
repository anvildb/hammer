# Hammer

Web-based management UI for [Anvil DB](https://anvildb.com). Query your graph, visualize relationships, manage documents, configure security, and administer users — all from the browser.

## Pages

| Page | Description |
|------|-------------|
| **Cypher** | Query editor with table, JSON, graph, and plan result views |
| **GraphQL** | Playground with introspection and data views |
| **Graph** | Interactive force-directed canvas with focus mode, neighbor orbit, lasso select, minimap, and PNG/SVG export |
| **Schema** | Browse labels, relationship types, property keys, indexes, and constraints |
| **Documents** | Collection CRUD, document browsing with pagination, JSON editor, sync rule management |
| **Policies** | Create and manage row-level security policies, enable/disable RLS, policy simulator |
| **Functions** | Create, edit, test, and manage stored Cypher functions |
| **Triggers** | Create and manage event-driven triggers with activity log and dependency analysis |
| **Import** | Paste or upload Cypher script files with node/relationship creation counts |
| **Monitor** | Real-time server stats, slow query log, event log |
| **Admin** | User and role management, event log explorer, alerts panel |
| **Settings** | Theme, default result view, editor preferences, graph defaults, connection profiles |
| **Help** | Built-in documentation and reference |

## Graph Canvas

The graph visualization uses D3.js force simulation with multiple layout options:

- **Force-directed** — default physics-based layout
- **Hierarchical** — layered by in-degree
- **Circular** — nodes arranged in a circle
- **Grid** — evenly spaced grid

**Focus mode** — click a node to pin it and orbit its direct connections in an evenly-spaced circle. Connected edges and labels highlight in yellow. Non-neighbor labels are hidden and nodes outside the orbit are pushed to the periphery. Click empty space to deselect and restore the normal layout.

**Interactions** — drag to move nodes, shift+drag for lasso selection, double-click to expand neighbors, right-click for context menus (inspect, edit, expand, hide, delete), scroll to zoom, minimap for navigation.

## Security

- Non-admin users cannot see or access Admin, Policies, Functions, or Triggers pages
- Schema dropdown only shows `auth` for admin users
- `auth.*` document collections are hidden from non-admin users
- All restrictions are enforced both client-side (hidden UI) and server-side (403 Forbidden)

## Configuration

Hammer connects to an Anvil DB instance via HTTP. The server URL is configured in the connection context (default: `http://localhost:7474`).

Authentication is required. On first load, Hammer presents a login screen. JWT tokens are stored in localStorage and automatically refreshed on 401 responses.

## Development

```bash
npm install
npm run dev
```

Runs at `http://localhost:5175` with hot module replacement.

## Production Build

```bash
npm run build
```

Output in `build/` — deploy the `client/` and `server/` directories to any Node.js host or container.

## Tech Stack

- React Router 7
- TypeScript
- Tailwind CSS v4
- D3.js (graph visualization)

## Author

Benjamin C. Tehan

## License

MIT License. Copyright (c) 2026 Devforge Pty Ltd.
