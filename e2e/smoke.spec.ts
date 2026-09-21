// Smoke test: the app boots into each of its two front doors and stays alive.
//
// `AuthGate` (app/root.tsx) shows the login screen when signed out and the app
// shell when signed in. Seeing either is not enough on its own — the server
// renders that HTML even when the client bundle then throws — so each test
// also does something only a hydrated page can, and fails on any uncaught
// runtime error. Hermetic like the other specs: Playwright route mocks stand
// in for the backend (the config points the app at http://mock-anvil:7474).

import { test, expect, type Page } from "@playwright/test";

const MOCK_ORIGIN = "http://mock-anvil:7474";
// app/root.tsx `meta` — the same title as the desktop window.
const TITLE = "Hammer — Anvil DB";

const FAKE_PAYLOAD = Buffer.from(
  JSON.stringify({ username: "test-admin", roles: ["admin"], exp: 9999999999 }),
).toString("base64");
const FAKE_TOKEN = `header.${FAKE_PAYLOAD}.signature`;

/** Mock the backend and collect uncaught errors thrown by the page. */
async function boot(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // Later routes win, so this catch-all only answers what nothing below does.
  await page.route(`${MOCK_ORIGIN}/**`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
  // The server-info probe drives the ConnectionProvider's "connected" state.
  await page.route(`${MOCK_ORIGIN}/`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ name: "anvil", version: "0.0.0-test" }),
    }),
  );
  await page.route(`${MOCK_ORIGIN}/auth/oauth/providers`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ linkedin: false }),
    }),
  );
  return errors;
}

test("signed out: the login screen loads and is interactive", async ({ page }) => {
  const errors = await boot(page);
  await page.goto("/");

  await expect(page).toHaveTitle(TITLE);
  await expect(page.getByRole("heading", { name: "Anvil DB" })).toBeVisible();
  await expect(page.getByText("Sign in to continue")).toBeVisible();

  // Sign In stays disabled until the server answers and both fields are
  // filled — state only a hydrated, connected page can reach.
  const signIn = page.getByRole("button", { name: "Sign In" });
  await expect(signIn).toBeDisabled();
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("anvil");
  await expect(signIn).toBeEnabled();

  expect(errors).toEqual([]);
});

test("signed in: the app shell loads and navigates", async ({ page }) => {
  const errors = await boot(page);
  await page.addInitScript(([token]) => {
    window.localStorage.setItem(
      "anvil_tokens",
      JSON.stringify({ accessToken: token, refreshToken: token }),
    );
  }, [FAKE_TOKEN]);
  await page.goto("/");

  await expect(page).toHaveTitle(TITLE);

  // The gate let us through: the shell's navigation, not the login screen.
  const nav = page.getByRole("navigation");
  await expect(nav.getByRole("link", { name: "Cypher" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Schema" })).toBeVisible();
  await expect(page.getByText("Sign in to continue")).toBeHidden();

  // Client-side routing works.
  await nav.getByRole("link", { name: "Cypher" }).click();
  await expect(page).toHaveURL(/\/query$/);
  // No route drops the title on the way.
  await expect(page).toHaveTitle(TITLE);

  expect(errors).toEqual([]);
});
