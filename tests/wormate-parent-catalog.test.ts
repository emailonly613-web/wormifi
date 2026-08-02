import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  DEFAULT_WORMATE_PARENT_SKIN_ID,
  DEFAULT_WORMATE_PARENT_OUTFIT,
  WORMATE_PARENT_ABILITIES,
  WORMATE_PARENT_EYES,
  WORMATE_PARENT_GLASSES,
  WORMATE_PARENT_HATS,
  WORMATE_PARENT_MOUTHS,
  WORMATE_PARENT_PORTIONS,
  WORMATE_PARENT_REGIONS,
  WORMATE_PARENT_REVISION,
  WORMATE_PARENT_SKINS,
  WORMATE_PARENT_SKIN_GROUPS,
  getWormateParentSkin,
  isWormateParentEyeId,
  isWormateParentGlassesId,
  isWormateParentHatId,
  isWormateParentMouthId,
  isWormateParentSkinId,
  isWormateParentThemeId,
  wormateParentAppearanceFromThemeId,
  wormateParentOutfitForIdentity,
  wormateParentSkinForIdentity,
  wormateParentSkinIdFromThemeId,
  wormateParentThemeId,
} from "../src/game/wormateParentCatalog";
import { createWormateParentSegmentPlan } from "../src/game/wormateParentRender";

