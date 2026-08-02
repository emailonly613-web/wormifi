import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

test("turns a finished run into visible Captain's Log progress that survives reload", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("desktop"), "The deterministic full-run proof only needs one desktop browser.");
  test.setTimeout(35_000);

  await page.goto("/");
  await page.getByTestId("solo-run-button").click();
  await expect(page.getByTestId("arena-canvas")).toBeVisible();
  await page.keyboard.press("ArrowDown");

  await expect(page.getByTestId("results-panel")).toBeVisible({ timeout: 22_000 });
  const update = page.getByTestId("captain-depth-update");
  await expect(update).toContainText("CAPTAIN'S LOG UPDATED");
  await expect(update).toContainText("FIRST WAKE");
  await expect(update).toContainText("LEAVE A WAKE");

  await page.getByTestId("view-captain-log").click();
  const log = page.getByTestId("captain-log");
  await expect(log).toBeVisible();
  await expect(page.getByTestId("captain-log-orders")).toContainText("1/3 CLEARED");
  await expect(page.getByTestId("captain-log-masteries")).toContainText("FIRST WAKE");
  await expect(page.getByTestId("captain-log-history")).toContainText("RUSH");
  await expect(page.getByTestId("captain-log-save")).toContainText("SAVED ON THIS BROWSER");

  const proofDirectory = path.resolve("proof", "browser", "captain-depth", testInfo.project.name);
  await mkdir(proofDirectory, { recursive: true });
  await page.screenshot({ path: path.join(proofDirectory, "01-earned-log.png"), fullPage: true });

  await page.getByRole("button", { name: "Back to harbor" }).click();
  await page.reload();
  await expect(page.getByTestId("captain-log-launch")).toBeVisible();
  await page.getByTestId("captain-log-launch").click();
  await expect(page.getByTestId("captain-log-history")).toContainText("RUSH");
});

test("keeps the seeded depth dashboard readable on desktop and landscape mobile", async ({ page }, testInfo) => {
  const nowMs = Date.now();
  const dayKey = new Date(nowMs).toISOString().slice(0, 10);
  await page.addInitScript(({ timestamp, today }) => {
    localStorage.setItem("wormifi.captain-progression.v1", JSON.stringify({
      version: 1,
      xp: 720,
      completedRuns: 8,
      totalScore: 18_400,
      lastAwardXp: 140,
      updatedAtMs: timestamp,
    }));
    localStorage.setItem("wormifi.captain-log.v1", JSON.stringify({
      version: 1,
      totalRuns: 8,
      totalScore: 18_400,
      totalKills: 12,
      bestScore: 5_600,
      bestRank: 1,
      bestPeakMass: 130,
      liveRuns: 3,
      soloRuns: 5,
      daily: {
        dayKey: today,
        runs: 2,
        bestScore: 2_500,
        kills: 3,
        bestRank: 2,
        peakMass: 92,
        liveRuns: 1,
      },
      recentRuns: [
        { source: "live", score: 2_500, kills: 3, rank: 2, peakMass: 92, endedAtMs: timestamp },
        { source: "rush", score: 1_840, kills: 1, rank: 4, peakMass: 70, endedAtMs: timestamp - 3_600_000 },
      ],
      updatedAtMs: timestamp,
    }));
  }, { timestamp: nowMs, today: dayKey });

  await page.goto("/");
  await page.getByTestId("captain-log-launch").click();
  const log = page.getByTestId("captain-log");
  await expect(log).toBeVisible();
  await expect(log).toContainText("LV 5");
  await expect(page.getByTestId("captain-log-orders")).toBeVisible();
  await expect(page.getByTestId("captain-log-masteries")).toContainText("CROWN TIDE");
  await expect(page.getByTestId("captain-log-history")).toContainText("LIVE WATER");
  await expect(page.getByTestId("captain-log-save")).toContainText("SAVED ON THIS BROWSER");

  const box = await log.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.width).toBeLessThanOrEqual((await page.viewportSize())!.width);

  const proofDirectory = path.resolve("proof", "browser", "captain-depth", testInfo.project.name);
  await mkdir(proofDirectory, { recursive: true });
  await page.screenshot({ path: path.join(proofDirectory, "02-depth-dashboard.png"), fullPage: true });
});
