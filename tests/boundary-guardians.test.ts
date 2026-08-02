import { describe, expect, it } from "vitest";
import {
  BOUNDARY_GUARDIAN_CATALOG,
  getBoundaryGuardianLayout,
  getBoundaryGuardianSpec,
} from "../src/game/boundaryGuardians";
import { ARENA_VISUAL_THEME_CATALOG } from "../src/game/worldCosmetics";

describe("living moat boundary guardians", () => {
  it("gives every arena visual skin one named guardian roster", () => {
    expect(BOUNDARY_GUARDIAN_CATALOG).toHaveLength(ARENA_VISUAL_THEME_CATALOG.length);
    expect(new Set(BOUNDARY_GUARDIAN_CATALOG.map((entry) => entry.themeId)).size)
      .toBe(ARENA_VISUAL_THEME_CATALOG.length);
    for (const theme of ARENA_VISUAL_THEME_CATALOG) {
      const guardian = getBoundaryGuardianSpec(theme.id);
      expect(guardian.themeId).toBe(theme.id);
      expect(guardian.label).toMatch(/MOAT/u);
      expect(guardian.roster.length).toBeGreaterThan(20);
    }
  });

  it("keeps every guardian slot strictly outside the playable boundary", () => {
    const radius = 620;
    const slots = getBoundaryGuardianLayout(radius, 0.72, 14_000, false);
    expect(slots.length).toBeGreaterThanOrEqual(12);
    expect(slots.length).toBeLessThanOrEqual(36);
    expect(slots.every((slot) => slot.radialDistance > radius)).toBe(true);
    expect(slots.some((slot) => slot.apex)).toBe(true);
  });

  it("freezes patrol motion for reduced-motion players", () => {
    expect(getBoundaryGuardianLayout(620, 0.72, 0, true))
      .toEqual(getBoundaryGuardianLayout(620, 0.72, 99_000, true));
  });
});
