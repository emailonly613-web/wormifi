/**
 * Pure canvas presentation for an already-prepared Photo Skin render plan.
 *
 * This module deliberately has no storage, decoding, network, room, or
 * protocol dependency. The caller owns the decoded image lifecycle and must
 * paint the authored worm theme first. Missing images therefore reveal that
 * authored theme instead of creating a blank or network-loaded body.
 */

import type {
  WormateParentOutfit,
  WormateParentSkinId,
} from "./wormateParentCatalog";

const MIN_PHOTOS = 2;
const MAX_PHOTOS = 6;
const EPSILON = 0.0001;
const PORTHOLE_OUTER_RADIUS_FACTOR = 0.72;
const PORTHOLE_INNER_RADIUS_FACTOR = 0.55;
const PORTHOLE_EDGE_INSET_FACTOR = 1.1;
const PORTHOLE_MINIMUM_SPACING_FACTOR = 3.1;

export interface PhotoSkinCanvasPoint {
  x: number;
  y: number;
}

export interface PhotoSkinCanvasPhoto {
  id: string;
  width: number;
  height: number;
  focalPoint: {
    x: number;
    y: number;
  };
}

/** Structurally compatible with PhotoSkinRenderPlan without importing it. */
export interface PhotoSkinCanvasRenderPlan {
  /** Exact parent atlas body selected through the shared cosmetic theme slot. */
  parentSkinId?: WormateParentSkinId;
  parentOutfit?: WormateParentOutfit;
  theme: {
    id?: string;
    palette: readonly string[];
    /** Authored material name; validated by the renderer before use. */
    pattern?: string;
  };
  faceTheme: {
    id?: string;
    palette: readonly string[];
    pattern?: string;
    headHue?: number;
  };
  faceMode?: "captain" | "features" | "eyes-only";
  eyeStyle?: "round" | "lookout" | "sleepy" | "jewel";
  expressionStyle?: "grin" | "determined" | "surprised" | "none";
  localPhotosEnabled: boolean;
  localPhotos: readonly PhotoSkinCanvasPhoto[];
}

/** Fully prepared local-only appearance passed into a canvas renderer. */
export interface PhotoSkinCanvasAppearance {
  renderPlan: PhotoSkinCanvasRenderPlan;
  decodedImages: ReadonlyMap<string, CanvasImageSource>;
}

export interface PhotoSkinCanvasPorthole {
  photoId: string;
  photoIndex: number;
  distance: number;
  center: PhotoSkinCanvasPoint;
  tangent: PhotoSkinCanvasPoint;
  outerRadius: number;
  innerRadius: number;
  sourceCrop: {
    sx: number;
    sy: number;
    sw: number;
    sh: number;
  };
}

export interface PhotoSkinCanvasOptions {
  points: readonly PhotoSkinCanvasPoint[];
  bodyRadius: number;
  /** Screen-space travel direction, used as the safe tangent fallback. */
  direction: PhotoSkinCanvasPoint;
  decodedImages: ReadonlyMap<string, CanvasImageSource>;
  renderPlan: PhotoSkinCanvasRenderPlan;
}

export interface PhotoSkinCanvasResult {
  mode: "portrait-portholes" | "authored-theme-only";
  renderedPhotoIds: readonly string[];
  unavailablePhotoIds: readonly string[];
  deferredPhotoIds: readonly string[];
  plannedPortholeCount: number;
  portholeCount: number;
}

interface PathSegment {
  from: PhotoSkinCanvasPoint;
  to: PhotoSkinCanvasPoint;
  startDistance: number;
  length: number;
  tangent: PhotoSkinCanvasPoint;
}

interface PathMetrics {
  points: readonly PhotoSkinCanvasPoint[];
  segments: readonly PathSegment[];
  totalLength: number;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.max(0, Math.min(1, value));
}

function finitePoint(point: PhotoSkinCanvasPoint): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function unitDirection(direction: PhotoSkinCanvasPoint): PhotoSkinCanvasPoint {
  const length = finitePoint(direction) ? Math.hypot(direction.x, direction.y) : 0;
  return length > EPSILON
    ? { x: direction.x / length, y: direction.y / length }
    : { x: 1, y: 0 };
}

function createPathMetrics(points: readonly PhotoSkinCanvasPoint[]): PathMetrics {
  const cleanPoints: PhotoSkinCanvasPoint[] = [];
  for (const point of points) {
    if (!finitePoint(point)) continue;
    const previous = cleanPoints.at(-1);
    if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) <= EPSILON) continue;
    cleanPoints.push({ x: point.x, y: point.y });
  }

  const segments: PathSegment[] = [];
  let totalLength = 0;
  for (let index = 1; index < cleanPoints.length; index += 1) {
    const from = cleanPoints[index - 1];
    const to = cleanPoints[index];
    const x = to.x - from.x;
    const y = to.y - from.y;
    const length = Math.hypot(x, y);
    segments.push({
      from,
      to,
      startDistance: totalLength,
      length,
      tangent: { x: x / length, y: y / length },
    });
    totalLength += length;
  }
  return { points: cleanPoints, segments, totalLength };
}

