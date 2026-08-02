import { describe, expect, it } from "vitest";
import {
  ARENA_VISUAL_THEME_CATALOG,
  DEFAULT_WORLD_COSMETICS,
  PICKUP_THEME_CATALOG,
  WORLD_COSMETIC_BUNDLES,
  WORLD_COSMETICS_STORAGE_KEY,
  equipWorldCosmeticBundle,
  normalizeWorldCosmetics,
  readWorldCosmetics,
  selectArenaVisualTheme,
  selectPickupTheme,
  writeWorldCosmetics,
} from "../src/game/worldCosmetics";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("world cosmetics", () => {
  it("defines independent pickup and arena layers plus coordinated bundles", () => {
    expect(PICKUP_THEME_CATALOG.map((theme) => theme.id)).toEqual([
      "parent-sweet-feast",
      "pirate-hoard",
      "mixed-bounty",
    ]);
    expect(ARENA_VISUAL_THEME_CATALOG).toHaveLength(4);
    expect(WORLD_COSMETIC_BUNDLES).toHaveLength(4);
  });

  it("fails malformed saved values closed to the exact-parent default", () => {
    expect(normalizeWorldCosmetics({ pickupThemeId: "speed-food", arenaThemeId: "tiny-board" }, 12)).toEqual({
      ...DEFAULT_WORLD_COSMETICS,
      updatedAtMs: 12,
    });
  });

  it("selects layers independently and equips a complete set without gameplay fields", () => {
    const treasure = selectPickupTheme(normalizeWorldCosmetics(DEFAULT_WORLD_COSMETICS, 1), "pirate-hoard", 2);
    expect(treasure).toMatchObject({ pickupThemeId: "pirate-hoard", arenaThemeId: "midnight-chart" });
    const volcanic = selectArenaVisualTheme(treasure, "volcanic-vault", 3);
    expect(volcanic).toMatchObject({ pickupThemeId: "pirate-hoard", arenaThemeId: "volcanic-vault" });
    const kraken = equipWorldCosmeticBundle(volcanic, WORLD_COSMETIC_BUNDLES[2], 4);
    expect(kraken).toEqual({ pickupThemeId: "mixed-bounty", arenaThemeId: "emerald-depths", updatedAtMs: 4 });
    expect(Object.keys(kraken)).not.toContain("speed");
    expect(Object.keys(kraken)).not.toContain("arenaRadius");
  });

  it("round-trips only the cosmetic selection in browser storage", () => {
    const storage = memoryStorage();
    const selected = equipWorldCosmeticBundle(
      normalizeWorldCosmetics(DEFAULT_WORLD_COSMETICS, 1),
      WORLD_COSMETIC_BUNDLES[0],
      20,
    );
    writeWorldCosmetics(selected, storage);
    expect(storage.getItem(WORLD_COSMETICS_STORAGE_KEY)).not.toBeNull();
    expect(readWorldCosmetics(storage)).toEqual(selected);
  });
});
