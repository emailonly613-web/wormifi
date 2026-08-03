/**
 * Player-controlled camera zoom (mouse wheel / trackpad pinch), owner order
 * 2026-08-03.
 *
 * This is a graphics preference, not gameplay state: it changes how THIS
 * device frames the arena and never travels to the server. Reads go through a
 * module cache exactly like renderPreferences so both arena render loops can
 * read it once per frame; wheel handlers write through this module so the
 * cache and the frame agree the same instant the wheel moves.
 *
 * Fairness/network safety ceiling: the wheel can never out-see the server. The
 * final zoom is floored in getArenaCameraZoom so the visible world radius
 * stays inside MAX_VISIBLE_WORLD_RADIUS, which the server's interest radius
 * covers with margin — zooming out all the way never shows pop-in at the
 * edges and never reveals worms the server would not have sent anyway.
 */

export const USER_CAMERA_ZOOM_MIN = 0.72;
export const USER_CAMERA_ZOOM_MAX = 1.45;
export const DEFAULT_USER_CAMERA_ZOOM = 1;

/** Multiplicative wheel response: one 100-unit notch scales zoom by 0.9. */
const WHEEL_NOTCH_SCALE = 0.9;
const WHEEL_MAX_DELTA_PER_EVENT = 480;

/**
 * Presentation easing half-life. Zoom targets step instantly (wheel notches,
 * mass growth, relic activation); the presented zoom glides through them so
 * the board scales smoothly instead of snapping.
 */
export const ZOOM_RESPONSE_HALF_LIFE_SECONDS = 0.16;

export const USER_CAMERA_ZOOM_STORAGE_KEY = "wormifi.camera-zoom.v1";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function browserStorage(): StorageLike | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

/** Invalid input falls back to the neutral zoom, never to a blank frame. */
export function normalizeUserCameraZoom(value: unknown): number {
  const numeric = typeof value === "string" ? Number.parseFloat(value) : value;
  if (typeof numeric !== "number" || !Number.isFinite(numeric) || numeric <= 0) {
    return DEFAULT_USER_CAMERA_ZOOM;
  }
  return clamp(numeric, USER_CAMERA_ZOOM_MIN, USER_CAMERA_ZOOM_MAX);
}

let cachedUserCameraZoom: number | undefined;

export function getUserCameraZoom(storage: StorageLike | undefined = browserStorage()): number {
  if (cachedUserCameraZoom !== undefined) return cachedUserCameraZoom;
  let stored: string | null = null;
  try {
    stored = storage?.getItem(USER_CAMERA_ZOOM_STORAGE_KEY) ?? null;
  } catch {
    stored = null;
  }
  cachedUserCameraZoom = normalizeUserCameraZoom(stored ?? DEFAULT_USER_CAMERA_ZOOM);
  return cachedUserCameraZoom;
}

export function setUserCameraZoom(
  value: unknown,
  storage: StorageLike | undefined = browserStorage(),
): number {
  const zoom = normalizeUserCameraZoom(value);
  cachedUserCameraZoom = zoom;
  try {
    storage?.setItem(USER_CAMERA_ZOOM_STORAGE_KEY, String(zoom));
  } catch {
    // Preference persistence is best-effort; the session keeps the cache.
  }
  return zoom;
}

export function resetUserCameraZoomCacheForTests(): void {
  cachedUserCameraZoom = undefined;
}

/**
 * Applies one wheel event to the current zoom. Scrolling down (positive
 * deltaY) zooms out, matching the genre convention. Huge deltas from inertial
 * trackpads are capped so one flick cannot jump the whole range.
 */
export function applyWheelZoom(current: number, deltaY: number): number {
  const base = normalizeUserCameraZoom(current);
  if (!Number.isFinite(deltaY) || deltaY === 0) return base;
  const capped = clamp(deltaY, -WHEEL_MAX_DELTA_PER_EVENT, WHEEL_MAX_DELTA_PER_EVENT);
  return clamp(
    base * Math.pow(WHEEL_NOTCH_SCALE, capped / 100),
    USER_CAMERA_ZOOM_MIN,
    USER_CAMERA_ZOOM_MAX,
  );
}

export interface ZoomMotionState {
  value: number;
  initialized: boolean;
  lastFrameAtMs?: number;
}

export function createZoomMotionState(): ZoomMotionState {
  return { value: DEFAULT_USER_CAMERA_ZOOM, initialized: false };
}

/**
 * Advances the presented zoom one frame toward the target, in real time so
 * the glide feels identical at 30 Hz and 144 Hz. An invalid target holds the
 * last trustworthy zoom instead of collapsing the view.
 */
export function advanceZoomMotion(
  zoomMotion: ZoomMotionState,
  target: number,
  frameAtMs: number,
): number {
  const previousFrameAtMs = zoomMotion.lastFrameAtMs;
  zoomMotion.lastFrameAtMs = frameAtMs;
  if (!Number.isFinite(target) || target <= 0) return zoomMotion.value;
  if (
    !zoomMotion.initialized ||
    !Number.isFinite(zoomMotion.value) ||
    zoomMotion.value <= 0 ||
    previousFrameAtMs === undefined ||
    !Number.isFinite(previousFrameAtMs)
  ) {
    zoomMotion.value = target;
    zoomMotion.initialized = true;
    return zoomMotion.value;
  }
  const deltaSeconds = Math.max(0, Math.min(0.25, (frameAtMs - previousFrameAtMs) / 1_000));
  const response = 1 - Math.pow(0.5, deltaSeconds / ZOOM_RESPONSE_HALF_LIFE_SECONDS);
  zoomMotion.value += (target - zoomMotion.value) * response;
  return zoomMotion.value;
}
