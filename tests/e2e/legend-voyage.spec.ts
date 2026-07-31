import { expect, test } from "@playwright/test";

test("Legend Voyage proves value without exposing checkout", async ({ page }) => {
  await page.goto("/");

  // The deployed owned site has a GA measurement ID and therefore shows the
  // optional consent choice; local builds intentionally do not invent one.
  // Prove the complete journey after declining, so interest remains usable
  // without granting analytics consent.
  const declineAnalytics = page
    .getByRole("dialog", { name: "Optional analytics choice" })
    .getByRole("button", { name: "NO THANKS" });
  if (await declineAnalytics.isVisible({ timeout: 1_500 }).catch(() => false)) {
    await declineAnalytics.click();
  }

  await page.getByTestId("settings-button").click();
  const launch = page.getByTestId("legend-voyage-launch");
  await expect(launch).toBeVisible();
  await expect(launch).toContainText("CAPTAIN LEVEL");
  await expect(launch).toContainText("NOT FOR SALE YET");
  await launch.click();

  const voyage = page.getByTestId("legend-voyage");
  await expect(voyage).toBeVisible();
  await expect(voyage).toHaveAttribute("data-purchasable", "false");
  await expect(voyage).toContainText("NOT FOR SALE YET");
  await expect(voyage).toContainText("no checkout · no card · no email collected");
  const valueSummary = voyage.locator(".legend-voyage__value");
  await expect(valueSummary).toContainText("COMPLETE LEGEND IDENTITIES");
  await expect(valueSummary.locator("strong").first()).toHaveText("3");
  await expect(voyage.getByRole("button", { name: /purchase|buy|checkout|unlock all/i })).toHaveCount(0);

  const preview = voyage.locator("canvas");
  await expect(preview).toBeVisible();
  await expect(preview).toHaveAttribute("role", "img");
  for (const themeId of ["krakens-ink", "phoenix-wake", "leviathan-scale"]) {
    const theme = page.getByTestId(`legend-theme-${themeId}`);
    await expect(theme).toBeVisible();
    await theme.click();
    await expect(theme).toHaveAttribute("aria-checked", "true");
  }

  const interest = page.getByTestId("legend-voyage-interest");
  await interest.click();
  await expect(interest).toBeDisabled();
  await expect(interest).toContainText("NO PAYMENT COLLECTED");

  await page.getByRole("button", { name: "Close Legend Voyage" }).click();
  await expect(voyage).toHaveCount(0);
  await expect(page.getByTestId("settings-panel")).toBeVisible();
  await expect(launch).toBeVisible();
});

test("legacy query-string store preview cannot expose a payment action", async ({ page }) => {
  await page.goto("/?store=preview");
  await page.getByTestId("settings-button").click();
  await page.getByTestId("skin-studio-launch").click();
  await expect(page.getByTestId("skin-studio")).toBeVisible();
  await expect(page.getByTestId("skin-studio-founder")).toHaveCount(0);
  await expect(page.getByTestId("founder-unlock-button")).toHaveCount(0);
});

test("returning captains can reach Legend Voyage directly without hunting through Settings", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("wormifi.captain-progression.v1", JSON.stringify({
      version: 1,
      xp: 420,
      completedRuns: 3,
      totalScore: 1_200,
      lastAwardXp: 80,
      updatedAtMs: Date.now(),
    }));
  });
  await page.goto("/");

  const directVoyage = page.getByTestId("legend-voyage-launch");
  await expect(directVoyage).toBeVisible();
  await expect(directVoyage).toContainText("LEGEND VOYAGE");
  await expect(directVoyage).toContainText("$4.99 RESEARCH");
  const launcherFit = await page.locator(".launch-panel").evaluate((panel) => ({
    clientHeight: panel.clientHeight,
    scrollHeight: panel.scrollHeight,
    bottom: panel.getBoundingClientRect().bottom,
    viewportHeight: window.innerHeight,
  }));
  expect(launcherFit.scrollHeight).toBeLessThanOrEqual(launcherFit.clientHeight + 1);
  expect(launcherFit.bottom).toBeLessThanOrEqual(launcherFit.viewportHeight);
  await directVoyage.click();

  await expect(page.getByTestId("legend-voyage")).toBeVisible();
  await expect(page.getByTestId("settings-panel")).toHaveCount(0);
});
