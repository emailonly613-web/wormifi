import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:4173";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "multiplayer-lab.spec.ts",
  outputDir: "test-results-multiplayer",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  expect: { timeout: 8_000 },
  use: {
    baseURL,
    actionTimeout: 5_000,
    navigationTimeout: 15_000,
    serviceWorkers: "block",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "corepack pnpm dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [{
    name: "two-browser-authority-proof",
    use: {
      ...devices["Desktop Chrome"],
      viewport: { width: 1280, height: 800 },
    },
  }],
});
