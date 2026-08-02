import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";

const proofDirectory = "proof/browser/flagship-store";
mkdirSync(proofDirectory, { recursive: true });

test.describe("flagship store and wardrobe", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("offers fast catalog preview while checkout stays fail-closed", async ({ page }, testInfo) => {
    await expect(page.getByTestId("launcher-open-store")).toBeVisible();
    await page.getByTestId("launcher-open-store").click();

    const store = page.getByTestId("currency-store-dialog");
    await expect(store).toBeVisible();
    await expect(store).toHaveAttribute("data-flagship-skin-count", "84");
    await expect(store).toHaveAttribute("data-verified-artwork-count", "63");
    await expect(store.getByRole("heading", { name: "Dilophosaurus" })).toBeVisible();
    await expect(store.getByTestId("flagship-checkout")).toBeDisabled();
    await expect(store).toContainText("CHECKOUT LOCKED · AUDIT REQUIRED");
    await expect(store).toContainText("COSMETICS ONLY");
    await page.screenshot({ path: `${proofDirectory}/${testInfo.project.name}-store.png`, fullPage: true });

    await store.getByRole("button", { name: /all skins/i }).click();
    await expect(store.getByTestId("flagship-skin-grid").locator(".flagship-product-card")).toHaveCount(84);
    await store.getByTestId("flagship-skin-premium_worm_creamberry").click();
    await expect(store.getByRole("heading", { name: "Creamberry" })).toBeVisible();
    await expect(store).toContainText("SOURCE ART NOT PUBLISHED");
  });

  test("moves from store to the full Art Studio without a dead end", async ({ page }) => {
    await page.getByTestId("launcher-open-store").click();
    const store = page.getByTestId("currency-store-dialog");
    await store.getByRole("button", { name: /^art studio build your captain$/i }).click();
    await expect(store.getByTestId("flagship-studio-panel")).toContainText("190 exact parent body designs");
    await expect(store.getByTestId("flagship-studio-panel")).toContainText("261 exact wearable parts");
    await store.getByTestId("flagship-open-art-studio").click();
    await expect(page.getByTestId("currency-store-dialog")).toHaveCount(0);
    await expect(page.getByTestId("skin-studio")).toBeVisible();
    await expect(page.getByTestId("parent-skin-catalog")).toHaveAttribute("data-parent-skin-count", "190");
  });
});
