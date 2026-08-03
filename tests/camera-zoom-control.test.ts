import { beforeEach, describe, expect, it } from "vitest";

import {
  DEFAULT_USER_CAMERA_ZOOM,
  USER_CAMERA_ZOOM_MAX,
  USER_CAMERA_ZOOM_MIN,
  USER_CAMERA_ZOOM_STORAGE_KEY,
  advanceZoomMotion,
  applyWheelZoom,
  createZoomMotionState,
  getUserCameraZoom,
  normalizeUserCameraZoom,
  resetUserCameraZoomCacheForTests,
  setUserCameraZoom,
} from "../src/game/cameraZoomControl";

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    dump: () => Object.fromEntries(map),
  };
}

beforeEach(() => resetUserCameraZoomCacheForTests());

describe("player wheel zoom preference", () => {
  it("normalizes garbage to the neutral zoom and clamps the rest", () => {
    expect(normalizeUserCameraZoom(undefined)).toBe(DEFAULT_USER_CAMERA_ZOOM);
    expect(normalizeUserCameraZoom("not a number")).toBe(DEFAULT_USER_CAMERA_ZOOM);
    expect(normalizeUserCameraZoom(Number.NaN)).toBe(DEFAULT_USER_CAMERA_ZOOM);
    expect(normalizeUserCameraZoom(-2)).toBe(DEFAULT_USER_CAMERA_ZOOM);
    expect(normalizeUserCameraZoom(0.01)).toBe(USER_CAMERA_ZOOM_MIN);
    expect(normalizeUserCameraZoom(99)).toBe(USER_CAMERA_ZOOM_MAX);
    expect(normalizeUserCameraZoom("1.2")).toBeCloseTo(1.2, 10);
  });

  it("zooms out on wheel-down, in on wheel-up, and clamps both ends", () => {
    const out = applyWheelZoom(1, 100);
    const back = applyWheelZoom(out, -100);
    expect(out).toBeCloseTo(0.9, 10);
    expect(back).toBeCloseTo(1, 10);

    let floor = 1;
    for (let index = 0; index < 60; index += 1) floor = applyWheelZoom(floor, 300);
    expect(floor).toBe(USER_CAMERA_ZOOM_MIN);
    let ceiling = 1;
    for (let index = 0; index < 60; index += 1) ceiling = applyWheelZoom(ceiling, -300);
    expect(ceiling).toBe(USER_CAMERA_ZOOM_MAX);
  });

  it("caps one inertial flick and ignores non-finite deltas", () => {
    // A 100,000-unit flick may not travel farther than the 480-unit cap.
    expect(applyWheelZoom(1, 100_000)).toBeCloseTo(applyWheelZoom(1, 480), 10);
    expect(applyWheelZoom(1, Number.NaN)).toBe(1);
    expect(applyWheelZoom(1, 0)).toBe(1);
  });

  it("persists through storage and survives a corrupt stored value", () => {
    const storage = memoryStorage();
    expect(setUserCameraZoom(0.8, storage)).toBeCloseTo(0.8, 10);
    expect(storage.dump()[USER_CAMERA_ZOOM_STORAGE_KEY]).toBe("0.8");

    resetUserCameraZoomCacheForTests();
    expect(getUserCameraZoom(storage)).toBeCloseTo(0.8, 10);

    resetUserCameraZoomCacheForTests();
    const corrupt = memoryStorage({ [USER_CAMERA_ZOOM_STORAGE_KEY]: "banana" });
    expect(getUserCameraZoom(corrupt)).toBe(DEFAULT_USER_CAMERA_ZOOM);
  });
});

describe("presented zoom easing", () => {
  it("snaps on the first frame, then glides toward the target", () => {
    const motion = createZoomMotionState();
    expect(advanceZoomMotion(motion, 1.2, 0)).toBe(1.2);
    const eased = advanceZoomMotion(motion, 0.9, 16);
    expect(eased).toBeGreaterThan(0.9);
    expect(eased).toBeLessThan(1.2);
  });

  it("is deterministic and frame-rate independent", () => {
    const at60 = createZoomMotionState();
    advanceZoomMotion(at60, 1, 0);
    const whole = advanceZoomMotion(at60, 0.8, 1_000 / 60);

    const at120 = createZoomMotionState();
    advanceZoomMotion(at120, 1, 0);
    advanceZoomMotion(at120, 0.8, 1_000 / 120);
    const halves = advanceZoomMotion(at120, 0.8, 1_000 / 60);

    expect(halves).toBeCloseTo(whole, 10);
  });

  it("holds the last trustworthy zoom through an invalid target", () => {
    const motion = createZoomMotionState();
    advanceZoomMotion(motion, 1.1, 0);
    expect(advanceZoomMotion(motion, Number.NaN, 16)).toBe(1.1);
    expect(advanceZoomMotion(motion, 0, 32)).toBe(1.1);
    expect(advanceZoomMotion(motion, -4, 48)).toBe(1.1);
  });
});
