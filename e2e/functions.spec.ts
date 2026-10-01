// Hammer e2e for the /functions table filters.
//
// The Registered Functions table filters by name or parameter (the list
// offers every function with its parameters), by return type (with counts)
// and by kind (read / mutating). Hermetic like triggers.spec.ts.

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

const SHOW_FUNCTIONS = {
  columns: [
    "name",
    "signature",
    "return_type",
    "mutating",
    "schema",
    "body",
    "created_by",
  ],
  rows: [
    [
      "total",
      "total(ids: LIST) RETURNS FLOAT",
      "FLOAT",
      false,
      "public",
      "RETURN 1.5",
      "admin",
    ],
    [
      "greet",
      "greet(name: STRING) RETURNS STRING",
      "STRING",
      false,
      "public",
      "RETURN 'hi ' + name",
      "admin",
    ],
    [
      "bump",
      "bump(id: INT, by: INT = 1) RETURNS INT",
      "INT",
      true,
      "public",
      "RETURN id + by",
      "admin",
    ],
    // Another schema: the page already leaves it out.
    [
      "auth.helper",
      "auth.helper() RETURNS INT",
      "INT",
      false,
      "auth",
      "RETURN 0",
      "admin",
    ],
  ],
  rowCount: 4,
};

const json = (route: Route, body: unknown) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });

// What SHOW FUNCTIONS answers with; a test may replace `rows` and reload.
let functionSet: { columns: string[]; rows: unknown[][] };

test.describe("Functions table filters", () => {
  test.beforeEach(async ({ page }) => {
    functionSet = {
      columns: SHOW_FUNCTIONS.columns,
      rows: [...SHOW_FUNCTIONS.rows],
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
    await page.route(`${MOCK_ORIGIN}/db/query`, (route) =>
      json(route, { ...functionSet, rowCount: functionSet.rows.length }),
    );

    await page.goto("/functions");
  });

  test("name, return type and kind filters narrow the table", async ({
    page,
  }) => {
    const rows = page.locator("table").first().locator("tbody tr");
    const names = () => rows.locator("td:first-child").allInnerTexts();
    const name = page.getByLabel("Filter by name");
    const returns = page.getByLabel("Filter by return type");
    const kind = page.getByLabel("Filter by kind");
    const list = page.getByRole("listbox");
    const options = async () =>
      (await list.getByRole("option").allInnerTexts()).map((t) =>
        t.replace(/\s+/g, " "),
      );
    await expect(rows).toHaveCount(3);
    await expect(page.getByText("3 of 3")).toBeVisible();

    // The name list shows each function with its parameters, sorted.
    await name.click();
    await expect(list).toBeVisible();
    expect(await options()).toEqual([
      "bump (id: INT, by: INT = 1)",
      "greet (name: STRING)",
      "total (ids: LIST)",
    ]);
    await list.getByRole("option", { name: "greet" }).click();
    await expect(name).toHaveValue("greet");
    expect(await names()).toEqual(["greet"]);

    // A parameter type matches too, in the list and the table alike.
    await name.fill("LIST");
    expect(await options()).toEqual(["total (ids: LIST)"]);
    expect(await names()).toEqual(["total"]);
    await page.keyboard.press("Escape");

    // Return types carry counts.
    await name.fill("");
    await returns.click();
    expect(await options()).toEqual(["FLOAT 1", "INT 1", "STRING 1"]);
    await list.getByRole("option", { name: "INT" }).click();
    expect(await names()).toEqual(["bump"]);

    // Kind combines with the rest.
    await returns.fill("");
    await kind.selectOption("mutating");
    expect(await names()).toEqual(["bump"]);
    await kind.selectOption("read");
    expect(await names()).toEqual(["total", "greet"]);
    await returns.fill("INT");
    await expect(rows).toHaveCount(0);
    await expect(
      page.getByText("No functions match these filters."),
    ).toBeVisible();
  });

  test("the body panel follows the filtered rows", async ({ page }) => {
    const rows = page.locator("table").first().locator("tbody tr");
    await rows
      .filter({ hasText: "greet" })
      .getByRole("button", { name: "Body" })
      .click();
    await expect(page.locator("pre")).toHaveText("RETURN 'hi ' + name");

    // Filtering greet out hides its body; bringing it back shows it again.
    await page.getByLabel("Filter by name").fill("bump");
    await expect(page.locator("pre")).toHaveCount(0);
    await page.getByLabel("Filter by name").fill("");
    await expect(page.locator("pre")).toHaveText("RETURN 'hi ' + name");
  });

  test("a long list pages, and an open body stays with its page", async ({
    page,
  }) => {
    functionSet.rows = Array.from({ length: 30 }, (_, i) => [
      `f${String(i).padStart(2, "0")}`,
      `f${String(i).padStart(2, "0")}() RETURNS INT`,
      "INT",
      false,
      "public",
      `RETURN ${i}`,
      "admin",
    ]);
    await page.reload();

    const rows = page.locator("table").first().locator("tbody tr");
    await expect(rows).toHaveCount(25);
    await expect(page.getByText("Page 1 of 2")).toBeVisible();

    await rows
      .filter({ hasText: "f03" })
      .getByRole("button", { name: "Body" })
      .click();
    await expect(page.locator("pre")).toHaveText("RETURN 3");

    // The body belongs to page 1: gone on page 2, back on page 1.
    await page.getByRole("button", { name: "Next" }).click();
    await expect(rows).toHaveCount(5);
    await expect(page.locator("pre")).toHaveCount(0);
    await page.getByRole("button", { name: "Prev" }).click();
    await expect(page.locator("pre")).toHaveText("RETURN 3");

    // 10 per page: f03 is still on the first page.
    await page.getByLabel("Rows per page").selectOption("10");
    await expect(rows).toHaveCount(10);
    await expect(page.getByText("Page 1 of 3")).toBeVisible();
    await expect(page.locator("pre")).toHaveText("RETURN 3");
  });
});
