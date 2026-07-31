import { expect, test, type Page } from "@playwright/test";
import { serializeChallengePayload } from "../../src/game/replay";

const gameContract = {
  arena: "arena-canvas",
  boost: "boost-control",
  exit: "exit-button",
  length: "hud-length",
  playerChain: "player-chain",
  rank: "hud-rank",
  score: "hud-score",
  tutorial: "tutorial-coach",
} as const;

async function steerToHighlightedSpark(page: Page) {
  const arena = page.getByTestId(gameContract.arena);
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const stage = await arena.getAttribute("data-tutorial-stage");
    if (stage === "sprint") return;
    expect(stage).toBe("spark");
    const values = await Promise.all([
      arena.getAttribute("data-player-x"),
      arena.getAttribute("data-player-y"),
      arena.getAttribute("data-tutorial-target-x"),
      arena.getAttribute("data-tutorial-target-y"),
    ]);
    if (values.some((value) => value === null || value === "")) {
      await page.waitForTimeout(70);
      continue;
    }
    const [playerX, playerY, targetX, targetY] = values.map(Number);
    const deltaX = targetX - playerX;
    const deltaY = targetY - playerY;
    const length = Math.hypot(deltaX, deltaY);
    const box = await arena.boundingBox();
    if (!box || length < 0.001) {
      await page.waitForTimeout(70);
      continue;
    }
    const reach = Math.min(230, Math.min(box.width, box.height) * 0.34);
    await page.mouse.move(
      box.x + box.width / 2 + deltaX / length * reach,
      box.y + box.height / 2 + deltaY / length * reach,
    );
    await page.waitForTimeout(80);
  }
  throw new Error("The highlighted tutorial Spark was not collected in time.");
}

async function expectLauncher(page: Page) {
  await expect(page.getByRole("heading", { name: "WORMIFI" })).toBeVisible();
  await expect(page.getByLabel("Your arena name")).toBeEditable();
  await expect(page.getByRole("button", { name: /play live/i })).toBeVisible();
  await expect(page.getByTestId("solo-run-button")).toBeVisible();
  await expect(page.getByTestId("settings-button")).toBeVisible();
  await expect(page.getByTestId("settings-panel")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /practice with labeled bots/i }),
  ).toBeVisible();
  await expect(page.getByTestId("friend-room-card")).toBeVisible();
  await expect(page.getByTestId("lobby-room-identity")).toContainText("ROOM #");
  await expect(page.getByTestId("lobby-invite")).toContainText("CHALLENGE A FRIEND");

  const launcherFit = await page.locator(".launch-panel").evaluate((panel) => {
    const bounds = panel.getBoundingClientRect();
    return {
      bottom: bounds.bottom,
      clientHeight: panel.clientHeight,
      scrollHeight: panel.scrollHeight,
      top: bounds.top,
      viewportHeight: window.innerHeight,
    };
  });
  expect(launcherFit.scrollHeight).toBeLessThanOrEqual(launcherFit.clientHeight + 1);
  expect(launcherFit.top).toBeGreaterThanOrEqual(0);
  expect(launcherFit.bottom).toBeLessThanOrEqual(launcherFit.viewportHeight);
}

async function expectActiveArena(page: Page) {
  await expect(page.getByTestId(gameContract.arena)).toBeVisible();
  await expect(page.getByTestId(gameContract.playerChain)).toBeVisible();
  await expect(page.getByTestId(gameContract.rank)).toContainText(/\d/);
  await expect(page.getByTestId(gameContract.score)).toContainText(/\d/);
  await expect(page.getByTestId(gameContract.length)).toContainText(/\d/);
  await expect(page.getByTestId(gameContract.boost)).toBeVisible();
  await expect(page.getByTestId(gameContract.exit)).toBeVisible();
}