function calculateSquareCoverCrop(
  photo: PhotoSkinCanvasPhoto,
): PhotoSkinCanvasPorthole["sourceCrop"] | undefined {
  if (
    !Number.isFinite(photo.width) || !Number.isFinite(photo.height) ||
    photo.width <= 0 || photo.height <= 0
  ) return undefined;

  const size = Math.min(photo.width, photo.height);
  return {
    sx: (photo.width - size) * clamp01(photo.focalPoint.x),
    sy: (photo.height - size) * clamp01(photo.focalPoint.y),
    sw: size,
    sh: size,
  };
}

function samplePath(
  path: PathMetrics,
  distance: number,
  fallback: PhotoSkinCanvasPoint,
): { point: PhotoSkinCanvasPoint; tangent: PhotoSkinCanvasPoint } {
  const target = Math.max(0, Math.min(path.totalLength, distance));
  const segment = path.segments.find(
    (candidate) => target <= candidate.startDistance + candidate.length + EPSILON,
  ) ?? path.segments.at(-1);
  if (!segment) return { point: path.points[0] ?? { x: 0, y: 0 }, tangent: fallback };
  const localDistance = Math.max(0, Math.min(segment.length, target - segment.startDistance));
  const progress = segment.length > EPSILON ? localDistance / segment.length : 0;
  return {
    point: {
      x: segment.from.x + (segment.to.x - segment.from.x) * progress,
      y: segment.from.y + (segment.to.y - segment.from.y) * progress,
    },
    tangent: segment.length > EPSILON ? segment.tangent : fallback,
  };
}

/**
 * Plans a prefix of the ordered photo collection. Short starter worms reveal
 * only the portraits that fit at a readable spacing; more portraits appear in
 * their original order as body length grows.
 */
export function buildPhotoSkinCanvasPortholes(
  points: readonly PhotoSkinCanvasPoint[],
  bodyRadius: number,
  direction: PhotoSkinCanvasPoint,
  renderPlan: PhotoSkinCanvasRenderPlan,
): readonly PhotoSkinCanvasPorthole[] {
  if (!renderPlan.localPhotosEnabled || !Number.isFinite(bodyRadius) || bodyRadius <= 0) return [];
  const photos = renderPlan.localPhotos;
  if (photos.length < MIN_PHOTOS || photos.length > MAX_PHOTOS) return [];

  const path = createPathMetrics(points);
  if (path.totalLength <= EPSILON) return [];
  const outerRadius = bodyRadius * PORTHOLE_OUTER_RADIUS_FACTOR;
  const innerRadius = bodyRadius * PORTHOLE_INNER_RADIUS_FACTOR;
  const edgeInset = Math.min(path.totalLength / 2, outerRadius * PORTHOLE_EDGE_INSET_FACTOR);
  const usableSpan = Math.max(0, path.totalLength - edgeInset * 2);
  const minimumSpacing = outerRadius * PORTHOLE_MINIMUM_SPACING_FACTOR;
  const capacity = Math.min(
    photos.length,
    usableSpan <= EPSILON ? 1 : 1 + Math.floor(usableSpan / minimumSpacing),
  );
  const fallback = unitDirection(direction);

  return photos.slice(0, capacity).flatMap((photo, photoIndex) => {
    const sourceCrop = calculateSquareCoverCrop(photo);
    if (!sourceCrop) return [];
    const distance = capacity === 1
      ? path.totalLength / 2
      : edgeInset + usableSpan * (photoIndex / (capacity - 1));
    const sample = samplePath(path, distance, fallback);
    return [{
      photoId: photo.id,
      photoIndex,
      distance,
      center: sample.point,
      tangent: sample.tangent,
      outerRadius,
      innerRadius,
      sourceCrop,
    }];
  });
}

/** Adds one exact union-of-capsules body silhouette to the current path. */
function traceBodySilhouette(
  context: CanvasRenderingContext2D,
  path: PathMetrics,
  bodyRadius: number,
): void {
  context.beginPath();
  for (const segment of path.segments) {
    const normal = { x: -segment.tangent.y, y: segment.tangent.x };
    context.moveTo(
      segment.from.x + normal.x * bodyRadius,
      segment.from.y + normal.y * bodyRadius,
    );
    context.lineTo(
      segment.to.x + normal.x * bodyRadius,
      segment.to.y + normal.y * bodyRadius,
    );
    context.lineTo(
      segment.to.x - normal.x * bodyRadius,
      segment.to.y - normal.y * bodyRadius,
    );
    context.lineTo(
      segment.from.x - normal.x * bodyRadius,
      segment.from.y - normal.y * bodyRadius,
    );
    context.closePath();
  }
  for (const point of path.points) {
    context.moveTo(point.x + bodyRadius, point.y);
    context.arc(point.x, point.y, bodyRadius, 0, Math.PI * 2);
    context.closePath();
  }
}

