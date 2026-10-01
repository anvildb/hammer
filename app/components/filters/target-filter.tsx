import { useEffect, useMemo, useState } from "react";
import { useConnection } from "~/lib/connection-context";
import type { SchemaData } from "~/components/schema/types";
import { FilterBox, type FilterGroup, type FilterOption } from "./filter-box";

export type TargetKind = "collection" | "label" | "relationship";

export interface ParsedTarget {
  kind: TargetKind;
  name: string;
}

/**
 * SHOW TRIGGERS / SHOW POLICIES render a target as `:Person` or
 * `COLLECTION auth.users`; the filter box shows the shorter `:Person` /
 * `auth.users`. Both parse here. A relationship type reads like a label.
 */
export function parseTarget(target: string): ParsedTarget {
  if (target.startsWith(":")) {
    return { kind: "label", name: target.slice(1) };
  }
  return { kind: "collection", name: target.replace(/^COLLECTION\s+/i, "") };
}

export function displayTarget({ kind, name }: ParsedTarget): string {
  return kind === "collection" ? name : `:${name}`;
}

/**
 * The target filter accepts a collection name (`auth.users`), a label
 * (`:Person`) or a fragment of either; a leading `:` or `COLLECTION ` pins the
 * kind, otherwise the fragment matches both.
 */
export function targetMatches(target: string, text: string): boolean {
  const { kind, name } = parseTarget(target);
  const q = text.trim();
  if (!q) return true;
  let needle = q;
  let pinned: ParsedTarget["kind"] | null = null;
  if (q.startsWith(":")) {
    pinned = "label";
    needle = q.slice(1);
  } else if (/^COLLECTION\s+/i.test(q)) {
    pinned = "collection";
    needle = q.replace(/^COLLECTION\s+/i, "");
  }
  if (pinned && kind !== pinned) return false;
  return name.toLowerCase().includes(needle.trim().toLowerCase());
}

/** The database's collections and labels (and relationship types, if asked): what a trigger or policy could target. */
function useKnownTargets(relationships: boolean): ParsedTarget[] {
  const { client, status } = useConnection();
  const [known, setKnown] = useState<ParsedTarget[]>([]);
  useEffect(() => {
    if (status !== "connected") return;
    let cancelled = false;
    // Either lookup failing just leaves the list to the targets in use.
    Promise.all([
      client
        .getSchema("default")
        .then((s) => s as SchemaData)
        .catch(() => null),
      client
        .listCollections()
        .then((cs) => cs.map((c) => c.name))
        .catch(() => [] as string[]),
    ]).then(([schema, collections]) => {
      if (cancelled) return;
      const labels = schema?.labels.map((l) => l.name) ?? [];
      const relTypes = relationships
        ? (schema?.relationshipTypes.map((r) => r.name) ?? [])
        : [];
      setKnown([
        ...collections.map((name) => ({ kind: "collection" as const, name })),
        ...labels.map((name) => ({ kind: "label" as const, name })),
        ...relTypes.map((name) => ({ kind: "relationship" as const, name })),
      ]);
    });
    return () => {
      cancelled = true;
    };
  }, [client, status, relationships]);
  return known;
}

const GROUP_HEADINGS: Record<TargetKind, string> = {
  collection: "Collections",
  label: "Labels",
  relationship: "Relationships",
};

/**
 * The filter's list: every target the database has, plus any a row already
 * names (a label can have no nodes yet), each with its row count.
 */
export function targetGroups(
  targets: string[],
  known: ParsedTarget[],
): FilterGroup[] {
  // A relationship type and a label read the same (`:KNOWS`), so the kind a
  // row's target lands in comes from the schema when it is known there.
  const byDisplay = new Map<string, { kind: TargetKind; count: number }>();
  for (const target of known) {
    byDisplay.set(displayTarget(target), { kind: target.kind, count: 0 });
  }
  for (const raw of targets) {
    const parsed = parseTarget(raw);
    const shown = displayTarget(parsed);
    const entry = byDisplay.get(shown);
    if (entry) entry.count += 1;
    else byDisplay.set(shown, { kind: parsed.kind, count: 1 });
  }
  const options = (kind: TargetKind): FilterOption[] =>
    [...byDisplay]
      .filter(([, e]) => e.kind === kind)
      .map(([value, e]) => ({ value, count: e.count }))
      .sort((a, b) =>
        a.value.localeCompare(b.value, undefined, { sensitivity: "base" }),
      );
  return (["collection", "label", "relationship"] as const).map((kind) => ({
    value: GROUP_HEADINGS[kind],
    items: options(kind),
  }));
}

interface TargetFilterProps {
  value: string;
  onValueChange: (value: string) => void;
  /** The rows' targets as the server renders them (`:Person`, `COLLECTION x`). */
  targets: string[];
  /** Also list the schema's relationship types (policies can target them). */
  relationships?: boolean;
}

/** Filters a table of rows that each have a trigger/policy target. Rows match via `targetMatches`. */
export function TargetFilter({
  value,
  onValueChange,
  targets,
  relationships = false,
}: TargetFilterProps) {
  const known = useKnownTargets(relationships);
  const groups = useMemo(() => targetGroups(targets, known), [targets, known]);
  return (
    <FilterBox
      value={value}
      onValueChange={onValueChange}
      groups={groups}
      match={(option, query) => targetMatches(option.value, query)}
      placeholder="auth.users or :Person"
      label="Filter by target"
      className="w-64"
    />
  );
}
