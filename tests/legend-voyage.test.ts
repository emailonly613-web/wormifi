import { describe, expect, it } from "vitest";
import {
  CAPTAIN_COMMERCE_OFFERS,
  FORBIDDEN_PAID_GAMEPLAY_ADVANTAGES,
} from "../src/game/captainCommerce";
import { isPremiumCosmeticThemeId } from "../src/game/cosmeticThemes";
import {
  LEGEND_VOYAGE,
  LEGEND_VOYAGE_REWARDS,
  LEGEND_VOYAGE_THEME_IDS,
} from "../src/game/legendVoyage";

describe("Legend Voyage no-sale contract", () => {
  it("is permanent, cosmetic, and deliberately not purchasable", () => {
    expect(LEGEND_VOYAGE).toMatchObject({
      permanent: true,
      purchasable: false,
    });
  });

  it("offers transparent monthly access or five-times-price permanent ownership without checkout", () => {
    expect(CAPTAIN_COMMERCE_OFFERS).toHaveLength(2);
    const [monthly, lifetime] = CAPTAIN_COMMERCE_OFFERS;
    expect(monthly).toMatchObject({
      billing: "monthly",
      priceResearchUsdCents: 199,
      relationship: "access_while_active",
      purchasable: false,
    });
    expect(lifetime).toMatchObject({
      billing: "one_time",
      priceResearchUsdCents: 999,
      relationship: "permanent_ownership",
      purchasable: false,
    });
    expect(lifetime.priceResearchUsdCents / monthly.priceResearchUsdCents).toBeGreaterThanOrEqual(5);
    expect(lifetime.priceResearchUsdCents / monthly.priceResearchUsdCents).toBeLessThanOrEqual(10);

    const paidPromise = CAPTAIN_COMMERCE_OFFERS
      .flatMap((offer) => [offer.promise, ...offer.includes])
      .join(" ")
      .toLowerCase();
    for (const forbidden of FORBIDDEN_PAID_GAMEPLAY_ADVANTAGES) {
      expect(paidPromise).not.toContain(forbidden);
    }
  });

  it("contains exactly the three authored premium legends", () => {
    expect(LEGEND_VOYAGE_THEME_IDS).toHaveLength(3);
    expect(new Set(LEGEND_VOYAGE_THEME_IDS).size).toBe(3);
    for (const themeId of LEGEND_VOYAGE_THEME_IDS) {
      expect(isPremiumCosmeticThemeId(themeId)).toBe(true);
    }
  });

  it("exposes a strictly increasing earned-level route", () => {
    expect(LEGEND_VOYAGE_REWARDS[0].level).toBe(1);
    expect(LEGEND_VOYAGE_REWARDS.at(-1)?.level).toBe(20);
    for (let index = 1; index < LEGEND_VOYAGE_REWARDS.length; index += 1) {
      expect(LEGEND_VOYAGE_REWARDS[index].level).toBeGreaterThan(LEGEND_VOYAGE_REWARDS[index - 1].level);
    }
    const copy = LEGEND_VOYAGE_REWARDS.map((reward) => `${reward.label} ${reward.detail}`).join(" ").toLowerCase();
    for (const forbidden of ["speed boost", "size boost", "collision power", "random chance", "loot box"]) {
      expect(copy).not.toContain(forbidden);
    }
  });
});
