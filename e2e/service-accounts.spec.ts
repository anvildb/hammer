// Hammer e2e for app-scoped service accounts (APPS.md §7c).
//
// Covers the Admin → Service Accounts tab (app picker, the scope copy that
// explains what a role will mean, the request payloads, scope badges, and
// confining a pre-scoping account) and the read-only service-account rows in
// an app's Members tab. Hermetic like index-advisor.spec.ts: Playwright route
// mocks + a fake JWT in localStorage, no anvil-server required.

import { test, expect, type Page, type Route } from "@playwright/test";

const FAKE_PAYLOAD = Buffer.from(
  JSON.stringify({
    username: "test-admin",
    roles: ["admin"],
    exp: 9999999999,
  }),
).toString("base64");
const FAKE_TOKEN = `header.${FAKE_PAYLOAD}.signature`;
const MOCK_ORIGIN = "http://mock-anvil:7474";

const APPS = [
  { id: "app-crm-id", slug: "crm", name: "Customer CRM", created_by: "admin", created_on: 1700000000000, enabled: true, privilege: "admin" },
  { id: "app-shop-id", slug: "shop", name: "Shop", created_by: "admin", created_on: 1700000000000, enabled: true, privilege: "admin" },
];

const account = (over: Record<string, unknown>) => ({
  id: "sa-0",
  name: "bot",
  description: "",
  roles: [],
  created_by: "admin",
  created_on: 1700000000000,
  disabled: false,
  service_role: false,
  app_scoped: true,
  apps: [],
  ...over,
});

const SCOPED = account({
  id: "sa-scoped",
  name: "crm-bot",
  roles: ["admin"],
  apps: [{ app_id: "app-crm-id", slug: "crm", name: "Customer CRM", privilege: "admin" }],
});
const SERVER_WIDE = account({
  id: "sa-wide",
  name: "sys-bot",
  roles: ["editor"],
  service_role: true,
  app_scoped: false,
});
// Created before app scoping: no service_role, yet server-wide.
const LEGACY = account({
  id: "sa-legacy",
  name: "old-bot",
  roles: ["admin"],
  app_scoped: false,
});

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });

/** Mock the backend. Returns the bodies the page sent to the service-account API. */
async function mockBackend(page: Page, accounts: unknown[]) {
  const sent: { method: string; url: string; body: any }[] = [];

  await page.addInitScript(([token]) => {
    window.localStorage.setItem(
      "anvil_tokens",
      JSON.stringify({ accessToken: token, refreshToken: token }),
    );
  }, [FAKE_TOKEN]);

  // Later routes win, so this catch-all only answers what nothing below does.
  await page.route(`${MOCK_ORIGIN}/**`, (route) => json(route, []));
  await page.route(`${MOCK_ORIGIN}/`, (route) =>
    json(route, { name: "anvil", version: "0.0.0-test" }),
  );
  await page.route(`${MOCK_ORIGIN}/admin/roles`, (route) =>
    json(route, [
      { name: "admin", privileges: [] },
      { name: "editor", privileges: [] },
      { name: "reader", privileges: [] },
    ]),
  );
  await page.route(`${MOCK_ORIGIN}/apps`, (route) => json(route, APPS));

  await page.route(`${MOCK_ORIGIN}/auth/service-accounts`, (route) => {
    const req = route.request();
    if (req.method() === "POST") {
      const body = req.postDataJSON();
      sent.push({ method: "POST", url: req.url(), body });
      return json(route, account({ id: "sa-new", ...body, apps: [] }), 201);
    }
    return json(route, accounts);
  });
  await page.route(`${MOCK_ORIGIN}/auth/service-accounts/*`, (route) => {
    const req = route.request();
    if (req.method() === "PATCH") {
      const body = req.postDataJSON();
      sent.push({ method: "PATCH", url: req.url(), body });
      return json(route, LEGACY);
    }
    return json(route, accounts[0] ?? {});
  });

  return sent;
}

async function openServiceAccounts(page: Page) {
  await page.goto("/admin");
  await page.getByRole("button", { name: "Service Accounts" }).click();
}

