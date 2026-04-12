// ============================================================================
// Anvil DB — Test Data Setup
// ============================================================================
// Import this file to seed a test graph for the manual test suite in TESTS.md.
//
// Creates: 19 nodes, 51 relationships
//   - 8 Person nodes (with multiple labels: Engineer, Manager, Designer, Intern)
//   - 3 Company nodes
//   - 3 Project nodes
//   - 5 Skill nodes
//   - 8 WORKS_AT, 11 FRIEND, 12 ASSIGNED_TO/MANAGES, 14 HAS_SKILL, 6 MENTORS
// ============================================================================

// Clear existing public data (auth schema nodes are protected)
MATCH (n) DETACH DELETE n;

// --- People ---
CREATE (alice:Person:Engineer {name: 'Alice', age: 32, city: 'New York', salary: 120000, active: true})
CREATE (bob:Person:Engineer {name: 'Bob', age: 28, city: 'San Francisco', salary: 95000, active: true})
CREATE (carol:Person:Manager {name: 'Carol', age: 35, city: 'London', salary: 140000, active: true})
CREATE (dave:Person:Designer {name: 'Dave', age: 41, city: 'Berlin', salary: 110000, active: false})
CREATE (eve:Person:Engineer {name: 'Eve', age: 26, city: 'Tokyo', salary: 88000, active: true})
CREATE (frank:Person:Manager {name: 'Frank', age: 38, city: 'Paris', salary: 135000, active: true})
CREATE (grace:Person:Intern {name: 'Grace', age: 22, city: 'New York', salary: 45000, active: true})
CREATE (hank:Person {name: 'Hank', age: 45, city: 'Chicago', salary: 160000, active: true})

// --- Companies ---
CREATE (acme:Company {name: 'Acme Corp', founded: 2010, industry: 'Technology', employees: 500})
CREATE (globex:Company {name: 'Globex Inc', founded: 2015, industry: 'Finance', employees: 200})
CREATE (initech:Company {name: 'Initech', founded: 2005, industry: 'Technology', employees: 1000})

// --- Projects ---
CREATE (projectA:Project {name: 'Project Alpha', budget: 500000, status: 'active'})
CREATE (projectB:Project {name: 'Project Beta', budget: 200000, status: 'completed'})
CREATE (projectC:Project {name: 'Project Gamma', budget: 750000, status: 'active'})

// --- Skills ---
CREATE (rust:Skill {name: 'Rust', category: 'Language'})
CREATE (python:Skill {name: 'Python', category: 'Language'})
CREATE (react:Skill {name: 'React', category: 'Framework'})
CREATE (graphql:Skill {name: 'GraphQL', category: 'API'})
CREATE (docker:Skill {name: 'Docker', category: 'DevOps'})

// --- Employment ---
CREATE
  (alice)-[:WORKS_AT {since: 2018, role: 'Senior Engineer'}]->(acme),
  (bob)-[:WORKS_AT {since: 2020, role: 'Engineer'}]->(acme),
  (carol)-[:WORKS_AT {since: 2016, role: 'VP Engineering'}]->(acme),
  (dave)-[:WORKS_AT {since: 2019, role: 'Lead Designer'}]->(globex),
  (eve)-[:WORKS_AT {since: 2022, role: 'Junior Engineer'}]->(globex),
  (frank)-[:WORKS_AT {since: 2017, role: 'Director'}]->(initech),
  (grace)-[:WORKS_AT {since: 2024, role: 'Intern'}]->(acme),
  (hank)-[:WORKS_AT {since: 2012, role: 'CTO'}]->(initech)

// --- Friendships ---
CREATE
  (alice)-[:FRIEND {since: 2017}]->(bob),
  (alice)-[:FRIEND {since: 2018}]->(carol),
  (alice)-[:FRIEND {since: 2020}]->(eve),
  (bob)-[:FRIEND {since: 2019}]->(dave),
  (bob)-[:FRIEND {since: 2021}]->(eve),
  (carol)-[:FRIEND {since: 2016}]->(frank),
  (dave)-[:FRIEND {since: 2020}]->(frank),
  (eve)-[:FRIEND {since: 2022}]->(grace),
  (frank)-[:FRIEND {since: 2018}]->(hank),
  (grace)-[:FRIEND {since: 2023}]->(alice),
  (hank)-[:FRIEND {since: 2015}]->(carol)

// --- Project Assignments ---
CREATE
  (alice)-[:ASSIGNED_TO {hours: 30}]->(projectA),
  (bob)-[:ASSIGNED_TO {hours: 40}]->(projectA),
  (eve)-[:ASSIGNED_TO {hours: 10}]->(projectA),
  (carol)-[:MANAGES]->(projectA),
  (dave)-[:ASSIGNED_TO {hours: 20}]->(projectB),
  (eve)-[:ASSIGNED_TO {hours: 35}]->(projectB),
  (hank)-[:ASSIGNED_TO {hours: 25}]->(projectB),
  (eve)-[:ASSIGNED_TO {hours: 15}]->(projectC),
  (frank)-[:ASSIGNED_TO {hours: 20}]->(projectC),
  (alice)-[:ASSIGNED_TO {hours: 10}]->(projectC),
  (frank)-[:MANAGES]->(projectC),
  (hank)-[:MANAGES]->(projectB)

// --- Skills ---
CREATE
  (alice)-[:HAS_SKILL {level: 'expert'}]->(rust),
  (alice)-[:HAS_SKILL {level: 'intermediate'}]->(python),
  (alice)-[:HAS_SKILL {level: 'advanced'}]->(react),
  (bob)-[:HAS_SKILL {level: 'advanced'}]->(rust),
  (bob)-[:HAS_SKILL {level: 'expert'}]->(docker),
  (carol)-[:HAS_SKILL {level: 'intermediate'}]->(python),
  (carol)-[:HAS_SKILL {level: 'beginner'}]->(graphql),
  (dave)-[:HAS_SKILL {level: 'expert'}]->(react),
  (eve)-[:HAS_SKILL {level: 'intermediate'}]->(rust),
  (eve)-[:HAS_SKILL {level: 'advanced'}]->(python),
  (frank)-[:HAS_SKILL {level: 'advanced'}]->(graphql),
  (grace)-[:HAS_SKILL {level: 'beginner'}]->(python),
  (grace)-[:HAS_SKILL {level: 'beginner'}]->(rust),
  (hank)-[:HAS_SKILL {level: 'expert'}]->(docker)

// --- Mentorship Chain ---
CREATE
  (carol)-[:MENTORS]->(alice),
  (alice)-[:MENTORS]->(bob),
  (alice)-[:MENTORS]->(grace),
  (frank)-[:MENTORS]->(dave),
  (hank)-[:MENTORS]->(frank),
  (bob)-[:MENTORS]->(eve)
