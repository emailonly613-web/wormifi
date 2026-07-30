import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

test("rebuilds and visibly advances the finished local run", async ({ page }, testInfo) => {
  test.skip(
    !testInfo.project.name.includes("desktop"),
    "One semantic desktop proof covers the deterministic local replay contract.",
  );
  test.setTimeout(35_000);

  await page.goto("/");
  await page.getByRole("button", { name: /play now/i }).click();
  const arena = page.getByTestId("arena-canvas");
  await expect(arena).toBeVisible();
  await page.keyboard.press("ArrowDown");

  // The default sanitized input points right; the deterministic Rush boundary
  // ends this proof run without a private test-only simulation shortcut.
  await expect(page.getByTestId("results-panel")).toBeVisible({ timeout: 22_000 });
  await page.getByTestId("watch-local-replay").click();

  await expect(page.getByTestId("local-replay-panel")).toContainText(
    "LOCAL REPLAY · NO LIVE PLAYERS",
  );
  await expect(arena).toHaveAttribute("data-replay-state", "playing", {
    timeout: 8_000,
  });

  const firstTick = Number(await arena.getAttribute("data-replay-tick"));
  const firstPosition = [
    await arena.getAttribute("data-replay-player-x"),
    await arena.getAttribute("data-replay-player-y"),
  ].join(":");
  await expect.poll(
    async () => Number(await arena.getAttribute("data-replay-tick")),
    { timeout: 2_000 },
  ).toBeGreaterThan(firstTick + 3);
  const nextPosition = [
    await arena.getAttribute("data-replay-player-x"),
    await arena.getAttribute("data-replay-player-y"),
  ].join(":");
  expect(nextPosition).not.toBe(firstPosition);
  const proofDirectory = path.resolve("proof", "browser", testInfo.project.name);
  await mkdir(proofDirectory, { recursive: true });
  await page.screenshot({
    path: path.join(proofDirectory, "03-local-replay.png"),
    fullPage: true,
  });

  await expect(arena).toHaveAttribute("data-replay-state", "complete", {
    timeout: 8_000,
  });
  await expect(page.getByTestId("local-replay-panel")).toContainText(
    "CHECKSUM VERIFIED",
  );
  await expect(arena).not.toHaveAttribute("data-replay-checksum", "");
  await page.screenshot({
    path: path.join(proofDirectory, "04-local-replay-verified.png"),
    fullPage: true,
  });

  await page.getByTestId("return-to-results").click();
  await expect(page.getByTestId("results-panel")).toBeVisible();
  await expect(page.getByRole("button", { name: /share challenge/i })).toBeVisible();
  await expect(arena).toHaveAttribute("data-replay-state", "off");
});

test("offers the same verified replay and honest actions after Endless", async ({ page }, testInfo) => {
  test.skip(
    !testInfo.project.name.includes("desktop"),
    "One semantic desktop proof covers the Endless result contract.",
  );
  test.setTimeout(50_000);

  await page.goto("/");
  await page.getByRole("button", { name: /endless/i }).click();
  await page.getByRole("button", { name: /play now/i }).click();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByTestId("results-panel")).toBeVisible({ timeout: 35_000 });
  await expect(page.getByTestId("watch-local-replay")).toContainText("WATCH FINAL 6S");
  await expect(page.getByTestId("restart-button")).toHaveText("PLAY AGAIN");
  await expect(page.getByRole("button", { name: /share challenge/i })).toBeVisible();

  await page.getByTestId("watch-local-replay").click();
  await expect(page.getByTestId("local-replay-panel")).toContainText("LOCAL REPLAY · NO LIVE PLAYERS");
  await expect(page.getByTestId("arena-canvas")).toHaveAttribute("data-replay-state", "complete", {
    timeout: 10_000,
  });
  await expect(page.getByTestId("local-replay-panel")).toContainText("CHECKSUM VERIFIED");
});
