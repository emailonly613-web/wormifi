import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

test("captures the first-screen and live-arena proof", async ({ page }, testInfo) => {
  const proofDirectory = path.resolve("proof", "browser", testInfo.project.name);
  await mkdir(proofDirectory, { recursive: true });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "WORMIFI" })).toBeVisible();
  await page.screenshot({
    path: path.join(proofDirectory, "01-menu.png"),
    fullPage: true,
  });

  await page.getByLabel("Your arena name").fill("Review Player");
  await page.getByTestId("solo-run-button").click();
  await expect(page.getByTestId("tutorial-coach")).toBeVisible();
  await page.waitForTimeout(450);
  await page.keyboard.press("ArrowDown");
  await expect(page.getByTestId("arena-canvas")).toHaveAttribute("data-tutorial-stage", "spark");
  await page.waitForTimeout(850);
  await page.screenshot({
    path: path.join(proofDirectory, "02-gameplay.png"),
    fullPage: true,
  });
});
