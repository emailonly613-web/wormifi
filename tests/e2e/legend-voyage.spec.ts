import { expect, test } from "@playwright/test";

test("Legend Voyage proves value without exposing checkout", async ({ page }) => {
  await page.goto("/");

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
  await expect(launch).toBeVisible();
});

test("legacy query-string store preview cannot expose a payment action", async ({ page }) => {
  await page.goto("/?store=preview");
  await page.getByTestId("skin-studio-launch").click();
  await expect(page.getByTestId("skin-studio")).toBeVisible();
  await expect(page.getByTestId("skin-studio-founder")).toHaveCount(0);
  await expect(page.getByTestId("founder-unlock-button")).toHaveCount(0);
});
