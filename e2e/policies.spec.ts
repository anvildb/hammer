// Hammer e2e for the /policies table filters.
//
// The Active Policies table filters by target (collections, labels and
// relationship types, pre-populated from the database) and by role
// (pre-populated from the server's roles). Hermetic like triggers.spec.ts.

import { test, expect, type Route } from "@playwright/test";

const FAKE_PAYLOAD = Buffer.from(
  JSON.stringify({
    username: "test-admin",
    roles: ["admin"],
    exp: 9999999999,
  }),
).toString("base64");
const FAKE_TOKEN = `header.${FAKE_PAYLOAD}.signature`;
const MOCK_ORIGIN = "http://mock-anvil:7474";

const SHOW_POLICIES = {
  columns: ["name", "target", "operation", "role", "mode", "using", "check"],
  rows: [
    [
      "owner_only",
      ":Person",
      "SELECT",
      "viewer",
      "PERMISSIVE",
      "n.owner = current_user()",
      "",
    ],
    [
      "orders_edit",
      "COLLECTION orders",
      "ALL",
      "editor",
      "PERMISSIVE",
      "true",
      "true",
    ],
    [
      "orders_admin",
      "COLLECTION orders",
      "DELETE",
      "admin",
      "RESTRICTIVE",
      "true",
      "",
    ],
    ["knows_hidden", ":KNOWS", "SELECT", "ALL", "RESTRICTIVE", "false", ""],
  ],
  rowCount: 4,
};

const json = (route: Route, body: unknown) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });

// The policy set the SHOW POLICIES mock answers with; a test may replace
// `rows` before navigating.
let policySet: { columns: string[]; rows: unknown[][] };

