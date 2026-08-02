import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";

function proofPath(testInfo: TestInfo, fileName: string) {
  return path.resolve("proof", "accessibility", testInfo.project.name, fileName);
}

async function captureProof(page: Page, testInfo: TestInfo, fileName: string) {
  const target = proofPath(testInfo, fileName);
  await mkdir(path.dirname(target), { recursive: true });
  try {
    await page.screenshot({ path: target, fullPage: true, timeout: 15_000 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/unknown error, open/iu.test(message)) throw error;

    // Windows image viewers can hold a previously inspected proof PNG open.
    // Preserve it and write the current proof beside it instead of deleting or
    // falsely failing an otherwise complete behavioral accessibility gate.
    const extension = path.extname(target);
    const fallback = `${target.slice(0, -extension.length)}-${process.pid}-${Date.now()}${extension}`;
    await page.screenshot({ path: fallback, fullPage: true, timeout: 15_000 });
    testInfo.annotations.push({
      type: "proof-fallback",
      description: `Canonical proof was locked; current capture: ${fallback}`,
    });
  }
}

async function expectWithinViewport(locator: Locator, page: Page) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(box, "control has a rendered bounding box").not.toBeNull();
  expect(viewport, "test has a fixed viewport").not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
}

async function expectVisibleFocus(locator: Locator) {
  const focus = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
    };
  });
  expect(focus.outlineStyle).not.toBe("none");
  expect(focus.outlineWidth).toBeGreaterThanOrEqual(3);
}

async function continuePastMobileAssist(page: Page) {
  const assist = page.getByTestId("mobile-play-assist");
  if (!await assist.isVisible().catch(() => false)) return;
  const continueButton = assist.getByTestId("mobile-web-continue");
  await expect.poll(async () => {
    if (!await assist.isVisible().catch(() => false)) return "closed";
    return await continueButton.evaluate((element) => element === document.activeElement)
      ? "focused"
      : "waiting";
  }).not.toBe("waiting");
  if (!await assist.isVisible().catch(() => false)) return;
  await page.keyboard.press("Enter");
  await expect(assist).toHaveCount(0);
}