test.describe("Service accounts: app scoping", () => {
  test("create form grants apps and says what the role will mean", async ({ page }) => {
    const sent = await mockBackend(page, []);
    await openServiceAccounts(page);
    await page.getByRole("button", { name: "+ Create" }).click();
    await page.getByPlaceholder(/Account name/).fill("crm-bot");

    const create = page.getByRole("button", { name: "Create Account" });
    const crm = page.getByRole("button", { name: "crm", exact: true });

    // Without service_role the account is app-scoped: the picker is shown,
    // and an account with no app is called out as able to reach nothing.
    await expect(crm).toBeVisible();
    await expect(page.getByRole("button", { name: "shop", exact: true })).toBeVisible();
    await expect(page.getByText(/cannot access anything until it\s+is granted one/)).toBeVisible();

    // An app needs a role to name its privilege: blocked until one is picked.
    await crm.click();
    await expect(page.getByText(/Select reader, editor or admin/)).toBeVisible();
    await expect(create).toBeDisabled();

    await page.getByRole("button", { name: "editor", exact: true }).click();
    await expect(page.getByText(/in the\s+selected apps only/)).toBeVisible();
    await expect(create).toBeEnabled();

    // admin is spelled out as app admin, not server admin.
    await page.getByRole("button", { name: "admin", exact: true }).click();
    await expect(page.getByText(/It is not a\s+server admin/)).toBeVisible();

    // service_role flips the account to server-wide: no picker, a warning.
    const serviceRole = page.getByRole("checkbox");
    await serviceRole.check();
    await expect(crm).toBeHidden();
    await expect(page.getByText(/is a full server admin/)).toBeVisible();
    await serviceRole.uncheck();
    await expect(crm).toBeVisible();

    await create.click();
    await expect.poll(() => sent.length).toBe(1);
    expect(sent[0].body).toMatchObject({
      name: "crm-bot",
      roles: ["editor", "admin"],
      service_role: false,
      apps: ["app-crm-id"],
    });
  });

  test("a service_role account is created with no apps", async ({ page }) => {
    const sent = await mockBackend(page, []);
    await openServiceAccounts(page);
    await page.getByRole("button", { name: "+ Create" }).click();
    await page.getByPlaceholder(/Account name/).fill("sys-bot");

    // Pick an app first, then go server-wide: the selection must not be sent.
    await page.getByRole("button", { name: "crm", exact: true }).click();
    await page.getByRole("button", { name: "admin", exact: true }).click();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect.poll(() => sent.length).toBe(1);
    expect(sent[0].body).toMatchObject({ service_role: true, apps: [] });
  });

  test("list and detail show how far each account reaches", async ({ page }) => {
    await mockBackend(page, [SCOPED, SERVER_WIDE, LEGACY]);
    await openServiceAccounts(page);

    await expect(page.getByText("crm · admin")).toBeVisible();
    await expect(page.getByText("service_role", { exact: true })).toBeVisible();
    await expect(page.getByText("server-wide", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: /crm-bot/ }).click();
    await expect(page.getByText(/Confined to these apps/)).toBeVisible();

    await page.getByRole("button", { name: /sys-bot/ }).click();
    await expect(page.getByText(/apply\s+to the entire server and it bypasses RLS/)).toBeVisible();

    // The pre-scoping admin account is flagged for what it is.
    await page.getByRole("button", { name: /old-bot/ }).click();
    await expect(page.getByText(/created before app scoping/)).toBeVisible();
    await expect(page.getByText(/including full server admin/)).toBeVisible();
  });

  test("granting apps to a pre-scoping account warns, then sends them", async ({ page }) => {
    const sent = await mockBackend(page, [LEGACY]);
    await openServiceAccounts(page);
    await page.getByRole("button", { name: /old-bot/ }).click();
    await page.getByRole("button", { name: "Edit", exact: true }).click();

    await page.getByRole("button", { name: "crm", exact: true }).click();
    await expect(page.getByText(/Saving confines this account/)).toBeVisible();
    await page.getByRole("button", { name: "Save", exact: true }).click();

    await expect.poll(() => sent.length).toBe(1);
    expect(sent[0].method).toBe("PATCH");
    expect(sent[0].url).toContain("/auth/service-accounts/sa-legacy");
    expect(sent[0].body.apps).toEqual(["app-crm-id"]);
    // Untouched fields are not resent.
    expect(sent[0].body.roles).toBeUndefined();
  });

  test("a service_role account has no app picker when edited", async ({ page }) => {
    await mockBackend(page, [SERVER_WIDE]);
    await openServiceAccounts(page);
    await page.getByRole("button", { name: /sys-bot/ }).click();
    await page.getByRole("button", { name: "Edit", exact: true }).click();

    await expect(page.getByRole("button", { name: "Save", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "crm", exact: true })).toBeHidden();
  });

  test("accounts from a server without app scoping render as server-wide", async ({ page }) => {
    // An older server sends neither `app_scoped` nor `apps`.
    const { app_scoped: _a, apps: _b, ...old } = account({
      id: "sa-old",
      name: "legacy-ci",
      roles: ["editor"],
    });
    await mockBackend(page, [old]);
    await openServiceAccounts(page);

    await expect(page.getByText("server-wide", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /legacy-ci/ }).click();
    await expect(page.getByText(/created before app scoping/)).toBeVisible();
  });
});

test.describe("App members: service accounts", () => {
  test("a service account row is labelled and read-only", async ({ page }) => {
    await mockBackend(page, []);
    await page.route(`${MOCK_ORIGIN}/apps/app-crm-id/members`, (route) =>
      json(route, [
        { app_id: "app-crm-id", user_id: "u-1", username: "alice", kind: "user", privilege: "editor", added_by: "admin", added_on: 1700000000000 },
        { app_id: "app-crm-id", user_id: "sa-scoped", username: "crm-bot", kind: "service_account", privilege: "admin", added_by: "admin", added_on: 1700000000000 },
      ]),
    );
    await page.route(`${MOCK_ORIGIN}/apps/app-crm-id/labels`, (route) =>
      json(route, { app_id: "app-crm-id", schema: "app_crm", labels: [] }),
    );

    await page.goto("/apps");
    await page.getByRole("button", { name: /Customer CRM/ }).click();
    await page.getByRole("button", { name: "Members", exact: true }).click();

    const userRow = page.getByRole("row", { name: /alice/ });
    const botRow = page.getByRole("row", { name: /crm-bot/ });
    await expect(botRow.getByText("service account")).toBeVisible();
    await expect(userRow.getByText("service account")).toBeHidden();

    // A user's privilege is edited and removed here; a service account's is
    // derived from its roles, so its row offers neither.
    await expect(userRow.getByRole("combobox")).toBeVisible();
    await expect(userRow.getByRole("button", { name: "Remove" })).toBeVisible();
    await expect(botRow.getByRole("combobox")).toBeHidden();
    await expect(botRow.getByRole("button", { name: "Remove" })).toBeHidden();
    // Its privilege still shows, as text. (Second cell: "Added By" also says admin.)
    await expect(botRow.getByRole("cell").nth(1)).toHaveText("admin");
  });
});
