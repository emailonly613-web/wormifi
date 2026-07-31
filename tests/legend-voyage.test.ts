import { describe, expect, it } from "vitest";
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
      priceResearchUsdCents: 499,
    });
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
