import { useState } from "react";

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
  | "observability"
  | "api"
  | "config"
  | "browser"
  | "drivers";

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
  { id: "observability", title: "Observability" },
  { id: "api", title: "HTTP API Reference" },
  { id: "config", title: "Configuration" },
  { id: "browser", title: "Browser UI" },
  { id: "drivers", title: "Client Drivers" },
];

function isCypherSection(id: SectionId) {
  return id.startsWith("cypher-");
}

export default function HelpRoute() {
  const [active, setActive] = useState<SectionId>("getting-started");
  const [cypherOpen, setCypherOpen] = useState(isCypherSection(active));

  return (
    <div className="flex h-full bg-zinc-950 text-zinc-100">
      {/* Sidebar TOC */}
      <nav className="w-56 shrink-0 border-r border-zinc-800 overflow-y-auto py-4">
        <p className="px-4 pb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Documentation
        </p>
        {sections.map((item) => {
          if (item.children) {
            const childActive = item.children.some((c) => c.id === active);
            return (
              <div key={item.id}>
                <button
                  onClick={() => {
                    const willOpen = !cypherOpen;
                    setCypherOpen(willOpen);
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
                    className={`h-3 w-3 text-zinc-500 transition-transform ${cypherOpen ? "rotate-90" : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
                {cypherOpen && (
                  <div>
                    {item.children.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => setActive(child.id)}
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
              onClick={() => setActive(item.id)}
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
          {active === "observability" && <ObservabilitySection />}
          {active === "api" && <APISection />}
          {active === "config" && <ConfigSection />}
          {active === "browser" && <BrowserSection />}
          {active === "drivers" && <DriversSection />}
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
curl -fsSL https://anvildb.com/install.sh | sh

# Or build from source
cargo build --release -p anvil`}</Code>

      <H2>Quick Start</H2>
      <Code>{`# Start the server (daemonizes by default)
anvil start

# Or run in foreground for development
anvil start --foreground

# Check status
anvil status

# Stop the server
anvil stop

# Open the browser UI
open http://localhost:5175

# Default login: admin / anvil`}</Code>
      <P>
        The server runs on port <InlineCode>7474</InlineCode> (HTTP API) and{" "}
        <InlineCode>7687</InlineCode> (Bolt protocol). The browser UI runs on port{" "}
        <InlineCode>5175</InlineCode>.
      </P>

      <H2>Your First Query</H2>
      <Code>{`-- Create nodes and a relationship
CREATE (alice:Person {name: "Alice", age: 32})
CREATE (bob:Person {name: "Bob", age: 28})
CREATE (alice)-[:KNOWS {since: 2020}]->(bob)

-- Query with pattern matching
MATCH (p:Person)-[r:KNOWS]->(friend:Person)
WHERE p.name = "Alice"
RETURN p.name, friend.name, r.since`}</Code>
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
      <Code>{`-- Create nodes and relationships
CREATE (alice:Person {name: "Alice", age: 32})
CREATE (bob:Person {name: "Bob", age: 28})
CREATE (alice)-[:KNOWS {since: 2020}]->(bob)

-- Query with pattern matching
MATCH (p:Person)-[r:KNOWS]->(friend:Person)
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

      <H2>Comments</H2>
      <P>
        Anvil supports several comment styles. All comment markers are ignored inside quoted
        strings.
      </P>
      <Table
        headers={["Syntax", "Description"]}
        rows={[
          ["// comment", "Line comment (C-style)"],
          ["-- comment", "Line comment (SQL-style). Note: --> is a relationship pattern, not a comment"],
          ["# comment", "Line comment (shell-style)"],
          ["/* comment */", "Block comment (may span multiple lines)"],
        ]}
      />
      <Code>{`// This is a line comment
-- This is also a line comment
# And so is this

/* This is a
   block comment */

MATCH (a)-[r]-->(b)  // --> here is a relationship, not a comment
RETURN a, b`}</Code>

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
MATCH (a:Person)-[r:KNOWS]->(b:Person)
RETURN a.name, b.name, r.since

-- Multiple patterns (implicit join on shared variables)
MATCH (a:Person)-[:WORKS_AT]->(c:Company),
      (a)-[:HAS_SKILL]->(s:Skill)
RETURN a.name, c.name, s.name

-- Undirected relationships
MATCH (a:Person)-[:KNOWS]-(b:Person)
RETURN a.name, b.name`}</Code>

      <H2>OPTIONAL MATCH</H2>
      <P>
        Like <InlineCode>MATCH</InlineCode>, but returns <InlineCode>null</InlineCode> for
        unmatched parts instead of filtering out the row.
      </P>
      <Code>{`MATCH (p:Person)
OPTIONAL MATCH (p)-[:MANAGES]->(team:Team)
RETURN p.name, team.name`}</Code>

      <H2>WITH</H2>
      <P>
        Chains query stages. Acts as a projection barrier — only variables listed in{" "}
        <InlineCode>WITH</InlineCode> are visible downstream.
      </P>
      <Code>{`MATCH (p:Person)-[:KNOWS]->(f)
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
CREATE (a)-[:KNOWS {since: 2020}]->(b)

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
MERGE (a)-[:KNOWS]->(b)`}</Code>

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
MATCH (a:Person)-[r:KNOWS]->(b:Person)
WHERE a.name = "Alice" AND b.name = "Bob"
DELETE r

-- Delete all nodes with a label
MATCH (n:TempData) DETACH DELETE n`}</Code>

      <H2>FOREACH</H2>
      <P>Iterate over a list and perform write operations for each element.</P>
      <Code>{`MATCH p = (a:Person {name: "Alice"})-[:KNOWS*]->(b)
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
WHERE (n)-[:KNOWS]->(:Person {name: "Alice"})
RETURN n.name

-- Nodes that do NOT know anyone named Charlie
MATCH (n:Person)
WHERE NOT (n)-[:KNOWS]->(:Person {name: "Charlie"})
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
MATCH (p:Person)-[:KNOWS]->(f:Person)
RETURN p.name, collect(f.name) AS friends

-- Aggregation with WITH for filtering
MATCH (p:Person)-[:KNOWS]->(f)
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
MATCH (a:Person)-[:KNOWS*1..3]->(b:Person)
RETURN a.name, b.name

-- Exactly 2 hops
MATCH (a)-[:KNOWS*2]->(b)
RETURN a.name, b.name

-- Any length (use with caution on large graphs)
MATCH (a:Person {name: "Alice"})-[:KNOWS*]->(b)
RETURN b.name`}</Code>

      <H2>Quantified Paths</H2>
      <P>Anvil supports GQL-style quantified path patterns for more precise hop control.</P>
      <Code>{`-- Exactly 3 hops
MATCH (a)-[:KNOWS]->{3}(b)
RETURN a.name, b.name

-- Between 2 and 5 hops
MATCH (a)-[:KNOWS]->{2,5}(b)
RETURN a.name, b.name

-- One or more hops
MATCH (a)-[:KNOWS]->+(b)
RETURN a.name, b.name`}</Code>

      <H2>Named Paths</H2>
      <Code>{`-- Assign a path to a variable
MATCH p = (a:Person {name: "Alice"})-[:KNOWS*]->(b)
RETURN p, length(p), nodes(p), relationships(p)`}</Code>

      <H2>Shortest Path</H2>
      <Code>{`-- Single shortest path
MATCH path = shortestPath(
  (a:Person {name: "Alice"})-[:KNOWS*]-(b:Person {name: "Dave"})
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
WHERE EXISTS { (n)-[:KNOWS]->(:Person {name: "Alice"}) }
RETURN n.name

-- Negated existence
MATCH (n:Person)
WHERE NOT EXISTS { (n)-[:WORKS_AT]->(:Company) }
RETURN n.name AS unemployed`}</Code>

      <H2>COUNT Subqueries</H2>
      <P>Count pattern occurrences inline without a separate <InlineCode>WITH</InlineCode> stage.</P>
      <Code>{`-- Inline count in RETURN
MATCH (n:Person)
RETURN n.name, count{ (n)-[:KNOWS]->() } AS friendCount

-- In WITH for filtering
MATCH (n:Person)
WITH n, count{ (n)-[:KNOWS]->() } AS friendCount
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

      <H2>UPSERT DOCUMENT ... WHERE</H2>
      <P>
        Update documents matching a predicate instead of targeting a specific key. Supports
        sync propagation when a sync rule is active on the collection.
      </P>
      <Code>{`-- Update all documents matching a condition
UPSERT DOCUMENT IN profiles WHERE username = "alice"
  SET status = "active", verified = true

-- With multiple conditions
UPSERT DOCUMENT IN orders WHERE status = "pending" AND total > 100
  SET status = "processing", updated_at = timestamp()`}</Code>

      <H2>DELETE DOCUMENT ... WHERE</H2>
      <P>
        Delete documents matching a predicate. Like the WHERE form of UPSERT, this supports
        sync propagation.
      </P>
      <Code>{`-- Delete all matching documents
DELETE DOCUMENT IN sessions WHERE expired = true

-- With field comparison
DELETE DOCUMENT IN cache WHERE created_at < timestamp() - 86400000`}</Code>

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
  MATCH (p:Person {name: person})-[:KNOWS]->(f)
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
          ["current_user()", "Username of the current session"],
          ["is_sync()", "Whether the operation was sync-originated"],
          ["timestamp()", "Current epoch milliseconds"],
          ["uuid()", "Generate a new UUID v4"],
        ]}
      />

      <H2>Trigger Chaining</H2>
      <P>
        When an UPSERT DOCUMENT is executed inside a trigger body, it fires any AFTER triggers
        defined on the target collection. This enables reactive pipelines where one trigger
        can cascade into another.
      </P>

      <H2>Trigger Backfill</H2>
      <P>
        Creating a trigger automatically processes all existing records in its target label or
        collection. This ensures that pre-existing data is consistent with the new trigger logic
        without requiring a manual migration.
      </P>

      <H2>Execution Limits</H2>
      <P>
        Priority ordering: lower number fires first (default 100). Recursive trigger firing is
        capped at 16 levels deep — exceeding this limit raises an error. Use{" "}
        <InlineCode>SKIP TRIGGERS</InlineCode> on sync rules to prevent cascades.
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
        The <InlineCode>TO role</InlineCode> clause is optional — omitting it applies the policy to all roles.
      </P>
      <Code>{`-- Users see only their own data (role-specific)
CREATE POLICY own_data ON :Project FOR SELECT TO reader
  USING (n.owner = current_user())

-- Policy for all roles (TO clause omitted)
CREATE POLICY public_read ON :Project FOR SELECT
  USING (n.public = true)

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
CREATE POLICY knows_policy ON :KNOWS FOR SELECT TO reader
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

      <H2>Write Enforcement</H2>
      <P>
        For write operations (INSERT, UPDATE, DELETE), the USING predicate is evaluated per-node
        or per-document before the operation is applied. SET operations check the USING predicate
        on each target node. UPSERT DOCUMENT checks the USING predicate on each target document.
        RLS write policies bypass RBAC role checks — any user whose data matches the predicate
        can write, regardless of their assigned role.
      </P>

      <H2>Deny-by-Default</H2>
      <P>
        When RLS is enabled on a label or collection, rows with no matching policy are denied.
        You must create at least one permissive policy for any data to be accessible.
      </P>

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
          ["current_username()", "The authenticated user's login username"],
          ["session('key')", "Custom session variable (e.g., tenant_id)"],
        ]}
      />

      <H2>Persistence</H2>
      <P>
        RLS policies and enabled/disabled state persist across server restarts via snapshot v5.
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
EXPLAIN MATCH (a:Person)-[:KNOWS]->(b:Person)-[:WORKS_AT]->(c:Company)
WHERE a.age > 25
RETURN a.name, c.name`}</Code>

      <H2>PROFILE</H2>
      <P>Execute the query and show actual statistics (rows processed, time per operator).</P>
      <Code>{`PROFILE MATCH (n:Person)-[:KNOWS]->(m:Person)
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
        Access the GraphQL playground from the browser UI sidebar under <strong>GraphQL</strong>.
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

      <H2>Collection Management (Cypher)</H2>
      <Code>{`-- Create a collection
CREATE COLLECTION orders

-- Create only if it doesn't already exist
CREATE COLLECTION IF NOT EXISTS orders

-- Drop a collection
DROP COLLECTION orders`}</Code>
      <P>
        System collections in the <InlineCode>auth.*</InlineCode> namespace (e.g.{" "}
        <InlineCode>auth.users</InlineCode>, <InlineCode>auth.roles</InlineCode>) cannot be
        dropped.
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
  MATCH (p:Person {name: person})-[:KNOWS]->(f) RETURN count(f)
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
          ["current_user()", "Session username"],
          ["is_sync()", "Whether operation is sync-originated"],
          ["timestamp()", "Current epoch ms"],
          ["uuid()", "Generate a new UUID v4"],
        ]}
      />

      <H2>Trigger Chaining</H2>
      <P>
        When an UPSERT DOCUMENT is executed inside a trigger body, it fires any AFTER triggers
        defined on the target collection. This enables reactive pipelines where one trigger
        can cascade into another.
      </P>

      <H2>Trigger Backfill</H2>
      <P>
        Creating a trigger automatically processes all existing records in its target label or
        collection. Pre-existing data is made consistent with the new trigger logic without
        requiring a manual migration.
      </P>

      <H2>Execution Limits</H2>
      <P>
        Priority ordering (lower = first, default 100). Recursive trigger firing is capped at
        16 levels deep — exceeding this limit raises an error. Use{" "}
        <InlineCode>SKIP TRIGGERS</InlineCode> on sync rules to prevent cascades.
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
        The <InlineCode>TO role</InlineCode> clause is optional — omitting it applies the policy to all roles.
      </P>
      <Code>{`-- Users see only their own data (role-specific)
CREATE POLICY own_data ON :Project FOR SELECT TO reader
  USING (n.owner = current_user())

-- Policy for all roles (TO clause omitted)
CREATE POLICY public_read ON :Project FOR SELECT
  USING (n.public = true)

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
          ["current_username()", "The authenticated user's login username"],
          ["session('key')", "Custom session variable (e.g., tenant_id)"],
        ]}
      />

      <H2>Write Enforcement</H2>
      <P>
        SET operations check the USING predicate per-node before applying changes.
        UPSERT DOCUMENT checks the USING predicate per-document. RLS write policies bypass
        RBAC role checks — any user whose data matches the predicate can write.
      </P>

      <H2>Deny-by-Default</H2>
      <P>
        When RLS is enabled, rows with no matching policy are denied. You must create at least
        one permissive policy for any data to be accessible.
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

      <H2>Persistence</H2>
      <P>
        RLS policies and enabled/disabled state persist across server restarts via snapshot v5.
      </P>
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
          ["GET", "/db/{name}/schema", "Get database schema"],
          ["GET", "/db/{name}/graph", "Get full graph data"],
          ["POST", "/graphql", "GraphQL endpoint"],
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
          ["GET", "/.well-known/jwks.json", "JWKS public keys"],
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
        Settings are resolved in order: CLI flags &gt; environment variables &gt; config file &gt; defaults.
      </P>
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
# RSA key pair auto-generated -> data/jwt_key.pem

[logging]
level = "info"
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
      <Table
        headers={["Variable", "Default"]}
        rows={[
          ["ANVIL_HTTP_PORT", "7474"],
          ["ANVIL_BOLT_PORT", "7687"],
          ["ANVIL_DATA_DIR", "./data"],
          ["ANVIL_LOG_LEVEL", "info"],
          ["ANVIL_AUTH_ENABLED", "true"],
          ["ANVIL_DOCUMENT_STORAGE", "unified"],
          ["ANVIL_SLOW_QUERY_THRESHOLD", "1000"],
          ["ANVIL_TLS_CERT", "(not set)"],
          ["ANVIL_TLS_KEY", "(not set)"],
        ]}
      />

      <H2>CLI Commands</H2>
      <Code>{`anvil start                    # Daemon mode (default)
anvil start --foreground       # Foreground mode
anvil stop                     # Graceful shutdown
anvil status                   # Show running state
anvil start --http-port 8080   # Override config`}</Code>
    </>
  );
}

function BrowserSection() {
  return (
    <>
      <H1>Browser UI</H1>
      <P>
        The browser UI runs on port 5175 and provides a complete interface for managing your database.
      </P>

      <H2>Pages</H2>
      <Table
        headers={["Page", "Description"]}
        rows={[
          ["Cypher", "Query editor with Table/JSON/Graph view, Cmd+Enter to execute"],
          ["GraphQL", "GraphQL playground with introspection"],
          ["Graph", "Force-directed visualization, right-click menus, expand neighbors, edit properties"],
          ["Schema", "Labels, relationship types, property keys, indexes"],
          ["Documents", "Collection CRUD, document browsing, sync rule management"],
          ["Policies", "RLS policy management, enable/disable, simulator"],
          ["Functions", "Create/edit/delete stored functions, test execution panel, call log"],
          ["Triggers", "Create/edit triggers, enable/disable, activity log, dependency analysis"],
          ["Monitor", "Server stats, slow query log, event log"],
          ["Admin", "User/role management, event log explorer, alerts panel"],
          ["Settings", "Theme, editor preferences, graph defaults"],
          ["Help", "This documentation page"],
        ]}
      />

      <H2>Schema Dropdown</H2>
      <P>
        Switch between <InlineCode>public</InlineCode> and <InlineCode>auth</InlineCode> schemas
        in the sidebar. Schema-aware pages filter content by the selected schema.
      </P>

      <H2>Graph Visualization</H2>
      <P>
        Force-directed layout with D3.js. Double-click nodes to expand neighbors. Right-click for
        edit/delete context menus. Per-label caption properties stored in localStorage.
      </P>
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
