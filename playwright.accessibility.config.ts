import { defineConfig, devices } from "@playwright/test";

const externalBaseUrl = process.env.WORMIFI_E2E_BASE_URL;
// Accessibility owns a fresh port. Reusing the performance-preview port can
// silently test a stale or distribution-specific build instead of this tree.
const localBaseUrl = "http://127.0.0.1:4184";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "accessibility-browser.spec.ts",
  outputDir: "test-results/accessibility",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report/accessibility", open: "never" }],
  ],
  expect: {
    timeout: 7_000,
  },
  use: {
    baseURL: externalBaseUrl ?? localBaseUrl,
    actionTimeout: 7_000,
    navigationTimeout: 15_000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    serviceWorkers: "block",
  },
  webServer: externalBaseUrl
    ? undefined
    : {
        command: "corepack pnpm dev --port 4184 --strictPort",
        url: localBaseUrl,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    {
      name: "chromium-accessibility",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "firefox-accessibility",
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "webkit-accessibility",
      use: {
        ...devices["Desktop Safari"],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
});
