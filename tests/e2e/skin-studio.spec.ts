import { expect, test } from "@playwright/test";
import { resolve } from "node:path";

import { PHOTO_SKIN_STORAGE_KEY } from "../../src/game/photoSkin";

test("opens and closes the private Photo Skin Studio from the launcher", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("settings-button").click();

  const customize = page.getByTestId("skin-studio-launch");
  await expect(customize).toBeVisible();
  await expect(customize).toContainText("CUSTOMIZE SKIN");
  await expect(customize).toContainText("YOUR PHOTOS STAY ON THIS DEVICE");

  await customize.click();

  const studio = page.getByTestId("skin-studio");
  await expect(studio).toBeVisible();
  await expect(studio).toHaveAttribute("data-photo-sharing", "authored-theme-only");
  await expect(studio).toContainText("PHOTOS NEVER UPLOAD OR LEAVE THIS DEVICE");
  await expect(studio).toContainText("Other players see only your authored Wormifi theme");
  const wormPreview = page.getByTestId("skin-studio-worm-preview");
  await expect(wormPreview).toBeVisible();
  await expect(wormPreview).toContainText("CONTINUOUS WORM PREVIEW");
  await expect(wormPreview.locator("canvas")).toHaveAttribute("role", "img");
  await expect(page.locator(".launch-panel")).toHaveCount(0);

  await page.getByRole("button", { name: "Close Photo Skin Studio" }).click();

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
  await page.getByRole("button", { name: "Close Photo Skin Studio" }).click();
  await page.getByTestId("settings-close").click();
  await page.getByTestId("solo-run-button").click();

  const arena = page.getByTestId("arena-canvas");
  await expect(arena).toHaveAttribute("data-local-photo-skin", "true");
  await expect.poll(async () => Number(await arena.getAttribute("data-local-photo-images"))).toBe(2);
});