test.describe("Policies table filters", () => {
  test.beforeEach(async ({ page }) => {
    policySet = {
      columns: SHOW_POLICIES.columns,
      rows: [...SHOW_POLICIES.rows],
    };
    await page.addInitScript(
      ([token]) => {
        window.localStorage.setItem(
          "anvil_tokens",
          JSON.stringify({ accessToken: token, refreshToken: token }),
        );
      },
      [FAKE_TOKEN],
    );

    await page.route(`${MOCK_ORIGIN}/**`, (route) => json(route, []));
    await page.route(`${MOCK_ORIGIN}/`, (route) =>
      json(route, { name: "anvil", version: "0.0.0-test" }),
    );
    // The page runs SHOW POLICIES and SHOW HIDDEN PROPERTIES; a DROP POLICY
    // takes its row out of the next SHOW.
    await page.route(`${MOCK_ORIGIN}/db/query`, (route) => {
      const { query } = route.request().postDataJSON() as { query: string };
      const drop = query.match(/^DROP POLICY (\S+) ON/);
      if (drop) {
        policySet.rows = policySet.rows.filter((r) => r[0] !== drop[1]);
        json(route, { columns: [], rows: [], rowCount: 0 });
      } else if (query.startsWith("SHOW POLICIES")) {
        json(route, { ...policySet, rowCount: policySet.rows.length });
      } else {
        json(route, { columns: [], rows: [], rowCount: 0 });
      }
    });
    await page.route(`${MOCK_ORIGIN}/docs`, (route) =>
      json(route, [
        { name: "orders", id: 1, composite_keys: false, default_ttl_ms: null },
        {
          name: "profiles",
          id: 2,
          composite_keys: false,
          default_ttl_ms: null,
        },
      ]),
    );
    await page.route(`${MOCK_ORIGIN}/db/default/schema`, (route) =>
      json(route, {
        labels: [
          { name: "Person", nodeCount: 3, properties: [] },
          { name: "Invoice", nodeCount: 1, properties: [] },
        ],
        relationshipTypes: [
          {
            name: "KNOWS",
            count: 2,
            properties: [],
            fromLabels: [],
            toLabels: [],
          },
          {
            name: "OWNS",
            count: 1,
            properties: [],
            fromLabels: [],
            toLabels: [],
          },
        ],
        propertyKeys: [],
        indexes: [],
        constraints: [],
      }),
    );
    await page.route(`${MOCK_ORIGIN}/admin/roles`, (route) =>
      json(
        route,
        ["admin", "editor", "viewer", "reader"].map((name) => ({
          name,
          privileges: [],
        })),
      ),
    );

    await page.goto("/policies");
  });

  test("target and role filters narrow the table together", async ({
    page,
  }) => {
    const rows = page.locator("table").first().locator("tbody tr");
    const names = () => rows.locator("td:first-child").allInnerTexts();
    const target = page.getByLabel("Filter by target");
    const role = page.getByLabel("Filter by role");
    const list = page.getByRole("listbox");
    const options = async () =>
      (await list.getByRole("option").allInnerTexts()).map((t) =>
        t.replace(/\s+/g, " "),
      );
    await expect(rows).toHaveCount(4);
    await expect(page.getByText("4 of 4")).toBeVisible();

    // Targets: the database's collections, labels and relationship types,
    // with policy counts.
    await target.click();
    await expect(list).toBeVisible();
    expect(await options()).toEqual([
      "orders 2",
      "profiles",
      ":Invoice",
      ":Person 1",
      ":KNOWS 1",
      ":OWNS",
    ]);
    await expect(list.getByText("Relationships")).toBeVisible();
    await list.getByRole("option", { name: ":KNOWS" }).click();
    expect(await names()).toEqual(["knows_hidden"]);

    // Roles: the server's roles plus any a policy names, with counts.
    await target.fill("orders");
    await role.click();
    expect(await options()).toEqual([
      "admin 1",
      "ALL 1",
      "editor 1",
      "reader",
      "viewer 1",
    ]);
    await list.getByRole("option", { name: "editor" }).click();
    expect(await names()).toEqual(["orders_edit"]);
    await expect(page.getByText("1 of 4")).toBeVisible();

    await role.fill("reader");
    await expect(rows).toHaveCount(0);
    await expect(
      page.getByText("No policies match these filters."),
    ).toBeVisible();
  });

  test("a long list pages, filters restart it, a drop keeps the page", async ({
    page,
  }) => {
    // 60 policies: p00..p59, odd ones on :Person, even ones on orders.
    policySet.rows = Array.from({ length: 60 }, (_, i) => [
      `p${String(i).padStart(2, "0")}`,
      i % 2 ? ":Person" : "COLLECTION orders",
      "SELECT",
      "viewer",
      "PERMISSIVE",
      "true",
      "",
    ]);
    await page.reload();

    const rows = page.locator("table").first().locator("tbody tr");
    const names = () => rows.locator("td:first-child").allInnerTexts();
    const next = page.getByRole("button", { name: "Next" });
    const prev = page.getByRole("button", { name: "Prev" });

    await expect(rows).toHaveCount(25);
    await expect(page.getByText("Page 1 of 3")).toBeVisible();
    await expect(page.getByText("(1–25 of 60)")).toBeVisible();
    await expect(prev).toBeDisabled();

    await next.click();
    await next.click();
    await expect(page.getByText("Page 3 of 3")).toBeVisible();
    await expect(page.getByText("(51–60 of 60)")).toBeVisible();
    await expect(rows).toHaveCount(10);
    await expect(next).toBeDisabled();
    expect((await names())[0]).toBe("p50");

    // Dropping on the last page stays on the last page.
    await rows.first().getByRole("button", { name: "Delete" }).click();
    await expect(rows).toHaveCount(9);
    await expect(page.getByText("Page 3 of 3")).toBeVisible();
    expect((await names())[0]).toBe("p51");

    // A filter edit restarts from the first page of the narrowed list.
    await page.getByLabel("Filter by target").fill(":Person");
    await expect(page.getByText("Page 1 of 2")).toBeVisible();
    await expect(page.getByText("30 of 59")).toBeVisible();
    expect((await names())[0]).toBe("p01");

    // Page size: everything fits, so the bar goes away.
    await page.getByLabel("Filter by target").fill("");
    await page.getByLabel("Rows per page").selectOption("100");
    await expect(rows).toHaveCount(59);
    await expect(page.getByText("Page 1 of 1")).toHaveCount(0);
  });
});
