import { expect, test } from "@playwright/test";

test("reopens the built shell offline, enters Practice, and never fakes multiplayer", async ({ context, page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "WORMIFI" })).toBeVisible();

  const manifest = await page.evaluate(async () => {
    const response = await fetch("/manifest.webmanifest");
    return await response.json() as {
      display: string;
      display_override: string[];
      icons: Array<{ sizes: string; purpose: string; type: string }>;
    };
  });
  expect(manifest.display).toBe("fullscreen");
  expect(manifest.display_override).toEqual(["fullscreen", "standalone"]);
  expect(manifest.icons).toEqual(expect.arrayContaining([
    expect.objectContaining({ sizes: "192x192", purpose: "any", type: "image/png" }),
    expect.objectContaining({ sizes: "512x512", purpose: "any", type: "image/png" }),
    expect.objectContaining({ sizes: "192x192", purpose: "maskable", type: "image/png" }),
    expect.objectContaining({ sizes: "512x512", purpose: "maskable", type: "image/png" }),
  ]));

  const cachedAssets = await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error("Service worker did not claim the page")), 8_000);
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          window.clearTimeout(timeout);
          resolve();
        }, { once: true });
      });
    }
    const cacheName = (await caches.keys()).find((name) => name.startsWith("wormifi-app-shell-"));
    if (!cacheName) return [];
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    return await Promise.all(requests.map(async (request) => {
      const response = await cache.match(request, { ignoreVary: true });
      return {
        path: new URL(request.url).pathname,
        bytes: response ? (await response.arrayBuffer()).byteLength : 0,
      };
    }));
  });
  expect(cachedAssets.some(({ path, bytes }) => path === "/" && bytes > 100)).toBe(true);
  expect(cachedAssets.some(({ path, bytes }) => path.startsWith("/assets/") && path.endsWith(".js") && bytes > 1_000)).toBe(true);
  expect(cachedAssets.some(({ path, bytes }) => path.startsWith("/assets/") && path.endsWith(".css") && bytes > 1_000)).toBe(true);

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "WORMIFI" })).toBeVisible();
  await expect(page.getByTestId("pwa-offline-status")).toContainText("OFFLINE PRACTICE READY");
  await expect(page.getByTestId("pwa-offline-status")).toContainText("Multiplayer stays offline");

  await page.getByRole("button", { name: /practice with labeled bots/i }).click();
  await expect(page.getByTestId("player-chain")).toBeVisible();
  await expect(page.getByTestId("room-identity")).toHaveAttribute("data-scope", "practice");
  await expect(page.getByTestId("room-identity")).toHaveAttribute("data-room-id", "none");

  await page.getByTestId("exit-button").click();
  await page.getByTestId("live-lab-button").click();
  await expect(page.getByTestId("live-arena-canvas")).toHaveAttribute("data-authority", "unconfirmed");
  await expect(page.getByTestId("live-status")).not.toHaveText("LIVE · SERVER AUTHORITATIVE");
  await expect(page.getByTestId("pwa-offline-status")).toContainText("Multiplayer stays offline");
});
