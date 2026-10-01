// Hammer e2e for the /triggers body viewer.
//
// A trigger's body opens in a modal over the table rather than in a panel
// under it. Hermetic like index-advisor.spec.ts: Playwright route mocks + a
// fake JWT in localStorage, no anvil-server required.

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

// Served out of name order, so the table's default sort reorders the rows.
const SHOW_TRIGGERS = {
  columns: [
    "name",
    "timing",
    "event",
    "target",
    "priority",
    "enabled",
    "body",
    "created_by",
  ],
  rows: [
    [
      "zeta_audit",
      "AFTER",
      "DELETE",
      "COLLECTION orders",
      100,
      true,
      "CREATE DOCUMENT IN audit OLD.id { gone: true }",
      "admin",
    ],
    [
      "alpha_profile",
      "BEFORE",
      "INSERT",
      "COLLECTION auth.users",
      50,
      true,
      "SET NEW.created_on = timestamp()",
      "admin",
    ],
    [
      "person_seen",
      "AFTER",
      "UPDATE",
      ":Person",
      100,
      true,
      "SET NEW.seen_on = timestamp()",
      "admin",
    ],
    [
      "user_label_seen",
      "AFTER",
      "UPDATE",
      ":User",
      100,
      true,
      "SET NEW.seen_on = timestamp()",
      "admin",
    ],
  ],
  rowCount: 4,
};

// 60 firings of alpha_profile, newest first, and 30 dependency rows.
const FIRINGS = Array.from({ length: 60 }, (_, i) => ({
  id: 1000 - i,
  timestamp: 1_700_000_000_000 - i * 1000,
  type: "TriggerFired",
  name: "alpha_profile",
  duration_ms: i,
  success: true,
  error: null,
  user: "admin",
  metadata: {
    timing: "BEFORE",
    event: "INSERT",
    target: "COLLECTION auth.users",
  },
}));
const DEPENDENCIES = {
  columns: ["source", "kind", "depends_on"],
  rows: Array.from({ length: 30 }, (_, i) => [
    `dep_${String(i).padStart(2, "0")}`,
    "trigger",
    "fn_x",
  ]),
};

const json = (route: Route, body: unknown) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });

// What SHOW TRIGGERS answers with; a test may replace `rows` and reload.
let triggerSet: { columns: string[]; rows: unknown[][] };

