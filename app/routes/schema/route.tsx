// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
import { useState, useEffect } from "react";
import { SchemaBrowser } from "~/components/schema/schema-browser";
import type { SchemaData } from "~/components/schema/types";
import { useConnection } from "~/lib/connection-context";

const EMPTY_SCHEMA: SchemaData = {
  labels: [],
  relationshipTypes: [],
  propertyKeys: [],
  indexes: [],
  constraints: [],
};

const AUTH_LABELS = new Set(["User", "Role"]);
const AUTH_REL_TYPES = new Set(["HAS_ROLE"]);

export default function SchemaRoute() {
  const { client, status, selectedSchema } = useConnection();
  const [schema, setSchema] = useState<SchemaData>(EMPTY_SCHEMA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "connected") return;

    let cancelled = false;

    async function fetchSchema() {
      try {
        setLoading(true);
        const data = (await client.getSchema("default")) as SchemaData;
        if (!cancelled) {
          // Filter labels and relationship types by schema.
          const filtered: SchemaData = {
            ...data,
            labels: data.labels.filter((l) =>
              selectedSchema === "auth" ? AUTH_LABELS.has(l.name) : !AUTH_LABELS.has(l.name)
            ),
            relationshipTypes: data.relationshipTypes.filter((r) =>
              selectedSchema === "auth" ? AUTH_REL_TYPES.has(r.name) : !AUTH_REL_TYPES.has(r.name)
            ),
          };
          setSchema(filtered);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSchema();
    return () => { cancelled = true; };
  }, [status, client, selectedSchema]);

  if (status !== "connected") {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        Waiting for server connection...
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        Loading schema...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-400">
        Error loading schema: {error}
      </div>
    );
  }

  return (
    <div className="h-full">
      <SchemaBrowser schema={schema} />
    </div>
  );
}
