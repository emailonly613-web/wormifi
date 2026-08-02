import type { Vec2 } from "./types";

/**
 * Camera response is expressed in real time so identical play feels identical
 * on 30 Hz phones, 60 Hz laptops, and high-refresh desktop displays.
 */
export const CAMERA_RESPONSE_HALF_LIFE_SECONDS = 0.055;

/**
 * Ordinary sprinting cannot create a gap this large. Crossing it means the
 * authority respawned or teleported the player, so easing would show empty
 * water instead of the action.
 */
export const CAMERA_TELEPORT_SNAP_DISTANCE = 320;

export interface CameraMotionState {
  position: Vec2;
  initialized: boolean;
  lastFrameAtMs?: number;
}

export function createCameraMotionState(
  position: Readonly<Vec2> = { x: 0, y: 0 },
  frameAtMs?: number,
): CameraMotionState {
  return {
    position: { x: position.x, y: position.y },
    initialized: frameAtMs !== undefined,
    lastFrameAtMs: frameAtMs,
  };
}

export function snapCameraMotion(
  camera: CameraMotionState,
  target: Readonly<Vec2>,
  frameAtMs?: number,
): Vec2 {
  camera.position.x = target.x;
  camera.position.y = target.y;
  camera.initialized = true;
  camera.lastFrameAtMs = frameAtMs;
  return camera.position;
}

/**
 * Advances one presentation frame. An absent target deliberately holds the
 * last trustworthy view during reconnect and death gaps instead of drifting
 * toward world origin.
 */
export function advanceCameraMotion(
  camera: CameraMotionState,
  target: Readonly<Vec2> | undefined,
  frameAtMs: number,
): Vec2 {
  const previousFrameAtMs = camera.lastFrameAtMs;
  camera.lastFrameAtMs = frameAtMs;

  if (!target || !Number.isFinite(target.x) || !Number.isFinite(target.y)) {
    return camera.position;
  }

  if (
    !camera.initialized ||
    !Number.isFinite(camera.position.x) ||
    !Number.isFinite(camera.position.y) ||
    previousFrameAtMs === undefined ||
    !Number.isFinite(previousFrameAtMs)
  ) {
    return snapCameraMotion(camera, target, frameAtMs);
  }

  const offsetX = target.x - camera.position.x;
  const offsetY = target.y - camera.position.y;
  if (
    offsetX * offsetX + offsetY * offsetY >=
    CAMERA_TELEPORT_SNAP_DISTANCE * CAMERA_TELEPORT_SNAP_DISTANCE
  ) {
    return snapCameraMotion(camera, target, frameAtMs);
  }

  const deltaSeconds = Math.max(0, Math.min(0.25, (frameAtMs - previousFrameAtMs) / 1_000));
  const response = 1 - Math.pow(0.5, deltaSeconds / CAMERA_RESPONSE_HALF_LIFE_SECONDS);
  camera.position.x += offsetX * response;
  camera.position.y += offsetY * response;
  return camera.position;
}

/**
 * Converts a pointer location into a world steering direction from the
 * captain's rendered head. Camera damping intentionally lets the head trail
 * screen center by a few pixels, so steering from the viewport center would
 * quietly bend close pointer targets away from where the player aimed.
 */
export function pointerSteeringDirection(
  pointer: Readonly<Vec2>,
  viewport: Readonly<{ width: number; height: number }>,
  camera: Readonly<Vec2>,
  player: Readonly<Vec2> | undefined,
  zoom: number,
  deadZone: number,
): Vec2 | undefined {
  if (
    !Number.isFinite(pointer.x) ||
    !Number.isFinite(pointer.y) ||
    !Number.isFinite(viewport.width) ||
    !Number.isFinite(viewport.height) ||
    viewport.width <= 0 ||
    viewport.height <= 0 ||
    !Number.isFinite(camera.x) ||
    !Number.isFinite(camera.y) ||
    !Number.isFinite(zoom) ||
    zoom <= 0 ||
    !Number.isFinite(deadZone) ||
    deadZone < 0
  ) {
    return undefined;
  }

  const originX = viewport.width / 2 + ((player?.x ?? camera.x) - camera.x) * zoom;
  const originY = viewport.height / 2 + ((player?.y ?? camera.y) - camera.y) * zoom;
  const offsetX = pointer.x - originX;
  const offsetY = pointer.y - originY;
  const length = Math.hypot(offsetX, offsetY);
  if (!Number.isFinite(length) || length < deadZone || length <= Number.EPSILON) {
    return undefined;
  }
  return { x: offsetX / length, y: offsetY / length };
}
