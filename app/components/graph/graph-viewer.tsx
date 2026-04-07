// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import type { GraphNode, GraphEdge, GraphData, VisConfig } from "./types";
import { DEFAULT_VIS_CONFIG } from "./types";
import { GraphCanvas } from "./graph-canvas";
import { GraphToolbar } from "./graph-toolbar";
import { NodeInspector } from "./node-inspector";
import { StyleConfigPanel } from "./style-config-panel";
import { EditModal } from "./edit-modal";
import { loadSettings, saveSettings } from "~/components/settings/types";

interface GraphViewerProps {
  initialData: GraphData;
  onExpandNeighbors?: (nodeId: string) => Promise<GraphData>;
  onDeleteNode?: (nodeId: string) => Promise<void>;
  onDeleteEdge?: (edgeId: string) => Promise<void>;
  onEditProperties?: (id: string, kind: "node" | "edge", properties: Record<string, unknown>) => Promise<void>;
}

export function GraphViewer({
  initialData,
  onExpandNeighbors,
  onDeleteNode,
  onDeleteEdge,
  onEditProperties,
}: GraphViewerProps) {
  const [config, setConfig] = useState<VisConfig>(() => {
    const saved = loadSettings();
    return {
      ...DEFAULT_VIS_CONFIG,
      layout: saved.graphDefaults.layout,
      maxNodes: saved.graphDefaults.maxNodes,
      nodeStyle: {
        ...DEFAULT_VIS_CONFIG.nodeStyle,
        sizeProperty: saved.graphDefaults.sizeProperty,
        captionProperty: saved.graphDefaults.captionProperty,
      },
      edgeStyle: {
        ...DEFAULT_VIS_CONFIG.edgeStyle,
        thicknessProperty: saved.graphDefaults.thicknessProperty,
      },
      captionByLabel: saved.graphDefaults.captionByLabel ?? {},
    };
  });
  const [nodes, setNodes] = useState<GraphNode[]>(() => initialData.nodes);
  const [edges, setEdges] = useState<GraphEdge[]>(() => initialData.edges);
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [inspectedNode, setInspectedNode] = useState<GraphNode | null>(null);
  const [inspectedEdge, setInspectedEdge] = useState<GraphEdge | null>(null);
  const [hiddenNodes, setHiddenNodes] = useState<Set<string>>(new Set());
  const [styleOpen, setStyleOpen] = useState(false);
  // Persist config changes to localStorage.
  useEffect(() => {
    const settings = loadSettings();
    settings.graphDefaults = {
      ...settings.graphDefaults,
      layout: config.layout,
      maxNodes: config.maxNodes,
      sizeProperty: config.nodeStyle.sizeProperty,
      captionProperty: config.nodeStyle.captionProperty,
      thicknessProperty: config.edgeStyle.thicknessProperty,
      captionByLabel: config.captionByLabel,
    };
    saveSettings(settings);
  }, [config]);

  const [editingNode, setEditingNode] = useState<GraphNode | null>(null);
  const [editingEdge, setEditingEdge] = useState<GraphEdge | null>(null);

  const fitRef = useRef<(() => void) | null>(null);
  const exportPngRef = useRef<(() => void) | null>(null);
  const exportSvgRef = useRef<(() => void) | null>(null);

  // Apply max-node limit and hidden filter.
  const visibleNodes = useMemo(() => {
    const filtered = nodes.filter((n) => !hiddenNodes.has(n.id));
    return filtered.slice(0, config.maxNodes);
  }, [nodes, hiddenNodes, config.maxNodes]);

  const maxReached = nodes.filter((n) => !hiddenNodes.has(n.id)).length > config.maxNodes;

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);

  const visibleEdges = useMemo(
    () =>
      edges.filter((e) => {
        const sid = typeof e.source === "string" ? e.source : e.source.id;
        const tid = typeof e.target === "string" ? e.target : e.target.id;
        return visibleNodeIds.has(sid) && visibleNodeIds.has(tid);
      }),
    [edges, visibleNodeIds],
  );

  // Collect all property keys for style config.
  const propertyKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const n of nodes) Object.keys(n.properties).forEach((k) => keys.add(k));
    for (const e of edges) Object.keys(e.properties).forEach((k) => keys.add(k));
    return [...keys].sort();
  }, [nodes, edges]);

  // Selection handlers.
  const handleSelectNode = useCallback((id: string | null, add?: boolean) => {
    if (id === null) {
      setSelectedNodes(new Set());
      setInspectedNode(null);
      return;
    }
    // Clear inspected edge so the panel shows the node.
    setInspectedEdge(null);
    setSelectedNodes((prev) => {
      const next = new Set(add ? prev : []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectEdge = useCallback((_id: string | null) => {
    if (!_id) {
      setInspectedEdge(null);
    } else {
      // Clear inspected node so the panel shows the edge.
      setInspectedNode(null);
    }
  }, []);

  // Expand neighbors.
  const handleExpand = useCallback(
    async (nodeId: string) => {
      if (!onExpandNeighbors) return;
      const data = await onExpandNeighbors(nodeId);
      setNodes((prev) => {
        const existing = new Set(prev.map((n) => n.id));
        return [...prev, ...data.nodes.filter((n) => !existing.has(n.id))];
      });
      setEdges((prev) => {
        const existing = new Set(prev.map((e) => e.id));
        return [...prev, ...data.edges.filter((e) => !existing.has(e.id))];
      });
    },
    [onExpandNeighbors],
  );

  // Hide node.
  const handleHide = useCallback((nodeId: string) => {
    setHiddenNodes((prev) => new Set(prev).add(nodeId));
    setInspectedNode(null);
  }, []);

  // Delete node.
  const handleDeleteNode = useCallback(
    async (nodeId: string) => {
      if (!confirm(`Delete node ${nodeId} and all its relationships?`)) return;
      try {
        if (onDeleteNode) await onDeleteNode(nodeId);
      } catch {
        return; // API error — don't remove from canvas
      }
      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
      setEdges((prev) =>
        prev.filter((e) => {
          const sid = typeof e.source === "string" ? e.source : e.source.id;
          const tid = typeof e.target === "string" ? e.target : e.target.id;
          return sid !== nodeId && tid !== nodeId;
        }),
      );
      setInspectedNode(null);
    },
    [onDeleteNode],
  );

  // Delete edge.
  const handleDeleteEdge = useCallback(
    async (edgeId: string) => {
      if (onDeleteEdge) await onDeleteEdge(edgeId);
      setEdges((prev) => prev.filter((e) => e.id !== edgeId));
      setInspectedEdge(null);
    },
    [onDeleteEdge],
  );

  // Edit save handler.
  const handleEditSave = useCallback(
    async (id: string, kind: "node" | "edge", properties: Record<string, unknown>) => {
      if (onEditProperties) await onEditProperties(id, kind, properties);
      if (kind === "node") {
        setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, properties } : n)));
      } else {
        setEdges((prev) => prev.map((e) => (e.id === id ? { ...e, properties } : e)));
      }
    },
    [onEditProperties],
  );

  return (
    <div className="flex flex-col h-full relative">
      <GraphToolbar
        config={config}
        onConfigChange={setConfig}
        onFitToScreen={() => fitRef.current?.()}
        onExportPng={() => exportPngRef.current?.()}
        onExportSvg={() => exportSvgRef.current?.()}
        nodeCount={visibleNodes.length}
        edgeCount={visibleEdges.length}
        maxReached={maxReached}
      />

      <div className="flex flex-1 min-h-0 relative">
        <StyleConfigPanel
          config={config}
          onChange={setConfig}
          propertyKeys={propertyKeys}
          open={styleOpen}
          onClose={() => setStyleOpen(false)}
        />

        <GraphCanvas
          nodes={visibleNodes}
          edges={visibleEdges}
          config={config}
          selectedNodes={selectedNodes}
          onSelectNode={handleSelectNode}
          onSelectEdge={handleSelectEdge}
          onExpandNode={handleExpand}
          onHideNode={handleHide}
          onDeleteNode={handleDeleteNode}
          onDeleteEdge={handleDeleteEdge}
          onInspectNode={setInspectedNode}
          onInspectEdge={setInspectedEdge}
          onEditNode={onEditProperties ? setEditingNode : undefined}
          onEditEdge={onEditProperties ? setEditingEdge : undefined}
          onFitRef={fitRef}
          onExportPngRef={exportPngRef}
          onExportSvgRef={exportSvgRef}
        />

        <NodeInspector
          node={inspectedNode}
          edge={inspectedEdge}
          onClose={() => {
            setInspectedNode(null);
            setInspectedEdge(null);
          }}
          onExpand={onExpandNeighbors ? handleExpand : undefined}
          onDelete={(id, kind) =>
            kind === "node" ? handleDeleteNode(id) : handleDeleteEdge(id)
          }
          config={config}
          onConfigChange={setConfig}
          allPropertyKeys={propertyKeys}
        />
      </div>

      {/* Style toggle button */}
      {!styleOpen && (
        <button
          onClick={() => setStyleOpen(true)}
          className="absolute bottom-2 right-2 z-20 text-[11px] px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
        >
          Style
        </button>
      )}

      {/* Edit modal */}
      {(editingNode || editingEdge) && (
        <EditModal
          node={editingNode}
          edge={editingEdge}
          onSave={handleEditSave}
          onClose={() => {
            setEditingNode(null);
            setEditingEdge(null);
          }}
        />
      )}
    </div>
  );
}
