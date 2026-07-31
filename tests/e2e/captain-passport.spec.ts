import { expect, test } from "@playwright/test";

const guestProgression = {
  version: 1,
  xp: 420,
  completedRuns: 3,
  totalScore: 9_200,
  lastAwardXp: 120,
  updatedAtMs: 1_700_000_000_000,
};

const savedProfile = {
  accountId: "00000000-0000-4000-8000-000000000123",
  sessionId: "00000000-0000-4000-8000-000000000456",
  progression: {
    accountId: "00000000-0000-4000-8000-000000000123",
    xp: 180,
    completedRuns: 2,
    totalScore: 4_800,
    lastAwardXp: 90,
    updatedAtMs: 1_700_000_100_000,
  },
  entitlements: [],
  passkeyCount: 0,
};

test("keeps play guest-first, offers optional email save, and restores a verified Passport", async ({ page }) => {
  await page.addInitScript((progression) => {
    localStorage.setItem("wormifi.captain-progression.v1", JSON.stringify(progression));
  }, guestProgression);

  let emailRequest = "";
  await page.route("**/passport/v1/capabilities", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        guestPlayRequired: false,
        passkeys: true,
        emailLinks: true,
        passwords: false,
        payments: false,
      }),
    });
  });
  await page.route("**/passport/v1/session", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ ok: false, code: "INVALID_SESSION" }),
    });
  });
  await page.route("**/passport/v1/email/start", async (route) => {
    emailRequest = String((route.request().postDataJSON() as { email?: string }).email ?? "");
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, accepted: true }),
    });
  });
  await page.route("**/passport/v1/email/complete", async (route) => {
    expect(route.request().postDataJSON()).toMatchObject({ token: "test-email-token" });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        created: true,
        recoveryCode: "W1-1111-2222-3333-4444-5555-6666-7777-8888",
        profile: savedProfile,
      }),
    });
  });

  await page.goto("/");
  await expect(page.getByRole("button", { name: /play live/i })).toBeVisible();
  await expect(page.getByText("NO SIGN-UP TO PLAY")).toBeVisible();
  await expect(page.getByTestId("launcher-passport")).toContainText("SAVE YOUR CAPTAIN");

  await page.getByTestId("launcher-passport").click();
  const passport = page.getByTestId("captain-passport");
  await expect(passport).toBeVisible();
  await expect(passport).toContainText("420 PREVIEW XP");
  await expect(passport).toContainText("not imported as verified XP");
  await expect(page.getByTestId("passport-email-option")).toBeEnabled();

  await page.getByTestId("passport-email-option").click();
  await page.getByLabel("EMAIL FOR SIGN-IN ONLY").fill("captain@example.test");
  await page.getByRole("button", { name: "SEND SECURE LINK" }).click();
  await expect(passport).toContainText("one-time sign-in link is on its way");
  expect(emailRequest).toBe("captain@example.test");
  await expect(passport.getByText("No password. No newsletter.", { exact: false })).toBeVisible();

  await page.goto("/#passport-email=test-email-token");
  await expect(page.getByTestId("passport-recovery-reveal")).toBeVisible();
  await expect(page.getByTestId("passport-recovery-reveal")).toContainText(
    "W1-1111-2222-3333-4444-5555-6666-7777-8888",
  );
  await page.getByRole("button", { name: "I SAVED IT" }).click();
  await expect(page.getByTestId("captain-passport")).toHaveCount(0);
  await expect(page.getByTestId("launcher-passport")).toContainText("PASSPORT SAVED");
  await expect(page.getByTestId("launcher-passport")).toContainText("180 verified XP");
});
