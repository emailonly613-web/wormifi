import { expect, test } from "@playwright/test";

test("creates one free private link and auto-joins invited guests without a login wall", async ({ context, page }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.getByTestId("launcher-captain-rooms").click();

  const dialog = page.getByTestId("captain-rooms");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "CAPTAIN ROOMS" })).toBeVisible();
  await expect(dialog.getByRole("radio", { name: /UP TO 10/u })).toBeChecked();
  await expect(dialog.getByRole("radio", { name: /UP TO 20/u })).not.toBeChecked();
  await expect(dialog).toContainText("VIRAL LAUNCH RULE · LOCKED");
  await expect(dialog).toContainText("CREATE · COPY · SEND · PLAY — 100% FREE");
  await expect(dialog).toContainText("zero login wall");
  await expect(dialog).toContainText("no checkout, login pop-up, room credit or invite fee");
  await expect(page.getByRole("button", { name: /buy|checkout|pay now/iu })).toHaveCount(0);

  await dialog.getByRole("radio", { name: /UP TO 30/u }).check();
  await expect(dialog).toContainText("30-PLAYER CAPTAIN COVE");
  await expect(dialog).toContainText("Separate board sized for 30 real human seats");
  const createButton = dialog.getByRole("button", { name: "CREATE FREE ROOM & COPY LINK" });
  await expect(createButton).toBeInViewport();
  await page.screenshot({
    path: `proof/browser/captain-rooms/${test.info().project.name}-free-options.png`,
    fullPage: true,
  });
  await createButton.click();

  const inviteDialog = page.getByTestId("room-invite-dialog");
  await expect(inviteDialog).toBeVisible();
  const inviteValue = await page.getByTestId("room-invite-url").inputValue();
  const inviteUrl = new URL(inviteValue);
  expect(inviteUrl.searchParams.get("room")).toMatch(/^captain-30-[a-f0-9]{20}$/u);
  expect([...inviteUrl.searchParams.keys()]).toEqual(["room"]);
  await expect(inviteDialog).toContainText("FREE CAPTAIN ROOM LINK COPIED");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(inviteValue);

  const guest = await context.newPage();
  await guest.goto(inviteValue);
  await expect(guest.locator("main.app-shell")).toHaveAttribute("data-playing", "true");
  await expect(guest.getByTestId("room-identity")).toHaveAttribute(
    "data-room-id",
    inviteUrl.searchParams.get("room")!,
  );
  await expect(guest.getByTestId("live-arena-canvas")).toBeVisible();
  await expect(guest.getByTestId("captain-passport")).toHaveCount(0);
  await expect(guest.getByRole("button", { name: /play live/iu })).toHaveCount(0);

  await page.screenshot({
    path: `proof/browser/captain-rooms/${test.info().project.name}-free-link.png`,
    fullPage: true,
  });
  await guest.close();
});
