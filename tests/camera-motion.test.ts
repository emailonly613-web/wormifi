import { describe, expect, it } from "vitest";

import {
  CAMERA_TELEPORT_SNAP_DISTANCE,
  advanceCameraMotion,
  createCameraMotionState,
  pointerSteeringDirection,
} from "../src/game/cameraMotion";

function followForOneSecond(frameRate: number) {
  const camera = createCameraMotionState({ x: 0, y: 0 }, 0);
  for (let frame = 1; frame <= frameRate; frame += 1) {
    advanceCameraMotion(camera, { x: 100, y: -50 }, (frame * 1_000) / frameRate);
  }
  return camera.position;
}

describe("frame-rate-independent camera motion", () => {
  it("lands on the same framing at 30, 60, and 120 FPS", () => {
    const thirty = followForOneSecond(30);
    const sixty = followForOneSecond(60);
    const oneTwenty = followForOneSecond(120);

    expect(thirty.x).toBeCloseTo(sixty.x, 8);
    expect(thirty.y).toBeCloseTo(sixty.y, 8);
    expect(oneTwenty.x).toBeCloseTo(sixty.x, 8);
    expect(oneTwenty.y).toBeCloseTo(sixty.y, 8);
  });

  it("holds the last trustworthy frame when the player is temporarily absent", () => {
    const camera = createCameraMotionState({ x: 84, y: -31 }, 100);
    advanceCameraMotion(camera, undefined, 1_100);

    expect(camera.position).toEqual({ x: 84, y: -31 });
    expect(camera.lastFrameAtMs).toBe(1_100);
  });

  it("snaps to first spawn and authoritative respawn discontinuities", () => {
    const firstSpawn = createCameraMotionState();
    advanceCameraMotion(firstSpawn, { x: 700, y: -500 }, 20);
    expect(firstSpawn.position).toEqual({ x: 700, y: -500 });

    const respawn = createCameraMotionState({ x: 10, y: 20 }, 20);
    advanceCameraMotion(
      respawn,
      { x: 10 + CAMERA_TELEPORT_SNAP_DISTANCE, y: 20 },
      36,
    );
    expect(respawn.position).toEqual({
      x: 10 + CAMERA_TELEPORT_SNAP_DISTANCE,
      y: 20,
    });
  });
});

describe("camera-faithful pointer steering", () => {
  it("aims from the rendered head while the camera is catching up", () => {
    const direction = pointerSteeringDirection(
      { x: 540, y: 400 },
      { width: 1_000, height: 600 },
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      2,
      8,
    );

    // The head is actually painted at (540, 300), so this pointer is straight
    // down from the creature even though it is diagonal from screen center.
    expect(direction?.x).toBeCloseTo(0, 10);
    expect(direction?.y).toBeCloseTo(1, 10);
  });

  it("keeps the dead zone centered on the visible head", () => {
    expect(pointerSteeringDirection(
      { x: 539, y: 303 },
      { width: 1_000, height: 600 },
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      2,
      8,
    )).toBeUndefined();
  });
});
