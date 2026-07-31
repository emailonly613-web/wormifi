import { expect, test } from "@playwright/test";

test("Founding 50 turns a visitor into a player, host, or sharer without a gate", async ({ context, page }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/founding-50.html?utm_source=e2e&utm_medium=proof&utm_campaign=founding_50&utm_id=qa");

  await expect(page.getByRole("heading", { name: /first 50 outside players/iu })).toBeVisible();
  await expect(page.getByRole("link", { name: "PLAY ONE RUN NOW" })).toHaveAttribute(
    "href",
    /utm_id=play/u,
  );
  await expect(page.getByRole("link", { name: "HOST A FREE ROOM" })).toHaveAttribute(
    "href",
    /launch=captain-room/u,
  );
  await expect(page.getByText("No login before play")).toBeVisible();
  await expect(page.getByText("No checkout or room fee")).toBeVisible();

  await page.getByRole("link", { name: "HOST A FREE ROOM" }).click();
  await expect(page).toHaveURL(/launch=captain-room/u);
  await expect(page.getByTestId("captain-rooms")).toBeVisible();
  await expect(page.getByRole("heading", { name: "CAPTAIN ROOMS" })).toBeVisible();
  await expect(page.getByTestId("captain-passport")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /buy|checkout|pay now/iu })).toHaveCount(0);
});

test("Founding 50 produces a distinct referral link", async ({ context, page }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
  });
  await page.goto("/founding-50.html");
  await page.getByRole("button", { name: "INVITE ONE FRIEND" }).click();
  await expect(page.getByRole("status")).toContainText("INVITE LINK COPIED");
  const shared = new URL(await page.evaluate(() => navigator.clipboard.readText()));
  expect(shared.pathname).toBe("/founding-50.html");
  expect(shared.searchParams.get("utm_source")).toBe("player_share");
  expect(shared.searchParams.get("utm_medium")).toBe("referral");
  expect(shared.searchParams.get("utm_campaign")).toBe("founding_50");
});

test("Founding 50 keeps the primary action usable in a narrow portrait browser", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/founding-50.html");
  const play = page.getByRole("link", { name: "PLAY ONE RUN NOW" });
  await expect(play).toBeVisible();
  await expect(play).toBeInViewport();
  await expect(page.getByRole("button", { name: "INVITE ONE FRIEND" })).toBeVisible();
});
