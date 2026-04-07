// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
import { useState } from "react";
import type { QueryResult } from "./types";

interface JsonViewProps {
  result: QueryResult;
}

export function JsonView({ result }: JsonViewProps) {
  // Convert columnar rows into array of objects for readability.
  const data = result.rows.map((row) => {
    const obj: Record<string, unknown> = {};
    result.columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });

  return (
    <div className="h-full overflow-auto p-3">
      <JsonNode value={data} name="results" defaultOpen />
    </div>
  );
}

interface JsonNodeProps {
  value: unknown;
  name?: string;
  defaultOpen?: boolean;
}

function JsonNode({ value, name, defaultOpen = false }: JsonNodeProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (value === null || value === undefined) {
    return (
      <span className="text-xs font-mono">
        {name && <span className="text-zinc-500">{name}: </span>}
        <span className="text-zinc-600 italic">null</span>
      </span>
    );
  }

  if (typeof value === "boolean") {
    return (
      <span className="text-xs font-mono">
        {name && <span className="text-zinc-500">{name}: </span>}
        <span className="text-amber-400">{value ? "true" : "false"}</span>
      </span>
    );
  }

  if (typeof value === "number") {
    return (
      <span className="text-xs font-mono">
        {name && <span className="text-zinc-500">{name}: </span>}
        <span className="text-blue-400">{value}</span>
      </span>
    );
  }

  if (typeof value === "string") {
    return (
      <span className="text-xs font-mono">
        {name && <span className="text-zinc-500">{name}: </span>}
        <span className="text-green-400">"{value}"</span>
      </span>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <span className="text-xs font-mono">
          {name && <span className="text-zinc-500">{name}: </span>}
          <span className="text-zinc-600">[]</span>
        </span>
      );
    }
    return (
      <div className="text-xs font-mono">
        <span
          className="cursor-pointer text-zinc-500 hover:text-zinc-300 select-none"
          onClick={() => setOpen(!open)}
        >
          {open ? "\u25BC" : "\u25B6"} {name && <>{name}: </>}
          <span className="text-zinc-600">[{value.length}]</span>
        </span>
        {open && (
          <div className="ml-4 border-l border-zinc-800 pl-2 mt-0.5 space-y-0.5">
            {value.map((item, i) => (
              <div key={i}>
                <JsonNode value={item} name={String(i)} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return (
        <span className="text-xs font-mono">
          {name && <span className="text-zinc-500">{name}: </span>}
          <span className="text-zinc-600">{"{}"}</span>
        </span>
      );
    }
    return (
      <div className="text-xs font-mono">
        <span
          className="cursor-pointer text-zinc-500 hover:text-zinc-300 select-none"
          onClick={() => setOpen(!open)}
        >
          {open ? "\u25BC" : "\u25B6"} {name && <>{name}: </>}
          <span className="text-zinc-600">
            {"{"}
            {entries.length}
            {"}"}
          </span>
        </span>
        {open && (
          <div className="ml-4 border-l border-zinc-800 pl-2 mt-0.5 space-y-0.5">
            {entries.map(([key, val]) => (
              <div key={key}>
                <JsonNode value={val} name={key} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <span className="text-xs font-mono text-zinc-400">
      {name && <span className="text-zinc-500">{name}: </span>}
      {String(value)}
    </span>
  );
}
