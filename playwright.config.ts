import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5175",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5175",
    reuseExistingServer: !process.env.CI,
    env: {
      // Force the api-client to point at a fake origin so Playwright's
      // route mocks have a stable URL to intercept. Without this the
      // serverInfo probe at `/` collides with the dev server's
      // homepage and the connection never reports "connected".
      VITE_ANVIL_API_URL: "http://mock-anvil:7474",
    },
  },
});
