import { useState } from "react";
import { useConnection, appSchemaName } from "~/lib/connection-context";
import { AppDetail } from "~/components/apps/app-detail";

/**
 * /apps — apps / projects (APPS.md Phase 4).
 *
 * Left: the apps the current user can access (server admins see all, and
 * can create new ones). Right: the selected app's overview, members,
 * labels, settings, and email templates.
 */
export default function AppsRoute() {
  const { client, status, isAdmin, apps, refreshApps, setSelectedSchema } =
    useConnection();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importSlug, setImportSlug] = useState("");
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  async function importBackup(file: File) {
    setImporting(true);
    setError(null);
    setImportSummary(null);
    try {
      const backup = JSON.parse(await file.text());
      const res = await client.importApp(
        backup,
        importSlug.trim() || undefined,
      );
      setShowImport(false);
      setImportSlug("");
      await refreshApps();
      setSelectedId(res.app.id);
      const counts = Object.entries(res.imported)
        .filter(([, v]) => typeof v === "number" && (v as number) > 0)
        .map(([k, v]) => `${v} ${k.replaceAll("_", " ")}`)
        .join(", ");
      setImportSummary(`Imported '${res.app.slug}': ${counts || "empty app"}`);
    } catch (err) {
      setError(String(err));
    } finally {
      setImporting(false);
    }
  }

  const selected = apps.find((a) => a.id === selectedId) ?? null;

  async function createApp(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const created = await client.createApp({
        slug: slug.trim(),
        name: name.trim(),
      });
      setSlug("");
      setName("");
      setShowCreate(false);
      await refreshApps();
      setSelectedId(created.id);
    } catch (err) {
      setError(String(err));
    } finally {
      setCreating(false);
    }
  }

  if (status !== "connected") {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        Waiting for server connection...
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Left: app list */}
      <div className="w-80 shrink-0 border-r border-zinc-800 flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
          <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            Apps
            <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 font-normal tabular-nums">
              {apps.length}
            </span>
          </h3>
          {isAdmin && (
            <div className="flex gap-1">
              <button
                onClick={() => {
                  setShowImport(!showImport);
                  setShowCreate(false);
                }}
                className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
              >
                {showImport ? "Cancel" : "Import"}
              </button>
              <button
                onClick={() => {
                  setShowCreate(!showCreate);
                  setShowImport(false);
                }}
                className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
              >
                {showCreate ? "Cancel" : "+ Create"}
              </button>
            </div>
          )}
        </div>

        {showCreate && (
          <form
            onSubmit={createApp}
            className="px-3 py-2 border-b border-zinc-800 space-y-2"
          >
            <div>
              <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">
                Slug
              </label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="crm"
                pattern="[a-z][a-z0-9_]{1,31}"
                title="lowercase letters, digits and _ (2-32 chars)"
                required
                className="w-full bg-zinc-800 text-zinc-200 text-xs font-mono rounded px-2 py-1 border border-zinc-700 focus:border-zinc-500 focus:outline-none"
              />
              <p className="mt-0.5 text-[10px] text-zinc-600">
                Schema will be{" "}
                <span className="font-mono">
                  {appSchemaName(slug || "slug")}
                </span>
                . Immutable after creation.
              </p>
            </div>
            <div>
              <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">
                Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Customer CRM"
                required
                className="w-full bg-zinc-800 text-zinc-200 text-xs rounded px-2 py-1 border border-zinc-700 focus:border-zinc-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="w-full text-xs px-2 py-1 rounded bg-zinc-700 text-zinc-100 hover:bg-zinc-600 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create app"}
            </button>
          </form>
        )}

        {showImport && (
          <div className="px-3 py-2 border-b border-zinc-800 space-y-2">
            <p className="text-[10px] text-zinc-500">
              Restore a <span className="font-mono">*-backup.json</span> file as
              a new app. Leave the slug empty to keep the backup's slug.
            </p>
            <input
              value={importSlug}
              onChange={(e) => setImportSlug(e.target.value)}
              placeholder="new slug (optional)"
              pattern="[a-z][a-z0-9_]{1,31}"
              className="w-full bg-zinc-800 text-zinc-200 text-xs font-mono rounded px-2 py-1 border border-zinc-700 focus:border-zinc-500 focus:outline-none"
            />
            <label className="block">
              <span
                className={`inline-block w-full text-center text-xs px-2 py-1 rounded bg-zinc-700 text-zinc-100 hover:bg-zinc-600 cursor-pointer ${
                  importing ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                {importing ? "Importing..." : "Choose backup file..."}
              </span>
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                disabled={importing}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) importBackup(f);
                }}
              />
            </label>
          </div>
        )}

        {importSummary && (
          <div className="mx-3 mt-2 p-2 rounded bg-emerald-900/20 border border-emerald-900/40 text-emerald-400 text-xs break-words">
            {importSummary}
          </div>
        )}

        {error && (
          <div className="mx-3 mt-2 p-2 rounded bg-red-900/20 border border-red-900/40 text-red-400 text-xs break-words">
            {error}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-zinc-800/50">
          {apps.length === 0 && (
            <p className="px-3 py-6 text-xs text-zinc-500 text-center">
              {isAdmin ? (
                <>
                  No apps yet. Click <span className="font-mono">+ Create</span>{" "}
                  to add one.
                </>
              ) : (
                "You are not a member of any app yet."
              )}
            </p>
          )}
          {apps.map((app) => (
            <button
              key={app.id}
              onClick={() => setSelectedId(app.id)}
              className={`block w-full text-left px-3 py-2 transition-colors ${
                selectedId === app.id ? "bg-zinc-800" : "hover:bg-zinc-800/40"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-200 truncate">
                  {app.name}
                </span>
                {!app.enabled && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/30 text-red-400 shrink-0">
                    disabled
                  </span>
                )}
                {app.privilege && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 shrink-0">
                    {app.privilege}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[10px] text-zinc-500 font-mono truncate">
                {appSchemaName(app.slug)}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Right: details */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {selected ? (
          <AppDetail
            key={selected.id}
            client={client}
            app={selected}
            isServerAdmin={isAdmin}
            onChanged={refreshApps}
            onDeleted={async () => {
              setSelectedId(null);
              await refreshApps();
            }}
            onOpenSchema={() => setSelectedSchema(appSchemaName(selected.slug))}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
            Select an app to manage it.
          </div>
        )}
      </div>
    </div>
  );
}
