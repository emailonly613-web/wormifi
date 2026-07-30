import { defineConfig } from "vitest/config";

export default defineConfig({
  server: {
    port: 4173,
    strictPort: true,
    watch: {
      // Browser-proof artifacts are written while other isolated Playwright
      // pages are active. They must never trigger a dev-server reload that
      // resets an in-progress deterministic run.
      ignored: ["**/proof/**", "**/test-results/**", "**/playwright-report/**"],
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**", "dist/**"],
    coverage: {
      reporter: ["text", "json-summary"],
    },
  },
});
