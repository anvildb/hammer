# Dependencies

Hammer is the browser UI for Anvil DB — a [React Router 7](https://reactrouter.com)
app (framework mode, SSR) built with Vite, React 19, and Tailwind CSS v4.

Versions below are the declared ranges from `package.json`. "Used for" describes
how each package is actually used in this app (verified against the source), and
a few packages are flagged as **declared but currently unused**.

---

## Runtime dependencies

### Framework & rendering

| Package | Version | Used for |
|---------|---------|----------|
| `react` | `^19.2.4` | The UI library. Every component in `app/` is React 19. |
| `react-dom` | `^19.2.4` | React's DOM renderer — client hydration and server-side rendering. |
| `react-router` | `^7.15.1` | The app framework: routing, data loaders/actions, `<Outlet>`, `useLocation`, SSR. Hammer runs in React Router "framework mode" (not just the library). |
| `@react-router/node` | `^7.15.1` | The Node.js server runtime/adapter for React Router SSR (request/response globals, streaming). Consumed by the build and `react-router-serve`, not imported in app code. |
| `@react-router/serve` | `^7.15.1` | The production server binary (`react-router-serve`) that serves the built app — see the `start` script. |
| `isbot` | `^5.1.36` | Bot/crawler detection used by React Router's **default** SSR entry: crawlers get fully-buffered HTML, browsers get streamed HTML. Pulled in via the framework's default server entry (there is no custom `app/entry.server.tsx`). |

### Routing convention

| Package | Version | Used for |
|---------|---------|----------|
| `remix-flat-routes` | `^0.8.5` | File-based "flat routes" convention (e.g. `routes/playground/route.tsx` → `/playground`). Configured in `app/routes.ts`. |
| `@react-router/remix-routes-option-adapter` | `^7.15.1` | Adapter that lets React Router 7 consume the `remix-flat-routes` route definitions in `app/routes.ts`. |

### UI components & styling helpers

| Package | Version | Used for |
|---------|---------|----------|
| `@base-ui/react` | `^1.3.0` | Headless, accessible UI primitives. Currently used by `app/components/ui/button.tsx` (the `Button` primitive); the base for the shadcn-style component layer. |
| `class-variance-authority` | `^0.7.1` | Type-safe variant styling (`cva`) — maps component props (variant/size) to Tailwind class sets. Used in the `ui/` components, e.g. `button.tsx`. |
| `clsx` | `^2.1.1` | Conditional className joining. Wrapped by the `cn()` helper in `app/lib/utils.ts`. |
| `tailwind-merge` | `^3.5.0` | Resolves conflicting Tailwind classes so later classes win. Combined with `clsx` in `cn()` (`app/lib/utils.ts`: `twMerge(clsx(inputs))`). |
| `tw-animate-css` | `^1.4.0` | Tailwind-compatible animation utilities. Imported globally in `app/app.css`. |
| `@fontsource-variable/geist` | `^5.2.8` | Self-hosted Geist variable font (no external font CDN). Imported in `app/app.css`. |
| `lucide-react` | `^1.7.0` | Icon component library. **Declared but not currently imported anywhere in `app/`** — a candidate for removal (icons in the app are inline SVG). |

### Graph visualization

The graph and schema views use a small set of standalone D3 modules (not the full
`d3` bundle) to drive an SVG canvas:

| Package | Version | Used for |
|---------|---------|----------|
| `d3-force` | `^3.0.0` | Force-directed layout simulation that positions nodes/edges. Used by `app/components/graph/use-graph-simulation.ts` and `app/components/schema/schema-graph.tsx`. |
| `d3-zoom` | `^3.0.0` | Pan/zoom behavior on the SVG canvas (`graph-canvas.tsx`, `schema-graph.tsx`). |
| `d3-selection` | `^3.0.0` | DOM selection helper required to attach `d3-zoom` to the SVG element (`select(...)`). |
| `d3-drag` | `^3.0.0` | Intended for node dragging, but **declared and not currently imported** — node dragging is hand-rolled in React state instead (see the comment in `graph-canvas.tsx`). Candidate for removal (along with `@types/d3-drag`). |

---

## Development dependencies

### Build & tooling

| Package | Version | Used for |
|---------|---------|----------|
| `vite` | `^7.3.2` | The dev server and production bundler underneath React Router. |
| `@react-router/dev` | `^7.15.1` | React Router's Vite plugin, `typegen`, and `build` commands (the `dev`/`build`/`typecheck` scripts). |
| `@tailwindcss/vite` | `^4.2.2` | The Tailwind CSS v4 Vite plugin (Tailwind v4 integrates via Vite rather than PostCSS). |
| `tailwindcss` | `^4.2.2` | The CSS framework itself; utility classes drive all styling (`app/app.css`). |
| `vite-tsconfig-paths` | `^5.1.4` | Resolves the `~/*` path alias (from `tsconfig.json`) in Vite so imports like `~/components/...` work. |
| `typescript` | `^5.9.3` | Type checking (`tsc`) and TS compilation. |
| `shadcn` | `^4.8.0` | The shadcn/ui CLI used to scaffold the `app/components/ui/*` components (cva + `cn()` pattern). A build-time tool, not imported at runtime. |

### Testing

| Package | Version | Used for |
|---------|---------|----------|
| `@playwright/test` | `^1.58.2` | End-to-end browser tests (`test:e2e`); config in `playwright.config.ts`, specs under `e2e/`. |

### Type definitions

Type-only packages providing TypeScript types for their runtime counterparts:

| Package | Version | Used for |
|---------|---------|----------|
| `@types/node` | `^22` | Node.js API types (build scripts, server runtime). |
| `@types/react` | `^19.2.14` | React types. |
| `@types/react-dom` | `^19.2.3` | React DOM types. |
| `@types/d3-force` | `^3.0.10` | Types for `d3-force`. |
| `@types/d3-zoom` | `^3.0.8` | Types for `d3-zoom`. |
| `@types/d3-selection` | `^3.0.11` | Types for `d3-selection`. |
| `@types/d3-drag` | `^3.0.7` | Types for `d3-drag` — unused alongside the `d3-drag` runtime package. |

---

## Notes

- **Unused declarations.** `lucide-react`, `d3-drag`, and `@types/d3-drag` are
  declared in `package.json` but not imported anywhere in `app/`. They can be
  removed unless there are near-term plans to use them.
- **Data layer.** Hammer talks to the Anvil server over HTTP/WebSocket using its
  own hand-written client (`app/lib/api-client.ts`, `app/lib/ws-client.ts`) —
  there is no data-fetching or state-management library (no React Query, Redux,
  etc.); loaders/actions and React state cover it.
- **Regenerating this list.** Dependencies are declared in `package.json`. To see
  the fully resolved tree run `npm ls` (or `npm ls <pkg>` for one package).
