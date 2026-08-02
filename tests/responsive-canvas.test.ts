import { describe, expect, it } from "vitest";
import {
  ARENA_CANVAS_CONTEXT_OPTIONS,
  arenaBackingScale,
  screenLayerBackingScale,
} from "../src/game/treasureRender";
import { arenaBoundaryIntersectsViewport } from "../src/components/ArenaCanvas";

describe("responsive canvas backing resolution", () => {
  it("uses an opaque low-latency arena context without changing CSS geometry", () => {
    expect(ARENA_CANVAS_CONTEXT_OPTIONS).toEqual({
      alpha: false,
      desynchronized: true,
    });
  });

  it("preserves crisp mobile rendering while capping extreme device density", () => {
    expect(arenaBackingScale(390, 844, 3)).toBe(1.75);
    expect(arenaBackingScale(430, 932, 1)).toBe(1);
  });

  it("scales large desktop backing stores without changing CSS geometry", () => {
    expect(arenaBackingScale(1_920, 1_080, 2, 500)).toBeCloseTo(1.4875);
    expect(arenaBackingScale(1_920, 1_080, 2, 1_000)).toBeCloseTo(0.875);
  });

  it("builds cached screen layers at the final crowded backing scale", () => {
    expect(screenLayerBackingScale(0.68)).toBe(0.68);
    expect(screenLayerBackingScale(0.85)).toBe(0.85);
    expect(screenLayerBackingScale(1.75)).toBe(1.75);
    expect(screenLayerBackingScale(3)).toBe(2);
    expect(screenLayerBackingScale(Number.NaN)).toBe(1);
  });

  it("culls only arena-boundary annuli that cannot paint into the viewport", () => {
    expect(arenaBoundaryIntersectsViewport(
      { x: 720, y: 450 }, 3_000, 48, 26, 1_440, 900,
    )).toBe(false);
    expect(arenaBoundaryIntersectsViewport(
      { x: 3_000, y: 450 }, 200, 48, 26, 1_440, 900,
    )).toBe(false);
    expect(arenaBoundaryIntersectsViewport(
      { x: 720, y: 450 }, 500, 48, 26, 1_440, 900,
    )).toBe(true);
    expect(arenaBoundaryIntersectsViewport(
      { x: -100, y: 450 }, 200, 48, 26, 1_440, 900,
    )).toBe(true);
  });
});
