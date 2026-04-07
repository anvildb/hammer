// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
import { useEffect, useRef, useCallback } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceRadial,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import type { GraphNode, GraphEdge, LayoutAlgorithm } from "./types";

interface UseGraphSimulationOptions {
  nodes: GraphNode[];
  edges: GraphEdge[];
  layout: LayoutAlgorithm;
  width: number;
  height: number;
  onTick: () => void;
  /** When set, pull neighbors of this node closer and push others away. */
  focusNodeId?: string | null;
}

export function useGraphSimulation({
  nodes,
  edges,
  layout,
  width,
  height,
  onTick,
  focusNodeId,
}: UseGraphSimulationOptions) {
  const simRef = useRef<Simulation<SimulationNodeDatum, SimulationLinkDatum<SimulationNodeDatum>> | null>(null);
  const prevFocusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!width || !height || nodes.length === 0) return;

    if (layout !== "force") {
      applyStaticLayout(nodes, edges, layout, width, height);
      onTick();
      return;
    }

    const sim = forceSimulation(nodes as unknown as SimulationNodeDatum[])
      .force(
        "link",
        forceLink(edges as unknown as SimulationLinkDatum<SimulationNodeDatum>[])
          .id((d: unknown) => (d as GraphNode).id)
          .distance(120)
      )
      .force("charge", forceManyBody().strength(-300))
      .force("center", forceCenter(width / 2, height / 2))
      .force("collide", forceCollide(30))
      .on("tick", onTick);

    simRef.current = sim;

    return () => {
      sim.stop();
      simRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, layout, width, height]);

  // When a node is focused, pin it and pull neighbors into a tight orbit.
  useEffect(() => {
    const sim = simRef.current;
    if (!sim) return;

    // Always unpin all nodes first (clears previous focus pins).
    for (const node of nodes) {
      if (node.fx !== undefined) {
        node.fx = undefined as unknown as number;
        node.fy = undefined as unknown as number;
      }
    }

    if (!focusNodeId) {
      prevFocusRef.current = null;
      // Restore defaults — remove focus forces.
      sim.force("focusRadial", null);
      const linkForce = sim.force("link") as ReturnType<typeof forceLink> | undefined;
      linkForce?.distance(120).strength(1 / 3);
      (sim.force("charge") as ReturnType<typeof forceManyBody> | undefined)?.strength(-300);
      sim.alpha(0.3).restart();
      return;
    }

    // Find the focused node and pin it in place.
    const focusNode = nodes.find((n) => n.id === focusNodeId);
    if (!focusNode) return;
    const fx = focusNode.x ?? width / 2;
    const fy = focusNode.y ?? height / 2;
    focusNode.fx = fx;
    focusNode.fy = fy;
    prevFocusRef.current = focusNodeId;

    // Build neighbor list (ordered) and target positions evenly around circle.
    const neighborList: string[] = [];
    const neighborSet = new Set<string>();
    for (const edge of edges) {
      const sid = typeof edge.source === "string" ? edge.source : edge.source.id;
      const tid = typeof edge.target === "string" ? edge.target : edge.target.id;
      if (sid === focusNodeId && !neighborSet.has(tid)) { neighborSet.add(tid); neighborList.push(tid); }
      if (tid === focusNodeId && !neighborSet.has(sid)) { neighborSet.add(sid); neighborList.push(sid); }
    }

    // Scale orbit radius based on neighbor count so labels don't overlap.
    const minRadius = 100;
    const minSpacing = 50; // minimum arc distance between neighbors
    const spacingRadius = (neighborList.length * minSpacing) / (2 * Math.PI);
    const orbitRadius = Math.max(minRadius, spacingRadius);
    // Compute evenly-spaced target positions for each neighbor.
    const targetPos = new Map<string, { tx: number; ty: number }>();
    neighborList.forEach((nid, i) => {
      const angle = (2 * Math.PI * i) / neighborList.length - Math.PI / 2;
      targetPos.set(nid, {
        tx: fx + orbitRadius * Math.cos(angle),
        ty: fy + orbitRadius * Math.sin(angle),
      });
    });

    // Pin neighbors at their evenly-spaced positions around the circle.
    for (const node of nodes) {
      const pos = targetPos.get(node.id);
      if (pos) {
        node.x = pos.tx;
        node.y = pos.ty;
        node.fx = pos.tx;
        node.fy = pos.ty;
      }
    }

    // Push any non-neighbor inside the orbit circle out past it.
    const clearRadius = orbitRadius + 80;
    for (const node of nodes) {
      if (node.id === focusNodeId || neighborSet.has(node.id)) continue;
      const dx = (node.x ?? 0) - fx;
      const dy = (node.y ?? 0) - fy;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      if (dist < clearRadius) {
        // Push outward; if node is right on top of focus, give it a random direction.
        const dirX = dist > 1 ? dx / dist : Math.cos(Math.random() * 2 * Math.PI);
        const dirY = dist > 1 ? dy / dist : Math.sin(Math.random() * 2 * Math.PI);
        node.x = fx + dirX * (clearRadius + 20);
        node.y = fy + dirY * (clearRadius + 20);
      }
    }

    // Keep non-neighbors from drifting into the orbit.
    sim.force(
      "focusRadial",
      forceRadial(clearRadius + 20, fx, fy).strength((d: unknown) => {
        const node = d as GraphNode;
        if (node.id === focusNodeId || neighborSet.has(node.id)) return 0;
        const ndx = (node.x ?? 0) - fx;
        const ndy = (node.y ?? 0) - fy;
        const ndist = Math.sqrt(ndx * ndx + ndy * ndy);
        return ndist < clearRadius ? 1 : 0;
      })
    );

    // Disable link forces for edges that don't touch the focus node.
    // This prevents non-neighbors linked to nodes on opposite sides from
    // being dragged into the center of the orbit.
    const linkForce = sim.force("link") as ReturnType<typeof forceLink> | undefined;
    linkForce
      ?.distance(200)
      .strength((link: unknown) => {
        const l = link as { source: GraphNode | string; target: GraphNode | string };
        const sid = typeof l.source === "string" ? l.source : l.source.id;
        const tid = typeof l.target === "string" ? l.target : l.target.id;
        // Only keep link force for edges touching the focus node.
        if (sid === focusNodeId || tid === focusNodeId) return 0.5;
        return 0;
      });

    (sim.force("charge") as ReturnType<typeof forceManyBody> | undefined)?.strength(
      (d: unknown) => {
        const node = d as GraphNode;
        if (node.id === focusNodeId || neighborSet.has(node.id)) return 0;
        return -100;
      }
    );

    sim.alpha(1).restart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNodeId]);

  const reheat = useCallback(() => {
    simRef.current?.alpha(0.3).restart();
  }, []);

  const stabilize = useCallback(() => {
    simRef.current?.alphaTarget(0).restart();
  }, []);

  return { simRef, reheat, stabilize };
}