test.describe("first Wormifi session", () => {
  test("uses the Play gesture to request browser-chrome-free fullscreen", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      Object.defineProperty(document.documentElement, "requestFullscreen", {
        configurable: true,
        value: async (options?: FullscreenOptions) => {
          document.documentElement.dataset.fullscreenRequest = options?.navigationUI ?? "missing";
        },
      });
    });

    await page.getByTestId("solo-run-button").click();
    await expect(page.locator("html")).toHaveAttribute("data-fullscreen-request", "hide");
    await expect(page.getByTestId("player-chain")).toBeVisible();
  });

  test("does not silently claim fullscreen when the host browser blocks it", async ({ page }) => {
    await page.addInitScript(() => {
      // Some embedded hosts expose Apple's non-standard flag even though
      // their own tabs remain visible. It is not proof of fullscreen.
      Object.defineProperty(navigator, "standalone", {
        configurable: true,
        value: true,
      });
    });
    await page.goto("/");
    await page.evaluate(() => {
      Object.defineProperty(document.documentElement, "requestFullscreen", {
        configurable: true,
        value: undefined,
      });
      Object.defineProperty(document.documentElement, "webkitRequestFullscreen", {
        configurable: true,
        value: undefined,
      });
    });

    await page.getByTestId("solo-run-button").click();
    const fullscreenControl = page.getByTestId("immersive-button");
    await expect(fullscreenControl).toBeVisible();
    await expect(fullscreenControl).toHaveAttribute("data-state", "unsupported");

    await fullscreenControl.click();
    await expect(page.getByTestId("immersive-notice")).toContainText("THIS BROWSER BLOCKS TRUE FULLSCREEN");
    await expect(page.getByTestId("player-chain")).toBeVisible();
  });

  test("independently collapses regular mobile-browser chrome without moving the arena", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      Object.defineProperty(navigator, "maxTouchPoints", {
        configurable: true,
        value: 5,
      });
      Object.defineProperty(document.documentElement, "requestFullscreen", {
        configurable: true,
        value: undefined,
      });
      Object.defineProperty(document.documentElement, "webkitRequestFullscreen", {
        configurable: true,
        value: undefined,
      });
      window.scrollTo = ((first?: number | ScrollToOptions, second?: number) => {
        const y = typeof first === "object" ? first.top ?? 0 : second ?? 0;
        document.documentElement.dataset.lastRequestedScrollY = String(y);
      }) as typeof window.scrollTo;
    });

    await page.getByTestId("solo-run-button").click();
    await expect(page.locator("html")).toHaveClass(/mobile-browser-game/);
    await expect(page.locator("html")).toHaveAttribute("data-mobile-browser-collapse", "true");
    await expect(page.locator("html")).toHaveAttribute("data-last-requested-scroll-y", "96");
    await expect(page.getByTestId("player-chain")).toBeVisible();

    await page.getByTestId("exit-button").click();
    await expect(page.locator("html")).not.toHaveClass(/mobile-browser-game/);
    await expect(page.locator("html")).not.toHaveAttribute("data-mobile-browser-collapse", "true");
    await expect(page.locator("html")).toHaveAttribute("data-last-requested-scroll-y", "0");
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("starts Rush as a guest through accessible controls", async ({ page }) => {
    test.setTimeout(30_000);
    const browserErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(message.text());
    });
    page.on("pageerror", (error) => browserErrors.push(error.message));

    await expectLauncher(page);
    await page.getByLabel("Your arena name").fill("Proof Player");

    await page.getByTestId("settings-button").click();
    const rush = page.getByRole("button", { name: /90s rush/i });
    await rush.click();
    await expect(rush).toHaveClass(/active/);
    await page.getByTestId("settings-close").click();
    await page.getByTestId("solo-run-button").click();

    await expectActiveArena(page);
    await expect(page.getByTestId(gameContract.tutorial)).toBeVisible();
    const arena = page.getByTestId(gameContract.arena);
    await expect(arena).toHaveAttribute("data-tutorial-stage", "steer");
    await expect(page.getByTestId(gameContract.rank)).toContainText("SIZE RANK");
    await expect(page.getByTestId(gameContract.length)).toContainText("SIZE");
    await expect(page.getByTestId(gameContract.boost)).toHaveAccessibleName(/costs 4 size per second/i);

    const frozenStart = await Promise.all([
      arena.getAttribute("data-player-x"),
      arena.getAttribute("data-player-y"),
      arena.getAttribute("data-player-mass"),
    ]);
    await page.waitForTimeout(2_100);
    expect(await Promise.all([
      arena.getAttribute("data-player-x"),
      arena.getAttribute("data-player-y"),
      arena.getAttribute("data-player-mass"),
    ])).toEqual(frozenStart);
    await expect(page.getByTestId("results-panel")).toHaveCount(0);

    await page.keyboard.press("ArrowLeft");
    await expect(arena).toHaveAttribute("data-tutorial-stage", "steer");
    await page.waitForTimeout(240);
    expect(await Promise.all([
      arena.getAttribute("data-player-x"),
      arena.getAttribute("data-player-y"),
      arena.getAttribute("data-player-mass"),
    ])).toEqual(frozenStart);

    // Neither continuing straight nor requesting an immediate reversal can
    // falsely complete the steering lesson.
    await page.keyboard.press("ArrowRight");
    await expect(arena).toHaveAttribute("data-tutorial-stage", "steer");
    const startY = Number(await arena.getAttribute("data-player-y"));
    await page.keyboard.press("ArrowDown");
    await expect(arena).toHaveAttribute("data-tutorial-stage", "spark");
    await expect
      .poll(async () => Number(await arena.getAttribute("data-player-y")), {
        message: "the player should visibly move after the accepted steering input",
        timeout: 1_000,
      })
      .toBeGreaterThan(startY + 1);

    await steerToHighlightedSpark(page);
    await expect(arena).toHaveAttribute("data-tutorial-stage", "sprint");
    await page.keyboard.down("Space");
    await expect(arena).toHaveAttribute("data-boosting", "true");
    await expect(arena).toHaveAttribute("data-tutorial-stage", "sprint-release");
    await expect(arena).toHaveAttribute("data-tutorial-sprint-spent", "true");
    await page.keyboard.up("Space");
    await expect(arena).toHaveAttribute("data-boosting", "false", { timeout: 1_000 });
    await expect(arena).toHaveAttribute("data-tutorial-stage", "collision");
    await expect(page.getByTestId(gameContract.tutorial)).toHaveAccessibleName(
      "Keep your head safe and make a rival head hit your crew.",
    );
    await expect(arena).toHaveAttribute("data-tutorial-stage", "collector", { timeout: 3_000 });

    await page.getByTestId(gameContract.exit).click();
    await expectLauncher(page);
    expect(browserErrors).toEqual([]);
  });

  test("turns a quick Turbo button tap into a visible simulation burst", async ({ page }) => {
    await expectLauncher(page);
    await page.getByTestId("solo-run-button").click();
    await expectActiveArena(page);

    const arena = page.getByTestId(gameContract.arena);
    await page.keyboard.press("ArrowDown");
    await expect(arena).toHaveAttribute("data-tutorial-stage", "spark");
    await expect(arena).toHaveAttribute("data-turbo-reserve", "1.000");
    const beforeY = Number(await arena.getAttribute("data-player-y"));
    await page.getByTestId(gameContract.boost).click();
    await expect(arena).toHaveAttribute("data-boosting", "true");
    await expect(arena).toHaveAttribute("data-boosting", "false", { timeout: 1_000 });
    await expect.poll(async () => Number(await arena.getAttribute("data-player-y"))).toBeGreaterThan(beforeY);
    await expect.poll(async () => Number(await arena.getAttribute("data-turbo-reserve"))).toBeLessThan(1);
  });

  test("labels Practice bots honestly before and during play", async ({ page }, testInfo) => {
    await expectLauncher(page);
    await page.getByRole("button", { name: /practice with labeled bots/i }).click();

    await expectActiveArena(page);
    const leaderboard = page.getByLabel("AI size leaderboard");
    await expect(leaderboard).toBeHidden();
    await expect(page.getByRole("heading", { name: "SIZE RANK · AI", includeHidden: true })).toHaveCount(1);
    await expect(page.getByText("LIVE ARENA")).toHaveCount(0);
    await expect(page.getByTestId("room-identity")).toHaveText(/PRACTICE — NO LIVE ROOM/u);
    await expect(page.getByTestId("room-identity")).toHaveAttribute("data-scope", "practice");
    const radar = page.getByTestId("pirate-radar");
    await expect(radar).toBeVisible();
    await expect(radar).toHaveAttribute("data-room-id", "none");
    await expect(radar).toHaveAttribute("data-human-player-count", "0");
    const practiceCrewCounts = await radar.evaluate((element) => ({
      other: Number(element.getAttribute("data-other-player-count")),
      rivals: Number(element.getAttribute("data-rival-marker-count")),
      ai: Number(element.getAttribute("data-ai-player-count")),
    }));
    expect(practiceCrewCounts.other).toBeGreaterThan(0);
    expect(practiceCrewCounts.rivals).toBe(practiceCrewCounts.other);
    expect(practiceCrewCounts.ai).toBe(practiceCrewCounts.other);
    await expect(radar).toHaveAttribute("data-hazard-count", "0");
    await expect(radar).toHaveAttribute("data-station-count", "3");
    await expect(radar).toHaveAttribute(
      "data-fair-intel",
      "arena-bounds,self-heading,coarse-players,collector,public-hazard,stations",
    );
    await expect(radar.getByTestId("radar-other-player").first()).toBeVisible();
    if (testInfo.project.name.includes("mobile")) {
      const radarBox = await radar.boundingBox();
      expect(radarBox).not.toBeNull();
      expect(radarBox!.width).toBeLessThanOrEqual(92);
      expect(radarBox!.height).toBeLessThanOrEqual(112);
    }
  });

  test("makes a friend room code and its clean invite link obvious before play", async ({ page }) => {
    await page.goto("/?room=crew-246810&arena_ws=ws%3A%2F%2Flocalhost%3A9999&c=discard-me");
    await expect(page.getByTestId("lobby-room-identity")).toHaveText("ROOM #CREW-246810");
    await page.getByTestId("settings-button").click();
    await expect(page.getByLabel("Room number or code")).toHaveValue("crew-246810");
    await page.getByTestId("settings-close").click();
    await expect(page.getByTestId("lobby-invite")).toContainText("CHALLENGE A FRIEND");

    await page.getByTestId("lobby-invite").click();
    const dialog = page.getByTestId("room-invite-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("ROOM #CREW-246810");
    const inviteUrl = new URL(await page.getByTestId("room-invite-url").inputValue());
    expect(inviteUrl.searchParams.get("room")).toBe("crew-246810");
    expect(inviteUrl.searchParams.has("arena_ws")).toBe(false);
    expect(inviteUrl.searchParams.has("c")).toBe(false);

    await page.getByRole("button", { name: "CLOSE" }).click();
    await expect(dialog).toHaveCount(0);
  });

  test("accepts a same-seed rivalry challenge and shows its target", async ({ page }) => {
    const token = serializeChallengePayload({
      seed: "proof-rivalry-seed",
      mode: "rush",
      target: { metric: "score", value: 777, playerId: "Proof-Rival" },
      playerLook: {
        coreId: "living-core-v1",
        followerId: "crew-mix-v1",
        trailId: "neon-story-v1",
      },
    });
    await page.goto(`/?c=${encodeURIComponent(token)}`);

    await expect(page.getByTestId("incoming-challenge")).toContainText("777");
    await page.getByRole("button", { name: /accept challenge/i }).click();
    await expectActiveArena(page);
    await expect(page.getByTestId("challenge-target")).toContainText("777");
  });

  test("retargets a Spark missed by the turn arc and still completes Grow", async ({ page }) => {
    test.setTimeout(25_000);
    await page.getByTestId("solo-run-button").click();
    const arena = page.getByTestId(gameContract.arena);
    await expect(arena).toHaveAttribute("data-tutorial-stage", "steer");

    await page.keyboard.press("ArrowLeft");
    await expect(arena).toHaveAttribute("data-tutorial-stage", "steer");
    await page.keyboard.press("ArrowDown");
    await expect(arena).toHaveAttribute("data-tutorial-stage", "spark");
    await expect(arena).toHaveAttribute("data-tutorial-target-id", "starter-turn-down");

    // Deliberately abandon the ringed Spark. Once it falls materially behind
    // the actual heading, the coach must select a reachable forward Spark.
    await page.keyboard.press("ArrowRight");
    await expect.poll(
      async () => Number(await arena.getAttribute("data-tutorial-retarget-count")),
      { timeout: 4_000 },
    ).toBeGreaterThan(0);
    await expect(arena).toHaveAttribute("data-tutorial-retarget-reason", "behind");
    await expect(arena).not.toHaveAttribute("data-tutorial-target-id", "starter-turn-down");

    await steerToHighlightedSpark(page);
    await expect(arena).toHaveAttribute("data-tutorial-stage", "sprint");
    await expect(page.getByTestId("results-panel")).toHaveCount(0);
  });

  test("shows a real one-thumb steering anchor on touch", async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes("mobile"), "Touch proof runs on the mobile project.");
    await page.getByTestId("solo-run-button").click();
    await expectActiveArena(page);

    const session = await page.context().newCDPSession(page);
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    const touchX = Math.min(105, viewport!.width * 0.22);
    const touchStartY = viewport!.height * 0.56;
    const touchEndY = Math.min(viewport!.height - 34, touchStartY + 72);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: touchX, y: touchStartY, radiusX: 4, radiusY: 4, force: 1, id: 1 }],
    });
    await expect(page.getByTestId("touch-guide")).toBeVisible();
    const startY = Number(await page.getByTestId(gameContract.arena).getAttribute("data-player-y"));

    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: touchX, y: touchEndY, radiusX: 4, radiusY: 4, force: 1, id: 1 }],
    });
    await page.waitForTimeout(420);
    const movedY = Number(await page.getByTestId(gameContract.arena).getAttribute("data-player-y"));
    expect(movedY).toBeGreaterThan(startY + 8);

    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(page.getByTestId("touch-guide")).toHaveCount(0);
  });

  test("persists a handed pirate helm and mirrors Sprint to the free hand", async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes("mobile"), "Handed helm proof runs on mobile.");
    await page.getByTestId("settings-button").click();
    await page.getByTestId("control-right-helm").click();
    await expect(page.getByTestId("control-right-helm")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("settings-close").click();
    await page.reload();
    await page.getByTestId("settings-button").click();
    await expect(page.getByTestId("control-right-helm")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("settings-close").click();

    await page.getByTestId("solo-run-button").click();
    const arena = page.getByTestId(gameContract.arena);
    await expect(arena).toHaveAttribute("data-control-scheme", "right-helm");
    const idleHelm = page.getByTestId("fixed-touch-guide");
    await expect(idleHelm).toBeVisible();
    const helmBox = await idleHelm.boundingBox();
    const sprintBox = await page.getByTestId("boost-control").boundingBox();
    expect(helmBox).not.toBeNull();
    expect(sprintBox).not.toBeNull();
    expect(helmBox!.x).toBeGreaterThan(page.viewportSize()!.width / 2);
    expect(sprintBox!.x + sprintBox!.width).toBeLessThan(page.viewportSize()!.width / 2);

    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: 48, y: 240, radiusX: 4, radiusY: 4, force: 1, id: 1 }],
    });
    await expect(page.getByTestId("touch-guide")).toHaveCount(0);
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

    const helmX = helmBox!.x + helmBox!.width / 2;
    const helmY = helmBox!.y + helmBox!.height / 2;
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: helmX, y: helmY, radiusX: 4, radiusY: 4, force: 1, id: 2 }],
    });
    await expect(page.getByTestId("touch-guide")).toBeVisible();
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: helmX, y: helmY - 52, radiusX: 4, radiusY: 4, force: 1, id: 2 }],
    });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(page.getByTestId("fixed-touch-guide")).toBeVisible();
  });
});
