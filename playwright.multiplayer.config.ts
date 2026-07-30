import { defineConfig, devices } from "@playwright/test";

const generatedPreviewPort = 20_000 + process.pid % 20_000;
const requestedPreviewPort = Number(
  process.env.WORMIFI_MULTIPLAYER_PREVIEW_PORT ?? generatedPreviewPort,
);
const previewPort = Number.isInteger(requestedPreviewPort) &&
    requestedPreviewPort >= 1_024 && requestedPreviewPort <= 49_151
  ? requestedPreviewPort
  : generatedPreviewPort;
// Playwright reloads this config inside worker processes. Persist the port
// selected by the parent so its web server and every worker share one origin.
process.env.WORMIFI_MULTIPLAYER_PREVIEW_PORT = String(previewPort);
const baseURL = `http://127.0.0.1:${previewPort}`;

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
    command: `corepack pnpm exec vite --host 127.0.0.1 --port ${previewPort} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
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
