import { defineConfig, devices } from "@playwright/test";

const externalBaseUrl = process.env.WORMIFI_E2E_BASE_URL;
const localBaseUrl = "http://127.0.0.1:4173";

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: ["multiplayer-lab.spec.ts", "pwa-offline.spec.ts", "performance-gate.spec.ts"],
  outputDir: "test-results",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  // Canvas-heavy browser cases verify behavior, not browser-process load.
  // Keep that separate from the dedicated load and smoothness harnesses.
  workers: process.env.CI ? 1 : 4,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: externalBaseUrl ?? localBaseUrl,
    actionTimeout: 5_000,
    navigationTimeout: 15_000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    serviceWorkers: "block",
  },
  webServer: externalBaseUrl
    ? undefined
    : {
        command: "corepack pnpm dev",
        url: localBaseUrl,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "mobile-chromium",
      use: {
        ...devices["Pixel 7"],
      },
    },
  ],
});
