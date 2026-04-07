import { useState, useEffect } from "react";
import { GraphViewer } from "~/components/graph/graph-viewer";
import type { GraphData } from "~/components/graph/types";
import { useConnection } from "~/lib/connection-context";

export default function GraphRoute() {
  const { client, status, selectedSchema } = useConnection();
  const [data, setData] = useState<GraphData>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refreshGraph() {
    try {
      const json = await client.getGraph("default");
      setData({
        nodes: (json.nodes ?? []) as unknown as GraphData["nodes"],
        edges: (json.edges ?? []) as unknown as GraphData["edges"],
      });
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => {
    if (status !== "connected") return;
    let cancelled = false;

    setLoading(true);
    refreshGraph().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [status]);

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
        Loading graph...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-400">
        Error loading graph: {error}
      </div>
    );
  }

  if (data.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4">
        <p>Graph is empty. Create some data using the Query Editor.</p>
        <p className="text-zinc-600 text-sm">
          Example: CREATE (a:Person &#123;name: "Alice"&#125;)-[:KNOWS]-&gt;(b:Person &#123;name: "Bob"&#125;)
        </p>
      </div>
    );
  }

  async function handleExpandNeighbors(nodeId: string): Promise<GraphData> {
    const res = await client.cypher({
      query: `MATCH (n)-[r]-(m) WHERE id(n) = ${nodeId} RETURN n, r, m`,
      database: selectedSchema,
    });

    const nodes: GraphData["nodes"] = [];
    const edges: GraphData["edges"] = [];
    const seenNodes = new Set<string>();
    const seenEdges = new Set<string>();

    for (const row of res.rows) {
      for (const cell of row) {
        if (cell && typeof cell === "object" && !Array.isArray(cell)) {
          const obj = cell as Record<string, unknown>;
          if (obj._type !== undefined && obj._start !== undefined && obj._end !== undefined) {
            const eid = String(obj._id ?? "");
            if (eid && !seenEdges.has(eid)) {
              seenEdges.add(eid);
              const { _id: _, _type: __, _start: ___, _end: ____, ...rest } = obj;
              edges.push({
                id: eid,
                source: String(obj._start),
                target: String(obj._end),
                type: String(obj._type),
                properties: rest,
              });
            }
          } else if (Array.isArray(obj._labels) || Array.isArray(obj.labels)) {
            const nid = String(obj._id ?? obj.id ?? "");
            if (nid && !seenNodes.has(nid)) {
              seenNodes.add(nid);
              const labels = (Array.isArray(obj._labels) ? obj._labels : obj.labels) as string[];
              const { _id: _, _labels: __, ...rest } = obj;
              nodes.push({ id: nid, labels, properties: rest });
            }
          }
        }
      }
    }
    return { nodes, edges };
  }

  async function handleDeleteNode(nodeId: string) {
    await client.cypher({
      query: `MATCH (n) WHERE id(n) = ${nodeId} DETACH DELETE n`,
      database: selectedSchema,
    });
  }

  async function handleDeleteEdge(edgeId: string) {
    if (!confirm(`Delete relationship ${edgeId}?`)) return;
    setData((prev) => ({
      ...prev,
      edges: prev.edges.filter((e) => e.id !== edgeId),
    }));
  }

  async function handleEditProperties(id: string, kind: "node" | "edge", properties: Record<string, unknown>) {
    const setEntries = Object.entries(properties)
      .map(([k, v]) => `n.${k} = ${JSON.stringify(v)}`)
      .join(", ");
    if (!setEntries) return;

    if (kind === "node") {
      await client.cypher({
        query: `MATCH (n) WHERE id(n) = ${id} SET ${setEntries} RETURN n`,
        database: selectedSchema,
      });
    }
    await refreshGraph();
  }

  return (
    <div className="h-full">
      <GraphViewer
        initialData={data}
        onExpandNeighbors={handleExpandNeighbors}
        onDeleteNode={handleDeleteNode}
        onDeleteEdge={handleDeleteEdge}
        onEditProperties={handleEditProperties}
      />
    </div>
  );
}
