// Phase 27.7 — Hammer e2e for the IndexAdvisor admin tab.
//
// Verifies the new /admin Index Advisor tab renders, fetches
// suggestions, and surfaces the per-suggestion actions. Uses
// Playwright's route mocking + a fake JWT in localStorage to
// bypass the live backend / auth flow so the test is hermetic
// (no anvil-server required).

import { test, expect } from "@playwright/test";

const FAKE_PAYLOAD = Buffer.from(
  JSON.stringify({
    username: "test-admin",
    roles: ["admin"],
    exp: 9999999999,
  }),
).toString("base64");
const FAKE_TOKEN = `header.${FAKE_PAYLOAD}.signature`;

const SAMPLE_SUGGESTIONS = [
  {
    id: "sugg-0000000000000001",
    label: "Person",
    property: "email",
    kind: "Property",
    est_benefit_ms: 1500,
    est_memory_bytes: 4096,
    observed_count: 12,
    dismissed: false,
    would_exceed_budget: false,
    sample_queries: [
      "MATCH (n:Person) WHERE n.email = $e RETURN n",
    ],
    created_on: 1700000000000,
  },
  {
    id: "sugg-0000000000000002",
    label: "Order",
    property: "total",
    kind: "Property",
    est_benefit_ms: 800,
    est_memory_bytes: 999_999_999,
    observed_count: 3,
    dismissed: false,
    would_exceed_budget: true,
    sample_queries: [],
    created_on: 1700000000000,
  },
];

test.describe("Index Advisor admin tab", () => {
  test.beforeEach(async ({ page }) => {
    // Seed localStorage with a valid-shape token BEFORE navigation so
    // the React app's mount-time effect picks it up.
    await page.addInitScript(([token]) => {
      window.localStorage.setItem(
        "anvil_tokens",
        JSON.stringify({
          accessToken: token,
          refreshToken: token,
        }),
      );
    }, [FAKE_TOKEN]);

    // Mock api-client calls. The playwright config sets
    // VITE_ANVIL_API_URL=http://mock-anvil:7474 so the React app's
    // requests target that origin; we intercept every call to it.
    const MOCK_ORIGIN = "http://mock-anvil:7474";

    // Server-info probe (`GET /`) drives the ConnectionProvider's
    // "connected" state.
    await page.route(`${MOCK_ORIGIN}/`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ name: "anvil", version: "0.0.0-test" }),
      }),
    );

    // Admin-only mount-time fetches return empty arrays so the route
    // resolves the loading state instead of error-ing out.
    for (const path of [
      "/admin/databases",
      "/admin/users",
      "/admin/roles",
      "/db/default/schema",
      "/auth/service-accounts",
    ]) {
      await page.route(`${MOCK_ORIGIN}${path}`, (route) =>
        route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
      );
    }

    // Advisor endpoint that the new tab fetches.
    await page.route(`${MOCK_ORIGIN}/admin/index-suggestions*`, (route) => {
      if (route.request().method() === "GET") {
        const url = new URL(route.request().url());
        const showDismissed = url.searchParams.get("dismissed") === "true";
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            showDismissed ? [] : SAMPLE_SUGGESTIONS,
          ),
        });
      } else {
        route.fulfill({ status: 204, body: "" });
      }
    });
  });

  test("renders the Advisor tab + suggestions table", async ({ page }) => {
    await page.goto("/admin");
    // Wait for the admin nav to mount (proves the AuthGate let us
    // through and the tabs rendered).
    await expect(page.getByRole("button", { name: "Index Advisor" })).toBeVisible();

    await page.getByRole("button", { name: "Index Advisor" }).click();

    // Panel heading (h3, distinct from the tab button at top).
    await expect(
      page.getByRole("heading", { name: /Index Advisor/ }),
    ).toBeVisible();

    // Row 1 — Person.email, no budget warning. Cells are <td>; the
    // label / property repeat outside the table in the sample-queries
    // block, so we anchor to the cell role.
    await expect(page.getByRole("cell", { name: "Person" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "email" })).toBeVisible();
    await expect(page.getByText("1,500")).toBeVisible(); // benefit
    await expect(page.getByText("4,096")).toBeVisible(); // mem bytes
    // Active status badge shows for non-dismissed, in-budget rows.
    await expect(page.getByText(/^active$/)).toBeVisible();

    // Row 2 — Order.total, over budget.
    await expect(page.getByRole("cell", { name: "Order" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "total" })).toBeVisible();
    await expect(page.getByText(/over budget/i)).toBeVisible();
  });

  test("Show dismissed toggle re-fetches and renders empty state", async ({ page }) => {
    await page.goto("/admin");
    await page.getByRole("button", { name: "Index Advisor" }).click();

    await expect(page.getByRole("cell", { name: "Person" })).toBeVisible();

    // Tick "Show dismissed" — the mocked endpoint returns an empty
    // array for the dismissed view, so the empty-state copy renders.
    await page.getByLabel("Show dismissed").check();
    await expect(page.getByText(/No dismissed suggestions/i)).toBeVisible();
  });
});
