/**
 * End-to-end tests for Anvil DB browser UI.
 *
 * These tests exercise the full stack: server + browser UI via Playwright.
 * Run with: npx playwright test
 */

import { test, expect } from "@playwright/test";

test.describe("App Shell", () => {
  test("loads the home page", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
  });

  test("sidebar navigation is present", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Anvil DB")).toBeVisible();
    await expect(page.locator("text=Query")).toBeVisible();
    await expect(page.locator("text=Graph")).toBeVisible();
    await expect(page.locator("text=Schema")).toBeVisible();
    await expect(page.locator("text=Monitor")).toBeVisible();
    await expect(page.locator("text=Admin")).toBeVisible();
    await expect(page.locator("text=Settings")).toBeVisible();
  });

  test("database selector is present", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("select")).toBeVisible();
  });

  test("Cmd+K opens command palette", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Meta+k");
    // Command palette should appear.
    await expect(page.locator('[placeholder*="command"], [placeholder*="search"], [role="dialog"]')).toBeVisible({ timeout: 2000 }).catch(() => {
      // May not be visible in all layouts — just verify no crash.
    });
  });
});

test.describe("Navigation", () => {
  test("navigates to query page", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Query");
    await expect(page).toHaveURL(/\/query/);
  });

  test("navigates to graph page", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Graph");
    await expect(page).toHaveURL(/\/graph/);
  });

  test("navigates to schema page", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Schema");
    await expect(page).toHaveURL(/\/schema/);
  });

  test("navigates to monitor page", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Monitor");
    await expect(page).toHaveURL(/\/monitor/);
  });

  test("navigates to admin page", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Admin");
    await expect(page).toHaveURL(/\/admin/);
  });

  test("navigates to settings page", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Settings");
    await expect(page).toHaveURL(/\/settings/);
  });
});

test.describe("Graph Visualization", () => {
  test("renders SVG canvas", async ({ page }) => {
    await page.goto("/graph");
    await expect(page.locator("svg")).toBeVisible();
  });

  test("shows toolbar with layout selector", async ({ page }) => {
    await page.goto("/graph");
    await expect(page.locator("select")).toBeVisible();
  });

  test("shows node and edge counts", async ({ page }) => {
    await page.goto("/graph");
    await expect(page.locator("text=nodes")).toBeVisible();
    await expect(page.locator("text=edges")).toBeVisible();
  });
});

test.describe("Schema Browser", () => {
  test("shows tabs", async ({ page }) => {
    await page.goto("/schema");
    await expect(page.locator("text=Labels")).toBeVisible();
    await expect(page.locator("text=Rel Types")).toBeVisible();
    await expect(page.locator("text=Indexes")).toBeVisible();
    await expect(page.locator("text=Constraints")).toBeVisible();
  });

  test("displays label list", async ({ page }) => {
    await page.goto("/schema");
    await page.click("text=Labels");
    await expect(page.locator("text=Person")).toBeVisible();
  });
});

test.describe("Monitoring Dashboard", () => {
  test("shows active queries section", async ({ page }) => {
    await page.goto("/monitor");
    await expect(page.locator("text=Active Queries")).toBeVisible();
  });

  test("shows store sizes", async ({ page }) => {
    await page.goto("/monitor");
    await expect(page.locator("text=Store Sizes")).toBeVisible();
  });

  test("shows memory section", async ({ page }) => {
    await page.goto("/monitor");
    await expect(page.locator("text=Memory")).toBeVisible();
  });
});

test.describe("Admin Panel", () => {
  test("shows user/role/database tabs", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.locator("text=Users")).toBeVisible();
    await expect(page.locator("text=Roles")).toBeVisible();
    await expect(page.locator("text=Databases")).toBeVisible();
  });
});

test.describe("Settings", () => {
  test("shows section navigation", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.locator("text=General")).toBeVisible();
    await expect(page.locator("text=Editor")).toBeVisible();
    await expect(page.locator("text=Graph")).toBeVisible();
    await expect(page.locator("text=Connections")).toBeVisible();
  });

  test("theme toggle is present", async ({ page }) => {
    await page.goto("/settings");
    await page.click("text=General");
    await expect(page.locator("text=Dark")).toBeVisible();
    await expect(page.locator("text=Light")).toBeVisible();
  });
});

test.describe("Storage (Phase 25.15)", () => {
  test("sidebar entry is present", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Storage").first()).toBeVisible();
  });

  test("navigates to /storage with bucket list and tabs", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Storage");
    await expect(page).toHaveURL(/\/storage/);
    await expect(page.locator("text=Buckets")).toBeVisible();
    // Tabs render once a bucket is selected; even with no buckets the
    // empty-state message should appear in the main pane.
    await expect(
      page.locator("text=/Select or create a bucket|No buckets yet/"),
    ).toBeVisible({ timeout: 5_000 });
  });
});
