import { defineConfig, devices } from "@playwright/test";

// Keep the smoothness build isolated from accessibility and distribution previews.
const requestedPreviewPort = Number(process.env.WORMIFI_PERF_PREVIEW_PORT ?? 4_185);
const previewPort = Number.isInteger(requestedPreviewPort) &&
    requestedPreviewPort >= 1_024 && requestedPreviewPort <= 65_535
  ? requestedPreviewPort
  : 4_185;
const localBaseURL = `http://127.0.0.1:${previewPort}`;
const reusePerformanceBuild = process.env.WORMIFI_PERF_REUSE_BUILD === "1";
const generatedArenaPort = 20_000 + process.pid % 20_000;
const requestedArenaPort = Number(
  process.env.WORMIFI_PERF_ARENA_PORT ?? generatedArenaPort,
);
const arenaPort = Number.isInteger(requestedArenaPort) &&
    requestedArenaPort >= 1_024 && requestedArenaPort <= 49_151
  ? requestedArenaPort
  : generatedArenaPort;
// The build helper and Playwright worker inherit one exact collision-free URL.
process.env.WORMIFI_PERF_ARENA_PORT = String(arenaPort);
process.env.WORMIFI_PERF_ARENA_URL = `ws://127.0.0.1:${arenaPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "performance-gate.spec.ts",
  // Keep runtime artifacts inside paths already ignored by Vite's watcher so
  // the performance probe cannot trigger its own page reload.
  outputDir: "test-results/performance",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 240_000,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report/performance", open: "never" }],
  ],
  expect: { timeout: 10_000 },
  use: {
    baseURL: localBaseURL,
    actionTimeout: 8_000,
    navigationTimeout: 20_000,
    serviceWorkers: "block",
    // Trace/video capture can pause a canvas-heavy page and would make the
    // measuring tool create the stalls it is meant to detect.
    trace: "off",
    video: "off",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `${
      reusePerformanceBuild ? "" : "node scripts/build-performance-proof.mjs && "
    }corepack pnpm exec vite preview --host 127.0.0.1 --port ${previewPort} --strictPort`,
    url: localBaseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [{
    name: "chromium-smoothness-gate",
    use: {
      ...devices["Desktop Chrome"],
      viewport: { width: 1440, height: 900 },
      launchOptions: {
        args: [
          "--disable-background-timer-throttling",
          "--disable-renderer-backgrounding",
          "--disable-backgrounding-occluded-windows",
        ],
      },
    },
  }],
});
