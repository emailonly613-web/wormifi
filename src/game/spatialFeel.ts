import { getCameraZoomMultiplier } from "./relics";
import type { ActiveSpecialist } from "./types";

/**
 * One shared launch profile for the inhabited, readable live-arena composition.
 * The values are deliberately coupled: changing only one can make the arena
 * empty, visually noisy, or too expensive to render.
 */
export const LIVE_SPATIAL_PROFILE = Object.freeze({
  targetPopulation: 32,
  targetDropCount: 600,
  maximumDropRefillDeficit: 48,
  arenaRadius: 1_450,
});

export const ARENA_CAMERA_BASE_ZOOM_SCALE = 1.45;
export const ARENA_CAMERA_MIN_VIEWPORT_SCALE = 0.68;
export const ARENA_CAMERA_MAX_VIEWPORT_SCALE = 1.12;
export const ARENA_CAMERA_MASS_ZOOM_FLOOR = 0.67;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export function getArenaCameraZoom(
  width: number,
  height: number,
  mass: number,
  activeRelic: ActiveSpecialist | undefined,
  tick: number,
): number {
  if (
    !Number.isFinite(width) || width <= 0 ||
    !Number.isFinite(height) || height <= 0 ||
    !Number.isFinite(mass) || mass < 0 ||
    !Number.isSafeInteger(tick) || tick < 0
  ) return 0;
  const viewportZoom = clamp(
    Math.min(width, height) / 760,
    ARENA_CAMERA_MIN_VIEWPORT_SCALE,
    ARENA_CAMERA_MAX_VIEWPORT_SCALE,
  ) * ARENA_CAMERA_BASE_ZOOM_SCALE;
  const massZoom = clamp(
    1 - Math.max(0, mass - 100) / 2_800,
    ARENA_CAMERA_MASS_ZOOM_FLOOR,
    1,
  );
  return viewportZoom * massZoom * getCameraZoomMultiplier(activeRelic, tick);
}

/** Radius of the smallest circle that contains the current camera rectangle. */
export function getArenaCameraVisibleRadius(
  width: number,
  height: number,
  mass: number,
  activeRelic: ActiveSpecialist | undefined,
  tick: number,
): number {
  const zoom = getArenaCameraZoom(width, height, mass, activeRelic, tick);
  return zoom > 0 ? Math.hypot(width, height) / (2 * zoom) : 0;
}

/**
 * Uniform-distribution composition estimate used only as a regression metric.
 * It is not runtime matchmaking logic and never manufactures nearby rivals.
 */
export function estimateVisibleFieldComposition(
  width: number,
  height: number,
  population: number,
  dropCount: number,
  arenaRadius: number,
  zoom: number,
): { creaturesIncludingSelf: number; pickups: number } {
  if (
    !Number.isFinite(width) || width <= 0 ||
    !Number.isFinite(height) || height <= 0 ||
    !Number.isSafeInteger(population) || population < 1 ||
    !Number.isSafeInteger(dropCount) || dropCount < 0 ||
    !Number.isFinite(arenaRadius) || arenaRadius <= 0 ||
    !Number.isFinite(zoom) || zoom <= 0
  ) return { creaturesIncludingSelf: 0, pickups: 0 };
  const visibleWorldArea = width / zoom * (height / zoom);
  const arenaArea = Math.PI * arenaRadius * arenaRadius;
  const visibleFraction = Math.min(1, visibleWorldArea / arenaArea);
  return {
    creaturesIncludingSelf: 1 + (population - 1) * visibleFraction,
    pickups: dropCount * visibleFraction,
  };
}
