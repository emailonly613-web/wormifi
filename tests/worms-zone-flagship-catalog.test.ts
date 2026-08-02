import { describe, expect, it } from "vitest";
import {
  WORMS_ZONE_FLAGSHIP_GAME_VERSION,
  WORMS_ZONE_FLAGSHIP_SKINS,
  WORMS_ZONE_FLAGSHIP_SKIN_COUNT,
  WORMS_ZONE_SOURCE_PLACEHOLDER_SKINS,
  WORMS_ZONE_VERIFIED_SKINS,
  flagshipArtworkPath,
  flagshipSkinBySku,
} from "../src/game/wormsZoneFlagshipCatalog";

describe("worms.zone flagship catalog", () => {
  it("preserves the complete audited premium skin inventory", () => {
    expect(WORMS_ZONE_FLAGSHIP_GAME_VERSION).toBe("6.26.1");
    expect(WORMS_ZONE_FLAGSHIP_SKIN_COUNT).toBe(84);
    expect(new Set(WORMS_ZONE_FLAGSHIP_SKINS.map((skin) => skin.sku)).size).toBe(84);
    expect(WORMS_ZONE_VERIFIED_SKINS).toHaveLength(63);
    expect(WORMS_ZONE_SOURCE_PLACEHOLDER_SKINS).toHaveLength(21);
  });

  it("keeps exact artwork distinct from honest source placeholders", () => {
    const dilophosaurus = flagshipSkinBySku("premium_worm_dilophosaurus");
    const creamberry = flagshipSkinBySku("premium_worm_creamberry");

    expect(dilophosaurus).toMatchObject({
      name: "Dilophosaurus",
      sourcePriceLabel: "$19.99",
      artworkStatus: "verified-local",
    });
    expect(flagshipArtworkPath(dilophosaurus!)).toBe(
      "/assets/parent-worms-zone/store/premium_worm_dilophosaurus.png",
    );
    expect(creamberry).toMatchObject({
      name: "Creamberry",
      sourcePriceLabel: "$5.99",
      artworkStatus: "source-placeholder",
    });
    expect(flagshipArtworkPath(creamberry!)).toBeUndefined();
  });

  it("contains pricing metadata only, never gameplay power values", () => {
    for (const skin of WORMS_ZONE_FLAGSHIP_SKINS) {
      expect(skin.sourcePriceUsd).toBeGreaterThan(0);
      expect(Object.keys(skin)).not.toContain("speed");
      expect(Object.keys(skin)).not.toContain("collisionPower");
      expect(Object.keys(skin)).not.toContain("size");
    }
  });
});
