import { useState, useCallback, useEffect } from "react";
import { useConnection } from "~/lib/connection-context";
import type { DocumentResponse, DocumentQueryResponse, CypherResult } from "~/lib/api-client";

interface CollectionEntry {
  name: string;
}

export default function DocumentsRoute() {
  const { client, status, selectedSchema, isAdmin, userRoles } = useConnection();
  const canWrite = isAdmin || userRoles.includes("editor");

  // Collection management
  const [collections, setCollections] = useState<CollectionEntry[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);

  // Load collections and sync rules from server on mount.
  useEffect(() => {
    if (status !== "connected") return;
    let cancelled = false;
    setCollectionsLoading(true);
    client
      .listCollections()
      .then((colls) => {
        if (!cancelled) {
          const filtered = colls.filter((c) => {
            if (selectedSchema === "auth") return c.name.startsWith("auth.");
            return !c.name.includes(".");
          });
          setCollections(
            filtered.map((c) => ({ name: c.name })).sort((a, b) => a.name.localeCompare(b.name))
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCollectionsLoading(false);
      });
    // Reset selection when schema changes.
    setSelectedCollection(null);
    setDocuments([]);
    setSelectedDoc(null);
    refreshSyncRules();
    return () => {
      cancelled = true;
    };
  }, [client, status, selectedSchema]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [collectionError, setCollectionError] = useState<string | null>(null);

  // Document browsing
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [docCursor, setDocCursor] = useState<string | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  // Document viewer/editor
  const [selectedDoc, setSelectedDoc] = useState<DocumentResponse | null>(null);
  const [editMode, setEditMode] = useState<"view" | "create" | "edit">("view");
  const [editDocId, setEditDocId] = useState("");
  const [editDocBody, setEditDocBody] = useState("{}");
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Sync rules
  const [syncRules, setSyncRules] = useState<Array<Record<string, unknown>>>([]);
  const [syncLabel, setSyncLabel] = useState("");
  const [syncCollection, setSyncCollection] = useState("");
  const [syncKey, setSyncKey] = useState("");
  const [syncInclude, setSyncInclude] = useState("");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncOpen, setSyncOpen] = useState(true);

  const PAGE_SIZE = 20;

  // -- Collection actions --

  async function refreshCollections() {
    if (status !== "connected") return;
    try {
      const colls = await client.listCollections();
      const filtered = colls.filter((c) => {
        if (selectedSchema === "auth") return c.name.startsWith("auth.");
        return !c.name.includes(".");
      });
      setCollections(
        filtered.map((c) => ({ name: c.name })).sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch {
      // Silently ignore — collections will show as empty.
    }
  }

  async function handleCreateCollection() {
    if (!newCollectionName.trim() || status !== "connected") return;
    setCollectionError(null);
    try {
      const fullName = selectedSchema === "public"
        ? newCollectionName.trim()
        : `${selectedSchema}.${newCollectionName.trim()}`;
      await client.createCollection(fullName);
      setNewCollectionName("");
      await refreshCollections();
    } catch (e) {
      setCollectionError(String(e));
    }
  }

  async function handleDropCollection(name: string) {
    if (status !== "connected") return;
    if (!confirm(`Drop collection "${name}"? This will delete all its documents.`)) return;
    setCollectionError(null);
    try {
      await client.dropCollection(name);
      if (selectedCollection === name) {
        setSelectedCollection(null);
        setDocuments([]);
        setDocCursor(null);
        setSelectedDoc(null);
      }
      await refreshCollections();
    } catch (e) {
      setCollectionError(String(e));
    }
  }

  // -- Sync rule actions --

  async function refreshSyncRules() {
    if (status !== "connected") return;
    try {
      const res = await client.cypher({ query: "SHOW SYNC RULES" });
      const rules = res.rows.map((row) => {
        const obj: Record<string, unknown> = {};
        res.columns.forEach((col, i) => { obj[col] = row[i]; });
        return obj;
      });
      const filtered = rules.filter((r) => {
        const coll = String(r.collection ?? "");
        if (selectedSchema === "auth") return coll.startsWith("auth.");
        return !coll.startsWith("auth.");
      });
      setSyncRules(filtered);
    } catch {
      setSyncRules([]);
    }
  }

  async function handleCreateSyncRule() {
    if (!syncLabel.trim() || !syncCollection.trim() || !syncKey.trim() || status !== "connected") return;
    setSyncError(null);
    try {
      let query = `SYNC LABEL ${syncLabel.trim()} TO COLLECTION ${syncCollection.trim()} KEY ${syncKey.trim()}`;
      if (syncInclude.trim()) {
        query += ` INCLUDE ${syncInclude.trim()}`;
      }
      await client.cypher({ query });
      setSyncLabel("");
      setSyncCollection("");
      setSyncKey("");
      setSyncInclude("");
      await refreshSyncRules();
      await refreshCollections();
    } catch (e) {
      setSyncError(String(e));
    }
  }

  async function handleDropSyncRule(id: unknown) {
    if (status !== "connected") return;
    if (!confirm(`Drop sync rule #${id}?`)) return;
    setSyncError(null);
    try {
      await client.cypher({ query: `DROP SYNC RULE ${id}` });
      await refreshSyncRules();
    } catch (e) {
      setSyncError(String(e));
    }
  }

  function handleAddExistingCollection() {
    if (!newCollectionName.trim()) return;
    const name = newCollectionName.trim();
    setCollections((prev) =>
      prev.some((c) => c.name === name) ? prev : [...prev, { name }].sort((a, b) => a.name.localeCompare(b.name))
    );
    setNewCollectionName("");
  }

  // -- Document browsing --

  const loadDocuments = useCallback(
    async (collection: string, cursor?: string) => {
      if (status !== "connected") return;
      setDocLoading(true);
      setDocError(null);
      try {
        const res: DocumentQueryResponse = await client.scanDocuments(collection, {
          limit: PAGE_SIZE,
          cursor: cursor || undefined,
        });
        if (cursor) {
          setDocuments((prev) => [...prev, ...res.documents]);
        } else {
          setDocuments(res.documents);
        }
        setDocCursor(res.cursor);
      } catch (e) {
        setDocError(String(e));
      } finally {
        setDocLoading(false);
      }
    },
    [client, status]
  );

  function handleSelectCollection(name: string) {
    setSelectedCollection(name);
    setSelectedDoc(null);
    setEditMode("view");
    setDocuments([]);
    setDocCursor(null);
    loadDocuments(name);
  }

  function handleLoadMore() {
    if (selectedCollection && docCursor) {
      loadDocuments(selectedCollection, docCursor);
    }
  }

  // -- Document CRUD --

  function handleViewDoc(doc: DocumentResponse) {
    setSelectedDoc(doc);
    setEditMode("view");
    setEditDocId(doc.key);
    setEditDocBody(JSON.stringify(doc.body, null, 2));
    setEditError(null);
  }

  function handleStartCreate() {
    setSelectedDoc(null);
    setEditMode("create");
    setEditDocId("");
    setEditDocBody("{\n  \n}");
    setEditError(null);
  }

  function handleStartEdit() {
    if (!selectedDoc) return;
    setEditMode("edit");
    setEditDocId(selectedDoc.key);
    setEditDocBody(JSON.stringify(selectedDoc.body, null, 2));
    setEditError(null);
  }

  async function handleSaveDocument() {
    if (!selectedCollection || status !== "connected") return;
    if (!editDocId.trim()) {
      setEditError("Document ID is required.");
      return;
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(editDocBody);
    } catch {
      setEditError("Invalid JSON body.");
      return;
    }

    setEditSaving(true);
    setEditError(null);
    try {
      const doc = await client.putDocument(selectedCollection, editDocId.trim(), parsed);
      setSelectedDoc(doc);
      setEditMode("view");
      setEditDocBody(JSON.stringify(doc.body, null, 2));
      // Refresh the list
      loadDocuments(selectedCollection);
    } catch (e) {
      setEditError(String(e));
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDeleteDocument(doc: DocumentResponse) {
    if (!selectedCollection || status !== "connected") return;
    if (!confirm(`Delete document "${doc.key}"?`)) return;
    try {
      await client.deleteDocument(selectedCollection, doc.key);
      setDocuments((prev) => prev.filter((d) => d.key !== doc.key));
      if (selectedDoc?.key === doc.key) {
        setSelectedDoc(null);
        setEditMode("view");
      }
    } catch (e) {
      setDocError(String(e));
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
    <div className="flex h-full bg-zinc-950 text-zinc-100">
      {/* Left panel: Collections */}
      <div className="w-64 flex-shrink-0 border-r border-zinc-800 flex flex-col">
        <div className="p-3 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-300 mb-2">Collections</h2>
          {canWrite ? (
            <>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateCollection();
                  }}
                  placeholder="Collection name..."
                  className="flex-1 min-w-0 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-1.5 mt-1.5">
                <button
                  onClick={handleCreateCollection}
                  disabled={!newCollectionName.trim()}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-xs font-medium rounded transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={handleAddExistingCollection}
                  disabled={!newCollectionName.trim()}
                  className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-200 text-xs font-medium rounded transition-colors"
                >
                  Add Existing
                </button>
              </div>
              {collectionError && (
                <p className="mt-1.5 text-xs text-red-400 break-words">{collectionError}</p>
              )}
            </>
          ) : (
            <p className="text-xs text-zinc-600">Read-only access</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {collections.length === 0 && (
            <p className="px-3 py-4 text-xs text-zinc-600 text-center">
              No collections added yet. Enter a name above to create or add an existing collection.
            </p>
          )}
          {collections.map((col) => (
            <div
              key={col.name}
              className={`flex items-center justify-between px-3 py-1.5 text-sm cursor-pointer group transition-colors ${
                selectedCollection === col.name
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
              onClick={() => handleSelectCollection(col.name)}
            >
              <span className="truncate font-mono text-xs">{col.name}</span>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(`CREATE COLLECTION ${col.name}`);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-200 px-1 transition-opacity"
                  title="Copy CREATE COLLECTION statement"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                    <path d="M5.5 3.5A1.5 1.5 0 0 1 7 2h5.5A1.5 1.5 0 0 1 14 3.5V11a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 11V3.5Z" />
                    <path d="M3 5a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 3 14h6a1.5 1.5 0 0 0 1.5-1.5V13H7a2.5 2.5 0 0 1-2.5-2.5V5H3Z" />
                  </svg>
                </button>
                {canWrite && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDropCollection(col.name);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 text-xs px-1 transition-opacity"
                    title="Drop collection"
                  >
                    Drop
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Sync Rules section — only visible for admin/editor */}
        {canWrite && (
          <div className="border-t border-zinc-800">
            <button
              onClick={() => setSyncOpen(!syncOpen)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200"
            >
              <span>Sync Rules ({syncRules.length})</span>
              <span>{syncOpen ? "−" : "+"}</span>
            </button>

            {syncOpen && (
              <div className="px-3 pb-3 space-y-2">
                {/* Existing rules */}
                {syncRules.length === 0 && (
                  <p className="text-[11px] text-zinc-600 italic">No sync rules defined</p>
                )}
                {syncRules.map((rule) => (
                  <div
                    key={String(rule.id)}
                    className="group flex items-start justify-between bg-zinc-900 rounded px-2 py-1.5 text-[11px]"
                  >
                    <div className="min-w-0">
                      <div className="text-zinc-300 font-mono">
                        :{String(rule.label)} → {String(rule.collection)}
                      </div>
                      <div className="text-zinc-500">
                        key={String(rule.key_property)}{" "}
                        {rule.include && rule.include !== "*" ? `include=${String(rule.include)}` : "(all props)"}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => {
                          const include = rule.include && rule.include !== "*" ? ` INCLUDE ${String(rule.include)}` : "";
                          const query = `SYNC LABEL ${String(rule.label)} TO COLLECTION ${String(rule.collection)} KEY ${String(rule.key_property)}${include}`;
                          navigator.clipboard.writeText(query);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-200 px-1 transition-opacity"
                        title="Copy SYNC LABEL statement"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                          <path d="M5.5 3.5A1.5 1.5 0 0 1 7 2h5.5A1.5 1.5 0 0 1 14 3.5V11a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 11V3.5Z" />
                          <path d="M3 5a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 3 14h6a1.5 1.5 0 0 0 1.5-1.5V13H7a2.5 2.5 0 0 1-2.5-2.5V5H3Z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDropSyncRule(rule.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 px-1 transition-opacity"
                      >
                        Drop
                      </button>
                    </div>
                  </div>
                ))}

                {/* Create new rule form */}
                <div className="space-y-1 pt-1 border-t border-zinc-800">
                  <p className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider">New Sync Rule</p>
                  <input
                    type="text"
                    value={syncLabel}
                    onChange={(e) => setSyncLabel(e.target.value)}
                    placeholder="Label (e.g. Person)"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[11px] text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    value={syncCollection}
                    onChange={(e) => setSyncCollection(e.target.value)}
                    placeholder="Collection (e.g. persons)"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[11px] text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    value={syncKey}
                    onChange={(e) => setSyncKey(e.target.value)}
                    placeholder="Key property (e.g. name)"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[11px] text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    value={syncInclude}
                    onChange={(e) => setSyncInclude(e.target.value)}
                    placeholder="Include props (e.g. name, email) or blank for all"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[11px] text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleCreateSyncRule}
                    disabled={!syncLabel.trim() || !syncCollection.trim() || !syncKey.trim()}
                    className="w-full px-2 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-xs font-medium rounded transition-colors"
                  >
                    Create Sync Rule
                  </button>
                  {syncError && <p className="text-red-400 text-[11px]">{syncError}</p>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right panel: Document browser + viewer */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedCollection ? (
          <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
            Select or create a collection to browse documents.
          </div>
        ) : (
          <>
            {/* Document list header */}
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-200">
                <span className="text-zinc-500">Documents in</span>{" "}
                <span className="font-mono">{selectedCollection}</span>
              </h2>
              <button
                onClick={handleStartCreate}
                className="ml-auto px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded transition-colors"
              >
                New Document
              </button>
              <button
                onClick={() => loadDocuments(selectedCollection)}
                disabled={docLoading}
                className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs font-medium rounded transition-colors disabled:opacity-50"
              >
                Refresh
              </button>
            </div>

            <div className="flex-1 flex min-h-0">
              {/* Document list */}
              <div className="w-80 flex-shrink-0 border-r border-zinc-800 overflow-y-auto">
                {docError && (
                  <div className="m-2 p-2 bg-red-900/30 border border-red-800 rounded text-red-300 text-xs">
                    {docError}
                  </div>
                )}

                {documents.length === 0 && !docLoading && !docError && (
                  <p className="px-3 py-4 text-xs text-zinc-600 text-center">
                    No documents found.
                  </p>
                )}

                {documents.map((doc) => (
                  <div
                    key={doc.key}
                    className={`flex items-center justify-between px-3 py-2 border-b border-zinc-800/50 cursor-pointer group transition-colors ${
                      selectedDoc?.key === doc.key
                        ? "bg-zinc-800"
                        : "hover:bg-zinc-900/50"
                    }`}
                    onClick={() => handleViewDoc(doc)}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-mono text-zinc-200 truncate">{doc.key}</div>
                      <div className="text-xs text-zinc-600 truncate">
                        v{doc.version} &middot; {new Date(doc.updated_at).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDocument(doc);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 text-xs px-1 flex-shrink-0 transition-opacity"
                      title="Delete document"
                    >
                      Del
                    </button>
                  </div>
                ))}

                {docLoading && (
                  <p className="px-3 py-3 text-xs text-zinc-500 text-center">Loading...</p>
                )}

                {docCursor && !docLoading && (
                  <button
                    onClick={handleLoadMore}
                    className="w-full px-3 py-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-zinc-900/50 transition-colors"
                  >
                    Load more...
                  </button>
                )}
              </div>

              {/* Document viewer/editor */}
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {editMode === "view" && !selectedDoc && (
                  <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
                    Select a document to view, or create a new one.
                  </div>
                )}

                {editMode === "view" && selectedDoc && (
                  <div className="flex flex-col h-full">
                    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800">
                      <span className="text-sm font-mono text-zinc-200">{selectedDoc.key}</span>
                      <span className="text-xs text-zinc-600">
                        v{selectedDoc.version} &middot; updated {new Date(selectedDoc.updated_at).toLocaleString()}
                      </span>
                      <button
                        onClick={handleStartEdit}
                        className="ml-auto px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs font-medium rounded transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="flex-1 overflow-auto p-4">
                      <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap break-words">
                        {JSON.stringify(selectedDoc.body, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {(editMode === "create" || editMode === "edit") && (
                  <div className="flex flex-col h-full">
                    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800">
                      <span className="text-sm font-semibold text-zinc-200">
                        {editMode === "create" ? "Create Document" : "Edit Document"}
                      </span>
                      <button
                        onClick={() => {
                          setEditMode("view");
                          setEditError(null);
                        }}
                        className="ml-auto px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs font-medium rounded transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveDocument}
                        disabled={editSaving}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-xs font-medium rounded transition-colors"
                      >
                        {editSaving ? "Saving..." : "Save"}
                      </button>
                    </div>

                    <div className="px-4 pt-3">
                      <label className="text-xs text-zinc-500 block mb-1">Document ID</label>
                      <input
                        type="text"
                        value={editDocId}
                        onChange={(e) => setEditDocId(e.target.value)}
                        disabled={editMode === "edit"}
                        placeholder="Enter document ID..."
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 font-mono text-sm text-zinc-100 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                      />
                    </div>

                    <div className="flex-1 flex flex-col px-4 pt-3 pb-4 min-h-0">
                      <label className="text-xs text-zinc-500 block mb-1">Body (JSON)</label>
                      <textarea
                        value={editDocBody}
                        onChange={(e) => setEditDocBody(e.target.value)}
                        className="flex-1 w-full bg-zinc-900 border border-zinc-700 rounded p-3 font-mono text-sm text-zinc-100 resize-none focus:outline-none focus:border-blue-500"
                        spellCheck={false}
                      />
                    </div>

                    {editError && (
                      <div className="mx-4 mb-3 p-2 bg-red-900/30 border border-red-800 rounded text-red-300 text-xs">
                        {editError}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
