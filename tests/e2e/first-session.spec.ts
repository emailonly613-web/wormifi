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
  await expect(page.getByRole("button", { name: /90s rush/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /endless/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /play now/i })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /practice with labeled bots/i }),
  ).toBeVisible();
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

    const rush = page.getByRole("button", { name: /90s rush/i });
    await rush.click();
    await expect(rush).toHaveClass(/active/);
    await page.getByRole("button", { name: /play now/i }).click();

    await expectActiveArena(page);
    await expect(page.getByTestId(gameContract.tutorial)).toBeVisible();
    const arena = page.getByTestId(gameContract.arena);
    await expect(arena).toHaveAttribute("data-tutorial-stage", "steer");
    await expect(page.getByTestId(gameContract.rank)).toContainText("SIZE RANK");
    await expect(page.getByTestId(gameContract.length)).toContainText("SIZE");
    await expect(page.getByTestId(gameContract.boost)).toContainText("12 SIZE/S");

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
    await page.waitForTimeout(140);
    const movedY = Number(await arena.getAttribute("data-player-y"));
    expect(movedY).toBeGreaterThan(startY + 1);

    await steerToHighlightedSpark(page);
    await expect(arena).toHaveAttribute("data-tutorial-stage", "sprint");
    await page.keyboard.down("Space");
    await expect(arena).toHaveAttribute("data-boosting", "true");
    await expect(arena).toHaveAttribute("data-tutorial-stage", "sprint-release");
    await expect(arena).toHaveAttribute("data-tutorial-sprint-spent", "true");
    await page.keyboard.up("Space");
    await expect(arena).toHaveAttribute("data-boosting", "false");
    await expect(arena).toHaveAttribute("data-tutorial-stage", "collision");
    await expect(page.getByText("THEIR HEAD", { exact: true })).toBeVisible();
    await expect(arena).toHaveAttribute("data-tutorial-stage", "collector", { timeout: 3_000 });

    await page.getByTestId(gameContract.exit).click();
    await expectLauncher(page);
    expect(browserErrors).toEqual([]);
  });

  test("labels Practice bots honestly before and during play", async ({ page }) => {
    await expectLauncher(page);
    await page.getByRole("button", { name: /practice with labeled bots/i }).click();

    await expectActiveArena(page);
    await expect(page.getByText(/practice.*labeled bots/i)).toBeVisible();
    await expect(page.getByLabel("AI size leaderboard")).toBeVisible();
    await expect(page.getByRole("heading", { name: "SIZE RANK · AI", includeHidden: true })).toHaveCount(1);
    await expect(page.getByText("LIVE ARENA")).toHaveCount(0);
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
    await page.getByRole("button", { name: /play now/i }).click();
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
    await page.getByRole("button", { name: /play now/i }).click();
    await expectActiveArena(page);

    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: 105, y: 520, radiusX: 4, radiusY: 4, force: 1, id: 1 }],
    });
    await expect(page.getByTestId("touch-guide")).toBeVisible();
    const startY = Number(await page.getByTestId(gameContract.arena).getAttribute("data-player-y"));

    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 105, y: 600, radiusX: 4, radiusY: 4, force: 1, id: 1 }],
    });
    await page.waitForTimeout(420);
    const movedY = Number(await page.getByTestId(gameContract.arena).getAttribute("data-player-y"));
    expect(movedY).toBeGreaterThan(startY + 8);

    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(page.getByTestId("touch-guide")).toHaveCount(0);
  });
});
