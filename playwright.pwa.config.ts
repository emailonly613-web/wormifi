import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:4175";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "pwa-offline.spec.ts",
  outputDir: "test-results-pwa",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    serviceWorkers: "allow",
    actionTimeout: 6_000,
    navigationTimeout: 15_000,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "corepack pnpm build && corepack pnpm exec vite preview --host 127.0.0.1 --port 4175 --strictPort",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [{ name: "chromium-production-pwa" }],
});
