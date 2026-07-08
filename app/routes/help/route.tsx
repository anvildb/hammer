import { useState, useEffect } from "react";
import { useLocation } from "react-router";

type SectionId =
  | "getting-started"
  | "cypher-overview"
  | "cypher-reading"
  | "cypher-writing"
  | "cypher-filtering"
  | "cypher-aggregation"
  | "cypher-paths"
  | "cypher-subqueries"
  | "cypher-documents"
  | "cypher-functions"
  | "cypher-triggers"
  | "cypher-rls"
  | "cypher-sync"
  | "cypher-indexes"
  | "cypher-analysis"
  | "cypher-builtin-functions"
  | "cypher-operators"
  | "graphql"
  | "documents"
  | "sync"
  | "functions"
  | "triggers"
  | "rls"
  | "auth"
  | "data-import"
  | "edge-functions"
  | "observability"
  | "api"
  | "config"
  | "hammer"
  | "drivers"
  | "storage-overview"
  | "storage-quickstart"
  | "storage-buckets"
  | "storage-objects"
  | "storage-cypher"
  | "storage-rls"
  | "storage-signed"
  | "storage-transforms"
  | "storage-resumable"
  | "storage-backends"
  | "storage-triggers"
  | "storage-tutorials";

interface NavItem {
  id: SectionId;
  title: string;
  children?: { id: SectionId; title: string }[];
}

const sections: NavItem[] = [
  { id: "getting-started", title: "Getting Started" },
  {
    id: "cypher-overview",
    title: "Cypher Query Language",
    children: [
      { id: "cypher-overview", title: "Overview" },
      { id: "cypher-reading", title: "Reading Data" },
      { id: "cypher-writing", title: "Writing Data" },
      { id: "cypher-filtering", title: "Filtering & WHERE" },
      { id: "cypher-aggregation", title: "Aggregation" },
      { id: "cypher-paths", title: "Path Patterns" },
      { id: "cypher-subqueries", title: "Subqueries" },
      { id: "cypher-documents", title: "Documents" },
      { id: "cypher-functions", title: "Functions" },
      { id: "cypher-triggers", title: "Triggers" },
      { id: "cypher-rls", title: "Row-Level Security" },
      { id: "cypher-sync", title: "Sync" },
      { id: "cypher-indexes", title: "Indexes" },
      { id: "cypher-analysis", title: "Query Analysis" },
      { id: "cypher-builtin-functions", title: "Built-in Functions" },
      { id: "cypher-operators", title: "Operators" },
    ],
  },
  { id: "graphql", title: "GraphQL API" },
  { id: "documents", title: "Document Store" },
  { id: "sync", title: "Graph-Document Sync" },
  { id: "functions", title: "Stored Functions" },
  { id: "triggers", title: "Triggers" },
  { id: "rls", title: "Row-Level Security" },
  { id: "auth", title: "Authentication" },
  {
    id: "storage-overview",
    title: "File Storage",
    children: [
      { id: "storage-overview", title: "Overview" },
      { id: "storage-quickstart", title: "Quickstart" },
      { id: "storage-buckets", title: "Buckets" },
      { id: "storage-objects", title: "Objects" },
      { id: "storage-cypher", title: "Cypher Integration" },
      { id: "storage-rls", title: "Row-Level Security" },
      { id: "storage-signed", title: "Signed URLs" },
      { id: "storage-transforms", title: "Image Transformations" },
      { id: "storage-resumable", title: "Resumable Uploads (TUS)" },
      { id: "storage-backends", title: "Backends" },
      { id: "storage-triggers", title: "Triggers & Edge Functions" },
      { id: "storage-tutorials", title: "Tutorials" },
    ],
  },
  { id: "data-import", title: "Data Import" },
  { id: "edge-functions", title: "Edge Functions" },
  { id: "observability", title: "Observability" },
  { id: "api", title: "HTTP API Reference" },
  { id: "config", title: "Configuration" },
  { id: "hammer", title: "Hammer UI" },
  { id: "drivers", title: "Client Drivers" },
];

// Flat ordered list of all section IDs for next/prev navigation.
const allSectionIds: SectionId[] = sections.flatMap((s) =>
  s.children ? s.children.map((c) => c.id) : [s.id]
);

// Map section ID to display title (including parent context).
const sectionTitles: Record<string, string> = {};
for (const s of sections) {
  if (s.children) {
    for (const c of s.children) {
      sectionTitles[c.id] = `${s.title} > ${c.title}`;
    }
  } else {
    sectionTitles[s.id] = s.title;
  }
}

function isCypherSection(id: SectionId) {
  return id.startsWith("cypher-");
}
function isStorageSection(id: SectionId) {
  return id.startsWith("storage-");
}

/**
 * Returns the parent-group key for a section ID, or `null` for top-level
 * entries. Used to drive the collapsible submenu state on the left-rail.
 */
function groupOf(id: SectionId): "cypher" | "storage" | null {
  if (isCypherSection(id)) return "cypher";
  if (isStorageSection(id)) return "storage";
  return null;
}

