import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";

const proofDirectory = "proof/browser/world-themes";
mkdirSync(proofDirectory, { recursive: true });

test("equips a coordinated food, treasure, and arena world without changing board rules", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByTestId("launcher-choose-look").click();
  await page.getByTestId("customizer-mode-world").click();

  const worldStudio = page.getByTestId("world-theme-studio");
  await expect(worldStudio).toBeVisible();
  await expect(worldStudio).toContainText("3 food/treasure");
  await expect(worldStudio.getByRole("heading", { name: "THEMED WORLDS" })).toBeVisible();
  await expect(worldStudio.getByRole("heading", { name: "FOOD & TREASURE FIELD" })).toBeVisible();
  await expect(worldStudio.getByRole("heading", { name: "ARENA + LIVING MOAT SKIN" })).toBeVisible();
  await page.getByTestId("world-bundle-kraken-family").click();
  await expect(page.getByTestId("world-bundle-kraken-family")).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: `${proofDirectory}/${testInfo.project.name}-world-studio.png`, fullPage: true });

  await page.getByRole("button", { name: "Close Captain Customizer" }).click();
  await page.getByRole("button", { name: /practice with labeled bots/i }).click();
  const arena = page.getByTestId("arena-canvas");
  await expect(arena).toHaveAttribute("data-pickup-theme-id", "mixed-bounty");
  await expect(arena).toHaveAttribute("data-arena-visual-theme-id", "emerald-depths");
  await expect(arena).toHaveAttribute("data-board-id", "open-seas");
});
