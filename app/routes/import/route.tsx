// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
import { useState, useRef } from "react";
import { useConnection } from "~/lib/connection-context";

interface ImportResult {
  total: number;
  success: number;
  nodesCreated?: number;
  relationshipsCreated?: number;
  errors: Array<{
    statement: number;
    status: number;
    error: string;
    query: string;
  }>;
}

export default function ImportRoute() {
  const { client, status } = useConnection();
  const [script, setScript] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    setScript(text);
    setResult(null);
    setError(null);
  }

  async function handleImport() {
    if (status !== "connected" || !script.trim()) return;
    setImporting(true);
    setError(null);
    setResult(null);
    try {
      const resp = await fetch(`${client.baseUrl}/db/import/cypher`, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          ...(client.authToken
            ? { Authorization: `Bearer ${client.authToken}` }
            : {}),
        },
        body: script,
      });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
      }
      const data: ImportResult = await resp.json();
      setResult(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setImporting(false);
    }
  }

  // Count statements for preview.
  const stmtCount = script
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("//")).length;

  if (status !== "connected") {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        Waiting for server connection...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 overflow-y-auto">
      <div className="border-b border-zinc-800 px-6 py-4">
        <h1 className="text-lg font-semibold">Import</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Import data from Cypher script files.
        </p>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {/* File upload */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
            Cypher Script Import
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4 space-y-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => fileRef.current?.click()}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium rounded-md border border-zinc-700 transition-colors"
              >
                Choose File
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch("/cyphers/tests.cypher");
                    const text = await res.text();
                    setScript(text);
                    setFileName("tests.cypher");
                    setResult(null);
                    setError(null);
                  } catch {
                    setError("Failed to load sample data");
                  }
                }}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium rounded-md border border-zinc-700 transition-colors"
              >
                Load Sample Data
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".cypher,.cql,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
              <span className="text-sm text-zinc-400">
                {fileName ?? "No file selected"}
              </span>
              {stmtCount > 0 && (
                <span className="text-xs text-zinc-500 ml-auto">
                  ~{stmtCount} statement{stmtCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">
                Or paste Cypher script directly
              </label>
              <textarea
                value={script}
                onChange={(e) => {
                  setScript(e.target.value);
                  setResult(null);
                  setError(null);
                }}
                rows={12}
                placeholder={`// Paste Cypher statements here\nCREATE (a:Person {name: "Alice"});\nCREATE (b:Person {name: "Bob"});\nCREATE (a)-[:KNOWS]->(b);`}
                spellCheck={false}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-md p-3 font-mono text-xs text-zinc-100 resize-y focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleImport}
                disabled={importing || !script.trim()}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-md transition-colors"
              >
                {importing ? "Importing..." : "Import"}
              </button>
              {importing && (
                <span className="text-sm text-zinc-400">
                  Executing statements...
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-md p-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <section>
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
              Import Result
            </h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4 space-y-4">
              <div className="flex gap-8">
                <div>
                  <p className="text-xs text-zinc-500">Statements</p>
                  <p className="text-2xl font-bold text-zinc-200">
                    {result.success}/{result.total}
                  </p>
                </div>
                {((result.nodesCreated ?? 0) > 0 || (result.relationshipsCreated ?? 0) > 0) && (
                  <>
                    <div>
                      <p className="text-xs text-zinc-500">Nodes Created</p>
                      <p className="text-2xl font-bold text-emerald-400">
                        {result.nodesCreated || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Relationships Created</p>
                      <p className="text-2xl font-bold text-emerald-400">
                        {result.relationshipsCreated || 0}
                      </p>
                    </div>
                  </>
                )}
                {result.errors.length > 0 && (
                  <div>
                    <p className="text-xs text-zinc-500">Failed</p>
                    <p className="text-2xl font-bold text-red-400">
                      {result.errors.length}
                    </p>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              <div className="w-full bg-zinc-800 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    result.errors.length > 0
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{
                    width: `${result.total > 0 ? (result.success / result.total) * 100 : 0}%`,
                  }}
                />
              </div>

              {/* Errors table */}
              {result.errors.length > 0 && (
                <div className="overflow-x-auto rounded-md border border-zinc-800">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-zinc-950 border-b border-zinc-800">
                        <th className="text-left px-3 py-2 text-zinc-400 font-medium">
                          #
                        </th>
                        <th className="text-left px-3 py-2 text-zinc-400 font-medium">
                          Error
                        </th>
                        <th className="text-left px-3 py-2 text-zinc-400 font-medium">
                          Statement
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.errors.map((err, i) => (
                        <tr
                          key={i}
                          className="border-b border-zinc-800/50 bg-red-950/10"
                        >
                          <td className="px-3 py-1.5 text-xs text-zinc-500">
                            {err.statement}
                          </td>
                          <td className="px-3 py-1.5 text-xs text-red-400">
                            {err.error}
                          </td>
                          <td
                            className="px-3 py-1.5 text-xs font-mono text-zinc-400 max-w-96 truncate"
                            title={err.query}
                          >
                            {err.query}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
