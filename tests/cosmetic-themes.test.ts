import { describe, expect, it } from "vitest";
import {
  COSMETIC_THEME_CATALOG,
  DEFAULT_COSMETIC_THEME_ID,
  cosmeticThemeHeadHue,
  getCosmeticTheme,
  isCosmeticTheme,
  isCosmeticThemeId,
} from "../src/game/cosmeticThemes";
import {
  COSMETIC_THEME_CATALOG as PHOTO_SKIN_COSMETIC_THEME_CATALOG,
  PHOTO_SKIN_THEMES,
  createDefaultPhotoSkinState,
  getPhotoSkinTheme,
} from "../src/game/photoSkin";

describe("public-safe authored cosmetic themes", () => {
  it("keeps the original free nine stable, adds candy colorways, and preserves the founder trio", () => {
    expect(DEFAULT_COSMETIC_THEME_ID).toBe("tideglass-corsair");
    // The free nine are position-stable forever; a change here means a free
    // theme was renamed, removed, or walled off.
    expect(COSMETIC_THEME_CATALOG.slice(0, 9).map((theme) => theme.id)).toEqual([
      "tideglass-corsair",
      "sunken-crown",
      "coral-signal",
      "emerald-privateer",
      "ruby-raider",
      "pearl-wraith",
      "pepper-flare",
      "storm-cannon",
      "vortex-oracle",
    ]);
    expect(COSMETIC_THEME_CATALOG.slice(9, 14).map((theme) => theme.id)).toEqual([
      "gumball-armada",
      "gumball-berry",
      "gumball-ocean",
      "gumball-citrus",
      "prism-plume",
    ]);
    expect(COSMETIC_THEME_CATALOG.filter((theme) => "premium" in theme).map((theme) => theme.id)).toEqual([
      "krakens-ink",
      "phoenix-wake",
      "leviathan-scale",
    ]);
    expect(new Set(COSMETIC_THEME_CATALOG.map((theme) => theme.palette.join("|"))).size)
      .toBe(COSMETIC_THEME_CATALOG.length);
    expect(cosmeticThemeHeadHue(getCosmeticTheme("gumball-ocean"))).toBe(175);
    expect(cosmeticThemeHeadHue(getCosmeticTheme("tideglass-corsair"))).toBe(0);
    expect(isCosmeticThemeId("sunken-crown")).toBe(true);
    expect(isCosmeticThemeId("wormate-parent-32")).toBe(true);
    expect(isCosmeticThemeId("wormate-parent-99999")).toBe(false);
    expect(isCosmeticThemeId("data:image/webp;base64,private")).toBe(false);
    expect(isCosmeticThemeId("ghost-theme")).toBe(false);
    expect(getCosmeticTheme("ghost-theme").id).toBe(DEFAULT_COSMETIC_THEME_ID);
    expect(isCosmeticTheme(COSMETIC_THEME_CATALOG[1])).toBe(true);
  });

  it("keeps every existing Photo Skin theme import working from the shared catalog", () => {
    expect(PHOTO_SKIN_THEMES).toBe(COSMETIC_THEME_CATALOG);
    expect(PHOTO_SKIN_COSMETIC_THEME_CATALOG).toBe(COSMETIC_THEME_CATALOG);
    expect(getPhotoSkinTheme("coral-signal")).toBe(getCosmeticTheme("coral-signal"));
    // The default body is seeded from the catalog, so pin the properties that
    // matter rather than one id: it is always a valid theme the server will
    // accept, it is stable for a given seed, and different captains differ.
    const seeded = createDefaultPhotoSkinState(1).themeId;
    expect(isCosmeticThemeId(seeded)).toBe(true);
    expect(createDefaultPhotoSkinState(1).themeId).toBe(seeded);
    expect(createDefaultPhotoSkinState(2).themeId).not.toBe(seeded);
    expect(createDefaultPhotoSkinState(1).faceThemeId).toBe("wormate-parent-32");
  });
});