function applyStaticLayout(
  nodes: GraphNode[],
  _edges: GraphEdge[],
  layout: LayoutAlgorithm,
  width: number,
  height: number,
) {
  const n = nodes.length;
  if (n === 0) return;

  switch (layout) {
    case "circular": {
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.4;
      nodes.forEach((node, i) => {
        const angle = (2 * Math.PI * i) / n;
        node.x = cx + radius * Math.cos(angle);
        node.y = cy + radius * Math.sin(angle);
      });
      break;
    }
    case "grid": {
      const cols = Math.ceil(Math.sqrt(n));
      const cellW = width / (cols + 1);
      const cellH = height / (Math.ceil(n / cols) + 1);
      nodes.forEach((node, i) => {
        node.x = (1 + (i % cols)) * cellW;
        node.y = (1 + Math.floor(i / cols)) * cellH;
      });
      break;
    }
    case "hierarchical": {
      // Simple layered: group by in-degree
      const inDeg = new Map<string, number>();
      nodes.forEach((n) => inDeg.set(n.id, 0));
      _edges.forEach((e) => {
        const tid = typeof e.target === "string" ? e.target : e.target.id;
        inDeg.set(tid, (inDeg.get(tid) ?? 0) + 1);
      });
      const sorted = [...nodes].sort((a, b) => (inDeg.get(a.id) ?? 0) - (inDeg.get(b.id) ?? 0));
      const layers = new Map<number, GraphNode[]>();
      sorted.forEach((node) => {
        const deg = inDeg.get(node.id) ?? 0;
        const layer = layers.get(deg) ?? [];
        layer.push(node);
        layers.set(deg, layer);
      });
      const layerKeys = [...layers.keys()].sort((a, b) => a - b);
      const layerH = height / (layerKeys.length + 1);
      layerKeys.forEach((key, li) => {
        const layerNodes = layers.get(key)!;
        const layerW = width / (layerNodes.length + 1);
        layerNodes.forEach((node, ni) => {
          node.x = (ni + 1) * layerW;
          node.y = (li + 1) * layerH;
        });
      });
      break;
    }
    default:
      break;
  }
}
