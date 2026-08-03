import { describe, expect, it } from "vitest";

import {
  ARENA_CAMERA_BASE_ZOOM_SCALE,
  LIVE_SPATIAL_PROFILE,
  MAX_VISIBLE_WORLD_RADIUS,
  RECOMMENDED_PLAYER_INTEREST_RADIUS,
  estimateVisibleFieldComposition,
  getArenaCameraVisibleRadius,
  getArenaCameraZoom,
} from "../src/game/spatialFeel";
import {
  USER_CAMERA_ZOOM_MAX,
  USER_CAMERA_ZOOM_MIN,
} from "../src/game/cameraZoomControl";

/** The pre-2026-08-03 board, kept as the yardstick for the owner's order. */
const LEGACY_ARENA_RADIUS = 1_450;

describe("spacious open-zone spatial framing (owner order 2026-08-03)", () => {
  it("gives the default board 2-3x the legacy area with the same population", () => {
    const areaRatio =
      (LIVE_SPATIAL_PROFILE.arenaRadius / LEGACY_ARENA_RADIUS) ** 2;
    expect(areaRatio).toBeGreaterThanOrEqual(2);
    expect(areaRatio).toBeLessThanOrEqual(3);
    expect(LIVE_SPATIAL_PROFILE.targetPopulation).toBe(32);
  });

  it("keeps the launch profile coupled to a broad but inhabited desktop view", () => {
    const zoom = getArenaCameraZoom(1_280, 720, 48, undefined, 0);
    const composition = estimateVisibleFieldComposition(
      1_280,
      720,
      LIVE_SPATIAL_PROFILE.targetPopulation,
      LIVE_SPATIAL_PROFILE.targetDropCount,
      LIVE_SPATIAL_PROFILE.arenaRadius,
      zoom,
    );

    expect(ARENA_CAMERA_BASE_ZOOM_SCALE).toBe(1.26);
    expect(zoom).toBeCloseTo(1.1936842105, 8);
    // Spacious, not barren: about two rivals and a steady treasure field in
    // frame at spawn mass — roomier than the legacy 3-4-creature crowd.
    expect(composition.creaturesIncludingSelf).toBeGreaterThanOrEqual(1.9);
    expect(composition.creaturesIncludingSelf).toBeLessThanOrEqual(2.6);
    expect(composition.pickups).toBeGreaterThanOrEqual(32);
    expect(composition.pickups).toBeLessThanOrEqual(46);
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

    expect(ordinaryZoom).toBeCloseTo(0.8568, 10);
    expect(spyglassZoom).toBeCloseTo(ordinaryZoom * 0.8, 10);
    expect(spyglassRadius).toBeCloseTo(ordinaryRadius * 1.25, 10);
  });

  it("scales the view by the player wheel zoom inside its clamp range", () => {
    const neutral = getArenaCameraZoom(1_280, 720, 48, undefined, 0);
    const zoomedIn = getArenaCameraZoom(1_280, 720, 48, undefined, 0, USER_CAMERA_ZOOM_MAX);
    const zoomedOut = getArenaCameraZoom(1_280, 720, 48, undefined, 0, USER_CAMERA_ZOOM_MIN);
    expect(zoomedIn).toBeCloseTo(neutral * USER_CAMERA_ZOOM_MAX, 10);
    expect(zoomedOut).toBeCloseTo(neutral * USER_CAMERA_ZOOM_MIN, 10);
    // A corrupt preference degrades to neutral, never to a blank frame.
    expect(getArenaCameraZoom(1_280, 720, 48, undefined, 0, Number.NaN)).toBe(neutral);
    expect(getArenaCameraZoom(1_280, 720, 48, undefined, 0, -3)).toBe(neutral);
  });

  it("never lets any zoom stack out-see the server interest radius", () => {
    // The pair that keeps zoom-out honest: the camera ceiling sits inside the
    // server's default interest radius with margin, so a fully zoomed-out
    // player never watches rivals pop in at the screen edge.
    expect(MAX_VISIBLE_WORLD_RADIUS + 100).toBeLessThanOrEqual(
      RECOMMENDED_PLAYER_INTEREST_RADIUS,
    );

    const spyglass = {
      kind: "collector" as const,
      relicKind: "emerald-spyglass" as const,
      activatedAtTick: 1,
      expiresAtTick: 20,
      durationTicks: 19,
    };
    const viewports = [
      [390, 844], [844, 390], [1_280, 720], [1_920, 1_080],
      [2_560, 1_440], [3_440, 1_440], [5_120, 2_880],
    ] as const;
    const masses = [0, 48, 500, 3_000, 100_000];
    const userZooms = [USER_CAMERA_ZOOM_MIN, 1, USER_CAMERA_ZOOM_MAX];
    for (const [width, height] of viewports) {
      for (const mass of masses) {
        for (const relic of [undefined, spyglass]) {
          for (const userZoom of userZooms) {
            const radius = getArenaCameraVisibleRadius(
              width, height, mass, relic, 10, userZoom,
            );
            expect(radius, `${width}x${height} mass=${mass} user=${userZoom}`)
              .toBeLessThanOrEqual(MAX_VISIBLE_WORLD_RADIUS + 1e-9);
          }
        }
      }
    }
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
