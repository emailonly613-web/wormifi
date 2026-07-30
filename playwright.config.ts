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
  // A single worker is intentional on both CI and local proof runs. Four
  // simultaneous canvas arenas can starve hydration and game-time assertions
  // on ordinary desktop hardware, which measures machine contention rather
  // than Wormifi behavior. Dedicated load/smoothness gates remain parallel.
  workers: 1,
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
    // The broad release-shaped matrix must not manufacture the registration
    // error UI by blocking the production service worker. Offline behavior has
    // its own dedicated gate; here a normal registration may proceed.
    serviceWorkers: "allow",
  },
  webServer: externalBaseUrl
    ? undefined
    : {
        // Use the release-shaped client for the broad behavioral gate. The Vite
        // development watcher can reload long canvas/replay tests while proof
        // PNGs are being written elsewhere in the repository.
        command: "corepack pnpm build && corepack pnpm preview --host 0.0.0.0 --port 4173 --strictPort",
        url: localBaseUrl,
        reuseExistingServer: false,
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
        ...devices["Pixel 7 landscape"],
      },
    },
  ],
});
