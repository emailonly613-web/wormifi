import type { Vec2 } from "./types";

/**
 * Projects a point into the playable circular arena. The operation mutates the
 * supplied point so the deterministic simulation can enforce the invariant
 * without allocating one object per body segment per tick.
 */
export function confinePointToArenaCircle(point: Vec2, maximumCenterRadius: number): boolean {
  const safeRadius = Number.isFinite(maximumCenterRadius)
    ? Math.max(0, maximumCenterRadius)
    : 0;
  const distanceSquared = point.x * point.x + point.y * point.y;
  if (Number.isFinite(distanceSquared) && distanceSquared <= safeRadius * safeRadius) return false;
  if (!Number.isFinite(distanceSquared) || distanceSquared <= 0 || safeRadius === 0) {
    point.x = 0;
    point.y = 0;
    return true;
  }
  const scale = safeRadius / Math.sqrt(distanceSquared);
  point.x *= scale;
  point.y *= scale;
  return true;
}

export function pointFitsArenaCircle(point: Readonly<Vec2>, maximumCenterRadius: number): boolean {
  if (
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y) ||
    !Number.isFinite(maximumCenterRadius) ||
    maximumCenterRadius < 0
  ) return false;
  return point.x * point.x + point.y * point.y <= maximumCenterRadius * maximumCenterRadius + 1e-7;
}

interface ArenaClipContext {
  beginPath(): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void;
  clip(): void;
}

/** Canvas defense in depth: stale or malformed snapshots cannot paint a worm through the wall. */
export function clipCanvasToArenaCircle(
  context: ArenaClipContext,
  center: Readonly<Vec2>,
  radius: number,
): void {
  if (
    !Number.isFinite(center.x) ||
    !Number.isFinite(center.y) ||
    !Number.isFinite(radius) ||
    radius <= 0
  ) return;
  context.beginPath();
  context.arc(center.x, center.y, radius, 0, Math.PI * 2);
  context.clip();
}

/**
 * Fast annulus/viewport test shared by local and authoritative renderers. The
 * generous paint spread includes guardian silhouettes, glow, shake, and soft
 * canvas-shadow tails, so visual culling can never hide a visible wall.
 */
export function arenaBoundaryIntersectsViewport(
  center: Readonly<Vec2>,
  radius: number,
  lineWidth: number,
  shadowBlur: number,
  width: number,
  height: number,
): boolean {
  const clampCoordinate = (value: number, minimum: number, maximum: number) =>
    Math.max(minimum, Math.min(maximum, value));
  const paintSpread = lineWidth / 2 + Math.max(160, shadowBlur * 3 + Math.SQRT2 * 9);
  const innerRadius = Math.max(0, radius - paintSpread);
  const outerRadius = radius + paintSpread;
  const closestX = clampCoordinate(center.x, 0, width);
  const closestY = clampCoordinate(center.y, 0, height);
  const closestDeltaX = center.x - closestX;
  const closestDeltaY = center.y - closestY;
  const minimumDistanceSquared = closestDeltaX ** 2 + closestDeltaY ** 2;
  const farthestDeltaX = Math.max(Math.abs(center.x), Math.abs(center.x - width));
  const farthestDeltaY = Math.max(Math.abs(center.y), Math.abs(center.y - height));
  const maximumDistanceSquared = farthestDeltaX ** 2 + farthestDeltaY ** 2;
  return minimumDistanceSquared <= outerRadius ** 2 &&
    (innerRadius === 0 || maximumDistanceSquared >= innerRadius ** 2);
}
