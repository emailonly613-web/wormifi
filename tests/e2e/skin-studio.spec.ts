import { expect, test } from "@playwright/test";
import { resolve } from "node:path";

import { PHOTO_SKIN_STORAGE_KEY } from "../../src/game/photoSkin";

test("opens and closes the four-layer Captain Customizer from the launcher", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("settings-button").click();

  const customize = page.getByTestId("skin-studio-launch");
  await expect(customize).toBeVisible();
  await expect(customize).toContainText("CUSTOMIZE CAPTAIN & WORLD");
  await expect(customize).toContainText("BODY · FACE · COMPLETE · FOOD · TREASURE · ARENA");

  await customize.click();

  const studio = page.getByTestId("skin-studio");
  await expect(studio).toBeVisible();
  await expect(studio).toHaveAttribute("data-photo-sharing", "authored-theme-only");
  await expect(studio).toContainText("PHOTOS NEVER UPLOAD OR LEAVE THIS DEVICE");
  await expect(studio).toContainText("Other players see only your selected public cosmetic ID");
  await expect(page.getByTestId("customizer-mode-body")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("body-skin-catalog")).toBeVisible();
  const parentCatalog = page.getByTestId("parent-skin-catalog");
  await expect(parentCatalog).toHaveAttribute("data-parent-revision", "100700");
  await expect(parentCatalog).toHaveAttribute("data-parent-skin-count", "190");
  await expect(page.getByTestId("parent-skin-current")).toContainText("SIMPLE · 0032");
  await expect(parentCatalog.locator("canvas.skin-studio-parent-strip")).toBeVisible();
  await page.getByTestId("parent-skin-next").click();
  await expect(page.getByTestId("parent-skin-current")).toContainText("SIMPLE · 0033");
  await expect.poll(async () => page.evaluate((storageKey) => {
    const saved = window.localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved).themeId : undefined;
  }, PHOTO_SKIN_STORAGE_KEY)).toBe("wormate-parent-33");
  await page.getByTestId("customizer-mode-face").click();
  await expect(page.getByTestId("face-only-catalog")).toBeVisible();
  const parentWearables = page.getByTestId("parent-wearable-catalog");
  await expect(parentWearables).toHaveAttribute("data-parent-wearable-count", "261");
  await expect(page.getByTestId("parent-wearable-grid-eyes").locator("button")).toHaveCount(20);
  await page.getByTestId("parent-wearable-tab-hat").click();
  await expect(page.getByTestId("parent-wearable-grid-hat").locator("button")).toHaveCount(119);
  await page.getByTestId("parent-wearable-grid-hat").locator('[data-parent-wearable-id="1"]').click();
  await expect.poll(async () => page.evaluate((storageKey) => {
    const saved = window.localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved).themeId : undefined;
  }, PHOTO_SKIN_STORAGE_KEY)).toBe("wormate-parent-33-e0-m0-g0-h1");
  await page.getByTestId("customizer-mode-complete").click();
  await expect(page.getByTestId("complete-style-catalog")).toBeVisible();
  await expect(page.getByRole("radio", { name: /GUMBALL ARMADA COMPLETE IDENTITY/i })).toBeVisible();
  await expect(page.getByRole("radio", { name: /PRISM PLUME COMPLETE IDENTITY/i })).toBeVisible();

  await page.getByTestId("customizer-mode-body").click();
  await page.getByRole("radio", { name: /GUMBALL · OCEAN/i }).check();
  await page.getByTestId("customizer-mode-face").click();
  await page.getByRole("radio", { name: /GUMBALL · BERRY/i }).check();
  const wormPreview = page.getByTestId("skin-studio-worm-preview");
  await expect(wormPreview).toBeVisible();
  await expect(wormPreview).toContainText("YOUR FACE + BODY PREVIEW");
  await expect(wormPreview.locator("canvas")).toHaveAttribute("role", "img");
  await expect(wormPreview.locator("canvas")).toHaveAttribute(
    "aria-label",
    "GUMBALL · BERRY face with GUMBALL · OCEAN body preview",
  );

  await page.getByTestId("customizer-mode-complete").click();
  await page.getByRole("radio", { name: /PRISM PLUME COMPLETE IDENTITY/i }).check();
  await expect(wormPreview.locator("canvas")).toHaveAttribute(
    "aria-label",
    "PRISM PLUME face with PRISM PLUME body preview",
  );
  await expect(page.locator(".launch-panel")).toHaveCount(0);

  await page.getByRole("button", { name: "Close Captain Customizer" }).click();

  await expect(studio).toHaveCount(0);
  await expect(customize).toBeVisible();
  await expect(page.getByTestId("settings-panel")).toBeVisible();
  await expect(page.getByTestId("friend-room-card")).toBeVisible();
  await page.getByTestId("settings-close").click();
  await expect(page.locator(".launch-panel")).toBeVisible();
  await expect(page.getByTestId("live-lab-button")).toBeVisible();
  await expect(page.getByTestId("solo-run-button")).toBeVisible();
});

test("imports, re-encodes, stores, and renders two private files without uploading them", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("settings-button").click();
  await page.getByTestId("skin-studio-launch").click();

  const studio = page.getByTestId("skin-studio");
  await page.getByRole("checkbox", { name: /EXPLICIT PHOTO CONSENT/i }).check();
  await page.getByLabel("Choose two to six JPEG, PNG, or WebP photos").setInputFiles([
    resolve("public/assets/sprites/pirate-atlas/ruby-skull.png"),
    resolve("public/assets/sprites/pirate-atlas/pearl-shell.png"),
  ]);

  await expect(studio).toHaveAttribute("data-photo-count", "2", { timeout: 12_000 });
  await expect(page.getByRole("status")).toContainText("2 sanitized photos saved locally");
  await expect(page.getByTestId("skin-photo")).toHaveCount(2);

  const stored = await page.evaluate((storageKey) => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as {
      photos?: Array<{
        dataUrl?: string;
        mimeType?: string;
        width?: number;
        height?: number;
        sanitized?: boolean;
      }>;
    };
    return parsed.photos;
  }, PHOTO_SKIN_STORAGE_KEY);
  expect(stored).toHaveLength(2);
  for (const photo of stored ?? []) {
    expect(photo.mimeType).toBe("image/webp");
    expect(photo.dataUrl).toMatch(/^data:image\/webp;base64,/u);
    expect(photo.sanitized).toBe(true);
    expect(photo.width).toBeGreaterThan(0);
    expect(photo.height).toBeGreaterThan(0);
    expect(photo.width).toBeLessThanOrEqual(768);
    expect(photo.height).toBeLessThanOrEqual(768);
  }

  await page.getByRole("checkbox", { name: /USE PRIVATE PHOTOS ON THIS DEVICE/i }).check();
  await expect(studio).toHaveAttribute("data-photo-enabled", "true");
  await page.getByRole("button", { name: "Close Captain Customizer" }).click();
  await page.getByTestId("settings-close").click();
  await page.getByTestId("solo-run-button").click();

  const arena = page.getByTestId("arena-canvas");
  await expect(arena).toHaveAttribute("data-local-photo-skin", "true");
  await expect.poll(async () => Number(await arena.getAttribute("data-local-photo-images"))).toBe(2);
});
