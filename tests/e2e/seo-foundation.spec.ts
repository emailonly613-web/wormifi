import { expect, test } from "@playwright/test";

test.describe("SEO and analytics foundation", () => {
  test("root exposes canonical crawl and social metadata without an analytics ID", async ({ page, request }) => {
    const googleRequests: string[] = [];
    page.on("request", (outgoing) => {
      if (/googletagmanager\.com|google-analytics\.com/iu.test(outgoing.url())) {
        googleRequests.push(outgoing.url());
      }
    });

    await page.goto("/?room=PRIVATE-ROOM&c=PRIVATE-CHALLENGE&utm_source=seo-test", {
      waitUntil: "networkidle",
    });

    await expect(page).toHaveTitle("Wormifi — Pirate Treasure Worm Arena Game");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://wormifi.com/");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /index,follow/u);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      "https://wormifi.com/og-wormifi-sea-serpent-v2.png",
    );
    expect(await page.locator('script[type="application/ld+json"]').textContent()).toContain("VideoGame");
    await expect(page.locator("html")).toHaveAttribute("data-analytics-state", "missing-id");
    expect(googleRequests).toEqual([]);

    const source = await (await request.get("/")).text();
    expect(source).toContain('href="/how-to-play.html"');
    expect(source).toContain('href="/multiplayer.html"');
    expect(source).not.toContain("PRIVATE-ROOM");
  });

  test("guide pages, robots, and sitemap are directly crawlable", async ({ page, request }) => {
    const guides = [
      ["/how-to-play.html", "How to play Wormifi", "https://wormifi.com/how-to-play.html"],
      ["/multiplayer.html", "Shared rooms. One collision authority.", "https://wormifi.com/multiplayer.html"],
      ["/pirate-treasure.html", "A pirate arena should drop treasure.", "https://wormifi.com/pirate-treasure.html"],
      ["/privacy.html", "Privacy and analytics choices", "https://wormifi.com/privacy.html"],
    ] as const;

    for (const [url, heading, canonical] of guides) {
      const response = await page.goto(url);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonical);
      await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");

      const skipLink = page.getByRole("link", { name: "Skip to main content" });
      await expect(skipLink).toBeAttached();
      await skipLink.focus();
      await page.keyboard.press("Enter");
      await expect(page.locator("#main-content")).toBeFocused();

      await page.getByRole("button", { name: "Privacy choices" }).click();
      const choiceDialog = page.getByRole("dialog", { name: "Privacy choices" });
      await expect(choiceDialog).toBeVisible();
      await expect(choiceDialog.getByRole("status")).toContainText(/not configured|currently|No optional/u);
      await choiceDialog.getByRole("button", { name: "Close privacy choices" }).click();
      await expect(choiceDialog).toBeHidden();
    }

    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toContain("Sitemap: https://wormifi.com/sitemap.xml");

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    const xml = await sitemap.text();
    expect(xml).toContain("https://wormifi.com/how-to-play.html");
    expect(xml).toContain("https://wormifi.com/privacy.html");

    const serviceWorker = await request.get("/sw.js");
    expect(serviceWorker.status()).toBe(200);
    const serviceWorkerSource = await serviceWorker.text();
    for (const [url] of guides) expect(serviceWorkerSource).toContain(JSON.stringify(url));
    expect(serviceWorkerSource).toContain('"/"');
    expect(serviceWorkerSource).toContain("cacheKey(pathname)");
  });
});