describe("authorized Wormate parent body catalog", () => {
  it("matches every body sequence and group in the imported first-party registry", () => {
    const registry = JSON.parse(readFileSync(
      new URL("../public/assets/parent-wormate/registry.json", import.meta.url),
      "utf8",
    )) as {
      revision: number;
      skinArrayDict: Array<{
        id: number;
        base: string[];
        glow: string[];
        prime: string;
        guest?: boolean;
        nonbuyable?: boolean;
      }>;
      skinGroupArrayDict: Array<{ id: string; name: { en: string }; list: number[] }>;
    };
    expect(registry.revision).toBe(WORMATE_PARENT_REVISION);
    expect(registry.skinArrayDict).toHaveLength(WORMATE_PARENT_SKINS.length);
    for (const parentSkin of registry.skinArrayDict) {
      expect(getWormateParentSkin(parentSkin.id)).toMatchObject({
        id: parentSkin.id,
        prime: parentSkin.prime,
        guest: parentSkin.guest === true,
        nonbuyable: parentSkin.nonbuyable === true,
        base: parentSkin.base,
        glow: parentSkin.glow,
      });
    }
    expect(WORMATE_PARENT_SKIN_GROUPS.map((group) => ({
      id: group.id,
      label: group.label,
      skinIds: [...group.skinIds],
    }))).toEqual(registry.skinGroupArrayDict.map((group) => ({
      id: group.id,
      label: group.name.en,
      skinIds: group.list,
    })));
  });

  it("contains the complete exact revision with unique IDs and complete group coverage", () => {
    expect(WORMATE_PARENT_REVISION).toBe(100700);
    expect(WORMATE_PARENT_SKINS).toHaveLength(190);
    expect(WORMATE_PARENT_SKIN_GROUPS).toHaveLength(9);
    expect(new Set(WORMATE_PARENT_SKINS.map((skin) => skin.id)).size).toBe(190);

    const groupedIds = WORMATE_PARENT_SKIN_GROUPS.flatMap((group) => group.skinIds);
    expect(groupedIds).toHaveLength(190);
    expect(new Set(groupedIds).size).toBe(190);
    expect(new Set(groupedIds)).toEqual(new Set(WORMATE_PARENT_SKINS.map((skin) => skin.id)));
  });

  it("resolves every body, wearable, portion, and ability sprite against the imported atlases", () => {
    for (const skin of WORMATE_PARENT_SKINS) {
      expect(skin.base.length).toBeGreaterThan(0);
      expect(skin.glow.length).toBeGreaterThan(0);
      for (const regionId of [...skin.base, ...skin.glow]) {
        const region = WORMATE_PARENT_REGIONS[regionId];
        expect(region, `missing sprite ${regionId} for parent skin ${skin.id}`).toBeDefined();
        expect(region.texture).toBe("skins");
        expect(region.w).toBeGreaterThan(0);
        expect(region.h).toBeGreaterThan(0);
      }
    }
    for (const wearable of [
      ...WORMATE_PARENT_EYES,
      ...WORMATE_PARENT_MOUTHS,
      ...WORMATE_PARENT_GLASSES,
      ...WORMATE_PARENT_HATS,
    ]) {
      for (const regionId of wearable.base) {
        expect(WORMATE_PARENT_REGIONS[regionId].texture).toBe("wear");
      }
    }
    for (const portion of WORMATE_PARENT_PORTIONS) {
      expect(WORMATE_PARENT_REGIONS[portion.base].texture).toBe("portions");
      expect(WORMATE_PARENT_REGIONS[portion.glow].texture).toBe("portions");
    }
    for (const ability of WORMATE_PARENT_ABILITIES) {
      expect(WORMATE_PARENT_REGIONS[ability.base].texture).toBe("abilities");
    }
  });

  it("matches every wearable, portion, and ability entry in the raw first-party registry", () => {
    const registry = JSON.parse(readFileSync(
      new URL("../public/assets/parent-wormate/registry.json", import.meta.url),
      "utf8",
    )) as Record<string, unknown>;
    const exactWearables = [
      ["eyesDict", WORMATE_PARENT_EYES],
      ["mouthDict", WORMATE_PARENT_MOUTHS],
      ["glassesDict", WORMATE_PARENT_GLASSES],
      ["hatDict", WORMATE_PARENT_HATS],
    ] as const;
    for (const [dictionaryName, catalog] of exactWearables) {
      const dictionary = registry[dictionaryName] as Record<
        string,
        { base: Array<{ region: string }> }
      >;
      expect(catalog).toHaveLength(Object.keys(dictionary).length);
      for (const item of catalog) {
        expect([...item.base]).toEqual(dictionary[String(item.id)].base.map((part) => part.region));
      }
    }
    const portions = registry.portionDict as Record<string, { base: string; glow: string }>;
    const abilities = registry.abilityDict as Record<string, { base: string }>;
    expect(WORMATE_PARENT_PORTIONS.map((item) => ({ ...item }))).toEqual(
      Object.entries(portions).map(([id, item]) => ({ id: Number(id), ...item })),
    );
    expect(WORMATE_PARENT_ABILITIES.map((item) => ({ ...item }))).toEqual(
      Object.entries(abilities).map(([id, item]) => ({ id: Number(id), ...item })),
    );
  });

  it("round-trips only registered parent theme IDs through the existing cosmetic slot", () => {
    for (const skin of WORMATE_PARENT_SKINS) {
      const themeId = wormateParentThemeId(skin.id);
      expect(isWormateParentThemeId(themeId)).toBe(true);
      expect(wormateParentSkinIdFromThemeId(themeId)).toBe(skin.id);
      expect(isWormateParentSkinId(skin.id)).toBe(true);
      expect(getWormateParentSkin(skin.id).id).toBe(skin.id);
    }
    expect(DEFAULT_WORMATE_PARENT_SKIN_ID).toBe(32);
    const exactOutfit = {
      eyeId: WORMATE_PARENT_EYES.at(-1)!.id,
      mouthId: WORMATE_PARENT_MOUTHS.at(-1)!.id,
      glassesId: WORMATE_PARENT_GLASSES.at(-1)!.id,
      hatId: WORMATE_PARENT_HATS.at(-1)!.id,
    };
    const completeThemeId = wormateParentThemeId(DEFAULT_WORMATE_PARENT_SKIN_ID, exactOutfit);
    expect(wormateParentAppearanceFromThemeId(completeThemeId)).toEqual({
      skinId: DEFAULT_WORMATE_PARENT_SKIN_ID,
      outfit: exactOutfit,
    });
    expect(wormateParentAppearanceFromThemeId("wormate-parent-32")).toEqual({
      skinId: 32,
      outfit: DEFAULT_WORMATE_PARENT_OUTFIT,
    });
    expect(isWormateParentThemeId("wormate-parent-99999")).toBe(false);
    expect(isWormateParentThemeId("wormate-parent-032")).toBe(false);
    expect(isWormateParentThemeId("wormate-parent-32-private")).toBe(false);
    expect(isWormateParentThemeId("wormate-parent-32-e0-m0-g0-h99999")).toBe(false);
  });

  it("cycles exact body frames and tapers only the final three tail pieces", () => {
    const skin = getWormateParentSkin(0);
    const plan = createWormateParentSegmentPlan(skin.id, 8);
    expect(plan).toHaveLength(8);
    expect(plan.map((segment) => segment.baseRegionId)).toEqual(
      Array.from({ length: 8 }, (_, index) => skin.base[index % skin.base.length]),
    );
    expect(plan.map((segment) => segment.glowRegionId)).toEqual(
      Array.from({ length: 8 }, (_, index) => skin.glow[index % skin.glow.length]),
    );
    expect(plan.map((segment) => segment.radiusScale)).toEqual([1, 1, 1, 1, 1, 0.97, 0.88, 0.72]);
  });

  it("assigns deterministic valid parent bodies to non-local crew", () => {
    expect(wormateParentSkinForIdentity(7)).toBe(wormateParentSkinForIdentity(7));
    expect(isWormateParentSkinId(wormateParentSkinForIdentity(-9))).toBe(true);
    expect(isWormateParentSkinId(wormateParentSkinForIdentity(Number.NaN))).toBe(true);
    const outfit = wormateParentOutfitForIdentity(7);
    expect(isWormateParentEyeId(outfit.eyeId)).toBe(true);
    expect(isWormateParentMouthId(outfit.mouthId)).toBe(true);
    expect(isWormateParentGlassesId(outfit.glassesId)).toBe(true);
    expect(isWormateParentHatId(outfit.hatId)).toBe(true);
  });
});
