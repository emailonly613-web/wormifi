import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { createServer } from "vite";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const templatePath = path.join(scriptDirectory, "og-card.template.html");
const outputPath = path.join(projectRoot, "public", "og-wormifi-sea-serpent-v2.png");

let server;
let browser;

try {
  const configuredBaseUrl = process.env.WORMIFI_OG_BASE_URL;
  let baseUrl = configuredBaseUrl;
  if (!baseUrl) {
    server = await createServer({
      root: projectRoot,
      server: {
        host: "127.0.0.1",
        port: 0,
        strictPort: false,
      },
    });
    await server.listen();
    const address = server.httpServer?.address();
    if (!address || typeof address === "string") {
      throw new Error("Could not resolve the local Vite address for OG generation");
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  }

  // This Windows/headless Chromium host can intermittently composite animated
  // canvas tiles over higher-z DOM bands. CPU composition produces the same
  // page pixels without the capture-only band corruption.
  browser = await chromium.launch({
    headless: true,
    args: ["--disable-gpu", "--disable-gpu-compositing"],
  });
  const gameplayContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    serviceWorkers: "block",
  });
  const gameplayPage = await gameplayContext.newPage();
  await gameplayPage.goto(baseUrl, { waitUntil: "networkidle" });
  await gameplayPage.getByLabel("Your arena name").fill("YOU");
  await gameplayPage.getByTestId("solo-run-button").click();
  await gameplayPage.getByTestId("player-chain").waitFor({ state: "visible" });
  await gameplayPage.keyboard.press("ArrowRight");
  // Prefer the first Loot Compass beat, but never leave social-card generation
  // waiting forever if a deterministic bot reaches the relic first. Either
  // path still captures real, moving gameplay with the tutorial visible.
  await gameplayPage.waitForFunction(() => {
    const arena = document.querySelector('[data-testid="arena-canvas"]');
    const collectorSeconds = Number(arena?.getAttribute("data-collector-seconds"));
    return collectorSeconds > 0 && collectorSeconds <= 11.5;
  }, undefined, { timeout: 5_000 }).catch(() => undefined);
  await gameplayPage.waitForTimeout(500);
  const gameplayPng = await gameplayPage.screenshot({ type: "png" });
  await gameplayContext.close();

  const template = await readFile(templatePath, "utf8");
  const gameplayDataUrl = `data:image/png;base64,${gameplayPng.toString("base64")}`;
  const cardHtml = template.replace("{{GAMEPLAY_DATA_URL}}", gameplayDataUrl);
  if (cardHtml === template) throw new Error("OG template gameplay placeholder is missing");

  const cardContext = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
    serviceWorkers: "block",
  });
  const cardPage = await cardContext.newPage();
  await cardPage.setContent(cardHtml, { waitUntil: "networkidle" });
  await cardPage.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
  });
  await cardPage.screenshot({
    path: outputPath,
    type: "png",
    fullPage: false,
  });
  await cardContext.close();

  process.stdout.write(`Generated ${outputPath}\n`);
} finally {
  await browser?.close();
  await server?.close();
}