test.describe("Wormifi accessibility and browser resilience", () => {
  test("keyboard-only launch, settings, tutorial, and exit preserve visible focus", async ({ page }, testInfo) => {
    await page.goto("/");

    const settings = page.getByTestId("settings-button");
    await page.keyboard.press("Tab");
    if (!await settings.evaluate((element) => element === document.activeElement)) {
      // Headless Firefox can consume the first Tab while focus enters the page.
      await page.keyboard.press("Tab");
    }
    await expect(settings).toBeFocused();
    await expectVisibleFocus(settings);
    await page.keyboard.press("Enter");

    const settingsClose = page.getByTestId("settings-close");
    const captainLog = page.getByTestId("captain-log-settings");
    const captainPassport = page.getByTestId("captain-passport-settings");
    const captainRooms = page.getByTestId("captain-rooms-settings");
    const customizeSkin = page.getByTestId("skin-studio-launch");
    const legendVoyage = page.getByTestId("legend-voyage-launch");
    const drag = page.getByTestId("control-drag-anywhere");
    const leftHelm = page.getByTestId("control-left-helm");
    const rightHelm = page.getByTestId("control-right-helm");
    const modeGroup = page.getByRole("group", { name: "Solo mode" });
    const rush = modeGroup.getByRole("button", { name: /90s rush/i });
    const endless = modeGroup.getByRole("button", { name: /endless/i });
    const openSeas = page.getByRole("radio", { name: /open seas/i });
    const blackPearl = page.getByRole("radio", { name: /black pearl/i });
    const boardShortcut = page.getByTestId("board-shortcut-toggle");
    const boardPicker = page.getByTestId("board-picker");
    const harborPace = page.getByRole("radio", { name: /harbor.*patient default/i });
    const classicPace = page.getByRole("radio", { name: /classic.*fast/i });
    const pacePicker = page.getByTestId("pace-picker");
    const roomCode = page.getByRole("textbox", { name: "Room number or code" });
    const joinRoom = page.getByRole("button", { name: "JOIN ROOM" });
    const newRoom = page.getByRole("button", { name: "NEW ROOM" });
    const inviteRoom = page.getByTestId("lobby-invite");
    const settingsDone = page.getByRole("button", { name: "DONE" });

    await expect(settingsClose).toBeFocused();
    await expectVisibleFocus(settingsClose);
    await expect(rush).toHaveAttribute("aria-pressed", "true");
    await expect(endless).toHaveAttribute("aria-pressed", "false");

    for (const control of [
      captainLog,
      captainPassport,
      captainRooms,
      customizeSkin,
      legendVoyage,
      drag,
      leftHelm,
      rightHelm,
      rush,
    ]) {
      await page.keyboard.press("Tab");
      await expect(control).toBeFocused();
      await expectVisibleFocus(control);
    }
    await page.keyboard.press("Tab");
    await expect(endless).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(endless).toHaveAttribute("aria-pressed", "true");

    await page.keyboard.press("Tab");
    await expect(boardShortcut).toBeFocused();
    await expectVisibleFocus(boardShortcut);
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("board-shortcut")).toHaveAttribute("open", "");
    await page.keyboard.press("Tab");
    await expect(openSeas).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(blackPearl).toBeFocused();
    await expect(blackPearl).toBeChecked();
    await expect(boardPicker).toHaveAttribute("data-board-id", "black-pearl-relay");
    await page.keyboard.press("Tab");
    await expect(harborPace).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(classicPace).toBeFocused();
    await expect(classicPace).toBeChecked();
    await expect(pacePicker).toHaveAttribute("data-pace-id", "classic");

    for (const control of [roomCode, joinRoom, newRoom, inviteRoom, settingsDone]) {
      await page.keyboard.press("Tab");
      await expect(control).toBeFocused();
      await expectVisibleFocus(control);
    }
    await page.keyboard.press("Enter");
    await expect(settings).toBeFocused();

    const nickname = page.getByRole("textbox", { name: "Your arena name" });
    const chooseLook = page.getByTestId("launcher-choose-look");
    const launcherPassport = page.getByTestId("launcher-passport");
    const launcherCaptainRooms = page.getByTestId("launcher-captain-rooms");
    const live = page.getByRole("button", { name: /play live/i });
    const play = page.getByTestId("solo-run-button");
    await page.keyboard.press("Tab");
    await expect(chooseLook).toBeFocused();
    await expectVisibleFocus(chooseLook);
    await page.keyboard.press("Tab");
    await expect(nickname).toBeFocused();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type("Keyboard Pilot");
    await page.keyboard.press("Tab");
    await expect(launcherPassport).toBeFocused();
    await expectVisibleFocus(launcherPassport);
    await page.keyboard.press("Tab");
    await expect(launcherCaptainRooms).toBeFocused();
    await expectVisibleFocus(launcherCaptainRooms);
    await page.keyboard.press("Tab");
    await expect(live).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(play).toBeFocused();
    await expectVisibleFocus(play);
    await page.keyboard.press("Enter");
    await continuePastMobileAssist(page);

    const arena = page.getByRole("region", { name: "Active Wormifi pirate sea-serpent arena" });
    await expect(arena).toBeFocused();
    await expectVisibleFocus(arena);
    await expect(arena).toHaveAttribute("aria-describedby", "arena-keyboard-help");
    await expect(page.getByTestId("room-identity")).toHaveText(/SOLO RUN — NO LIVE ROOM/u);
    await expect(page.getByTestId("tutorial-coach")).toHaveAccessibleName("Steer to start.");
    if (testInfo.project.name.includes("mobile")) {
      await expect(page.getByTestId("mobile-map-toggle")).toHaveAccessibleName(
        /rank \d+ of \d+, score \d+, size \d+/i,
      );
    } else {
      await expect(page.getByTestId("hud-rank")).toHaveAccessibleName(/rank \d+ of \d+/i);
      await expect(page.getByTestId("hud-score")).toHaveAccessibleName(/score \d+/i);
      await expect(page.getByTestId("hud-length")).toHaveAccessibleName(/size \d+/i);
    }
    await expect(page.getByRole("timer")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /exit to wormifi menu/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /sprint.*costs 4 size/i })).toBeVisible();

    await page.keyboard.press("ArrowDown");
    await expect(arena).toHaveAttribute("data-tutorial-stage", "spark");
    await expect(page.getByTestId("tutorial-coach")).toHaveAccessibleName("Collect the ringed gem.");
    await page.keyboard.press("Tab");
    if (testInfo.project.name.includes("mobile")) {
      const map = page.getByTestId("mobile-map-toggle");
      const scores = page.getByTestId("mobile-scores-toggle");
      await expect(map).toBeFocused();
      await expectVisibleFocus(map);
      await page.keyboard.press("Tab");
      await expect(scores).toBeFocused();
      await expectVisibleFocus(scores);
      await page.keyboard.press("Tab");
    }
    const exit = page.getByRole("button", { name: "Exit to Wormifi menu" });
    await expect(exit).toBeFocused();
    await expectVisibleFocus(exit);
    await page.keyboard.press("Enter");

    await expect(live).toBeFocused();
    await expectVisibleFocus(live);
    await captureProof(page, testInfo, "01-keyboard-exit-focus.png");
  });

  test("result dialog puts keyboard focus on retry and restarts the tutorial", async ({ page }, testInfo) => {
    test.setTimeout(65_000);
    await page.goto("/");
    const play = page.getByTestId("solo-run-button");
    await play.focus();
    await page.keyboard.press("Enter");
    await continuePastMobileAssist(page);

    const arena = page.getByRole("region", { name: "Active Wormifi pirate sea-serpent arena" });
    await expect(arena).toBeFocused();
    await page.keyboard.press("ArrowDown");
    // A fast browser can render the highlighted Spark before this assertion;
    // a slower one may collect it on the same steering step and reach Sprint.
    await expect(arena).toHaveAttribute("data-tutorial-stage", /^(spark|sprint)$/u);
    await page.keyboard.down("Space");
    await expect(arena).toHaveAttribute("data-boosting", "true");

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId("room-identity")).toHaveText(/SOLO RUN — NO LIVE ROOM/u);
    await page.keyboard.up("Space");
    await expect(dialog).toHaveAccessibleName(/chain released|rush complete|target beaten/i);
    const retry = page.getByRole("button", { name: "PLAY AGAIN" });
    await expect(retry).toBeFocused();
    await expectVisibleFocus(retry);
    await captureProof(page, testInfo, "02-result-retry-focus.png");

    await page.keyboard.press("Enter");
    await expect(arena).toBeFocused();
    await expect(arena).toHaveAttribute("data-tutorial-stage", "steer");
    await expect(dialog).toHaveCount(0);
  });

  test("reduced motion freezes decorative preview motion but keeps essential play", async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    const arena = page.getByTestId("arena-canvas");
    await expect(arena).toHaveAttribute("data-reduced-motion", "true");
    await expect(arena).toHaveAttribute("data-sensory-motion", "essential-only");
    const initialPosition = await Promise.all([
      arena.getAttribute("data-player-x"),
      arena.getAttribute("data-player-y"),
    ]);
    await page.waitForTimeout(600);
    expect(await Promise.all([
      arena.getAttribute("data-player-x"),
      arena.getAttribute("data-player-y"),
    ])).toEqual(initialPosition);

    const orbitMotion = await page.locator(".brand-orbit-a").evaluate((element) => {
      const style = getComputedStyle(element);
      return { duration: style.animationDuration, iterations: style.animationIterationCount };
    });
    expect(orbitMotion.duration).toBe("0.001s");
    expect(orbitMotion.iterations).toBe("1");
    expect(await page.getByRole("button", { name: /play live/i }).evaluate(
      (element) => getComputedStyle(element, "::after").display,
    )).toBe("none");

    const soloRun = page.getByTestId("solo-run-button");
    await soloRun.focus();
    await page.keyboard.press("Enter");
    await continuePastMobileAssist(page);
    await expect(arena).toHaveAttribute("data-reduced-motion", "true");
    const startY = Number(await arena.getAttribute("data-player-y"));
    await page.keyboard.press("ArrowDown");
    await expect(arena).toHaveAttribute("data-tutorial-stage", "spark");
    await expect.poll(async () => Number(await arena.getAttribute("data-player-y"))).toBeGreaterThan(startY + 2);
    await captureProof(page, testInfo, "03-reduced-motion-essential-play.png");

    await page.goto("/");
    const playLive = page.getByRole("button", { name: /play live/i });
    await playLive.focus();
    await page.keyboard.press("Enter");
    await continuePastMobileAssist(page);
    const liveArena = page.getByRole("region", { name: "Server-authoritative Wormifi live arena" });
    await expect(liveArena).toBeFocused();
    await expect(liveArena).toHaveAttribute("data-reduced-motion", "true");
    await expect(liveArena).toHaveAttribute("data-sensory-motion", "essential-only");
    await expect(liveArena).toHaveAttribute("aria-describedby", "live-arena-keyboard-help");
  });

  test("320 CSS-pixel viewport keeps every launcher and game control reachable", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 480 });
    await page.goto("/");

    const panel = page.locator(".launch-panel");
    await expect(panel).toBeVisible();
    expect(await panel.evaluate((element) => getComputedStyle(element).overflowY)).toBe("hidden");
    expect(await panel.evaluate((element) => element.scrollHeight)).toBeLessThanOrEqual(
      await panel.evaluate((element) => element.clientHeight + 1),
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);

    const live = page.getByRole("button", { name: /play live/i });
    await live.scrollIntoViewIfNeeded();
    await live.focus();
    await expect(live).toBeFocused();
    await expectVisibleFocus(live);
    await expectWithinViewport(live, page);
    await captureProof(page, testInfo, "04-narrow-launcher.png");

    const play = page.getByTestId("solo-run-button");
    await play.scrollIntoViewIfNeeded();
    await play.focus();
    await page.evaluate(() => {
      // This case proves the constrained regular-tab viewport. Native browser
      // fullscreen can expand Firefox to the host screen and is covered by
      // the dedicated fullscreen contract tests.
      Object.defineProperty(document.documentElement, "requestFullscreen", {
        configurable: true,
        value: undefined,
      });
      Object.defineProperty(document.documentElement, "webkitRequestFullscreen", {
        configurable: true,
        value: undefined,
      });
    });
    await page.keyboard.press("Enter");
    const landscapeGate = page.getByTestId("landscape-gate");
    if (await landscapeGate.isVisible().catch(() => false)) {
      await expect(landscapeGate).toBeVisible();
      await expect(landscapeGate).toContainText("ROTATE TO PLAY");
      await page.setViewportSize({ width: 568, height: 320 });
      await expect(landscapeGate).toHaveCount(0);
    }
    await continuePastMobileAssist(page);
    const exit = page.getByRole("button", { name: "Exit to Wormifi menu" });
    const sprint = page.getByRole("button", { name: /sprint.*costs 4 size/i });
    await expectWithinViewport(exit, page);
    await expectWithinViewport(sprint, page);
    await expect(page.getByTestId("tutorial-coach")).toHaveAccessibleName("Steer to start.");
    await captureProof(page, testInfo, "05-narrow-game.png");
  });
});