test.describe("Triggers body viewer", () => {
  test.beforeEach(async ({ page }) => {
    triggerSet = {
      columns: SHOW_TRIGGERS.columns,
      rows: [...SHOW_TRIGGERS.rows],
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

    // Later routes win, so this catch-all only answers what nothing below does.
    await page.route(`${MOCK_ORIGIN}/**`, (route) => json(route, []));
    await page.route(`${MOCK_ORIGIN}/`, (route) =>
      json(route, { name: "anvil", version: "0.0.0-test" }),
    );
    await page.route(`${MOCK_ORIGIN}/db/query`, (route) => {
      const { query } = route.request().postDataJSON() as { query: string };
      json(
        route,
        query.startsWith("SHOW DEPENDENCIES")
          ? { ...DEPENDENCIES, rowCount: DEPENDENCIES.rows.length }
          : { ...triggerSet, rowCount: triggerSet.rows.length },
      );
    });
    // The activity log asks for TriggerFired and TriggerError events.
    await page.route(
      (url) => url.origin === MOCK_ORIGIN && url.pathname === "/admin/events",
      (route) => {
        const type = new URL(route.request().url()).searchParams.get("type");
        const events = type === "TriggerFired" ? FIRINGS : [];
        json(route, { events, count: events.length, total: events.length });
      },
    );
    // What the database has: `profiles` and `Invoice` carry no trigger, and
    // the `:User` trigger's label has no nodes, so it is missing here.
    await page.route(`${MOCK_ORIGIN}/docs`, (route) =>
      json(route, [
        {
          name: "profiles",
          id: 1,
          composite_keys: false,
          default_ttl_ms: null,
        },
        { name: "orders", id: 2, composite_keys: false, default_ttl_ms: null },
        {
          name: "auth.users",
          id: 3,
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
        relationshipTypes: [],
        propertyKeys: [],
        indexes: [],
        constraints: [],
      }),
    );

    await page.goto("/triggers");
  });

  test("the table filters by collection name and by :Label", async ({
    page,
  }) => {
    const rows = page.locator("tbody tr");
    const names = () => rows.locator("td:first-child").allInnerTexts();
    const filter = page.getByLabel("Filter by target");
    await expect(rows).toHaveCount(4);
    await expect(page.getByText("4 of 4")).toBeVisible();

    // A bare fragment matches collections and labels alike.
    await filter.fill("user");
    await expect(rows).toHaveCount(2);
    expect(await names()).toEqual(["alpha_profile", "user_label_seen"]);

    // A leading colon pins it to labels.
    await filter.fill(":user");
    await expect(rows).toHaveCount(1);
    expect(await names()).toEqual(["user_label_seen"]);

    await filter.fill(":Person");
    expect(await names()).toEqual(["person_seen"]);

    // A dotted collection name.
    await filter.fill("auth.users");
    expect(await names()).toEqual(["alpha_profile"]);
    await expect(page.getByText("1 of 4")).toBeVisible();

    // COLLECTION pins it to collections, as in SHOW TRIGGERS output.
    await filter.fill("COLLECTION ord");
    expect(await names()).toEqual(["zeta_audit"]);

    // The text survives the list closing: it is the filter, not a selection.
    await page.keyboard.press("Escape");
    await filter.blur();
    await expect(filter).toHaveValue("COLLECTION ord");
    await expect(rows).toHaveCount(1);

    // Nothing matching says so instead of an empty table.
    await filter.fill(":Nobody");
    await expect(rows).toHaveCount(0);
    await expect(
      page.getByText("No triggers match this target filter."),
    ).toBeVisible();
  });

  test("the filter offers the database's targets, grouped by kind", async ({
    page,
  }) => {
    const rows = page.locator("tbody tr");
    const names = () => rows.locator("td:first-child").allInnerTexts();
    const filter = page.getByLabel("Filter by target");
    const list = page.getByRole("listbox");
    // Each option reads "<target>" or "<target> <trigger count>".
    const options = async () =>
      (await list.getByRole("option").allInnerTexts()).map((t) =>
        t.replace(/\s+/g, " "),
      );

    // Clicking the empty box lists every collection and label the database
    // has, plus the targets in use, with trigger counts; collections first.
    await filter.click();
    await expect(list).toBeVisible();
    await expect(list.getByRole("option")).toHaveCount(6);
    expect(await options()).toEqual([
      "auth.users 1",
      "orders 1",
      "profiles",
      ":Invoice",
      ":Person 1",
      ":User 1",
    ]);
    await expect(list.getByText("Collections")).toBeVisible();
    await expect(list.getByText("Labels")).toBeVisible();

    // Picking one fills the box and filters the table.
    await list.getByRole("option", { name: ":Person" }).click();
    await expect(filter).toHaveValue(":Person");
    await expect(list).toHaveCount(0);
    expect(await names()).toEqual(["person_seen"]);

    // Typing narrows the list by the same rules as the table.
    await filter.fill("user");
    expect(await options()).toEqual(["auth.users 1", ":User 1"]);
    await filter.fill(":");
    expect(await options()).toEqual([":Invoice", ":Person 1", ":User 1"]);
    await expect(list.getByText("Collections")).toHaveCount(0);

    // A target with no trigger yet still filters, to an empty table.
    await list.getByRole("option", { name: ":Invoice" }).click();
    await expect(filter).toHaveValue(":Invoice");
    await expect(rows).toHaveCount(0);
    await expect(
      page.getByText("No triggers match this target filter."),
    ).toBeVisible();

    // Clear empties both. (While the list is open, Base UI hides the rest of
    // the page from the accessibility tree, so close it first.)
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(filter).toHaveValue("");
    await expect(rows).toHaveCount(4);
  });

  test("Body opens the clicked trigger in a modal", async ({ page }) => {
    const row = page.getByRole("row").filter({ hasText: "alpha_profile" });
    await row.getByRole("button", { name: "Body" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("alpha_profile");
    await expect(dialog).toContainText(
      "BEFORE INSERT ON COLLECTION auth.users",
    );
    await expect(dialog).toContainText("Available variables: NEW");
    await expect(dialog.locator("pre")).toHaveText(
      "SET NEW.created_on = timestamp()",
    );
    await expect(dialog).toBeInViewport();

    // The body lives in the modal only, not in a panel under the table.
    await expect(page.locator("pre")).toHaveCount(1);

    // A label-targeted trigger reads the same way.
    await page.keyboard.press("Escape");
    await page
      .getByRole("row")
      .filter({ hasText: "person_seen" })
      .getByRole("button", { name: "Body" })
      .click();
    await expect(dialog).toContainText("AFTER UPDATE ON :Person");
    await expect(dialog).toContainText("Available variables: OLD, NEW");
  });

  test("Escape, the close button and the backdrop all dismiss it", async ({
    page,
  }) => {
    const open = () =>
      page
        .getByRole("row")
        .filter({ hasText: "zeta_audit" })
        .getByRole("button", { name: "Body" })
        .click();
    const dialog = page.getByRole("dialog");

    await open();
    await expect(dialog.locator("pre")).toContainText("gone: true");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);

    await open();
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toHaveCount(0);

    await open();
    await page.mouse.click(5, 5);
    await expect(dialog).toHaveCount(0);
  });

  test("a long list pages; a sort or filter change restarts it", async ({
    page,
  }) => {
    // 40 triggers t00..t39 with priority counting down, so sorting by
    // priority reverses the name order.
    triggerSet.rows = Array.from({ length: 40 }, (_, i) => [
      `t${String(i).padStart(2, "0")}`,
      "AFTER",
      "INSERT",
      i % 2 ? ":Person" : "COLLECTION orders",
      100 - i,
      true,
      "RETURN 1",
      "admin",
    ]);
    await page.reload();

    const rows = page.locator("table").first().locator("tbody tr");
    const names = () => rows.locator("td:first-child").allInnerTexts();
    await expect(rows).toHaveCount(25);
    await expect(page.getByText("Page 1 of 2")).toBeVisible();

    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Page 2 of 2")).toBeVisible();
    await expect(rows).toHaveCount(15);
    expect((await names())[0]).toBe("t25");

    // Sorting by priority (ascending: t39 first) restarts at page 1.
    await page.getByRole("button", { name: "Priority" }).click();
    await expect(page.getByText("Page 1 of 2")).toBeVisible();
    expect((await names())[0]).toBe("t39");

    await page.getByRole("button", { name: "Next" }).click();
    await page.getByLabel("Filter by target").fill(":Person");
    await expect(page.getByText("20 of 40")).toBeVisible();
    await expect(page.getByText("Page 1 of 1")).toHaveCount(0);
    await expect(rows).toHaveCount(20);
  });

  test("the activity log and dependency analysis page too", async ({
    page,
  }) => {
    // Activity: 60 firings, 25 a page; a reload starts over at page 1.
    await page.getByRole("button", { name: "Load Activity" }).click();
    // The table and its pager bar share the bordered wrapper.
    const activity = page.locator("table").nth(1).locator("..");
    const activityRows = activity.locator("tbody tr");
    await expect(activityRows).toHaveCount(25);
    await expect(activity.getByText("Page 1 of 3")).toBeVisible();
    await activity.getByRole("button", { name: "Next" }).click();
    await expect(activity.getByText("Page 2 of 3")).toBeVisible();
    await expect(activityRows.first()).toContainText("25ms");
    await page.getByRole("button", { name: "Load Activity" }).click();
    await expect(activity.getByText("Page 1 of 3")).toBeVisible();
    await expect(activityRows.first()).toContainText("0ms");

    // Dependencies: 30 rows, so two pages; each table pages on its own.
    await page.getByRole("button", { name: "Analyze Dependencies" }).click();
    const deps = page.locator("table").nth(2).locator("..");
    const depRows = deps.locator("tbody tr");
    await expect(depRows).toHaveCount(25);
    await expect(deps.getByText("(1–25 of 30)")).toBeVisible();
    await deps.getByRole("button", { name: "Next" }).click();
    await expect(depRows).toHaveCount(5);
    await expect(depRows.first()).toContainText("dep_25");
    await expect(activity.getByText("Page 1 of 3")).toBeVisible();
  });
});
