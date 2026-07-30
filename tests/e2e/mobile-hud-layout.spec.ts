import { expect, test, type Locator, type Page } from "@playwright/test";

const proofDirectory = "proof/browser/mobile-hud";

async function expectInsideViewport(locator: Locator, page: Page) {
  await expect(locator).toBeVisible();
  const [box, viewport] = await Promise.all([
    locator.boundingBox(),
    page.evaluate(() => ({ width: innerWidth, height: innerHeight })),
  ]);
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(-0.5);
  expect(box!.y).toBeGreaterThanOrEqual(-0.5);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 0.5);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 0.5);
  return box!;
}

function overlapArea(
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number },
) {
  const width = Math.max(0, Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x));
  const height = Math.max(0, Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y));
  return width * height;
}

for (const viewport of [
  { width: 390, height: 844, label: "390" },
  { width: 320, height: 568, label: "320" },
] as const) {
  test(`${viewport.label}px solo HUD stays compact, reachable and in bounds`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/?mobile-hud-proof=1");
    await page.getByTestId("solo-run-button").click();
    await expect(page.getByTestId("arena-canvas")).toBeVisible();
    await expect(page.getByTestId("tutorial-coach")).toContainText("STEP 1 OF 4");
    await page.waitForTimeout(300);

    const room = await expectInsideViewport(page.getByTestId("room-identity"), page);
    const hud = await expectInsideViewport(page.locator(".hud-top"), page);
    const exit = await expectInsideViewport(page.getByRole("button", { name: "Exit to Wormifi menu" }), page);
    const radar = await expectInsideViewport(page.getByTestId("pirate-radar"), page);
    const tutorial = await expectInsideViewport(page.getByTestId("tutorial-coach"), page);
    const sprint = await expectInsideViewport(page.getByRole("button", { name: /sprint.*costs 12 size/i }), page);

    expect(exit.width).toBeGreaterThanOrEqual(44);
    expect(exit.height).toBeGreaterThanOrEqual(44);
    expect(sprint.width).toBeGreaterThanOrEqual(44);
    expect(sprint.height).toBeGreaterThanOrEqual(44);
    expect(overlapArea(room, hud)).toBe(0);
    expect(overlapArea(radar, tutorial)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);

    await page.screenshot({
      path: `${proofDirectory}/01-solo-${viewport.label}-tutorial.png`,
      fullPage: true,
    });

    // Mount the exact live-state markup over the real arena so this layout test
    // is deterministic and does not depend on reaching a randomly moving Relic.
    await page.evaluate(() => {
      const hudElement = document.querySelector(".game-hud");
      const stage = document.querySelector(".arena-stage");
      if (!hudElement || !stage) throw new Error("Arena HUD unavailable");
      hudElement.insertAdjacentHTML("beforeend", `
        <aside class="relic-status relic-status--loot-compass specialist-status active"
          data-testid="relic-status" aria-label="Loot Compass Relic status">
          <div class="relic-status__identity" role="status" aria-live="polite">
            <img class="relic-status__icon" src="/assets/sprites/pirate-atlas/loot-compass.png" alt="" aria-hidden="true" />
            <span class="relic-status__copy"><strong>LOOT COMPASS ACTIVE</strong><span>PULLS GEMS + YOUR WAKE LOOT</span></span>
          </div>
          <time class="relic-status__time" aria-label="8 seconds remaining">8.0S</time>
          <progress class="relic-status__progress" max="12" value="8" aria-label="Loot Compass duration remaining">67%</progress>
          <span class="relic-status__rival-disclosure">EXTENDED PICKUP REACH</span>
        </aside>
      `);
      stage.insertAdjacentHTML("beforeend", `
        <div class="live-authority-card" data-phase="authoritative" data-testid="mobile-authority-proof" aria-live="polite">
          <span class="live-authority-badge confirmed">LIVE · SERVER AUTHORITATIVE</span>
          <span class="live-room-line">ROOM MOBILE-PROOF · <b>2 HUMANS</b> · 22 AI</span>
        </div>
      `);
    });

    const relic = page.getByTestId("relic-status");
    const relicBox = await expectInsideViewport(relic, page);
    const sprintAfter = await expectInsideViewport(page.getByRole("button", { name: /sprint.*costs 12 size/i }), page);
    const authority = await expectInsideViewport(page.getByTestId("mobile-authority-proof"), page);
    expect(overlapArea(relicBox, sprintAfter)).toBe(0);
    expect(overlapArea(authority, sprintAfter)).toBe(0);
    expect(overlapArea(authority, relicBox)).toBe(0);

    await page.screenshot({
      path: `${proofDirectory}/02-solo-${viewport.label}-loot-compass.png`,
      fullPage: true,
    });
  });
}