function drawPortraitPorthole(
  context: CanvasRenderingContext2D,
  porthole: PhotoSkinCanvasPorthole,
  image: CanvasImageSource,
): void {
  const { center, outerRadius, innerRadius, sourceCrop } = porthole;
  context.save();
  context.translate(center.x, center.y);

  // Every painted radius is at most 72% of the authoritative body radius.
  // The dark well, brass bezel, glass and rivets therefore remain inset even
  // before the exact body-silhouette clip is applied by the caller.
  context.fillStyle = "#241608";
  context.beginPath();
  context.arc(0, 0, outerRadius, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#c68a22";
  context.beginPath();
  context.arc(0, 0, outerRadius * 0.91, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#f3cf68";
  context.beginPath();
  context.arc(0, 0, outerRadius * 0.78, 0, Math.PI * 2);
  context.fill();

  context.save();
  context.beginPath();
  context.arc(0, 0, innerRadius, 0, Math.PI * 2);
  context.clip();
  context.drawImage(
    image,
    sourceCrop.sx,
    sourceCrop.sy,
    sourceCrop.sw,
    sourceCrop.sh,
    -innerRadius,
    -innerRadius,
    innerRadius * 2,
    innerRadius * 2,
  );
  context.fillStyle = "rgba(255,255,255,0.14)";
  context.beginPath();
  context.arc(-innerRadius * 0.22, -innerRadius * 0.28, innerRadius * 0.72, Math.PI, Math.PI * 1.78);
  context.fill();
  context.restore();

  context.strokeStyle = "#fff0a6";
  context.lineWidth = Math.max(0.8, outerRadius * 0.08);
  context.beginPath();
  context.arc(0, 0, outerRadius * 0.84, 0, Math.PI * 2);
  context.stroke();
  context.strokeStyle = "#6f430d";
  context.lineWidth = Math.max(0.7, outerRadius * 0.07);
  context.beginPath();
  context.arc(0, 0, innerRadius * 1.08, 0, Math.PI * 2);
  context.stroke();

  context.fillStyle = "#6d420e";
  const rivetRadius = Math.max(0.7, outerRadius * 0.065);
  const rivetOrbit = outerRadius * 0.84;
  for (let index = 0; index < 4; index += 1) {
    const angle = index * Math.PI / 2;
    context.beginPath();
    context.arc(
      Math.cos(angle) * rivetOrbit,
      Math.sin(angle) * rivetOrbit,
      rivetRadius,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  context.restore();
}

/**
 * Overlays upright local portraits as brass-rimmed portholes within one
 * continuous body silhouette. Authored skin remains underneath and visible
 * between portraits. Missing decoded images fail closed to that authored skin.
 */
export function drawPhotoSkinCanvas(
  context: CanvasRenderingContext2D,
  options: PhotoSkinCanvasOptions,
): PhotoSkinCanvasResult {
  const { points, bodyRadius, direction, decodedImages, renderPlan } = options;
  const authoredThemeOnly = (
    unavailablePhotoIds: readonly string[] = [],
    deferredPhotoIds: readonly string[] = renderPlan.localPhotos.map((photo) => photo.id),
    plannedPortholeCount = 0,
  ): PhotoSkinCanvasResult => ({
    mode: "authored-theme-only",
    renderedPhotoIds: [],
    unavailablePhotoIds,
    deferredPhotoIds,
    plannedPortholeCount,
    portholeCount: 0,
  });

  const portholes = buildPhotoSkinCanvasPortholes(points, bodyRadius, direction, renderPlan);
  if (portholes.length === 0) return authoredThemeOnly();
  const path = createPathMetrics(points);
  if (path.totalLength <= EPSILON) return authoredThemeOnly();

  const plannedIds = new Set(portholes.map((porthole) => porthole.photoId));
  const deferredPhotoIds = renderPlan.localPhotos
    .filter((photo) => !plannedIds.has(photo.id))
    .map((photo) => photo.id);
  const availablePortholes = portholes.filter((porthole) => decodedImages.has(porthole.photoId));
  const unavailablePhotoIds = portholes
    .filter((porthole) => !decodedImages.has(porthole.photoId))
    .map((porthole) => porthole.photoId);
  if (availablePortholes.length === 0) {
    return authoredThemeOnly(unavailablePhotoIds, deferredPhotoIds, portholes.length);
  }

  context.save();
  traceBodySilhouette(context, path, bodyRadius);
  context.clip();
  for (const porthole of availablePortholes) {
    const image = decodedImages.get(porthole.photoId);
    if (image) drawPortraitPorthole(context, porthole, image);
  }
  context.restore();

  return {
    mode: "portrait-portholes",
    renderedPhotoIds: availablePortholes.map((porthole) => porthole.photoId),
    unavailablePhotoIds,
    deferredPhotoIds,
    plannedPortholeCount: portholes.length,
    portholeCount: availablePortholes.length,
  };
}
