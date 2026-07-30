import { describe, expect, it } from "vitest";

import {
  ARENA_CAMERA_BASE_ZOOM_SCALE,
  LIVE_SPATIAL_PROFILE,
  estimateVisibleFieldComposition,
  getArenaCameraVisibleRadius,
  getArenaCameraZoom,
} from "../src/game/spatialFeel";

describe("inhabited open-zone spatial framing", () => {
  it("keeps the launch profile coupled to a broad but populated desktop view", () => {
    const zoom = getArenaCameraZoom(1_280, 720, 48, undefined, 0);
    const composition = estimateVisibleFieldComposition(
      1_280,
      720,
      LIVE_SPATIAL_PROFILE.targetPopulation,
      LIVE_SPATIAL_PROFILE.targetDropCount,
      LIVE_SPATIAL_PROFILE.arenaRadius,
      zoom,
    );

    expect(ARENA_CAMERA_BASE_ZOOM_SCALE).toBe(1.45);
    expect(zoom).toBeCloseTo(1.3736842105, 8);
    expect(composition.creaturesIncludingSelf).toBeGreaterThanOrEqual(3);
    expect(composition.creaturesIncludingSelf).toBeLessThanOrEqual(4);
    expect(composition.pickups).toBeGreaterThanOrEqual(40);
    expect(composition.pickups).toBeLessThanOrEqual(50);
  });

  it("uses the same framing on a landscape phone and expands it by exactly 25% for Spyglass", () => {
    const ordinaryZoom = getArenaCameraZoom(844, 390, 48, undefined, 10);
    const spyglass = {
      kind: "collector" as const,
      relicKind: "emerald-spyglass" as const,
      activatedAtTick: 1,
      expiresAtTick: 20,
      durationTicks: 19,
    };
    const spyglassZoom = getArenaCameraZoom(844, 390, 48, spyglass, 10);
    const ordinaryRadius = getArenaCameraVisibleRadius(844, 390, 48, undefined, 10);
    const spyglassRadius = getArenaCameraVisibleRadius(844, 390, 48, spyglass, 10);

    expect(ordinaryZoom).toBeCloseTo(0.986, 10);
    expect(spyglassZoom).toBeCloseTo(ordinaryZoom * 0.8, 10);
    expect(spyglassRadius).toBeCloseTo(ordinaryRadius * 1.25, 10);
  });

  it("fails closed for invalid framing inputs", () => {
    expect(getArenaCameraZoom(0, 720, 48, undefined, 0)).toBe(0);
    expect(getArenaCameraVisibleRadius(390, 844, 48, undefined, -1)).toBe(0);
    expect(estimateVisibleFieldComposition(1, 1, 0, 1, 1, 1)).toEqual({
      creaturesIncludingSelf: 0,
      pickups: 0,
    });
  });
});
