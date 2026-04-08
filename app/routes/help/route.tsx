// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
import { useState } from "react";

type SectionId =
  | "getting-started"
  | "cypher"
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

const sections: { id: SectionId; title: string }[] = [
  { id: "getting-started", title: "Getting Started" },
  { id: "cypher", title: "Cypher Query Language" },
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

export default function HelpRoute() {
  const [active, setActive] = useState<SectionId>("getting-started");

  return (
    <div className="flex h-full bg-zinc-950 text-zinc-100">
      {/* Sidebar TOC */}
      <nav className="w-56 shrink-0 border-r border-zinc-800 overflow-y-auto py-4">
        <p className="px-4 pb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Documentation
        </p>
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className={`block w-full text-left px-4 py-1.5 text-sm transition-colors ${
              active === s.id
                ? "bg-zinc-800 text-zinc-100 border-l-2 border-zinc-400"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border-l-2 border-transparent"
            }`}
          >
            {s.title}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">
          {active === "getting-started" && <GettingStarted />}
          {active === "cypher" && <CypherSection />}
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

function CypherSection() {
  return (
    <>
      <H1>Cypher Query Language</H1>
      <P>
        Anvil implements the Cypher query language with a hand-written lexer, recursive descent
        parser, cost-based optimizer, and Volcano-model executor.
      </P>

      <H2>Clauses</H2>
      <H3>CREATE</H3>
      <Code>{`-- Create nodes
CREATE (n:Person {name: "Alice", age: 30})

-- Create with relationships (multi-CREATE with variable binding)
CREATE (a:Person {name: "Alice"})
CREATE (b:Person {name: "Bob"})
CREATE (a)-[:KNOWS {since: 2020}]->(b)

-- Create multiple in one pattern
CREATE (a:Person), (b:Company), (a)-[:WORKS_AT]->(b)`}</Code>

      <H3>MATCH</H3>
      <Code>{`-- Simple node match
MATCH (n:Person) RETURN n

-- With property filter
MATCH (n:Person {name: "Alice"}) RETURN n

-- With WHERE clause
MATCH (n:Person) WHERE n.age > 25 RETURN n.name, n.age

-- Relationship pattern
MATCH (a:Person)-[r:KNOWS]->(b:Person) RETURN a.name, b.name

-- With WHERE on relationships
MATCH (p:Person)-[r:KNOWS]->(friend)
WHERE p.role = "Engineer"
RETURN p.name, collect(friend.name) AS friends`}</Code>

      <H3>SET / DELETE</H3>
      <Code>{`-- Update properties
MATCH (n:Person {name: "Alice"}) SET n.age = 31 RETURN n

-- Delete with relationships
MATCH (n:Person {name: "Bob"}) DETACH DELETE n

-- Delete by label
MATCH (n:OldLabel) DETACH DELETE n`}</Code>

      <H2>Aggregation Functions</H2>
      <Table
        headers={["Function", "Description", "Example"]}
        rows={[
          ["count(expr)", "Count non-null values", "count(n)"],
          ["collect(expr)", "Collect into array", "collect(n.name)"],
          ["sum(expr)", "Sum numeric values", "sum(n.score)"],
          ["avg(expr)", "Average", "avg(n.age)"],
          ["min(expr) / max(expr)", "Min/max value", "min(n.age)"],
        ]}
      />

      <H2>Scalar Functions</H2>
      <Table
        headers={["Function", "Description"]}
        rows={[
          ["id(node)", "Node internal ID"],
          ["type(rel)", "Relationship type"],
          ["labels(node)", "Node labels array"],
          ["properties(node)", "Properties map (excludes internals)"],
          ["keys(map)", "Map keys"],
          ["coalesce(a, b, ...)", "First non-null value"],
          ["size(str | list)", "String length or list size"],
          ["timestamp()", "Current epoch milliseconds"],
        ]}
      />

      <H2>String Functions</H2>
      <Table
        headers={["Function", "Description"]}
        rows={[
          ["toUpper(s) / toLower(s)", "Case conversion"],
          ["trim(s)", "Strip whitespace"],
          ["reverse(s)", "Reverse string"],
          ["replace(s, from, to)", "Replace substring"],
          ["toString(x) / toInteger(x) / toFloat(x)", "Type conversion"],
        ]}
      />

      <H2>Math Functions</H2>
      <Table
        headers={["Function", "Description"]}
        rows={[
          ["abs(n)", "Absolute value"],
          ["ceil(n) / floor(n) / round(n)", "Rounding"],
          ["sqrt(n)", "Square root"],
          ["rand()", "Random float 0-1"],
          ["range(start, end, step?)", "Generate integer range"],
        ]}
      />

      <H2>List Functions</H2>
      <Table
        headers={["Function", "Description"]}
        rows={[
          ["head(list)", "First element"],
          ["last(list)", "Last element"],
          ["tail(list)", "All elements except first"],
          ["size(list)", "Number of elements"],
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

      <P>
        Priority ordering (lower = first, default 100). Max recursion depth: 16.
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
      <Code>{`-- Users see only their own data
CREATE POLICY own_data ON :Project FOR SELECT TO reader
  USING (n.owner = current_user())

-- Multi-tenant isolation
CREATE POLICY tenant ON :Project FOR ALL TO authenticated
  USING (n.tenant_id = session('tenant_id'))

-- Restrictive policy (AND logic)
CREATE POLICY no_secret ON :Document FOR SELECT TO reader
  USING (n.classification != 'SECRET') AS RESTRICTIVE`}</Code>

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