export default function HelpRoute() {
  const location = useLocation();
  const initialSection = (location.hash?.replace("#", "") || "getting-started") as SectionId;
  const [active, setActive] = useState<SectionId>(initialSection);
  const [cypherOpen, setCypherOpen] = useState(isCypherSection(active));
  const [storageOpen, setStorageOpen] = useState(isStorageSection(active));
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Sync hash on section change.
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${active}`);
    }
  }, [active]);

  // Handle hash change from external navigation.
  useEffect(() => {
    const hash = location.hash?.replace("#", "");
    if (hash && hash !== active) {
      const target = hash as SectionId;
      setActive(target);
      if (isCypherSection(target)) setCypherOpen(true);
      if (isStorageSection(target)) setStorageOpen(true);
    }
  }, [location.hash]);

  return (
    <div className="flex lg:flex-row flex-col bg-zinc-950 text-zinc-100">
      {/* Sidebar TOC */}
      <nav className="lg:w-56 w-full shrink-0 border-r border-zinc-800 overflow-y-auto">
        {/* Mobile toggle */}
        <button
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="lg:hidden flex items-center justify-between w-full px-4 py-3 border-b border-zinc-800 text-sm text-zinc-300"
        >
          <span className="font-semibold">{sectionTitles[active] || "Documentation"}</span>
          <svg
            className={`h-4 w-4 text-zinc-500 transition-transform ${mobileNavOpen ? "rotate-180" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {/* Desktop: always visible. Mobile: collapsed by default. */}
        <div className={`${mobileNavOpen ? "block" : "hidden"} lg:block py-4`}>
        <p className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 hidden lg:block">
          Documentation
        </p>
        {sections.map((item) => {
          if (item.children) {
            const childActive = item.children.some((c) => c.id === active);
            const group = groupOf(item.id);
            const isOpen = group === "storage" ? storageOpen : cypherOpen;
            const setOpen = group === "storage" ? setStorageOpen : setCypherOpen;
            return (
              <div key={item.id}>
                <button
                  onClick={() => {
                    const willOpen = !isOpen;
                    setOpen(willOpen);
                    if (willOpen) setActive(item.children![0].id);
                  }}
                  className={`flex items-center justify-between w-full text-left px-4 py-1.5 text-sm transition-colors ${
                    childActive
                      ? "text-zinc-100 border-l-2 border-zinc-400"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border-l-2 border-transparent"
                  }`}
                >
                  <span>{item.title}</span>
                  <svg
                    className={`h-3 w-3 text-zinc-500 transition-transform ${isOpen ? "rotate-90" : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
                {isOpen && (
                  <div>
                    {item.children.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => { setActive(child.id); setMobileNavOpen(false); }}
                        className={`block w-full text-left pl-7 pr-4 py-1 text-xs transition-colors ${
                          active === child.id
                            ? "bg-zinc-800 text-zinc-100 border-l-2 border-zinc-400"
                            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 border-l-2 border-transparent"
                        }`}
                      >
                        {child.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return (
            <button
              key={item.id}
              onClick={() => { setActive(item.id); setMobileNavOpen(false); }}
              className={`block w-full text-left px-4 py-1.5 text-sm transition-colors ${
                active === item.id
                  ? "bg-zinc-800 text-zinc-100 border-l-2 border-zinc-400"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border-l-2 border-transparent"
              }`}
            >
              {item.title}
            </button>
          );
        })}
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">
          {active === "getting-started" && <GettingStarted />}
          {active === "cypher-overview" && <CypherOverviewSection />}
          {active === "cypher-reading" && <CypherReadingSection />}
          {active === "cypher-writing" && <CypherWritingSection />}
          {active === "cypher-filtering" && <CypherFilteringSection />}
          {active === "cypher-aggregation" && <CypherAggregationSection />}
          {active === "cypher-paths" && <CypherPathsSection />}
          {active === "cypher-subqueries" && <CypherSubqueriesSection />}
          {active === "cypher-documents" && <CypherDocumentsSection />}
          {active === "cypher-functions" && <CypherFunctionsSection />}
          {active === "cypher-triggers" && <CypherTriggersSection />}
          {active === "cypher-rls" && <CypherRLSSection />}
          {active === "cypher-sync" && <CypherSyncSection />}
          {active === "cypher-indexes" && <CypherIndexesSection />}
          {active === "cypher-analysis" && <CypherAnalysisSection />}
          {active === "cypher-builtin-functions" && <CypherBuiltinFunctionsSection />}
          {active === "cypher-operators" && <CypherOperatorsSection />}
          {active === "graphql" && <GraphQLSection />}
          {active === "documents" && <DocumentsSection />}
          {active === "sync" && <SyncSection />}
          {active === "functions" && <FunctionsSection />}
          {active === "triggers" && <TriggersSection />}
          {active === "rls" && <RLSSection />}
          {active === "auth" && <AuthSection />}
          {active === "storage-overview" && <StorageOverviewSection />}
          {active === "storage-quickstart" && <StorageQuickstartSection />}
          {active === "storage-buckets" && <StorageBucketsSection />}
          {active === "storage-objects" && <StorageObjectsSection />}
          {active === "storage-cypher" && <StorageCypherSection />}
          {active === "storage-rls" && <StorageRLSSection />}
          {active === "storage-signed" && <StorageSignedSection />}
          {active === "storage-transforms" && <StorageTransformsSection />}
          {active === "storage-resumable" && <StorageResumableSection />}
          {active === "storage-backends" && <StorageBackendsSection />}
          {active === "storage-triggers" && <StorageTriggersSection />}
          {active === "storage-tutorials" && <StorageTutorialsSection />}
          {active === "data-import" && <DataImportSection />}
          {active === "edge-functions" && <EdgeFunctionsSection />}
          {active === "observability" && <ObservabilitySection />}
          {active === "api" && <APISection />}
          {active === "config" && <ConfigSection />}
          {active === "hammer" && <HammerSection />}
          {active === "drivers" && <DriversSection />}

          {/* Next / Previous section navigation */}
          {(() => {
            const idx = allSectionIds.indexOf(active);
            const prevId = idx > 0 ? allSectionIds[idx - 1] : null;
            const nextId = idx < allSectionIds.length - 1 ? allSectionIds[idx + 1] : null;
            return (
              <div className="flex items-center justify-between pt-8 mt-8 border-t border-zinc-800">
                {prevId ? (
                  <button
                    onClick={() => {
                      setActive(prevId);
                      if (isCypherSection(prevId)) setCypherOpen(true);
                      if (isStorageSection(prevId)) setStorageOpen(true);
                    }}
                    className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-200 transition-colors"
                  >
                    <span>&larr;</span>
                    <span>{sectionTitles[prevId]}</span>
                  </button>
                ) : <div />}
                {nextId ? (
                  <button
                    onClick={() => {
                      setActive(nextId);
                      if (isCypherSection(nextId)) setCypherOpen(true);
                      if (isStorageSection(nextId)) setStorageOpen(true);
                    }}
                    className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-200 transition-colors"
                  >
                    <span>{sectionTitles[nextId]}</span>
                    <span>&rarr;</span>
                  </button>
                ) : <div />}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helper components                                                  */
/* ------------------------------------------------------------------ */

function H1({ children }: { children: React.ReactNode }) {
  return <h1 className="text-2xl font-bold text-white">{children}</h1>;
}
function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-semibold text-zinc-200 mt-8 mb-3 border-b border-zinc-800 pb-2">
      {children}
    </h2>
  );
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-zinc-300 mt-6 mb-2">{children}</h3>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-zinc-400 leading-relaxed">{children}</p>;
}
function Code({ children }: { children: string }) {
  return (
    <pre className="bg-zinc-900 border border-zinc-800 rounded-md p-4 text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre">
      {children}
    </pre>
  );
}
function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded text-xs font-mono">
      {children}
    </code>
  );
}
function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-zinc-800 my-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-900 border-b border-zinc-800">
            {headers.map((h) => (
              <th key={h} className="text-left px-3 py-2 text-zinc-400 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-zinc-800/50">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 text-xs text-zinc-300 font-mono">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sections                                                           */
/* ------------------------------------------------------------------ */

function GettingStarted() {
  return (
    <>
      <H1>Getting Started</H1>
      <P>
        Anvil is a graph database written in Rust combining a property graph, native document store,
        and row-level security into a single binary.
      </P>

      <H2>Installation</H2>
      <Code>{`# Download and install
curl -fsSL https://anvildb.com/install.sh | sh`}</Code>

      <H2>Quick Start</H2>
      <Code>{`# Start the server (daemonizes by default)
anvil start

# Or run in foreground for development
anvil start --foreground

# Check status
anvil status

# Stop the server
anvil stop

# Open the Hammer UI
open http://localhost:5175

# Default login: admin / anvil`}</Code>
      <P>
        The server runs on port <InlineCode>7474</InlineCode> (HTTP API) and{" "}
        <InlineCode>7687</InlineCode> (Bolt protocol). The Hammer UI runs on port{" "}
        <InlineCode>5175</InlineCode>.
      </P>

      <H2>Import Sample Data</H2>
      <P>
        Import the built-in sample dataset (8 people, 3 companies, 3 projects, 5 skills —
        19 nodes, 51 relationships) to get started quickly.
      </P>
      <Code>{`anvil import --sample`}</Code>

      <H2>Your First Query</H2>
      <Code>{`-- Find engineers and their friends
MATCH (p:Person:Engineer)-[r:FRIEND]->(friend)
RETURN p.name, collect(friend.name) AS friends

-- Skills per company
MATCH (p:Person)-[:WORKS_AT]->(c:Company),
      (p)-[:HAS_SKILL]->(s:Skill)
RETURN c.name, collect(DISTINCT s.name) AS skills

-- Mentorship chain from Carol
MATCH path = (c:Person {name: 'Carol'})-[:MENTORS*]->(mentee)
RETURN c.name, collect(mentee.name) AS chain`}</Code>
    </>
  );
}


function CypherOverviewSection() {
  return (
    <>
      <H1>Cypher Query Language</H1>
      <P>
        Anvil implements the Cypher query language with a hand-written lexer, recursive descent
        parser, cost-based optimizer, and Volcano-model executor. In addition to standard Cypher
        for property graphs, Anvil extends the language with native document operations, stored
        functions, triggers, row-level security, and graph-document synchronization.
      </P>

      <H2>Quick Example</H2>
      <Code>{`-- Query with pattern matching
MATCH (p:Person)-[r:FRIEND]->(friend:Person)
WHERE p.name = "Alice"
RETURN p.name, friend.name, r.since`}</Code>

      <H2>Supported Clauses</H2>
      <Table
        headers={["Clause", "Description"]}
        rows={[
          ["MATCH", "Pattern match against the graph"],
          ["OPTIONAL MATCH", "Match with null padding for missing patterns"],
          ["WHERE", "Filter matched results"],
          ["RETURN", "Project results with aliases"],
          ["WITH", "Chain query stages, project intermediate results"],
          ["ORDER BY", "Sort results (ASC / DESC)"],
          ["SKIP / LIMIT", "Paginate results"],
          ["UNWIND", "Expand a list into rows"],
          ["CREATE", "Create nodes and relationships"],
          ["MERGE", "Match or create a pattern"],
          ["SET", "Update properties or add labels"],
          ["REMOVE", "Remove properties or labels"],
          ["DELETE / DETACH DELETE", "Delete nodes and relationships"],
          ["UNION / UNION ALL", "Combine result sets"],
          ["CALL ... YIELD", "Invoke stored functions"],
          ["FOREACH", "Iterate and perform updates"],
        ]}
      />

      <H2>Anvil Extensions</H2>
      <P>
        Beyond standard Cypher, Anvil adds first-class support for documents, stored functions,
        triggers, row-level security policies, sync rules, and query analysis. These extensions
        integrate seamlessly — you can reference documents in graph queries, trigger document
        writes from graph events, and synchronize data between both models.
      </P>
      <Table
        headers={["Extension", "Description"]}
        rows={[
          ["CREATE / MATCH / UPSERT / DELETE DOCUMENT", "Native document store operations inside Cypher"],
          ["CREATE FUNCTION ... AS { }", "User-defined functions with typed parameters"],
          ["CREATE TRIGGER ... AS { }", "Event-driven logic on graph and document changes"],
          ["CREATE POLICY ... USING ()", "Row-level security predicates"],
          ["SYNC LABEL ... TO COLLECTION", "Bidirectional graph-document synchronization"],
          ["EXPLAIN / PROFILE", "Query plan analysis and profiling"],
        ]}
      />

      <H2>Comments</H2>
      <P>
        Anvil supports several comment styles in Cypher queries. All comment markers are
        ignored inside quoted strings.
      </P>
      <Code>{`// C-style line comment
-- SQL-style line comment (note: --> is a relationship pattern, not a comment)
# Shell-style line comment

/* Block comment spanning
   multiple lines */

MATCH (n) // inline comment after a clause
RETURN n.name -- also works here`}</Code>
    </>
  );
}

function CypherReadingSection() {
  return (
    <>
      <H1>Reading Data</H1>

      <H2>MATCH</H2>
      <P>
        The <InlineCode>MATCH</InlineCode> clause finds patterns in the graph. Nodes are
        wrapped in parentheses, relationships in square brackets.
      </P>
      <Code>{`-- Match all nodes with a label
MATCH (n:Person) RETURN n

-- Match with inline property filter
MATCH (n:Person {name: "Alice"}) RETURN n

-- Match relationship patterns
MATCH (a:Person)-[r:FRIEND]->(b:Person)
RETURN a.name, b.name, r.since

-- Multiple patterns (implicit join on shared variables)
MATCH (a:Person)-[:WORKS_AT]->(c:Company),
      (a)-[:HAS_SKILL]->(s:Skill)
RETURN a.name, c.name, s.name

-- Undirected relationships
MATCH (a:Person)-[:FRIEND]-(b:Person)
RETURN a.name, b.name`}</Code>

      <H2>OPTIONAL MATCH</H2>
      <P>
        Like <InlineCode>MATCH</InlineCode>, but returns <InlineCode>null</InlineCode> for
        unmatched parts instead of filtering out the row.
      </P>
      <Code>{`MATCH (p:Person)
OPTIONAL MATCH (p)-[:MANAGES]->(project:Project)
RETURN p.name, project.name`}</Code>

      <H2>WITH</H2>
      <P>
        Chains query stages. Acts as a projection barrier — only variables listed in{" "}
        <InlineCode>WITH</InlineCode> are visible downstream.
      </P>
      <Code>{`MATCH (p:Person)-[:FRIEND]->(f)
WITH p, count(f) AS friendCount
WHERE friendCount > 3
RETURN p.name, friendCount
ORDER BY friendCount DESC`}</Code>

      <H2>UNWIND</H2>
      <P>Expands a list into individual rows.</P>
      <Code>{`UNWIND [1, 2, 3] AS x RETURN x

-- Combine with MATCH
WITH ["Alice", "Bob", "Charlie"] AS names
UNWIND names AS name
MATCH (p:Person {name: name})
RETURN p`}</Code>

      <H2>UNION</H2>
      <Code>{`-- Deduplicated union
MATCH (n:Person) RETURN n.name AS name
UNION
MATCH (n:Company) RETURN n.name AS name

-- Keep duplicates
MATCH (n:Person) RETURN n.name AS name
UNION ALL
MATCH (n:Company) RETURN n.name AS name`}</Code>

      <H2>ORDER BY / SKIP / LIMIT</H2>
      <Code>{`MATCH (n:Person)
RETURN n.name, n.age
ORDER BY n.age DESC, n.name ASC
SKIP 10
LIMIT 25`}</Code>
    </>
  );
}

function CypherWritingSection() {
  return (
    <>
      <H1>Writing Data</H1>

      <H2>CREATE</H2>
      <Code>{`-- Create a node
CREATE (n:Person {name: "Alice", age: 30})

-- Create multiple nodes
CREATE (a:Person {name: "Alice"}), (b:Person {name: "Bob"})

-- Create with relationships
CREATE (a:Person {name: "Alice"})
CREATE (b:Person {name: "Bob"})
CREATE (a)-[:FRIEND {since: 2020}]->(b)

-- Create everything in one pattern
CREATE (a:Person {name: "Alice"})-[:WORKS_AT]->(c:Company {name: "Acme"})`}</Code>

      <H2>MERGE</H2>
      <P>
        Match-or-create semantics. Use <InlineCode>ON CREATE SET</InlineCode> and{" "}
        <InlineCode>ON MATCH SET</InlineCode> to conditionally set properties.
      </P>
      <Code>{`-- Create if not exists
MERGE (n:Person {name: "Alice"})
ON CREATE SET n.created = timestamp()
ON MATCH SET n.lastSeen = timestamp()
RETURN n

-- Merge relationships
MATCH (a:Person {name: "Alice"}), (b:Person {name: "Bob"})
MERGE (a)-[:FRIEND]->(b)`}</Code>

      <H2>SET</H2>
      <Code>{`-- Set properties
MATCH (n:Person {name: "Alice"})
SET n.age = 31, n.email = "alice@example.com"
RETURN n

-- Add a label
MATCH (n:Person {name: "Alice"})
SET n:Employee

-- Copy all properties from a map
MATCH (n:Person {name: "Alice"})
SET n += {city: "Sydney", country: "AU"}`}</Code>

      <H2>REMOVE</H2>
      <Code>{`-- Remove a property
MATCH (n:Person {name: "Alice"})
REMOVE n.email

-- Remove a label
MATCH (n:Person:Employee {name: "Alice"})
REMOVE n:Employee`}</Code>

      <H2>DELETE</H2>
      <Code>{`-- Delete a node (must have no relationships)
MATCH (n:Person {name: "Bob"})
DELETE n

-- Delete node and all its relationships
MATCH (n:Person {name: "Bob"})
DETACH DELETE n

-- Delete a relationship
MATCH (a:Person)-[r:FRIEND]->(b:Person)
WHERE a.name = "Alice" AND b.name = "Bob"
DELETE r

-- Delete all nodes with a label
MATCH (n:TempData) DETACH DELETE n`}</Code>

      <H2>FOREACH</H2>
      <P>Iterate over a list and perform write operations for each element.</P>
      <Code>{`MATCH p = (a:Person {name: "Alice"})-[:FRIEND*]->(b)
FOREACH (n IN nodes(p) | SET n.visited = true)`}</Code>
    </>
  );
}

function CypherFilteringSection() {
  return (
    <>
      <H1>Filtering & WHERE</H1>

      <H2>Comparison Operators</H2>
      <Code>{`MATCH (n:Person) WHERE n.age > 25 RETURN n
MATCH (n:Person) WHERE n.age >= 18 AND n.age <= 65 RETURN n
MATCH (n:Person) WHERE n.name <> "Bob" RETURN n`}</Code>

      <H2>Boolean Logic</H2>
      <Code>{`MATCH (n:Person)
WHERE n.age > 25 AND (n.city = "Sydney" OR n.city = "Melbourne")
RETURN n

MATCH (n:Person)
WHERE NOT n.retired
RETURN n`}</Code>

      <H2>String Predicates</H2>
      <Code>{`MATCH (n:Person) WHERE n.name STARTS WITH "Al" RETURN n
MATCH (n:Person) WHERE n.name ENDS WITH "ce" RETURN n
MATCH (n:Person) WHERE n.name CONTAINS "li" RETURN n
MATCH (n:Person) WHERE n.email =~ ".*@example\\.com" RETURN n`}</Code>

      <H2>NULL Checks</H2>
      <Code>{`MATCH (n:Person) WHERE n.email IS NOT NULL RETURN n
MATCH (n:Person) WHERE n.phone IS NULL RETURN n`}</Code>

      <H2>IN Operator</H2>
      <Code>{`MATCH (n:Person)
WHERE n.city IN ["Sydney", "Melbourne", "Brisbane"]
RETURN n`}</Code>

      <H2>Pattern Predicates</H2>
      <P>
        Use patterns directly in <InlineCode>WHERE</InlineCode> to filter based on the
        existence of relationships.
      </P>
      <Code>{`-- Nodes that know Alice
MATCH (n:Person)
WHERE (n)-[:FRIEND]->(:Person {name: "Alice"})
RETURN n.name

-- Nodes that do NOT know anyone named Charlie
MATCH (n:Person)
WHERE NOT (n)-[:FRIEND]->(:Person {name: "Charlie"})
RETURN n.name`}</Code>

      <H2>List Predicates</H2>
      <Table
        headers={["Predicate", "Description", "Example"]}
        rows={[
          ["all(x IN list WHERE expr)", "All elements satisfy condition", "all(x IN n.scores WHERE x > 50)"],
          ["any(x IN list WHERE expr)", "At least one satisfies", "any(x IN n.tags WHERE x = 'urgent')"],
          ["none(x IN list WHERE expr)", "No element satisfies", "none(x IN n.scores WHERE x < 0)"],
          ["single(x IN list WHERE expr)", "Exactly one satisfies", "single(x IN n.tags WHERE x = 'primary')"],
        ]}
      />
    </>
  );
}

function CypherAggregationSection() {
  return (
    <>
      <H1>Aggregation & Grouping</H1>
      <P>
        Non-aggregated expressions in <InlineCode>RETURN</InlineCode> or{" "}
        <InlineCode>WITH</InlineCode> act as implicit grouping keys — no{" "}
        <InlineCode>GROUP BY</InlineCode> clause is needed.
      </P>

      <H2>Aggregation Functions</H2>
      <Table
        headers={["Function", "Description", "Example"]}
        rows={[
          ["count(expr)", "Count non-null values (or count(*) for all rows)", "count(n)"],
          ["collect(expr)", "Collect values into a list", "collect(n.name)"],
          ["sum(expr)", "Sum numeric values", "sum(n.score)"],
          ["avg(expr)", "Average numeric values", "avg(n.age)"],
          ["min(expr)", "Minimum value", "min(n.created)"],
          ["max(expr)", "Maximum value", "max(n.score)"],
          ["percentileCont(expr, p)", "Continuous percentile (interpolated)", "percentileCont(n.age, 0.95)"],
          ["percentileDisc(expr, p)", "Discrete percentile (exact value)", "percentileDisc(n.age, 0.5)"],
          ["stdev(expr)", "Sample standard deviation", "stdev(n.score)"],
          ["stdevp(expr)", "Population standard deviation", "stdevp(n.score)"],
        ]}
      />

      <H2>Grouping Examples</H2>
      <Code>{`-- Count per label
MATCH (n:Person) RETURN n.city, count(n) AS population
ORDER BY population DESC

-- Collect friends per person
MATCH (p:Person)-[:FRIEND]->(f:Person)
RETURN p.name, collect(f.name) AS friends

-- Aggregation with WITH for filtering
MATCH (p:Person)-[:FRIEND]->(f)
WITH p, count(f) AS friendCount
WHERE friendCount > 5
RETURN p.name, friendCount`}</Code>

      <H2>DISTINCT</H2>
      <Code>{`MATCH (n:Person)-[:LIVES_IN]->(c:City)
RETURN DISTINCT c.name

-- With count
MATCH (p:Person)-[:HAS_SKILL]->(s)
RETURN p.name, count(DISTINCT s) AS uniqueSkills`}</Code>
    </>
  );
}

function CypherPathsSection() {
  return (
    <>
      <H1>Path Patterns</H1>

      <H2>Variable-Length Paths</H2>
      <P>
        Use <InlineCode>*min..max</InlineCode> after the relationship type to traverse
        multiple hops.
      </P>
      <Code>{`-- 1 to 3 hops
MATCH (a:Person)-[:FRIEND*1..3]->(b:Person)
RETURN a.name, b.name

-- Exactly 2 hops
MATCH (a)-[:FRIEND*2]->(b)
RETURN a.name, b.name

-- Any length (use with caution on large graphs)
MATCH (a:Person {name: "Alice"})-[:FRIEND*]->(b)
RETURN b.name`}</Code>

      <H2>Quantified Paths</H2>
      <P>Anvil supports GQL-style quantified path patterns for more precise hop control.</P>
      <Code>{`-- Exactly 3 hops
MATCH (a)-[:FRIEND]->{3}(b)
RETURN a.name, b.name

-- Between 2 and 5 hops
MATCH (a)-[:FRIEND]->{2,5}(b)
RETURN a.name, b.name

-- One or more hops
MATCH (a)-[:FRIEND]->+(b)
RETURN a.name, b.name`}</Code>

      <H2>Named Paths</H2>
      <Code>{`-- Assign a path to a variable
MATCH p = (a:Person {name: "Alice"})-[:FRIEND*]->(b)
RETURN p, length(p), nodes(p), relationships(p)`}</Code>

      <H2>Shortest Path</H2>
      <Code>{`-- Single shortest path
MATCH path = shortestPath(
  (a:Person {name: "Alice"})-[:FRIEND*]-(b:Person {name: "Dave"})
)
RETURN path, length(path)

-- All shortest paths (same length)
MATCH p = ALL SHORTEST (a:Person {name: "Alice"})--+(b:Person {name: "Dave"})
RETURN p`}</Code>

      <H2>Negated Relationship Types</H2>
      <P>
        Exclude specific relationship types using the <InlineCode>!</InlineCode> prefix.
      </P>
      <Code>{`-- Match any relationship except ACTED_IN
MATCH (a:Person)-[:!ACTED_IN]->(b)
RETURN a.name, type(b)`}</Code>

      <H2>Path Functions</H2>
      <Table
        headers={["Function", "Description"]}
        rows={[
          ["length(path)", "Number of relationships in the path"],
          ["nodes(path)", "List of all nodes in the path"],
          ["relationships(path)", "List of all relationships in the path"],
        ]}
      />
    </>
  );
}

function CypherSubqueriesSection() {
  return (
    <>
      <H1>Subquery Expressions</H1>

      <H2>EXISTS Subqueries</H2>
      <P>
        Test whether a pattern exists without returning the matched data.
      </P>
      <Code>{`-- People who know at least one other person named Alice
MATCH (n:Person)
WHERE EXISTS { (n)-[:FRIEND]->(:Person {name: "Alice"}) }
RETURN n.name

-- Negated existence
MATCH (n:Person)
WHERE NOT EXISTS { (n)-[:WORKS_AT]->(:Company) }
RETURN n.name AS unemployed`}</Code>

      <H2>COUNT Subqueries</H2>
      <P>Count pattern occurrences inline without a separate <InlineCode>WITH</InlineCode> stage.</P>
      <Code>{`-- Inline count in RETURN
MATCH (n:Person)
RETURN n.name, count{ (n)-[:FRIEND]->() } AS friendCount

-- In WITH for filtering
MATCH (n:Person)
WITH n, count{ (n)-[:FRIEND]->() } AS friendCount
WHERE friendCount > 3
RETURN n.name, friendCount`}</Code>
    </>
  );
}

function CypherDocumentsSection() {
  return (
    <>
      <H1>Document Operations</H1>
      <P>
        Anvil extends Cypher with native document store operations. Documents live in
        collections organized by schema (<InlineCode>public</InlineCode> or{" "}
        <InlineCode>auth</InlineCode>). These operations can be mixed with graph queries in
        the same transaction.
      </P>

      <H2>CREATE DOCUMENT</H2>
      <P>
        Insert a new document into a collection. The second argument is the document key (ID).
      </P>
      <Code>{`-- Basic document creation
CREATE DOCUMENT IN users alice {
  name: "Alice",
  age: 30,
  email: "alice@example.com"
}

-- With a generated UUID key
CREATE DOCUMENT IN events uuid() {
  event: "login",
  user: "alice",
  timestamp: timestamp()
}

-- In a schema-namespaced collection
CREATE DOCUMENT IN auth.users admin {
  username: "admin",
  role: "superuser"
}`}</Code>

      <H2>MATCH DOCUMENT</H2>
      <P>
        Query documents from a collection with filters. The bound variable gives access to
        document fields.
      </P>
      <Code>{`-- Query with field filter
MATCH DOCUMENT d IN users WHERE d.age > 25
RETURN d.name, d.email

-- Exact match
MATCH DOCUMENT d IN profiles WHERE d.username = "alice"
RETURN d

-- Multiple conditions
MATCH DOCUMENT d IN orders
WHERE d.status = "pending" AND d.total > 100
RETURN d.id, d.total`}</Code>

      <H2>UPSERT DOCUMENT</H2>
      <P>
        Insert a document if the key doesn't exist, or merge fields into the existing document.
        Existing fields not specified in the upsert body are preserved.
      </P>
      <Code>{`-- Insert or update
UPSERT DOCUMENT IN profiles alice {
  email: "alice@example.com",
  age: 31,
  updated_at: timestamp()
}

-- Idempotent event tracking
UPSERT DOCUMENT IN metrics daily_2024_01 {
  page_views: 1500,
  unique_visitors: 340
}`}</Code>

      <H2>DELETE DOCUMENT</H2>
      <P>Remove a document by collection and key.</P>
      <Code>{`-- Delete by key
DELETE DOCUMENT IN users alice

-- Delete from namespaced collection
DELETE DOCUMENT IN auth.refresh_tokens token_abc123`}</Code>

      <H2>UPSERT DOCUMENT ... WHERE</H2>
      <P>
        Update documents matching a predicate. Supports sync propagation when a sync rule
        covers the target collection.
      </P>
      <Code>{`-- Update all documents matching a condition
UPSERT DOCUMENT IN profiles WHERE status = "trial"
  SET status = "active", upgraded_at = timestamp()

-- Update with multiple conditions
UPSERT DOCUMENT IN orders WHERE region = "us" AND fulfilled = false
  SET fulfilled = true, fulfilled_at = timestamp()`}</Code>

      <H2>DELETE DOCUMENT ... WHERE</H2>
      <P>
        Delete all documents matching a predicate. Supports sync propagation when a sync rule
        covers the target collection.
      </P>
      <Code>{`-- Delete matching documents
DELETE DOCUMENT IN sessions WHERE expired = true

-- Delete from a namespaced collection
DELETE DOCUMENT IN auth.refresh_tokens WHERE user_id = "alice"`}</Code>

      <H2>SET on Documents</H2>
      <P>
        Update specific fields on matched documents using <InlineCode>SET</InlineCode>.
      </P>
      <Code>{`MATCH DOCUMENT d IN profiles WHERE d.username = "alice"
SET d.status = "active", d.verified = true`}</Code>

      <H2>Combining Graph and Document Queries</H2>
      <P>
        Document operations can be used alongside graph operations in the same query,
        enabling powerful cross-model workflows.
      </P>
      <Code>{`-- Create a graph node and a document in one transaction
CREATE (p:Person {name: "Alice", age: 30})
CREATE DOCUMENT IN profiles alice {name: "Alice", joined: timestamp()}

-- Read from documents in a graph query context
MATCH (p:Person {name: "Alice"})
MATCH DOCUMENT d IN profiles WHERE d.name = p.name
RETURN p, d.joined`}</Code>

      <H2>Document Filter Operators</H2>
      <P>
        When querying documents via the REST API or in <InlineCode>MATCH DOCUMENT</InlineCode>{" "}
        WHERE clauses, the following filter operators are available:
      </P>
      <Table
        headers={["Operator", "Description", "Example"]}
        rows={[
          ["eq / neq", "Equal / not equal", "d.status = 'active'"],
          ["lt / gt", "Less than / greater than", "d.age > 25"],
          ["between", "Inclusive range", "d.score between 80 and 100"],
          ["begins_with", "String prefix match", "d.name STARTS WITH 'A'"],
          ["contains", "String or list containment", "d.tags contains 'urgent'"],
          ["in", "Value in a set", "d.city IN ['Sydney', 'Melbourne']"],
          ["exists", "Field existence check", "d.email IS NOT NULL"],
          ["and / or", "Logical combinators", "d.age > 18 AND d.active = true"],
        ]}
      />

      <H2>Collection Features</H2>
      <Table
        headers={["Feature", "Description"]}
        rows={[
          ["Schema namespacing", "public.* (default) and auth.* (system/protected)"],
          ["Composite keys", "Partition key + sort key for hierarchical data"],
          ["TTL", "Automatic document expiry with default_ttl_ms"],
          ["Secondary indexes", "Global (GSI) and local (LSI) secondary indexes"],
          ["Batch operations", "Bulk insert/update/delete via REST API"],
          ["Paginated scan", "Cursor-based iteration over collections"],
        ]}
      />
    </>
  );
}

function CypherFunctionsSection() {
  return (
    <>
      <H1>Stored Functions</H1>
      <P>
        User-defined Cypher functions with typed parameters, default values, schema
        namespacing, and body caching. Functions can query the graph, read/write documents,
        and call other functions (up to 16 levels deep with cycle detection).
      </P>

      <H2>CREATE FUNCTION</H2>
      <Code>{`-- Simple expression function
CREATE FUNCTION greet(name: STRING) RETURNS STRING AS {
  'Hello, ' + name + '!'
}

-- With default parameter
CREATE FUNCTION greet(name: STRING = 'World') RETURNS STRING AS {
  'Hello, ' + name + '!'
}

-- Graph-reading function
CREATE FUNCTION friend_count(person: STRING) RETURNS INT AS {
  MATCH (p:Person {name: person})-[:FRIEND]->(f)
  RETURN count(f)
}

-- Document-reading function
CREATE FUNCTION get_email(username: STRING) RETURNS STRING AS {
  MATCH DOCUMENT d IN auth.users WHERE d.username = username
  RETURN d.email
}

-- Mutating function (writes data)
CREATE FUNCTION log_event(event: STRING) RETURNS VOID MUTATING AS {
  CREATE DOCUMENT IN audit uuid() {
    event: event,
    ts: timestamp()
  }
}`}</Code>

      <H2>Calling Functions</H2>
      <Code>{`-- Inline in expressions (non-mutating only)
MATCH (n:Person)
RETURN n.name, greet(n.name)

-- In WHERE clauses
MATCH (n:Person)
WHERE friend_count(n.name) > 5
RETURN n.name

-- With CALL ... YIELD (required for mutating functions)
CALL log_event('user_login') YIELD result

-- CALL with arguments from MATCH
MATCH (n:Person)
CALL greet(n.name) YIELD result
RETURN n.name, result`}</Code>

      <H2>Management</H2>
      <Code>{`-- Update existing function
CREATE OR REPLACE FUNCTION greet(name: STRING) RETURNS STRING AS {
  'Hi, ' + name + '!'
}

-- Drop a function
DROP FUNCTION greet

-- List all functions
SHOW FUNCTIONS

-- List functions in a schema
SHOW FUNCTIONS IN auth`}</Code>

      <H2>Parameter Types</H2>
      <Table
        headers={["Type", "Aliases", "Description"]}
        rows={[
          ["STRING", "", "Text value"],
          ["INT", "INTEGER", "64-bit integer"],
          ["FLOAT", "DOUBLE", "64-bit floating point"],
          ["BOOL", "BOOLEAN", "Boolean value"],
          ["LIST", "", "Array / list"],
          ["MAP", "", "Key-value object"],
          ["NODE", "", "Graph node"],
          ["RELATIONSHIP", "", "Graph relationship"],
          ["ANY", "", "Any type (no validation)"],
          ["VOID", "", "No return value (mutating only)"],
        ]}
      />

      <P>
        Functions in the <InlineCode>auth</InlineCode> schema are protected and require admin
        privileges. Max nesting depth is 16 levels with automatic cycle detection.
      </P>
    </>
  );
}

function CypherTriggersSection() {
  return (
    <>
      <H1>Triggers</H1>
      <P>
        Event-driven logic that fires automatically on INSERT, UPDATE, or DELETE — on graph
        labels or document collections. Triggers execute within the same transaction as the
        triggering operation, guaranteeing atomicity.
      </P>

      <H2>CREATE TRIGGER</H2>
      <Code>{`-- After insert on a document collection
CREATE TRIGGER create_profile
  AFTER INSERT ON COLLECTION auth.users
  FOR EACH ROW AS {
    UPSERT DOCUMENT IN profiles NEW.id {
      id: NEW.id,
      username: NEW.username,
      email: NEW.email
    }
  }

-- Before delete with RAISE to prevent deletion
CREATE TRIGGER protect_admin
  BEFORE DELETE ON COLLECTION auth.users
  FOR EACH ROW AS {
    RAISE 'Cannot delete admin users'
  }

-- Set timestamps on graph node creation
CREATE TRIGGER set_timestamps
  BEFORE INSERT ON :Project PRIORITY 10
  FOR EACH ROW AS {
    SET NEW.created_on = timestamp(),
        NEW.created_by = current_user()
  }

-- Audit log on delete
CREATE TRIGGER audit_delete
  AFTER DELETE ON :Project
  FOR EACH ROW AS {
    CREATE DOCUMENT IN audit_log uuid() {
      action: 'DELETE',
      old_name: OLD.name,
      deleted_by: current_user(),
      timestamp: timestamp()
    }
  }`}</Code>

      <H2>Trigger Body Statements</H2>
      <Table
        headers={["Statement", "Description"]}
        rows={[
          ["CREATE DOCUMENT IN coll key { ... }", "Insert document (no-op if key exists)"],
          ["UPSERT DOCUMENT IN coll key { ... }", "Insert or merge fields"],
          ["MATCH DOCUMENT d IN coll WHERE ... SET ...", "Find and update documents"],
          ["SET NEW.field = expr", "Modify row before write (BEFORE only)"],
          ["RAISE 'message'", "Abort the operation (BEFORE only)"],
        ]}
      />

      <H2>OLD / NEW Pseudo-Variables</H2>
      <Table
        headers={["Event", "OLD", "NEW"]}
        rows={[
          ["INSERT", "Not available", "The new row"],
          ["UPDATE", "Row before changes", "Row after changes"],
          ["DELETE", "The deleted row", "Not available"],
        ]}
      />

      <H2>Management</H2>
      <Code>{`CREATE OR REPLACE TRIGGER name ...
DROP TRIGGER name
ENABLE TRIGGER name
DISABLE TRIGGER name
SHOW TRIGGERS
SHOW TRIGGERS ON :Label
SHOW TRIGGERS ON COLLECTION auth.users`}</Code>

      <H2>Built-in Functions in Triggers</H2>
      <Table
        headers={["Function", "Description"]}
        rows={[
          ["current_user()", "UUID of the current session user"],
          ["current_username()", "Login username of the current session"],
          ["is_sync()", "Whether the operation was sync-originated"],
          ["timestamp()", "Current epoch milliseconds"],
          ["uuid()", "Generate a new UUID v4"],
        ]}
      />

      <H2>Chaining, Backfill & Depth</H2>
      <P>
        Trigger chaining: an <InlineCode>UPSERT DOCUMENT</InlineCode> executed inside a
        trigger body fires any AFTER triggers defined on the target collection.
      </P>
      <P>
        Trigger backfill: creating a new trigger automatically processes all existing
        records in its target (label or collection), so existing data is immediately
        consistent with the new logic.
      </P>
      <P>
        Priority ordering: lower number fires first (default 100). Recursive trigger
        firing is capped at 16 levels deep to prevent infinite loops.
        Use <InlineCode>SKIP TRIGGERS</InlineCode> on sync rules to prevent cascades.
      </P>
    </>
  );
}

function CypherRLSSection() {
  return (
    <>
      <H1>Row-Level Security</H1>
      <P>
        PostgreSQL-inspired fine-grained access control. Policies define predicates that
        determine which rows a user or role can see and modify, enforced transparently
        by the query engine.
      </P>

      <H2>Enable RLS</H2>
      <Code>{`-- Enable on a graph label (deny-by-default: no rows visible without policies)
ENABLE ROW LEVEL SECURITY ON :Project

-- Enable on a document collection
ENABLE ROW LEVEL SECURITY ON COLLECTION profiles`}</Code>

      <H2>CREATE POLICY</H2>
      <P>
        Syntax: <InlineCode>CREATE POLICY name ON target FOR op [TO role] USING (predicate)</InlineCode>.
        The <InlineCode>TO role</InlineCode> clause is optional — omitting it applies the policy to all users.
      </P>
      <Code>{`-- Users see only their own data
CREATE POLICY own_data ON :Project FOR SELECT TO reader
  USING (n.owner = current_user())

-- Policy without a role (applies to everyone)
CREATE POLICY public_read ON :Post FOR SELECT
  USING (n.published = true)

-- Multi-tenant isolation
CREATE POLICY tenant ON :Project FOR ALL TO authenticated
  USING (n.tenant_id = session('tenant_id'))

-- Restrictive policy (AND logic instead of OR)
CREATE POLICY no_secret ON :Document FOR SELECT TO reader
  USING (n.classification != 'SECRET') AS RESTRICTIVE

-- Policy on document collection
CREATE POLICY doc_own ON COLLECTION auth.users FOR SELECT TO reader
  USING (doc.owner = current_user())

-- Policy on relationships
CREATE POLICY knows_policy ON :FRIEND FOR SELECT TO reader
  USING (r.visible = true)`}</Code>

      <H2>Policy Operations</H2>
      <Table
        headers={["Operation", "Description"]}
        rows={[
          ["SELECT", "Filter rows on read"],
          ["INSERT", "Validate new rows"],
          ["UPDATE", "Filter rows eligible for update"],
          ["DELETE", "Filter rows eligible for delete"],
          ["ALL", "Applies to all operations"],
        ]}
      />

      <H2>Management</H2>
      <Code>{`DROP POLICY name ON :Label
SHOW POLICIES
SHOW POLICIES ON :Label
ENABLE ROW LEVEL SECURITY ON :Label
DISABLE ROW LEVEL SECURITY ON :Label
FORCE ROW LEVEL SECURITY ON :Label
SIMULATE POLICY AS alice WITH ROLE reader ON :Project`}</Code>

      <H2>Session Functions</H2>
      <Table
        headers={["Function", "Description"]}
        rows={[
          ["current_user()", "The authenticated user's UUID"],
          ["current_username()", "The authenticated login username"],
          ["session('key')", "Custom session variable (e.g., tenant_id)"],
        ]}
      />

      <H2>Write Enforcement</H2>
      <P>
        RLS policies are enforced on writes as well as reads. SET operations check the
        USING predicate per-node before applying changes. UPSERT DOCUMENT checks the
        USING predicate per-document. Write policies bypass the RBAC role check — any
        user whose data satisfies the predicate can write, regardless of role.
      </P>

      <H2>Behavior</H2>
      <P>
        Deny-by-default: when RLS is enabled on a target, queries with no matching policy
        are denied. RLS policies and the enabled/disabled state persist across server
        restarts (snapshot v5).
      </P>

      <P>
        When a sync rule links a label to a collection, a single policy on the label
        automatically applies to the paired collection too.
      </P>
    </>
  );
}

function CypherSyncSection() {
  return (
    <>
      <H1>Graph-Document Sync</H1>
      <P>
        Define sync rules to automatically keep graph nodes and document collections in sync.
        Changes propagate bidirectionally within the same transaction.
      </P>

      <H2>SYNC LABEL ... TO COLLECTION</H2>
      <Code>{`-- Sync Person nodes to a persons collection, keyed by name
SYNC LABEL Person TO COLLECTION persons KEY name INCLUDE name, email, age

-- Sync all properties (omit INCLUDE)
SYNC LABEL Product TO COLLECTION products KEY sku

-- With SKIP TRIGGERS to prevent cascades
SYNC LABEL User TO COLLECTION user_cache KEY username INCLUDE username, role SKIP TRIGGERS`}</Code>
      <P>
        Now creating a <InlineCode>:Person</InlineCode> node auto-creates a document in{" "}
        <InlineCode>persons</InlineCode>, and vice versa. The <InlineCode>KEY</InlineCode>{" "}
        property on the node becomes the document key.
      </P>

      <H2>Sync Directions</H2>
      <Table
        headers={["Direction", "Description"]}
        rows={[
          ["Bidirectional (default)", "Changes in either model propagate to the other"],
          ["Graph-to-Document", "Only graph writes create/update documents"],
          ["Document-to-Graph", "Only document writes create/update nodes"],
        ]}
      />

      <H2>Conflict Resolution</H2>
      <Table
        headers={["Strategy", "Description"]}
        rows={[
          ["Last-Write-Wins (default)", "Most recent write takes precedence"],
          ["Graph-Wins", "Graph data always takes precedence on conflict"],
          ["Document-Wins", "Document data always takes precedence on conflict"],
        ]}
      />

      <H2>Management</H2>
      <Code>{`-- List all sync rules
SHOW SYNC RULES

-- Drop a sync rule by ID
DROP SYNC RULE 1`}</Code>
    </>
  );
}

function CypherIndexesSection() {
  return (
    <>
      <H1>Indexes & Constraints</H1>

      <H2>CREATE INDEX</H2>
      <Code>{`-- Single property index
CREATE INDEX idx_person_name FOR (n:Person) ON (n.name)

-- Composite index
CREATE INDEX idx_person_city_age FOR (n:Person) ON (n.city, n.age)

-- Index on document collection
CREATE INDEX idx_orders_status FOR COLLECTION orders ON (status)`}</Code>

      <H2>Constraints</H2>
      <Code>{`-- Unique constraint
CREATE CONSTRAINT uniq_email FOR (n:Person) REQUIRE n.email IS UNIQUE

-- Composite unique constraint
CREATE CONSTRAINT uniq_tenant_user FOR (n:Account)
  REQUIRE (n.tenant_id, n.username) IS UNIQUE`}</Code>

      <H2>Management</H2>
      <Code>{`-- Drop an index
DROP INDEX idx_person_name

-- Drop a constraint
DROP CONSTRAINT uniq_email

-- List indexes
SHOW INDEXES

-- List constraints
SHOW CONSTRAINTS`}</Code>

      <H2>Index Types</H2>
      <Table
        headers={["Type", "Description"]}
        rows={[
          ["B+ tree", "Default. Supports equality, range, and prefix queries"],
          ["Unique", "B+ tree with uniqueness enforcement"],
          ["Composite", "Multi-property B+ tree index"],
          ["Full-text", "Text search with tokenization"],
          ["Spatial", "Geographic point indexing"],
        ]}
      />
    </>
  );
}

function CypherAnalysisSection() {
  return (
    <>
      <H1>Query Analysis</H1>
      <P>
        Anvil provides two tools for understanding query execution: <InlineCode>EXPLAIN</InlineCode>{" "}
        shows the planned execution without running the query, and <InlineCode>PROFILE</InlineCode>{" "}
        executes the query and reports actual performance statistics.
      </P>

      <H2>EXPLAIN</H2>
      <P>Show the query execution plan without executing it.</P>
      <Code>{`EXPLAIN MATCH (n:Person) WHERE n.age > 25 RETURN n

-- Complex query plan
EXPLAIN MATCH (a:Person)-[:FRIEND]->(b:Person)-[:WORKS_AT]->(c:Company)
WHERE a.age > 25
RETURN a.name, c.name`}</Code>

      <H2>PROFILE</H2>
      <P>Execute the query and show actual statistics (rows processed, time per operator).</P>
      <Code>{`PROFILE MATCH (n:Person)-[:FRIEND]->(m:Person)
RETURN n.name, m.name`}</Code>

      <H2>Query Analytics</H2>
      <Code>{`-- Most-called queries with latency percentiles
SHOW QUERY STATS LIMIT 10`}</Code>
      <P>
        Returns: query, count, avg_ms, p95_ms, p99_ms, min_ms, max_ms.
      </P>

      <H2>Event & Dependency Analysis</H2>
      <Code>{`-- View recent events
SHOW EVENTS
SHOW EVENTS LIMIT 20
SHOW EVENTS WHERE type = 'QuerySlow'

-- Map trigger/function/sync dependencies
SHOW DEPENDENCIES
SHOW DEPENDENCIES FOR TRIGGER create_profile`}</Code>
    </>
  );
}

function CypherBuiltinFunctionsSection() {
  return (
    <>
      <H1>Built-in Functions</H1>
      <P>
        Anvil includes 55+ built-in functions covering aggregation, string manipulation,
        math, list operations, type conversion, temporal, and spatial operations.
      </P>

      <H2>Scalar Functions</H2>
      <Table
        headers={["Function", "Description"]}
        rows={[
          ["id(node)", "Internal node ID"],
          ["type(rel)", "Relationship type string"],
          ["labels(node)", "List of node labels"],
          ["properties(entity)", "Properties map (excludes internals)"],
          ["keys(map)", "List of map keys"],
          ["coalesce(a, b, ...)", "First non-null value"],
          ["exists(expr)", "Whether expression is non-null"],
          ["toBoolean(expr)", "Convert to boolean"],
          ["timestamp()", "Current epoch milliseconds"],
          ["uuid()", "Generate UUID v4"],
        ]}
      />

      <H2>String Functions</H2>
      <Table
        headers={["Function", "Description"]}
        rows={[
          ["toString(x)", "Convert to string"],
          ["toUpper(s) / toLower(s)", "Case conversion"],
          ["trim(s) / ltrim(s) / rtrim(s)", "Whitespace trimming"],
          ["replace(s, from, to)", "Replace substring"],
          ["substring(s, start, len?)", "Extract substring"],
          ["left(s, n) / right(s, n)", "First/last n characters"],
          ["split(s, delimiter)", "Split into list"],
          ["reverse(s)", "Reverse string"],
          ["size(s)", "String length"],
        ]}
      />

      <H2>Math Functions</H2>
      <Table
        headers={["Function", "Description"]}
        rows={[
          ["abs(n)", "Absolute value"],
          ["ceil(n) / floor(n) / round(n)", "Rounding"],
          ["sign(n)", "Sign (-1, 0, or 1)"],
          ["sqrt(n)", "Square root"],
          ["log(n) / log10(n)", "Natural / base-10 logarithm"],
          ["exp(n)", "Euler's number raised to n"],
          ["e() / pi()", "Mathematical constants"],
          ["rand()", "Random float between 0 and 1"],
          ["toInteger(x) / toFloat(x)", "Numeric type conversion"],
        ]}
      />

      <H2>List Functions</H2>
      <Table
        headers={["Function", "Description"]}
        rows={[
          ["size(list)", "Number of elements"],
          ["head(list)", "First element"],
          ["last(list)", "Last element"],
          ["tail(list)", "All elements except first"],
          ["range(start, end, step?)", "Generate integer range"],
          ["reverse(list)", "Reverse list order"],
          ["nodes(path)", "List of nodes in a path"],
          ["relationships(path)", "List of relationships in a path"],
        ]}
      />

      <H2>Temporal Functions</H2>
      <Table
        headers={["Function", "Description"]}
        rows={[
          ["date()", "Current date"],
          ["datetime()", "Current datetime"],
          ["time()", "Current time"],
          ["duration({days: 5})", "Create a duration"],
          ["date.truncate('month', d)", "Truncate to unit"],
          ["datetime.truncate('hour', dt)", "Truncate datetime to unit"],
        ]}
      />

      <H2>Spatial Functions</H2>
      <Table
        headers={["Function", "Description"]}
        rows={[
          ["point({x, y})", "2D Cartesian point"],
          ["point({x, y, z})", "3D Cartesian point"],
          ["point({latitude, longitude})", "Geographic point (WGS 84)"],
          ["distance(p1, p2)", "Distance between points (Haversine for geographic)"],
        ]}
      />
    </>
  );
}

function CypherOperatorsSection() {
  return (
    <>
      <H1>Operators</H1>

      <H2>Comparison</H2>
      <Table
        headers={["Operator", "Description"]}
        rows={[
          ["=", "Equal"],
          ["<> or !=", "Not equal"],
          ["<", "Less than"],
          [">", "Greater than"],
          ["<=", "Less than or equal"],
          [">=", "Greater than or equal"],
          ["IS NULL", "Null check"],
          ["IS NOT NULL", "Non-null check"],
        ]}
      />

      <H2>Boolean</H2>
      <Table
        headers={["Operator", "Description"]}
        rows={[
          ["AND", "Logical AND"],
          ["OR", "Logical OR"],
          ["NOT", "Logical negation"],
          ["XOR", "Exclusive OR"],
        ]}
      />

      <H2>String</H2>
      <Table
        headers={["Operator", "Description"]}
        rows={[
          ["STARTS WITH", "String prefix match"],
          ["ENDS WITH", "String suffix match"],
          ["CONTAINS", "Substring match"],
          ["=~", "Regular expression match"],
          ["+", "String concatenation"],
        ]}
      />

      <H2>Mathematical</H2>
      <Table
        headers={["Operator", "Description"]}
        rows={[
          ["+", "Addition"],
          ["-", "Subtraction"],
          ["*", "Multiplication"],
          ["/", "Division"],
          ["%", "Modulo"],
          ["^", "Exponentiation"],
        ]}
      />

      <H2>List</H2>
      <Table
        headers={["Operator", "Description"]}
        rows={[
          ["IN", "Check membership in a list"],
          ["+", "List concatenation"],
          ["[index]", "Element access (0-based)"],
          ["[start..end]", "Sublist slice"],
        ]}
      />

      <H2>Map / Property</H2>
      <Table
        headers={["Operator", "Description"]}
        rows={[
          [".key", "Property access"],
          ["['key']", "Dynamic property access"],
        ]}
      />
    </>
  );
}


function GraphQLSection() {
  return (
    <>
      <H1>GraphQL API</H1>
      <P>
        Auto-generated GraphQL schema from your graph structure with introspection support.
        Endpoint: <InlineCode>POST /graphql</InlineCode>
      </P>
      <H2>Query Example</H2>
      <Code>{`{
  users(where: { username: "admin" }) {
    id
    username
    email
  }
}`}</Code>
      <H2>Introspection</H2>
      <Code>{`{
  __schema {
    types { name kind }
  }
}`}</Code>
      <P>
        Access the GraphQL playground from the Hammer UI sidebar under <strong>GraphQL</strong>.
      </P>
    </>
  );
}

function DocumentsSection() {
  return (
    <>
      <H1>Document Store</H1>
      <P>
        Built-in NoSQL document store with collections, composite keys, TTL, secondary indexes,
        and bidirectional graph-document sync. Collections are organized into schemas:{" "}
        <InlineCode>public</InlineCode> (default) and <InlineCode>auth</InlineCode> (system).
      </P>

      <H2>REST API</H2>
      <Table
        headers={["Method", "Endpoint", "Description"]}
        rows={[
          ["POST", "/docs/{collection}", "Create collection"],
          ["DELETE", "/docs/{collection}", "Drop collection"],
          ["GET", "/docs/{collection}/{id}", "Get document"],
          ["PUT", "/docs/{collection}/{id}", "Upsert document"],
          ["DELETE", "/docs/{collection}/{id}", "Delete document"],
          ["POST", "/docs/{collection}/query", "Query with filters"],
          ["POST", "/docs/{collection}/batch", "Batch operations"],
          ["GET", "/docs/{collection}/scan", "Paginated scan"],
        ]}
      />

      <H2>Create & Query Documents</H2>
      <Code>{`# Create a collection
curl -X POST http://localhost:7474/docs/orders \\
  -H "Authorization: Bearer $TOKEN" \\
  -d '{"composite_keys": false}'

# Insert a document
curl -X PUT http://localhost:7474/docs/orders/order-1 \\
  -H "Authorization: Bearer $TOKEN" \\
  -d '{"body": {"item": "Widget", "qty": 10, "status": "pending"}}'

# Query with filters
curl -X POST http://localhost:7474/docs/orders/query \\
  -H "Authorization: Bearer $TOKEN" \\
  -d '{"filter": {"op": "eq", "field": "status", "value": "pending"}}'`}</Code>

      <H2>Cypher Integration</H2>
      <Code>{`CREATE DOCUMENT IN orders order1 {item: "Widget", qty: 10}
MATCH DOCUMENT d IN orders WHERE d.status = "pending" RETURN d.item`}</Code>

      <H2>Filter Operators</H2>
      <Table
        headers={["Operator", "Description"]}
        rows={[
          ["eq / neq", "Equal / not equal"],
          ["lt / gt", "Less than / greater than"],
          ["between", "Range (inclusive)"],
          ["begins_with", "String prefix"],
          ["contains", "String or list contains"],
          ["in", "Value in array"],
          ["exists", "Field exists"],
          ["and / or", "Logical combinators"],
        ]}
      />

      <H2>Collection Management (Cypher)</H2>
      <Code>{`-- Create a collection
CREATE COLLECTION orders

-- Create only if it doesn't already exist
CREATE COLLECTION IF NOT EXISTS orders

-- Drop a collection
DROP COLLECTION orders`}</Code>
      <P>
        System collections (<InlineCode>auth.*</InlineCode>) cannot be dropped.
      </P>
    </>
  );
}

function SyncSection() {
  return (
    <>
      <H1>Graph-Document Sync</H1>
      <P>
        Define sync rules to automatically keep graph nodes and document collections in sync.
        Changes propagate bidirectionally within the same transaction.
      </P>
      <H2>Define a Sync Rule</H2>
      <Code>{`SYNC LABEL Person TO COLLECTION persons KEY name INCLUDE name, email, age`}</Code>
      <P>
        Now creating a <InlineCode>:Person</InlineCode> node auto-creates a document in{" "}
        <InlineCode>persons</InlineCode>, and vice versa. The <InlineCode>INCLUDE</InlineCode>{" "}
        clause controls which fields sync.
      </P>
      <H2>Manage Sync Rules</H2>
      <Code>{`-- List all sync rules
SHOW SYNC RULES

-- Drop a rule by ID
DROP SYNC RULE 1`}</Code>

      <H2>Options</H2>
      <Table
        headers={["Option", "Description"]}
        rows={[
          ["KEY property", "Node property used as document key"],
          ["INCLUDE prop1, prop2", "Fields to sync (empty = all)"],
          ["SKIP TRIGGERS", "Sync writes don't fire triggers on the target"],
        ]}
      />
    </>
  );
}

function FunctionsSection() {
  return (
    <>
      <H1>Stored Functions</H1>
      <P>
        User-defined Cypher functions with typed parameters, default values, schema namespacing,
        and body caching. Functions can query the graph and document store.
      </P>

      <H2>CREATE FUNCTION</H2>
      <Code>{`CREATE FUNCTION greet(name: STRING) RETURNS STRING AS {
  'Hello, ' + name + '!'
}

-- With default parameter
CREATE FUNCTION greet(name: STRING = 'World') RETURNS STRING AS {
  'Hello, ' + name + '!'
}

-- Graph-reading function
CREATE FUNCTION friend_count(person: STRING) RETURNS INT AS {
  MATCH (p:Person {name: person})-[:FRIEND]->(f) RETURN count(f)
}

-- Document-reading function
CREATE FUNCTION get_email(username: STRING) RETURNS STRING AS {
  MATCH DOCUMENT d IN auth.users WHERE d.username = username RETURN d.email
}

-- Mutating function
CREATE FUNCTION log_event(event: STRING) RETURNS VOID MUTATING AS {
  CREATE DOCUMENT IN audit uuid() {event: event, ts: timestamp()}
}`}</Code>

      <H2>Calling Functions</H2>
      <Code>{`-- Inline in queries
MATCH (n:Person) RETURN greet(n.name)

-- With CALL...YIELD
CALL greet('Alice') YIELD result

-- In WHERE clauses
MATCH (n:Person) WHERE friend_count(n.name) > 5 RETURN n.name`}</Code>

      <H2>Management</H2>
      <Code>{`CREATE OR REPLACE FUNCTION greet(...) ...
DROP FUNCTION greet
SHOW FUNCTIONS
SHOW FUNCTIONS IN auth`}</Code>

      <H2>Parameter Types</H2>
      <Table
        headers={["Type", "Description"]}
        rows={[
          ["STRING", "Text value"],
          ["INT / INTEGER", "64-bit integer"],
          ["FLOAT / DOUBLE", "64-bit float"],
          ["BOOL / BOOLEAN", "Boolean"],
          ["LIST", "Array"],
          ["MAP", "Key-value object"],
          ["ANY", "Any type"],
          ["VOID", "No return (mutating only)"],
        ]}
      />

      <P>
        Schema namespacing: <InlineCode>auth.*</InlineCode> functions are protected (admin only).
        Max nesting depth: 16 levels with cycle detection.
      </P>
    </>
  );
}

function TriggersSection() {
  return (
    <>
      <H1>Triggers</H1>
      <P>
        Event-driven logic that fires automatically on INSERT, UPDATE, or DELETE — on graph labels
        or document collections. Triggers execute within the same transaction as the triggering operation.
      </P>

      <H2>CREATE TRIGGER</H2>
      <Code>{`-- After insert: auto-create a profile (upsert for idempotency)
CREATE TRIGGER create_profile
  AFTER INSERT ON COLLECTION auth.users
  FOR EACH ROW AS {
    UPSERT DOCUMENT IN profiles NEW.id {
      id: NEW.id,
      username: NEW.username,
      email: NEW.email
    }
  }

-- After update: keep profile in sync (creates if missing)
CREATE TRIGGER sync_profile
  AFTER UPDATE ON COLLECTION auth.users
  FOR EACH ROW AS {
    UPSERT DOCUMENT IN profiles NEW.id {
      id: NEW.id,
      username: NEW.username,
      email: NEW.email
    }
  }

-- Before delete with RAISE to prevent
CREATE TRIGGER protect_admin
  BEFORE DELETE ON COLLECTION auth.users
  FOR EACH ROW AS {
    RAISE 'Cannot delete admin users'
  }

-- Set timestamps on node creation
CREATE TRIGGER set_timestamps
  BEFORE INSERT ON :Project PRIORITY 10
  FOR EACH ROW AS {
    SET NEW.created_on = timestamp(),
        NEW.created_by = current_user()
  }

-- Audit log on delete
CREATE TRIGGER audit_delete
  AFTER DELETE ON :Project
  FOR EACH ROW AS {
    CREATE DOCUMENT IN audit_log uuid() {
      action: 'DELETE',
      old_name: OLD.name,
      deleted_by: current_user(),
      timestamp: timestamp()
    }
  }`}</Code>

      <H2>Trigger Body Statements</H2>
      <Table
        headers={["Statement", "Description"]}
        rows={[
          ["CREATE DOCUMENT IN coll key { fields }", "Insert new document (no-op if key exists)"],
          ["UPSERT DOCUMENT IN coll key { fields }", "Insert if missing, update fields if exists"],
          ["MATCH DOCUMENT d IN coll WHERE expr + SET d.field = expr", "Find and update matching documents"],
          ["SET NEW.field = expr", "Modify new row (BEFORE INSERT/UPDATE only)"],
          ["RAISE 'message'", "Abort the operation (BEFORE triggers only)"],
        ]}
      />

      <H2>OLD / NEW Variables</H2>
      <Table
        headers={["Event", "OLD", "NEW"]}
        rows={[
          ["INSERT", "not available", "the new row"],
          ["UPDATE", "row before changes", "row after changes"],
          ["DELETE", "the deleted row", "not available"],
        ]}
      />

      <H2>Management</H2>
      <Code>{`CREATE OR REPLACE TRIGGER name ...
DROP TRIGGER name
ENABLE TRIGGER name
DISABLE TRIGGER name
SHOW TRIGGERS
SHOW TRIGGERS ON :Label
SHOW TRIGGERS ON COLLECTION auth.users`}</Code>

      <H2>Built-in Functions in Triggers</H2>
      <Table
        headers={["Function", "Description"]}
        rows={[
          ["current_user()", "UUID of the current session user"],
          ["current_username()", "Login username of the current session"],
          ["is_sync()", "Whether operation is sync-originated"],
          ["timestamp()", "Current epoch ms"],
          ["uuid()", "Generate a new UUID v4"],
        ]}
      />

      <H2>Sync Runs Before AFTER Triggers</H2>
      <P>
        On a collection write (REST <InlineCode>PUT /docs/&#123;collection&#125;/&#123;id&#125;</InlineCode>{" "}
        or <InlineCode>DELETE</InlineCode>), the sync engine projects the
        document into the graph <em>before</em> any AFTER INSERT / UPDATE /
        DELETE trigger fires. Trigger bodies can therefore <InlineCode>MATCH</InlineCode>{" "}
        the synced node and rely on it being present (or absent, for deletes)
        — there's no race against the sync pass.
      </P>

      <H2>Chaining, Backfill & Depth</H2>
      <P>
        Trigger chaining: an <InlineCode>UPSERT DOCUMENT</InlineCode> executed inside a
        trigger body fires any AFTER triggers defined on the target collection.
      </P>
      <P>
        Trigger backfill: creating a new trigger automatically processes all existing
        records in its target, so existing data is immediately consistent with the new logic.
      </P>
      <P>
        Priority ordering (lower = first, default 100). Recursive trigger firing is capped
        at 16 levels deep to prevent infinite loops.
        Use <InlineCode>SKIP TRIGGERS</InlineCode> on sync rules to prevent cascades.
        <InlineCode>UPSERT DOCUMENT</InlineCode> only updates specified fields — existing fields are preserved.
      </P>
    </>
  );
}

function RLSSection() {
  return (
    <>
      <H1>Row-Level Security</H1>
      <P>
        PostgreSQL-inspired fine-grained access control. Policies define which rows a user or role
        can see and modify, enforced transparently by the query engine.
      </P>

      <H2>Enable RLS</H2>
      <Code>{`ENABLE ROW LEVEL SECURITY ON :Project
-- Deny-by-default: without policies, no rows visible`}</Code>

      <H2>Create Policies</H2>
      <P>
        Syntax: <InlineCode>CREATE POLICY name ON target FOR op [TO role] USING (predicate)</InlineCode>.
        The <InlineCode>TO role</InlineCode> clause is optional — omitting it applies the policy to all users.
      </P>
      <Code>{`-- Users see only their own data
CREATE POLICY own_data ON :Project FOR SELECT TO reader
  USING (n.owner = current_user())

-- Policy without a role (applies to everyone)
CREATE POLICY public_read ON :Post FOR SELECT
  USING (n.published = true)

-- Multi-tenant isolation
CREATE POLICY tenant ON :Project FOR ALL TO authenticated
  USING (n.tenant_id = session('tenant_id'))

-- Restrictive policy (AND logic)
CREATE POLICY no_secret ON :Document FOR SELECT TO reader
  USING (n.classification != 'SECRET') AS RESTRICTIVE`}</Code>

      <H2>Session Functions</H2>
      <Table
        headers={["Function", "Description"]}
        rows={[
          ["current_user()", "The authenticated user's UUID"],
          ["current_username()", "The authenticated login username"],
          ["session('key')", "Custom session variable (e.g., tenant_id)"],
        ]}
      />

      <H2>Write Enforcement</H2>
      <P>
        SET operations check the USING predicate per-node before applying changes.
        UPSERT DOCUMENT checks the USING predicate per-document. Write policies bypass
        the RBAC role check — any user whose data satisfies the predicate can write.
      </P>

      <H2>Behavior</H2>
      <P>
        Deny-by-default: when RLS is enabled, no matching policy means the operation is
        denied. Policies and the enabled/disabled state persist across server restarts
        (snapshot v5).
      </P>

      <H2>Sync Pairs</H2>
      <P>
        When a sync rule links a label to a collection, a single policy on the label automatically
        applies to the paired collection too.
      </P>

      <H2>Management</H2>
      <Code>{`DROP POLICY name ON :Label
SHOW POLICIES
SHOW POLICIES ON :Label
ENABLE / DISABLE / FORCE ROW LEVEL SECURITY ON :Label
SIMULATE POLICY AS alice WITH ROLE reader ON :Project`}</Code>
    </>
  );
}

function AuthSection() {
  return (
    <>
      <H1>Authentication</H1>
      <P>
        Graph-native auth with users and roles stored in <InlineCode>auth.*</InlineCode>{" "}
        schema-namespaced collections, synced to graph nodes.
      </P>

      <H2>Login</H2>
      <Code>{`curl -X POST http://localhost:7474/auth/login \\
  -d '{"username": "admin", "password": "anvil"}'

# Response: { "idToken": "eyJ...", "refreshToken": "...", "accessToken": "eyJ..." }`}</Code>

      <H2>Use the Token</H2>
      <Code>{`curl http://localhost:7474/db/query \\
  -H "Authorization: Bearer eyJ..." \\
  -d '{"query": "MATCH (n) RETURN n"}'`}</Code>

      <H2>Register / Refresh / Change Password</H2>
      <Code>{`POST /auth/register   -- { username, password, email }
POST /auth/refresh    -- { refresh_token }
POST /auth/change-password -- { old_password, new_password }`}</Code>

      <H2>Key Features</H2>
      <Table
        headers={["Feature", "Detail"]}
        rows={[
          ["JWT RS256", "Asymmetric signing, persistent key pair (data/jwt_key.pem)"],
          ["JWKS", "GET /.well-known/jwks.json for external verification"],
          ["Argon2id", "OWASP-recommended password hashing"],
          ["Refresh tokens", "7-day refresh, 1-hour access tokens"],
          ["Schema collections", "auth.users, auth.roles, auth.user_roles, auth.refresh_tokens"],
          ["Graph sync", ":User and :Role nodes with [:HAS_ROLE] relationships"],
          ["Forced password change", "Default admin must change password on first login"],
        ]}
      />

      <H2>Passwordless Login (OTP)</H2>
      <P>
        Email-based login that doesn't require a password. The user requests
        a 6-digit code sent to their inbox, then exchanges it for a JWT —
        same token shape as the password-login flow.
      </P>
      <Code>{`# 1. Request a code (no auth required)
curl -X POST http://localhost:7474/auth/otp/request \\
  -d '{"email":"alice@example.com"}'
# => { "expires_in_seconds": 300, "message": "If an account ... has been sent." }

# 2. Exchange the code for a JWT
curl -X POST http://localhost:7474/auth/otp/verify \\
  -d '{"email":"alice@example.com","code":"482901"}'
# => { "accessToken": "...", "idToken": "...", "refreshToken": "...", "mustChangePassword": false }`}</Code>
      <Table
        headers={["Setting", "Default", "Description"]}
        rows={[
          ["auth.email.otp_ttl_secs", "300", "How long a code is valid"],
          ["auth.email.otp_max_attempts", "3", "Lockout after this many wrong codes for the same OTP"],
          ["auth.allow_otp_registration", "false", "Auto-create a user when verify is called for an unknown email"],
        ]}
      />

      <H3>Auto-Registration</H3>
      <P>
        With <InlineCode>auth.allow_otp_registration = true</InlineCode>, an
        OTP verify for an email that isn't in <InlineCode>auth.users</InlineCode>{" "}
        auto-creates the account with the <InlineCode>reader</InlineCode> role,{" "}
        <InlineCode>email_verified: true</InlineCode>, and no password. Disabled
        by default — accidentally exposing a passwordless onboarding path to
        anyone with a working SMTP inbox is rarely what you want.
      </P>
      <P>
        When the flag is off, an unknown-email verify returns the same{" "}
        <InlineCode>401 "Invalid or expired code"</InlineCode> as a wrong
        code. Identical response shapes prevent the endpoint from being used
        to enumerate registered addresses.
      </P>

      <H3>Username Collisions</H3>
      <P>
        The username doubles as the document key in{" "}
        <InlineCode>auth.users</InlineCode>, so it has to be unique. On
        auto-registration the server tries the email's local part first —
        e.g. <InlineCode>alice@example.com</InlineCode> →{" "}
        <InlineCode>alice</InlineCode>. If that's already taken (because a
        different person at a different domain shares the local part, or
        someone manually registered the name), the server appends a 6-char
        hex suffix and retries: <InlineCode>alice-a3f9d2</InlineCode>.
        Retries are capped at 10 attempts; the suffix space is 24 bits, so
        any realistic user base won't hit that ceiling.
      </P>
      <P>
        The provisional user doc carries{" "}
        <InlineCode>username_provisional: true</InlineCode> so a UI can
        prompt the new user to choose a permanent handle. Both{" "}
        <InlineCode>auth.users</InlineCode> and{" "}
        <InlineCode>auth.user_roles</InlineCode> are keyed on the resolved
        (potentially suffixed) name, so role lookup stays in sync without
        any extra steps.
      </P>

      <H2>Service Accounts & API Keys</H2>
      <P>
        Long-lived credentials for CI, scripts, and machine clients. A
        service account holds a role set and zero or more API keys; each key
        can narrow that role set with a scope allowlist and may be revoked
        independently of the account.
      </P>
      <Code>{`# Create the account
curl -X POST http://localhost:7474/auth/service-accounts \\
  -H "Authorization: Bearer $ADMIN_JWT" \\
  -d '{"name": "ci-bot", "roles": ["editor"]}'

# Mint a key — the plaintext is returned ONCE, only stored as a hash after
curl -X POST http://localhost:7474/auth/service-accounts/$ID/keys \\
  -H "Authorization: Bearer $ADMIN_JWT" \\
  -d '{"name": "github-actions"}'
# => { "key": "anvil_sk_...", "key_id": "...", "prefix": "anvil_sk_xxxxxx" }

# Use the key like any Bearer token
curl http://localhost:7474/db/query \\
  -H "Authorization: Bearer anvil_sk_..." \\
  -d '{"query": "MATCH (n) RETURN n"}'`}</Code>
      <Table
        headers={["Capability", "Detail"]}
        rows={[
          ["Key prefix", "anvil_sk_ — the auth middleware uses this to distinguish keys from JWTs"],
          ["Storage", "auth.service_accounts and auth.api_keys collections (admin-only writes)"],
          ["Scopes", "Per-key allowlist; intersected with the account's roles at request time"],
          ["service_role", "Capability flag that bypasses RLS when both the account and key scope allow it"],
          ["Auditing", "AuthEvents emitted on create / use / revoke (prefix-only, never logs the secret)"],
          ["Throttled last-used", "last_used_on updates are coalesced to avoid write amplification"],
        ]}
      />

      <H2>Email Delivery (SMTP)</H2>
      <P>
        Verification, OTP, and password-reset emails ship through a built-in SMTP
        client with TLS. Configure under <InlineCode>[auth.email]</InlineCode> in{" "}
        <InlineCode>anvil.toml</InlineCode>, override via{" "}
        <InlineCode>ANVIL_SMTP_*</InlineCode> env vars, or hot-reload through{" "}
        <InlineCode>system.settings</InlineCode>.
      </P>
      <Code>{`[auth.email]
smtp_host = "smtp.resend.com"
smtp_port = 465                  # 465 = implicit TLS, 587 = STARTTLS
smtp_user = "resend"
smtp_pass = "re_xxxxxxxxxxxxxxxx"
smtp_from = "Anvil DB <noreply@example.com>"
smtp_starttls = true             # only consulted when port != 465`}</Code>

      <H3>TLS Modes</H3>
      <Table
        headers={["Port", "Mode", "When to use"]}
        rows={[
          ["465", "Implicit TLS", "Resend, Mailgun TLS endpoints — handshake happens before SMTP"],
          ["587", "STARTTLS upgrade", "Gmail, Office 365, most relays — plaintext greeting then upgrade"],
          ["25 / other", "Plaintext", "Dev-only — set smtp_starttls=false to opt in"],
        ]}
      />
      <P>
        TLS uses <InlineCode>tokio-rustls</InlineCode> with Mozilla's
        webpki-roots trust store. SMTP replies are parsed across multi-line
        <InlineCode>250-</InlineCode> capability lists, and message bodies are
        dot-stuffed (RFC 5321 §4.5.2) so payload lines beginning with{" "}
        <InlineCode>.</InlineCode> don't terminate the DATA section early.
      </P>

      <H3>Webhook Alternative</H3>
      <P>
        Set <InlineCode>ANVIL_EMAIL_WEBHOOK_URL</InlineCode> (or{" "}
        <InlineCode>webhook_url</InlineCode> in the config) to POST email
        payloads as JSON to an external provider instead of speaking SMTP
        directly. Useful when an outbound TCP relay isn't an option.
      </P>
    </>
  );
}

function ObservabilitySection() {
  return (
    <>
      <H1>Observability & Event Logging</H1>
      <P>
        Built-in event log capturing trigger firings, function calls, query executions, and auth
        events. In-memory ring buffer with configurable retention (10K events / 24 hours).
      </P>

      <H2>Event Types</H2>
      <Table
        headers={["Type", "Description"]}
        rows={[
          ["TriggerFired / TriggerError", "Trigger executions"],
          ["FunctionCalled / FunctionError", "UDF calls"],
          ["QueryExecuted / QuerySlow", "Cypher queries"],
          ["AuthEvent", "Authentication events"],
          ["SyncEvent", "Sync rule propagations"],
        ]}
      />

      <H2>Query Events</H2>
      <Code>{`SHOW EVENTS
SHOW EVENTS LIMIT 20
SHOW EVENTS WHERE type = 'TriggerError'
SHOW EVENTS WHERE name = 'my_trigger'`}</Code>

      <H2>Query Analytics</H2>
      <Code>{`-- Most-called queries with latency percentiles
SHOW QUERY STATS LIMIT 10`}</Code>
      <P>Returns: query, count, avg_ms, p95_ms, p99_ms, min_ms, max_ms.</P>

      <H2>Dependency Analysis</H2>
      <Code>{`-- Map all trigger/function/sync dependencies
SHOW DEPENDENCIES

-- Dependencies for a specific trigger
SHOW DEPENDENCIES FOR TRIGGER create_profile`}</Code>
      <P>Detects potential infinite loops and sync-trigger overlaps.</P>

      <H2>Alert Rules</H2>
      <Code>{`CREATE ALERT my_alert WHEN TriggerError > 10 IN 5m THEN LOG
SHOW ALERTS
DROP ALERT my_alert`}</Code>

      <H3>Built-in Alerts</H3>
      <Table
        headers={["Alert", "Condition"]}
        rows={[
          ["trigger_error_spike", "10+ TriggerError in 5 minutes"],
          ["slow_query_spike", "5+ QuerySlow in 5 minutes"],
          ["auth_failure_burst", "20+ AuthEvent in 1 minute"],
        ]}
      />
    </>
  );
}

function APISection() {
  return (
    <>
      <H1>HTTP API Reference</H1>

      <H2>Core</H2>
      <Table
        headers={["Method", "Endpoint", "Description"]}
        rows={[
          ["GET", "/", "Server info"],
          ["GET", "/health", "Health check"],
          ["POST", "/db/query", "Execute Cypher query"],
          ["POST", "/db/import/cypher", "Import a Cypher script (admin/editor)"],
          ["GET", "/db/{name}/schema", "Get database schema"],
          ["GET", "/db/{name}/graph", "Get full graph data"],
          ["POST", "/graphql", "GraphQL endpoint"],
          ["ANY", "/functions/v1/{name}", "Invoke a stored edge function"],
        ]}
      />

      <H2>Authentication</H2>
      <Table
        headers={["Method", "Endpoint", "Description"]}
        rows={[
          ["POST", "/auth/login", "Login, returns JWT tokens"],
          ["POST", "/auth/refresh", "Refresh access token"],
          ["POST", "/auth/register", "Register new user"],
          ["POST", "/auth/change-password", "Change password"],
          ["GET", "/auth/verify", "Verify email via token query param"],
          ["POST", "/auth/resend-verification", "Resend the verification email"],
          ["POST", "/auth/otp/request", "Request a 6-digit OTP for an email"],
          ["POST", "/auth/otp/verify", "Verify OTP, returns JWT tokens"],
          ["GET", "/.well-known/jwks.json", "JWKS public keys"],
        ]}
      />

      <H2>Service Accounts (admin)</H2>
      <Table
        headers={["Method", "Endpoint", "Description"]}
        rows={[
          ["POST", "/auth/service-accounts", "Create service account"],
          ["GET", "/auth/service-accounts", "List service accounts"],
          ["GET", "/auth/service-accounts/{id}", "Get one"],
          ["PATCH", "/auth/service-accounts/{id}", "Update name / roles"],
          ["DELETE", "/auth/service-accounts/{id}", "Delete account (revokes all keys)"],
          ["POST", "/auth/service-accounts/{id}/keys", "Mint a new API key (plaintext returned once)"],
          ["GET", "/auth/service-accounts/{id}/keys", "List keys for an account"],
          ["DELETE", "/auth/service-accounts/{id}/keys/{key_id}", "Revoke an API key"],
        ]}
      />

      <H2>System Settings (admin)</H2>
      <Table
        headers={["Method", "Endpoint", "Description"]}
        rows={[
          ["GET", "/system/settings", "List all runtime settings"],
          ["GET", "/system/settings/{key}", "Get one setting"],
          ["PUT", "/system/settings/{key}", "Update one (hot-reload, no restart)"],
          ["DELETE", "/system/settings/{key}", "Reset to file / env / default"],
        ]}
      />

      <H2>Document Store</H2>
      <Table
        headers={["Method", "Endpoint", "Description"]}
        rows={[
          ["GET", "/docs", "List collections"],
          ["POST", "/docs/{collection}", "Create collection"],
          ["DELETE", "/docs/{collection}", "Drop collection"],
          ["GET", "/docs/{collection}/{id}", "Get document"],
          ["PUT", "/docs/{collection}/{id}", "Upsert document"],
          ["DELETE", "/docs/{collection}/{id}", "Delete document"],
          ["POST", "/docs/{collection}/query", "Query with filters"],
          ["POST", "/docs/{collection}/batch", "Batch operations"],
          ["GET", "/docs/{collection}/scan", "Paginated scan"],
        ]}
      />

      <H2>Admin</H2>
      <Table
        headers={["Method", "Endpoint", "Description"]}
        rows={[
          ["GET", "/admin/stats", "Server statistics"],
          ["GET", "/admin/users", "List users"],
          ["GET", "/admin/roles", "List roles"],
          ["GET", "/admin/events", "Query event log"],
          ["GET", "/admin/slow-queries", "Recent slow queries"],
          ["GET", "/admin/query-stats", "Query frequency analytics"],
        ]}
      />
    </>
  );
}

function ConfigSection() {
  return (
    <>
      <H1>Configuration</H1>
      <P>
        Settings are resolved in order: <strong>runtime</strong> (system.settings collection) &gt;
        CLI flags &gt; environment variables &gt; config file &gt; defaults.
        Config file search order: <InlineCode>./anvil.toml</InlineCode> (local), then{" "}
        <InlineCode>/etc/anvil/anvil.toml</InlineCode> (system install on Linux/macOS) or{" "}
        <InlineCode>%LOCALAPPDATA%\Anvil\anvil.toml</InlineCode> (Windows).
      </P>

      <H2>Runtime Settings (system.settings)</H2>
      <P>
        Most auth, email, storage, and observability knobs can be hot-reloaded
        through the <InlineCode>system.settings</InlineCode> document collection
        without restarting the server. Runtime values take the highest precedence
        and are persisted in the snapshot, so they survive restarts.
      </P>
      <Code>{`# Read all settings
curl http://localhost:7474/system/settings -H "Authorization: Bearer $JWT"

# Update one (admin only) — takes effect immediately
curl -X PUT http://localhost:7474/system/settings/auth.email.smtp_host \\
  -H "Authorization: Bearer $ADMIN_JWT" \\
  -d '{"value": "smtp.resend.com"}'

# Reset to file / env / default
curl -X DELETE http://localhost:7474/system/settings/auth.email.smtp_host \\
  -H "Authorization: Bearer $ADMIN_JWT"`}</Code>
      <P>
        Or edit through the Hammer Admin page. Each setting carries{" "}
        <InlineCode>category</InlineCode>, <InlineCode>type</InlineCode>,{" "}
        <InlineCode>description</InlineCode>, and an audit trail{" "}
        (<InlineCode>updated_at</InlineCode>, <InlineCode>updated_by</InlineCode>).
      </P>

      <H2>System Install Paths</H2>
      <P>
        When installed via <InlineCode>install.sh</InlineCode> or <InlineCode>install.ps1</InlineCode>,
        Anvil uses system paths automatically:
      </P>
      <Table
        headers={["", "Linux / macOS", "Windows"]}
        rows={[
          ["Config", "/etc/anvil/anvil.toml", "%LOCALAPPDATA%\\Anvil\\anvil.toml"],
          ["Data", "/var/lib/anvil/", "%LOCALAPPDATA%\\Anvil\\data\\"],
          ["Logs", "/var/log/anvil/anvil.log", "%LOCALAPPDATA%\\Anvil\\log\\anvil.log"],
          ["Plugins", "/var/lib/anvil/plugins/", "%LOCALAPPDATA%\\Anvil\\data\\plugins\\"],
        ]}
      />
      <P>For local development builds (<InlineCode>cargo run</InlineCode>), paths default to <InlineCode>./data</InlineCode>, <InlineCode>./plugins</InlineCode>, and stdout logging.</P>

      <H2>Generate Config</H2>
      <Code>{`anvil config init     # Write default anvil.toml
anvil config          # Print effective config`}</Code>

      <H2>anvil.toml</H2>
      <Code>{`[server]
http_port = 7474
bolt_port = 7687
bind_address = "0.0.0.0"
# tls_cert = "/etc/anvil/fullchain.pem"
# tls_key = "/etc/anvil/privkey.pem"

[storage]
data_dir = "./data"
document_storage = "unified"    # or "split"

[auth]
enabled = true
default_password = "anvil"
access_token_ttl_secs = 3600    # 1 hour
refresh_token_ttl_secs = 604800 # 7 days
require_email_verification = false
# RSA key pair auto-generated -> data/jwt_key.pem

[auth.email]
# Empty smtp_host disables email; verification / OTP become no-ops
smtp_host = ""
smtp_port = 465                 # 465 = implicit TLS, 587 = STARTTLS
smtp_user = ""
smtp_pass = ""
smtp_from = ""
smtp_starttls = true            # only consulted when port != 465
webhook_url = ""                # optional HTTP webhook instead of SMTP
otp_ttl_secs = 300
otp_max_attempts = 3
verification_ttl_secs = 86400
template_dir = "data/templates"

[logging]
level = "info"
log_file = ""                   # empty = stdout (daemon uses data/anvil.log)
slow_query_threshold_ms = 1000`}</Code>

      <H2>TLS / HTTPS</H2>
      <P>
        Set <InlineCode>tls_cert</InlineCode> and <InlineCode>tls_key</InlineCode> in{" "}
        <InlineCode>[server]</InlineCode> to enable HTTPS. Both must point to PEM files.
      </P>
      <Code>{`[server]
tls_cert = "/etc/letsencrypt/live/example.com/fullchain.pem"
tls_key = "/etc/letsencrypt/live/example.com/privkey.pem"

# Or via environment variables:
# ANVIL_TLS_CERT=/etc/anvil/fullchain.pem
# ANVIL_TLS_KEY=/etc/anvil/privkey.pem`}</Code>

      <H2>Environment Variables</H2>
      <H3>Server &amp; storage core</H3>
      <Table
        headers={["Variable", "Default"]}
        rows={[
          ["ANVIL_HTTP_PORT", "7474"],
          ["ANVIL_BOLT_PORT", "7687"],
          ["ANVIL_DATA_DIR", "./data"],
          ["ANVIL_LOG_LEVEL", "info"],
          ["ANVIL_LOG_FILE", "(empty = stdout)"],
          ["ANVIL_AUTH_ENABLED", "true"],
          ["ANVIL_DOCUMENT_STORAGE", "unified"],
          ["ANVIL_SLOW_QUERY_THRESHOLD", "1000"],
          ["ANVIL_TLS_CERT", "(not set)"],
          ["ANVIL_TLS_KEY", "(not set)"],
        ]}
      />
      <H3>File storage (Phase 25)</H3>
      <Table
        headers={["Variable", "Default", "Notes"]}
        rows={[
          ["ANVIL_STORAGE_BACKEND", "local", "local | s3 | gcs | azure"],
          ["ANVIL_STORAGE_LOCAL_ROOT", "./data/storage", "Content-addressed blob root"],
          ["ANVIL_STORAGE_STAGING_DIR", "./data/staging", "Temp uploads"],
          ["ANVIL_STORAGE_SIGNING_KEY_PATH", "./data/storage_signing_key.pem", "HMAC key for signed URLs"],
          ["ANVIL_STORAGE_SIGNED_URL_DEFAULT_TTL", "1h", "Used when expires_in=0"],
          ["ANVIL_STORAGE_SIGNED_URL_MAX_TTL", "24h", "Server-side clamp"],
          ["ANVIL_STORAGE_UPLOAD_CHUNK_SIZE", "5MiB", "TUS chunk advertised in OPTIONS"],
          ["ANVIL_STORAGE_UPLOAD_EXPIRY", "24h", "Resumable session lifetime"],
          ["ANVIL_STORAGE_LOG_OBJECT_ACCESS", "false", "Emit StorageObjectAccessed events"],
          ["ANVIL_STORAGE_MAX_FILE_SIZE", "50MiB", "Per-object hard ceiling"],
          ["ANVIL_STORAGE_MAX_TOTAL_STORAGE", "0", "0 = no global cap"],
          ["ANVIL_STORAGE_MAX_USER_STORAGE", "0", "Per-:auth.User cap; 0 = unlimited"],
          ["ANVIL_STORAGE_IMAGE_CACHE_DIR", "./data/image_cache", "Variant cache root"],
          ["ANVIL_STORAGE_IMAGE_MAX_CACHE_SIZE", "2GiB", "On-disk cache budget"],
          ["ANVIL_STORAGE_IMAGE_MAX_DIMENSION", "4096", "Reject larger width/height"],
          ["ANVIL_STORAGE_IMAGE_ALLOWED_FORMATS", "webp,jpeg,png,avif", "Output encoder allow-list"],
        ]}
      />
      <H3>S3 / R2 / MinIO (when ANVIL_STORAGE_BACKEND=s3)</H3>
      <Table
        headers={["Variable", "Notes"]}
        rows={[
          ["ANVIL_S3_KEY", "Access key ID"],
          ["ANVIL_S3_SECRET", "Secret access key"],
          ["ANVIL_S3_REGION", "AWS region (e.g. us-east-1)"],
          ["ANVIL_S3_BUCKET", "Backing bucket name"],
          ["ANVIL_S3_ENDPOINT", "Custom endpoint for R2 / MinIO / Wasabi"],
        ]}
      />

      <H2>CLI Commands</H2>
      <Code>{`anvil start                    # Daemon mode (logs to data/anvil.log)
anvil start --foreground       # Foreground mode
anvil stop                     # Graceful shutdown
anvil status                   # Show running state
anvil start --http-port 8080   # Override config
anvil import cypher ./data.cypher  # Import Cypher script`}</Code>
    </>
  );
}

function HammerSection() {
  return (
    <>
      <H1>Hammer UI</H1>
      <P>
        The Hammer UI runs on port 5175 and provides a complete interface for managing your database.
      </P>

      <H2>Pages</H2>
      <Table
        headers={["Page", "Description"]}
        rows={[
          ["Cypher", "Query editor with Table/JSON/Graph view, Cmd+Enter to execute"],
          ["GraphQL", "GraphQL playground with introspection"],
          ["Graph", "Force-directed visualization with focus mode, neighbor orbit, lasso select, minimap, PNG/SVG export"],
          ["Schema", "Labels, relationship types, property keys, indexes"],
          ["Documents", "Collection CRUD, document browsing, sync rule management"],
          ["Storage", "Bucket browser, upload, image preview, signed URLs, resumable uploads"],
          ["Policies", "RLS policy management, enable/disable, simulator"],
          ["Functions", "Create/edit/delete stored functions, test execution panel, call log"],
          ["Triggers", "Create/edit triggers, enable/disable, activity log, dependency analysis"],
          ["Import", "Cypher script import via paste or file upload, shows nodes/relationships created"],
          ["Monitor", "Server stats, slow query log, event log"],
          ["Admin", "User/role management, service accounts & API keys, event log explorer, runtime settings"],
          ["Settings", "Theme, editor preferences, graph defaults"],
          ["Help", "This documentation page"],
        ]}
      />

      <H2>Schema Dropdown</H2>
      <P>
        Switch between <InlineCode>public</InlineCode>, <InlineCode>auth</InlineCode>, and{" "}
        <InlineCode>system</InlineCode> schemas in the sidebar. Schema-aware pages filter
        content by the selected schema. The <InlineCode>auth</InlineCode> schema is only
        visible to admin users; <InlineCode>storage</InlineCode> collections are owned by
        the storage subsystem and managed through the Storage page.
      </P>

      <H2>Graph Visualization</H2>
      <P>
        Force-directed layout with D3.js. Click a node to enter focus mode — direct
        connections orbit in an evenly-spaced circle with yellow highlighted edges and labels,
        while non-neighbors are pushed to the periphery with hidden labels. Double-click to
        expand neighbors. Shift+drag for lasso selection. Right-click for edit/delete context
        menus. Layouts: force, hierarchical, circular, grid. Export as PNG or SVG.
      </P>
    </>
  );
}

function DataImportSection() {
  return (
    <>
      <H1>Data Import</H1>
      <P>
        Import Neo4j-compatible Cypher scripts via CLI, REST API, or the Hammer UI.
        Supports semicolon-separated statements, multi-CREATE without semicolons,
        MERGE with ON CREATE SET, and variable binding across CREATE clauses.
      </P>

      <H2>CLI Import</H2>
      <Code>{`anvil import cypher ./movies.cypher`}</Code>

      <H2>REST API Import</H2>
      <Code>{`curl -X POST http://localhost:7474/db/import/cypher \\
  -H "Content-Type: text/plain" \\
  -H "Authorization: Bearer $TOKEN" \\
  --data-binary @movies.cypher

# Response:
# {
#   "total": 2,
#   "success": 2,
#   "nodesCreated": 171,
#   "relationshipsCreated": 253,
#   "errors": []
# }`}</Code>

      <H2>Hammer UI</H2>
      <P>
        Navigate to the <InlineCode>Import</InlineCode> page. Paste a Cypher script or
        upload a <InlineCode>.cypher</InlineCode> file. The result displays statements
        executed, nodes created, and relationships created.
      </P>

      <H2>Supported Formats</H2>
      <Table
        headers={["Format", "Description"]}
        rows={[
          ["Semicolon-separated", "Standard format: each statement ends with ;"],
          ["Multi-CREATE (no semicolons)", "Neo4j initialDatabase.cypher format with variable binding across CREATEs"],
          ["MERGE", "MERGE with ON CREATE SET / ON MATCH SET for upserts"],
          ["MATCH + MERGE", "MATCH to bind variables, then MERGE relationships"],
        ]}
      />

      <H2>Automatic Skipping</H2>
      <P>
        The import engine automatically skips unsupported DDL (<InlineCode>CREATE CONSTRAINT</InlineCode>,{" "}
        <InlineCode>CREATE INDEX</InlineCode>) and standalone <InlineCode>MATCH</InlineCode> without
        RETURN/SET/DELETE/MERGE. These count as successful in the response.
      </P>
    </>
  );
}

function EdgeFunctionsSection() {
  return (
    <>
      <H1>Edge Functions</H1>
      <P>
        Run JavaScript or TypeScript on the server, triggered via HTTP endpoints.
        Functions execute in a Deno or Node.js subprocess with on-demand startup.
      </P>

      <H2>Create an Edge Function</H2>
      <Code>{`CREATE EDGE FUNCTION hello
RUNTIME 'deno'
ENTRYPOINT 'functions/hello.ts'`}</Code>

      <H2>Function File</H2>
      <Code>{`// functions/hello.ts
Deno.serve((req: Request) => {
  const url = new URL(req.url);
  const name = url.searchParams.get("name") ?? "World";
  return new Response(
    JSON.stringify({ message: \`Hello, \${name}!\` }),
    { headers: { "Content-Type": "application/json" } }
  );
});`}</Code>

      <H2>Invoke</H2>
      <Code>{`curl http://localhost:7474/edge/hello?name=Alice
# {"message": "Hello, Alice!"}`}</Code>

      <H2>Management</H2>
      <Code>{`-- List all edge functions
SHOW EDGE FUNCTIONS

-- Drop an edge function
DROP EDGE FUNCTION hello`}</Code>

      <H2>Runtimes</H2>
      <Table
        headers={["Runtime", "Command", "Notes"]}
        rows={[
          ["deno", "deno run --allow-net", "Recommended; secure by default"],
          ["node", "node", "Requires Node.js on PATH"],
        ]}
      />
    </>
  );
}

function DriversSection() {
  return (
    <>
      <H1>Client Drivers</H1>
      <P>
        Official drivers for Rust, TypeScript, Python, and Go using the{" "}
        <InlineCode>anvil://</InlineCode> URI scheme.
      </P>

      <H2>Connection URI</H2>
      <Code>{`anvil://username:password@host:port/database
anvil+tls://username:password@host:port/database`}</Code>

      <H2>Rust</H2>
      <Code>{`let client = AnvilClient::connect("anvil://localhost:7687").await?;
let result = client.query("MATCH (n) RETURN n LIMIT 10").await?;`}</Code>

      <H2>TypeScript</H2>
      <Code>{`const client = await AnvilClient.connect("anvil://localhost:7687");
const result = await client.query("MATCH (n) RETURN n LIMIT 10");`}</Code>

      <H2>Python</H2>
      <Code>{`client = AnvilClient.connect("anvil://localhost:7687")
result = client.query("MATCH (n) RETURN n LIMIT 10")`}</Code>

      <H2>Go</H2>
      <Code>{`client, err := anvil.Connect("anvil://localhost:7687")
result, err := client.Query("MATCH (n) RETURN n LIMIT 10")`}</Code>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  File Storage sections (Phase 25.16)                                */
/* ------------------------------------------------------------------ */

function StorageOverviewSection() {
  return (
    <>
      <H1>File Storage — Overview</H1>
      <P>
        Anvil bundles an object/blob store directly inside the database
        binary, so deployments don't need a sidecar S3/MinIO instance. Files
        live as <InlineCode>:storage.Object</InlineCode> nodes in the system{" "}
        <InlineCode>storage</InlineCode> schema; binary content is held by a
        pluggable backend (local FS by default, optionally AWS S3, Cloudflare
        R2, MinIO, Google Cloud Storage, or Azure Blob).
      </P>
      <P>
        Modeled after Supabase Storage but graph-native: buckets and files
        are first-class graph entities, so they participate in Cypher
        queries, relationships, row-level security policies, triggers, and
        edge functions.
      </P>

      <H2>Architecture</H2>
      <P>
        The storage subsystem has three layers:
      </P>
      <Table
        headers={["Layer", "Responsibility", "Examples"]}
        rows={[
          ["Graph", "Bucket / Object metadata as nodes", ":storage.Bucket, :storage.Object"],
          ["Refcount", "Content-addressed dedup + lifetime", "RefCounter::incref/decref"],
          ["Backend", "Bytes on disk or in the cloud", "LocalBackend, S3Backend"],
        ]}
      />
      <P>
        Backend blobs are content-addressed (SHA-256). Two objects with
        identical bytes share one backend file — uploading the same image
        twice is free after the first time.
      </P>

      <H2>How it compares</H2>
      <Table
        headers={["Feature", "Anvil Storage", "S3 / R2", "Supabase Storage"]}
        rows={[
          ["Built-in to DB", "Yes", "No", "Postgres extension"],
          ["Graph-native", "Yes (Cypher MATCH)", "No", "Partial (SQL)"],
          ["RLS for objects", "Native", "IAM only", "Native"],
          ["Signed URLs", "HMAC, bucket-versioned", "Pre-signed", "JWT-based"],
          ["Image transform", "Built-in", "External (Lambda)", "Pro tier"],
          ["Resumable upload", "TUS 1.0.0", "Multipart", "TUS"],
          ["Content dedup", "Refcounted", "No", "No"],
        ]}
      />

      <H2>What's in the box</H2>
      <Table
        headers={["Component", "Surface"]}
        rows={[
          ["REST API", "/storage/v1/bucket, /storage/v1/object, /storage/v1/upload/resumable, /storage/v1/render"],
          ["Cypher DDL", "CREATE BUCKET, ALTER BUCKET, DROP BUCKET, SHOW BUCKETS"],
          ["Cypher helpers", "file_url, signed_url, file_size, file_mime, bucket_size, image_metadata"],
          ["Triggers", "BEFORE/AFTER INSERT/UPDATE/DELETE on :storage.Object"],
          ["Client SDKs", "anvilent for Rust / TypeScript / Python / Go"],
          ["CLI", "anvil storage create-bucket / upload / download / ls / rm / sign / usage / gc"],
          ["Hammer UI", "/storage panel with browser, upload, preview, signed URLs"],
        ]}
      />
    </>
  );
}

function StorageQuickstartSection() {
  return (
    <>
      <H1>File Storage — Quickstart</H1>
      <P>
        Create a bucket, upload a file, and download it — start to finish
        in under five minutes. The examples below assume a running server
        at <InlineCode>localhost:7474</InlineCode> with default config.
      </P>

      <H2>1. Create a bucket</H2>
      <Code>{`# CLI
anvil storage create-bucket avatars --public --max-size 5MB

# Or via Cypher (in the Hammer UI or anvilent shell)
CREATE BUCKET avatars
  PUBLIC = true,
  FILE_SIZE_LIMIT = 5242880`}</Code>

      <H2>2. Upload an object</H2>
      <Code>{`# CLI
anvil storage upload ./alice.png avatars/alice.png

# Or via curl
curl -X POST \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: image/png" \\
  --data-binary @alice.png \\
  http://localhost:7474/storage/v1/object/avatars/alice.png`}</Code>

      <H2>3. Download or share</H2>
      <Code>{`# Public bucket: permanent URL, no auth needed.
curl http://localhost:7474/storage/v1/object/public/avatars/alice.png -o alice.png

# Private bucket: mint a signed URL with 1-hour TTL.
anvil storage sign avatars/alice.png --ttl 1h

# Or from code (TypeScript):
const { signedUrl } = await client.storage
  .from("avatars")
  .createSignedUrl("alice.png", 3600);`}</Code>

      <H2>4. (Optional) inspect usage</H2>
      <Code>{`anvil storage usage

# Example output:
# Total: 1 object, 4.21 KiB
#
# By bucket:
#   avatars                  1            4.21 KiB`}</Code>

      <P>
        Next: read the dedicated pages on{" "}
        <InlineCode>buckets</InlineCode>, <InlineCode>objects</InlineCode>,{" "}
        <InlineCode>signed URLs</InlineCode>, and{" "}
        <InlineCode>image transformations</InlineCode> for the details.
      </P>
    </>
  );
}

function StorageBucketsSection() {
  return (
    <>
      <H1>Buckets</H1>
      <P>
        A bucket is a logical container for objects. Each bucket carries a
        public/private flag, optional per-file size cap, optional total
        bucket size cap, an allow-list of MIME types, and an owner. Buckets
        are <InlineCode>:storage.Bucket</InlineCode> nodes — visible to
        Cypher, GraphQL, and RLS like any other graph entity.
      </P>

      <H2>Public vs Private</H2>
      <P>
        A <InlineCode>public: true</InlineCode> bucket serves objects via{" "}
        <InlineCode>GET /storage/v1/object/public/{`{bucket}/{path}`}</InlineCode>{" "}
        with no authentication. Flipping a bucket to private (or revoking
        its signing version) is the kill-switch for sharing.
      </P>
      <Code>{`# Toggle private at any time:
ALTER BUCKET avatars SET PUBLIC = false;

# Or via REST:
curl -X PUT -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"public": false}' \\
  http://localhost:7474/storage/v1/bucket/avatars`}</Code>

      <H2>Size limits</H2>
      <Table
        headers={["Field", "Scope", "Notes"]}
        rows={[
          ["file_size_limit", "Per object", "Rejects upload with 413 if Content-Length exceeds"],
          ["bucket_size_limit", "Sum across bucket", "Pre-flight + atomic check at write time"],
          ["max_file_size", "Global (config)", "Server-wide ceiling (anvil.toml)"],
          ["max_total_storage", "Global (config)", "Storage cap across every bucket"],
          ["max_user_storage", "Per user", "Tracked via :auth.User.storage_used"],
        ]}
      />

      <H2>Allowed MIME types</H2>
      <P>
        If <InlineCode>allowed_mime_types</InlineCode> is non-empty, uploads
        with a <InlineCode>Content-Type</InlineCode> outside the list are
        rejected with 415.
      </P>
      <Code>{`CREATE BUCKET avatars
  PUBLIC = true,
  FILE_SIZE_LIMIT = 5242880,
  ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];`}</Code>

      <H2>REST surface</H2>
      <Table
        headers={["Method", "Path", "Use"]}
        rows={[
          ["POST", "/storage/v1/bucket", "Create"],
          ["GET", "/storage/v1/bucket", "List visible buckets"],
          ["GET", "/storage/v1/bucket/{id}", "Fetch one"],
          ["PUT", "/storage/v1/bucket/{id}", "Update settings"],
          ["DELETE", "/storage/v1/bucket/{id}", "Drop (must be empty)"],
          ["POST", "/storage/v1/bucket/{id}/empty", "Delete every object inside"],
          ["POST", "/storage/v1/bucket/{id}/sign-revoke", "Invalidate signed URLs"],
        ]}
      />
    </>
  );
}

function StorageObjectsSection() {
  return (
    <>
      <H1>Objects</H1>
      <P>
        Objects are <InlineCode>:storage.Object</InlineCode> nodes uniquely
        identified by <InlineCode>(bucket_id, path)</InlineCode>. The{" "}
        <InlineCode>path</InlineCode> is a flat string but the conventional{" "}
        <InlineCode>/</InlineCode>-separator lets clients render a folder
        tree on top.
      </P>

      <H2>Upload</H2>
      <P>
        Two surfaces: <InlineCode>POST</InlineCode> creates (409 on
        conflict), <InlineCode>PUT</InlineCode> upserts. Body is the raw
        bytes; <InlineCode>Content-Type</InlineCode> sets the stored MIME.
      </P>
      <Code>{`# Single-shot create
curl -X POST -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: image/png" \\
  --data-binary @alice.png \\
  http://localhost:7474/storage/v1/object/avatars/alice.png

# Upsert (replaces if it exists)
curl -X PUT ...same headers... \\
  http://localhost:7474/storage/v1/object/avatars/alice.png`}</Code>
      <P>
        For files larger than the configured{" "}
        <InlineCode>upload_chunk_size</InlineCode> (default 5 MiB) use the
        TUS resumable endpoint — see the Resumable Uploads page.
      </P>

      <H2>Download</H2>
      <P>
        Authenticated downloads via{" "}
        <InlineCode>GET /storage/v1/object/{`{bucket}/{path}`}</InlineCode>;
        public buckets also expose{" "}
        <InlineCode>GET /storage/v1/object/public/{`{bucket}/{path}`}</InlineCode>.
        Both honour <InlineCode>Range</InlineCode> headers so video and
        audio players can seek.
      </P>

      <H2>HEAD</H2>
      <P>
        <InlineCode>HEAD /storage/v1/object/{`{bucket}/{path}`}</InlineCode>{" "}
        returns the metadata headers (<InlineCode>Content-Length</InlineCode>,{" "}
        <InlineCode>Content-Type</InlineCode>,{" "}
        <InlineCode>ETag</InlineCode>, <InlineCode>X-Content-SHA256</InlineCode>){" "}
        without streaming the body — ideal for existence checks.
      </P>

      <H2>Copy / move</H2>
      <Code>{`# Copy across buckets
curl -X POST -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "source_bucket": "avatars",
    "source_path": "alice.png",
    "dest_bucket": "thumbnails",
    "dest_path": "alice.png"
  }' \\
  http://localhost:7474/storage/v1/object/copy

# Rename within a bucket
curl -X POST .../storage/v1/object/move -d '{
  "source_bucket": "avatars", "source_path": "old.png",
  "dest_bucket": "avatars",  "dest_path": "new.png"
}'`}</Code>

      <H2>List</H2>
      <P>
        <InlineCode>POST /storage/v1/object/list/{`{bucket}`}</InlineCode>{" "}
        with an optional prefix, limit, offset, and sort. Defaults to{" "}
        <InlineCode>limit: 100</InlineCode>, capped at 1000.
      </P>
      <Code>{`curl -X POST -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"prefix":"users/","limit":50,"sort_by":"created_at","order":"desc"}' \\
  http://localhost:7474/storage/v1/object/list/avatars`}</Code>

      <H2>Delete</H2>
      <P>
        <InlineCode>DELETE /storage/v1/object/{`{bucket}/{path}`}</InlineCode>.
        The backend blob is released automatically when the last{" "}
        <InlineCode>:storage.Object</InlineCode> referencing its content
        hash is removed (refcount cleanup).
      </P>
    </>
  );
}

function StorageCypherSection() {
  return (
    <>
      <H1>Cypher Integration</H1>
      <P>
        Storage participates in the same Cypher dialect used for the rest
        of the graph — buckets are nodes, objects are nodes, and dedicated
        helper functions surface URLs, sizes, and image metadata so reports
        can pull everything in a single query.
      </P>

      <H2>Bucket DDL</H2>
      <Code>{`-- Create
CREATE BUCKET avatars
  PUBLIC = true,
  FILE_SIZE_LIMIT = 5242880,
  ALLOWED_MIME_TYPES = ["image/png", "image/jpeg"];

-- Update
ALTER BUCKET avatars SET PUBLIC = false;

-- Drop (bucket must be empty)
DROP BUCKET avatars;

-- Inspect
SHOW BUCKETS;`}</Code>

      <H2>Matching objects</H2>
      <Code>{`-- Every avatar over 1 MB.
MATCH (o:\`storage.Object\`)
WHERE o.bucket_id = "avatars" AND o.size > 1048576
RETURN o.path, file_size(o), file_mime(o)
ORDER BY o.size DESC
LIMIT 20;`}</Code>

      <H2>Helper functions</H2>
      <Table
        headers={["Function", "Returns", "Use"]}
        rows={[
          ["file_url(o)", "string", "Authenticated download URL"],
          ["signed_url(o, ttl_secs)", "string", "Mint a signed URL inline"],
          ["file_size(o)", "int", "Byte size"],
          ["file_mime(o)", "string", "MIME type"],
          ["file_etag(o)", "string", "Strong ETag"],
          ["file_hash(o)", "string", "SHA-256 content hash"],
          ["file_exists(bucket, path)", "bool", "Cheap existence check"],
          ["bucket_size(bucket)", "int", "Sum of object sizes in a bucket"],
          ["image_metadata(o)", "map", "{width, height, format, color_space}"],
        ]}
      />

      <H2>Attaching objects to user-defined nodes</H2>
      <P>
        A common pattern: store the object as a node, then connect it with
        a typed relationship to a domain object (User, Document, Product…).
        RLS, sync, and triggers all see this just like any other edge.
      </P>
      <Code>{`MATCH (u:User {id: $userId})
MATCH (o:\`storage.Object\` {bucket_id: "avatars", path: $path})
CREATE (u)-[:AVATAR]->(o);

-- Later: fetch every user's avatar URL in one round-trip.
MATCH (u:User)-[:AVATAR]->(o:\`storage.Object\`)
RETURN u.name, file_url(o) AS avatar_url;`}</Code>
    </>
  );
}

function StorageRLSSection() {
  return (
    <>
      <H1>Storage RLS</H1>
      <P>
        Storage objects participate in the same row-level security engine
        as the rest of the graph. Policies attach to the{" "}
        <InlineCode>storage.Object</InlineCode> label (or the{" "}
        <InlineCode>storage.objects</InlineCode> collection) using the
        familiar <InlineCode>CREATE POLICY</InlineCode> syntax.
      </P>

      <H2>Standard claims</H2>
      <P>
        Every storage RLS predicate has these session variables in scope:
      </P>
      <Table
        headers={["Variable", "Source"]}
        rows={[
          ["auth.uid()", "JWT sub claim — current user ID"],
          ["auth.role()", "JWT role claim"],
          ["auth.jwt()", "Full JWT payload as a map"],
          ["row", "The :storage.Object being checked"],
        ]}
      />

      <H2>Examples</H2>
      <Code>{`-- Only the owner can read their objects.
CREATE POLICY avatars_owner_select
  ON LABEL \`storage.Object\`
  FOR SELECT
  USING (row.owner = auth.uid());

-- Only the owner can upload to their folder.
CREATE POLICY avatars_owner_insert
  ON LABEL \`storage.Object\`
  FOR INSERT
  WITH CHECK (
    row.owner = auth.uid()
    AND row.path STARTS WITH (auth.uid() || '/')
  );

-- Anyone authenticated can read; only admins can write.
CREATE POLICY storage_admin_write
  ON LABEL \`storage.Object\`
  FOR INSERT, UPDATE, DELETE
  WITH CHECK ('admin' IN auth.role());`}</Code>

      <H2>Bypass for service_role</H2>
      <P>
        Edge functions and server-side code typically authenticate with the{" "}
        <InlineCode>service_role</InlineCode> claim, which bypasses all
        storage RLS (just like Postgres / Supabase). End-user requests
        always go through the policy gauntlet.
      </P>

      <H2>Public bucket vs RLS</H2>
      <P>
        The public-download endpoint (
        <InlineCode>/storage/v1/object/public/...</InlineCode>) is a
        deliberate side-channel: it bypasses RLS because the bucket's{" "}
        <InlineCode>public: true</InlineCode> flag is the authorization.
        Authenticated downloads through{" "}
        <InlineCode>/storage/v1/object/{`{bucket}/{path}`}</InlineCode>{" "}
        always consult RLS.
      </P>
    </>
  );
}

function StorageSignedSection() {
  return (
    <>
      <H1>Signed URLs</H1>
      <P>
        A signed URL is a self-contained, time-boxed share link. The token
        embeds the bucket, path, scope (read or write), expiry, and the
        bucket's <InlineCode>signing_version</InlineCode>, all sealed with
        an HMAC-SHA256 over the server's signing key.
      </P>

      <H2>Anatomy</H2>
      <Code>{`http://host:7474/storage/v1/object/signed/<token>

token = base64url(payload) "." base64url(hmac_sha256(key, payload))

payload = {
  "bucket": "avatars",
  "path": "alice.png",
  "exp": 1778838131,           // Unix seconds
  "iat": 1778834531,
  "scope": "read" | "write",
  "bucket_version": 0,
  "transform": { ... }          // optional, render endpoints only
}`}</Code>

      <H2>Mint a token</H2>
      <Code>{`# REST — needs an authenticated session that can SELECT the object.
curl -X POST -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"expires_in": 3600}' \\
  http://localhost:7474/storage/v1/object/sign/avatars/alice.png

# CLI
anvil storage sign avatars/alice.png --ttl 1h

# Cypher
RETURN signed_url(o, 3600) AS url`}</Code>

      <H2>Server-side clamping</H2>
      <Table
        headers={["Field", "Behaviour"]}
        rows={[
          ["expires_in = 0", "Use signed_url_default_ttl from config"],
          ["expires_in > max", "Clamped to signed_url_max_ttl"],
          ["expires_in <= 0", "Rejected (400)"],
        ]}
      />

      <H2>Revocation</H2>
      <P>
        The token embeds the bucket's current{" "}
        <InlineCode>signing_version</InlineCode>. Bump it to invalidate
        every outstanding token for that bucket:
      </P>
      <Code>{`# REST
curl -X POST -H "Authorization: Bearer $TOKEN" \\
  http://localhost:7474/storage/v1/bucket/avatars/sign-revoke

# Hammer UI: Storage → bucket → Settings → "Revoke signed URLs"`}</Code>
      <P>
        Existing valid signatures still fail the version check after a
        revoke. The mint endpoint always uses the latest version, so newly
        minted URLs after the bump work normally.
      </P>

      <H2>Upload signing</H2>
      <P>
        Browser-side uploads to private buckets typically use a
        write-scoped signed URL so the browser doesn't need to hold a
        bearer token. <InlineCode>POST /storage/v1/object/upload/sign/...</InlineCode>{" "}
        returns a <InlineCode>PUT</InlineCode>-able URL.
      </P>
    </>
  );
}

function StorageTransformsSection() {
  return (
    <>
      <H1>Image Transformations</H1>
      <P>
        Anvil ships an in-process image pipeline so common transforms
        (resize, format conversion, quality re-encode) don't need an
        external service. The pipeline runs on cache miss and writes the
        result to a content-addressed cache so repeated requests are zero
        copies.
      </P>

      <H2>Two endpoints</H2>
      <Table
        headers={["Route", "Auth"]}
        rows={[
          ["/storage/v1/render/image/public/{bucket}/{path}", "None (bucket must be public)"],
          ["/storage/v1/render/image/authenticated/{bucket}/{path}", "Session-bound, honours RLS"],
          ["/storage/v1/render/image/sign/{bucket}/{path}", "Mint a signed render URL (transform baked into token)"],
        ]}
      />

      <H2>Parameters</H2>
      <Table
        headers={["Param", "Type", "Notes"]}
        rows={[
          ["width", "u32", "Target width in pixels"],
          ["height", "u32", "Target height in pixels"],
          ["resize", "cover | contain | fill", "Fit policy"],
          ["format", "webp | jpeg | png | avif", "Output encoder"],
          ["quality", "u32 1..100", "Encoder quality"],
        ]}
      />

      <H2>Examples</H2>
      <Code>{`# 200x200 webp thumbnail
http://host/storage/v1/render/image/public/avatars/alice.png?width=200&height=200&resize=cover&format=webp

# Signed render URL with transform sealed into the token.
curl -X POST -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "expires_in": 3600,
    "transform": {"width": 200, "height": 200, "format": "webp"}
  }' \\
  http://localhost:7474/storage/v1/render/image/sign/avatars/alice.png`}</Code>

      <H2>Cache</H2>
      <P>
        Variants are cached on disk under{" "}
        <InlineCode>{`{cache_dir}/{source_hash}/{params_hash}`}</InlineCode>.{" "}
        Configure cache size and limits in{" "}
        <InlineCode>[file_storage.image_transforms]</InlineCode>:
      </P>
      <Code>{`[file_storage.image_transforms]
cache_dir = "./data/image_cache"
max_cache_size = "2GiB"
image_max_dimension = 4096
allowed_formats = ["webp", "jpeg", "png", "avif"]`}</Code>

      <H2>Limits</H2>
      <P>
        Requests for dimensions over <InlineCode>image_max_dimension</InlineCode>{" "}
        return 400 — protects the renderer from accidental memory blow-ups.
        Disallowed output formats also 400.
      </P>
    </>
  );
}

function StorageResumableSection() {
  return (
    <>
      <H1>Resumable Uploads (TUS 1.0.0)</H1>
      <P>
        Anvil implements the{" "}
        <a
          className="text-blue-400 underline"
          href="https://tus.io/protocols/resumable-upload"
          target="_blank"
          rel="noreferrer"
        >
          TUS 1.0.0
        </a>{" "}
        resumable upload protocol so large files survive transient failures
        without restarting. The threshold for switching from single-shot
        upload to TUS is whatever the client decides — both Hammer and the
        SDKs default to <InlineCode>5 MiB</InlineCode>.
      </P>

      <H2>Protocol overview</H2>
      <Table
        headers={["Step", "Endpoint", "Headers"]}
        rows={[
          ["Initiate", "POST /storage/v1/upload/resumable", "Tus-Resumable, Upload-Length, Upload-Metadata"],
          ["Append chunk", "PATCH /storage/v1/upload/resumable/{id}", "Upload-Offset, Content-Type=application/offset+octet-stream"],
          ["Query offset", "HEAD /storage/v1/upload/resumable/{id}", "Tus-Resumable"],
          ["Abort", "DELETE /storage/v1/upload/resumable/{id}", "Tus-Resumable"],
          ["Discovery", "OPTIONS /storage/v1/upload/resumable", "Returns Tus-Version, Tus-Extension, Tus-Max-Size"],
        ]}
      />

      <H2>Extensions advertised</H2>
      <Table
        headers={["Extension", "Behaviour"]}
        rows={[
          ["creation", "POST initiates a session"],
          ["expiration", "Upload-Expires header; expired sessions return 410"],
          ["checksum", "Upload-Checksum: sha256 <base64> per chunk"],
          ["termination", "DELETE removes the session + temp file"],
        ]}
      />

      <H2>Walk-through</H2>
      <Code>{`# 1. Create session — Upload-Metadata carries bucket/path/mime as base64.
curl -i -X POST http://localhost:7474/storage/v1/upload/resumable \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Tus-Resumable: 1.0.0" \\
  -H "Upload-Length: 10485760" \\
  -H "Upload-Metadata: bucket dmlkZW9z,path Y2xpcC5tcDQ=,mime dmlkZW8vbXA0"

# 201 Created
# Location: /storage/v1/upload/resumable/<session-id>

# 2. Append a chunk (any size up to MAX_CHUNK_BYTES = 1 GiB).
curl -i -X PATCH http://localhost:7474/storage/v1/upload/resumable/<session-id> \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Tus-Resumable: 1.0.0" \\
  -H "Content-Type: application/offset+octet-stream" \\
  -H "Upload-Offset: 0" \\
  --data-binary @part0.bin

# 204 No Content
# Upload-Offset: <new offset>
# When offset == Upload-Length, also:
#   Location: /storage/v1/object/<bucket>/<path>
#   X-Anvil-Content-Hash: <sha256>`}</Code>

      <H2>Resume after failure</H2>
      <P>
        If a chunk fails, issue <InlineCode>HEAD</InlineCode> on the session
        URL to discover the server's current{" "}
        <InlineCode>Upload-Offset</InlineCode>, then resume{" "}
        <InlineCode>PATCH</InlineCode>ing from there. The Anvil client SDKs
        and the Hammer upload zone do this transparently.
      </P>

      <H2>Garbage collection</H2>
      <P>
        Expired upload sessions are cleaned up by the same background loop
        that handles snapshot checkpoints. The expiry window comes from{" "}
        <InlineCode>file_storage.upload_expiry</InlineCode>.
      </P>
    </>
  );
}

function StorageBackendsSection() {
  return (
    <>
      <H1>Storage Backends</H1>
      <P>
        Backend objects are content-addressed by SHA-256 — the storage
        engine doesn't care where the bytes physically live, only that the
        backend can <InlineCode>put</InlineCode>,{" "}
        <InlineCode>get</InlineCode>, <InlineCode>delete</InlineCode>, and{" "}
        <InlineCode>exists</InlineCode> by hash. Switch backends by
        changing one line in <InlineCode>anvil.toml</InlineCode>.
      </P>

      <H2>Available backends</H2>
      <Table
        headers={["Backend", "Use", "Status"]}
        rows={[
          ["local", "Files under data/storage/{hash[0:2]}/{hash[2:4]}/{hash}", "Production"],
          ["s3", "AWS S3 (or any S3-compatible: R2, MinIO, Wasabi, B2)", "Stub — Phase 25.4 deferred"],
          ["gcs", "Google Cloud Storage", "Stub"],
          ["azure", "Azure Blob Storage", "Stub"],
        ]}
      />

      <H2>Local backend</H2>
      <Code>{`[file_storage]
backend = "local"
file_storage_local_root = "./data/storage"
staging_dir = "./data/staging"        # temp uploads go here first`}</Code>
      <P>
        Files are content-addressed: identical bytes are stored once and
        shared via the in-memory refcounter. The backend never deletes a
        file while its refcount &gt; 0.
      </P>

      <H2>S3-compatible (when enabled)</H2>
      <Code>{`[file_storage]
backend = "s3"

# Credentials and endpoint pulled from environment:
# ANVIL_S3_KEY=<access-key>
# ANVIL_S3_SECRET=<secret>
# ANVIL_S3_REGION=us-east-1
# ANVIL_S3_BUCKET=my-anvil-bucket
# ANVIL_S3_ENDPOINT=https://<r2-account-id>.r2.cloudflarestorage.com  # R2 / MinIO`}</Code>

      <H2>Migration path</H2>
      <P>
        Switching from <InlineCode>local</InlineCode> to{" "}
        <InlineCode>s3</InlineCode> later is a streaming migration: walk{" "}
        <InlineCode>storage.objects</InlineCode>, read each blob from the
        local backend, write it to S3 by the same hash, then flip the
        config. Because the database holds the canonical metadata, the
        path-level URLs stay identical for every client.
      </P>
    </>
  );
}

function StorageTriggersSection() {
  return (
    <>
      <H1>Triggers & Edge Functions</H1>
      <P>
        Storage objects fire the standard trigger lifecycle — every CRUD
        event has a <InlineCode>BEFORE</InlineCode> and{" "}
        <InlineCode>AFTER</InlineCode> hook on both the{" "}
        <InlineCode>storage.Object</InlineCode> label and the{" "}
        <InlineCode>storage.objects</InlineCode> collection. This lets you
        post-process uploads (thumbnail, virus-scan, OCR), enforce custom
        invariants, or kick off downstream workflows.
      </P>

      <H2>Available events</H2>
      <Table
        headers={["When", "Insert", "Update", "Delete"]}
        rows={[
          ["BEFORE", "Validate / mutate before write", "Same for replace", "Veto deletes"],
          ["AFTER", "Side effects (thumbnail, queue job)", "React to overwrites", "Cleanup external state"],
        ]}
      />

      <H2>Example: auto-thumbnail</H2>
      <Code>{`-- Drop a 200x200 thumbnail into a sibling bucket on every avatar upload.
CREATE TRIGGER avatar_thumbnail
  AFTER INSERT ON LABEL \`storage.Object\`
  WHEN row.bucket_id = "avatars" AND row.mime_type STARTS WITH "image/"
  EXECUTE EDGE FUNCTION generate_thumbnail
    WITH ARGS {
      source_bucket: "avatars",
      source_path: row.path,
      dest_bucket: "thumbnails",
      width: 200,
      height: 200
    };`}</Code>

      <H2>Edge function recipe (TypeScript)</H2>
      <Code>{`// edge_functions/generate_thumbnail.ts
import { AnvilClient } from "anvilent";

export async function handler(args: {
  source_bucket: string;
  source_path: string;
  dest_bucket: string;
  width: number;
  height: number;
}) {
  // service_role JWT is injected by the runtime — bypasses RLS.
  const client = anvil.client;

  // Re-encode via the built-in render endpoint.
  const url = client.storage
    .from(args.source_bucket)
    .getPublicUrl(args.source_path, {
      transform: { width: args.width, height: args.height, format: "webp" },
    }).publicUrl;

  const blob = await fetch(url).then((r) => r.blob());

  await client.storage
    .from(args.dest_bucket)
    .upload(args.source_path.replace(/\\.[^.]+$/, ".webp"), blob, {
      contentType: "image/webp",
      upsert: true,
    });
}`}</Code>

      <H2>Other patterns</H2>
      <Table
        headers={["Trigger", "Edge function"]}
        rows={[
          ["AFTER INSERT", "Push notification (mobile app)"],
          ["BEFORE INSERT", "Reject upload if virus scanner returns positive"],
          ["AFTER UPDATE", "Invalidate CDN cache for the public URL"],
          ["AFTER DELETE", "Mirror deletion to an external archive"],
        ]}
      />
    </>
  );
}

function StorageTutorialsSection() {
  return (
    <>
      <H1>Tutorials</H1>
      <P>
        Four end-to-end recipes covering the most common storage scenarios.
        Each one stands alone; the snippets are written against{" "}
        <InlineCode>anvilent</InlineCode> for TypeScript but every driver
        carries the same surface.
      </P>

      <H2>1. User avatar uploads (React + anvilent)</H2>
      <Code>{`import { AnvilClient } from "anvilent";

const client = await AnvilClient.connect("anvil://localhost:7474/app");

export function AvatarUpload({ userId }: { userId: string }) {
  async function handleFile(file: File) {
    await client.storage
      .from("avatars")
      .upload(\`\${userId}.png\`, file, {
        contentType: file.type,
        upsert: true,
      });
  }
  return (
    <input
      type="file"
      accept="image/*"
      onChange={(e) => e.target.files && handleFile(e.target.files[0]!)}
    />
  );
}

// And to render — uses the bucket's public URL with a server-side resize.
function Avatar({ userId }: { userId: string }) {
  const { publicUrl } = client.storage
    .from("avatars")
    .getPublicUrl(\`\${userId}.png\`, {
      transform: { width: 64, height: 64, resize: "cover", format: "webp" },
    });
  return <img src={publicUrl} width={64} height={64} />;
}`}</Code>

      <H2>2. Image gallery with transforms + signed URLs</H2>
      <P>
        Keep the gallery's bucket <em>private</em> so only authenticated
        users can browse; serve thumbnails via the render endpoint, mint a
        short-lived signed URL on demand for full-resolution downloads.
      </P>
      <Code>{`// List the user's photos.
const { items } = await client.storage
  .from("photos")
  .list(\`\${userId}/\`, { sortBy: { column: "created_at", order: "desc" } });

// Build a thumbnail URL per photo. The render endpoint is server-side
// auth-checked — RLS still applies.
const thumbs = items.map((it) => ({
  path: it.path,
  url: client.storage.from("photos").getPublicUrl(it.path, {
    transform: { width: 320, format: "webp" },
  }).publicUrl,
}));

// On click, mint a 5-minute signed URL for the original.
async function downloadOriginal(path: string) {
  const { signedUrl } = await client.storage
    .from("photos")
    .createSignedUrl(path, 300, { transform: undefined });
  window.location.href = signedUrl;
}`}</Code>

      <H2>3. Secure document sharing (auth + RLS + signed URLs)</H2>
      <P>
        Tenants upload contracts; only members of the deal team can see
        them; external counterparties get a one-off signed link with a
        24-hour expiry that revokes the moment the deal closes.
      </P>
      <Code>{`-- Schema: every Contract has an owning Deal, every Deal has team members.
CREATE POLICY contract_team_read
  ON LABEL \`storage.Object\`
  FOR SELECT
  USING (
    EXISTS {
      MATCH (o:\`storage.Object\` {bucket_id: "contracts"})
            -[:CONTRACT_FOR]->(d:Deal)<-[:MEMBER_OF]-(u:User)
      WHERE u.id = auth.uid() AND o.path = row.path
    }
  );

-- Share with an outside party for 24 hours.
CALL signed_url("contracts", "deal-2026-05-15.pdf", 86400) YIELD url;

-- Closing the deal revokes every link for that bucket.
CALL revoke_bucket_signed_urls("contracts");`}</Code>

      <H2>4. Automatic thumbnail generation (trigger + edge function)</H2>
      <P>
        See <strong>Triggers & Edge Functions</strong> for the full
        walkthrough — the short version is{" "}
        <InlineCode>AFTER INSERT</InlineCode> on{" "}
        <InlineCode>:storage.Object</InlineCode> →{" "}
        <InlineCode>EXECUTE EDGE FUNCTION</InlineCode> → re-upload via the
        client SDK using the render endpoint to do the heavy lifting.
      </P>
    </>
  );
}
