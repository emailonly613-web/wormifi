import type { Vec2 } from "./types";
import {
  DEFAULT_WORMATE_PARENT_OUTFIT,
  WORMATE_PARENT_PORTIONS,
  WORMATE_PARENT_REGIONS,
  getWormateParentAbility,
  getWormateParentPortion,
  getWormateParentSkin,
  getWormateParentWearable,
  type WormateParentAbilityId,
  type WormateParentOutfit,
  type WormateParentPortionId,
  type WormateParentRegionId,
  type WormateParentSkinId,
} from "./wormateParentCatalog";

const PUBLIC_ASSET_ROOT = import.meta.env.BASE_URL.endsWith("/")
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;
const SKIN_ATLAS_SOURCE = `${PUBLIC_ASSET_ROOT}assets/parent-wormate/100700_skins.png`;
const WEAR_ATLAS_SOURCE = `${PUBLIC_ASSET_ROOT}assets/parent-wormate/100700_wear.png`;
const ABILITY_ATLAS_SOURCE = `${PUBLIC_ASSET_ROOT}assets/parent-wormate/100700_abilities.png`;
const PORTION_ATLAS_SOURCE = `${PUBLIC_ASSET_ROOT}assets/parent-wormate/100700_portions.png`;
const TAU = Math.PI * 2;

/**
 * Spine stamp spacing as a fraction of the body radius. The parent's body art is
 * a plain circle - its smoothness comes entirely from how tightly those circles
 * are packed. One stamp per chain point leaves points bodyRadius * 1.64 apart
 * against a drawn diameter of 2.24, only ~27% overlap, so every circle reads as
 * its own bulge. At 0.18 consecutive stamps overlap so heavily that only the
 * outer envelope shows.
 */
const SMOOTH_BODY_STEP = 0.18;

/**
 * How far forward, in head radii, the face is moved before it is stamped.
 *
 * The parent's wear sprites are authored around a front-of-head origin: the
 * stock eye region has pivot px=75 in a 128-unit box while the sprite is only
 * 42 wide, so drawn about our head centre it lands roughly -1.4 to -0.6 radii -
 * behind the head, on the neck. Tuned by eye against the real arena at eight
 * headings rather than computed, because the eyes, mouth, glasses and hat are
 * authored as a set and only look right together.
 */
const FACE_FORWARD_OFFSET = 0.70;

interface AtlasState {
  image?: HTMLImageElement;
  promise?: Promise<HTMLImageElement | undefined>;
}

const skinAtlas: AtlasState = {};
const wearAtlas: AtlasState = {};
const abilityAtlas: AtlasState = {};
const portionAtlas: AtlasState = {};
const bodySpriteCache = new Map<string, CanvasImageSource>();
const portionSpriteCache = new Map<string, CanvasImageSource>();
interface PortionFieldAtlas {
  canvas: HTMLCanvasElement;
  cellSize: number;
  columns: number;
}
let portionFieldAtlas: PortionFieldAtlas | undefined;

function requestAtlas(state: AtlasState, source: string): Promise<HTMLImageElement | undefined> {
  if (state.image?.complete && state.image.naturalWidth > 0) return Promise.resolve(state.image);
  if (state.promise) return state.promise;
  if (typeof Image === "undefined") return Promise.resolve(undefined);
  state.promise = new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      state.image = image;
      resolve(image);
    };
    image.onerror = () => resolve(undefined);
    image.src = source;
  });
  return state.promise;
}

function readyAtlas(state: AtlasState, source: string): HTMLImageElement | undefined {
  if (state.image?.complete && state.image.naturalWidth > 0) return state.image;
  void requestAtlas(state, source);
  return undefined;
}

export async function preloadWormateParentVisuals(): Promise<boolean> {
  // Bodies and wearables come from the parent catalogue; food and treasure are
  // Wormifi's own, so the portion atlas is deliberately not fetched here. It
  // was 177 KB downloaded on every visit and stitched into a combined field
  // that nothing draws - dead weight against the load-time budget.
  const [skins, wear, abilities] = await Promise.all([
    requestAtlas(skinAtlas, SKIN_ATLAS_SOURCE),
    requestAtlas(wearAtlas, WEAR_ATLAS_SOURCE),
    requestAtlas(abilityAtlas, ABILITY_ATLAS_SOURCE),
  ]);
  return Boolean(skins && wear && abilities);
}

export interface WormateParentSegmentPlan {
  baseRegionId: WormateParentRegionId;
  glowRegionId: WormateParentRegionId;
  radiusScale: number;
}

export function createWormateParentSegmentPlan(
  skinId: WormateParentSkinId,
  pointCount: number,
): WormateParentSegmentPlan[] {
  const skin = getWormateParentSkin(skinId);
  const count = Math.max(0, Math.trunc(pointCount));
  return Array.from({ length: count }, (_, index) => {
    const distanceFromTail = count - 1 - index;
    const radiusScale = index === 0
      ? 1
      : distanceFromTail === 0
        ? 0.72
        : distanceFromTail === 1
          ? 0.88
          : distanceFromTail === 2
            ? 0.97
            : 1;
    return {
      baseRegionId: skin.base[index % skin.base.length] as WormateParentRegionId,
      glowRegionId: skin.glow[index % skin.glow.length] as WormateParentRegionId,
      radiusScale,
    };
  });
}

function drawRoundRegion(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  regionId: WormateParentRegionId,
  point: Readonly<Vec2>,
  radius: number,
) {
  const region = WORMATE_PARENT_REGIONS[regionId];
  const extent = radius * 2;
  context.drawImage(
    image,
    region.x,
    region.y,
    region.w,
    region.h,
    point.x - radius,
    point.y - radius,
    extent,
    extent,
  );
}

function combinedBodySprite(
  image: CanvasImageSource,
  baseRegionId: WormateParentRegionId,
  glowRegionId: WormateParentRegionId,
): CanvasImageSource | undefined {
  const key = `${baseRegionId}:${glowRegionId}`;
  const cached = bodySpriteCache.get(key);
  if (cached) return cached;
  if (typeof document === "undefined") return undefined;
  const base = WORMATE_PARENT_REGIONS[baseRegionId];
  const glow = WORMATE_PARENT_REGIONS[glowRegionId];
  const width = Math.max(base.w, glow.w);
  const height = Math.max(base.h, glow.h);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return undefined;
  context.drawImage(image, base.x, base.y, base.w, base.h, 0, 0, width, height);
  context.drawImage(image, glow.x, glow.y, glow.w, glow.h, 0, 0, width, height);
  bodySpriteCache.set(key, canvas);
  return canvas;
}

function drawBodySegment(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  baseRegionId: WormateParentRegionId,
  glowRegionId: WormateParentRegionId,
  point: Readonly<Vec2>,
  radius: number,
) {
  const composite = combinedBodySprite(image, baseRegionId, glowRegionId);
  if (!composite) {
    drawRoundRegion(context, image, baseRegionId, point, radius);
    drawRoundRegion(context, image, glowRegionId, point, radius);
    return;
  }
  const extent = radius * 2;
  context.drawImage(
    composite,
    point.x - radius,
    point.y - radius,
    extent,
    extent,
  );
}

function drawTrimmedRegionAt(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  regionId: WormateParentRegionId,
  center: Readonly<Vec2>,
  logicalExtent: number,
) {
  const region = WORMATE_PARENT_REGIONS[regionId] as {
    x: number;
    y: number;
    w: number;
    h: number;
    pw?: number;
    ph?: number;
    px?: number;
    py?: number;
  };
  const logicalWidth = region.pw ?? 128;
  const logicalHeight = region.ph ?? 128;
  const pivotX = region.px ?? logicalWidth / 2;
  const pivotY = region.py ?? logicalHeight / 2;
  const scaleX = logicalExtent / logicalWidth;
  const scaleY = logicalExtent / logicalHeight;
  context.drawImage(
    image,
    region.x,
    region.y,
    region.w,
    region.h,
    center.x - pivotX * scaleX,
    center.y - pivotY * scaleY,
    region.w * scaleX,
    region.h * scaleY,
  );
}

function combinedPortionSprite(
  image: CanvasImageSource,
  glowRegionId: WormateParentRegionId,
  baseRegionId: WormateParentRegionId,
): CanvasImageSource | undefined {
  const key = `${glowRegionId}:${baseRegionId}`;
  const cached = portionSpriteCache.get(key);
  if (cached) return cached;
  if (typeof document === "undefined") return undefined;
  const glow = WORMATE_PARENT_REGIONS[glowRegionId] as {
    x: number; y: number; w: number; h: number; px?: number; py?: number; pw?: number; ph?: number;
  };
  const base = WORMATE_PARENT_REGIONS[baseRegionId] as typeof glow;
  const width = Math.max(glow.pw ?? glow.w, base.pw ?? base.w);
  const height = Math.max(glow.ph ?? glow.h, base.ph ?? base.h);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return undefined;
  const drawCentered = (region: typeof glow) => {
    const logicalWidth = region.pw ?? width;
    const logicalHeight = region.ph ?? height;
    const pivotX = region.px ?? logicalWidth / 2;
    const pivotY = region.py ?? logicalHeight / 2;
    context.drawImage(
      image,
      region.x,
      region.y,
      region.w,
      region.h,
      width / 2 - pivotX,
      height / 2 - pivotY,
      region.w,
      region.h,
    );
  };
  drawCentered(glow);
  drawCentered(base);
  portionSpriteCache.set(key, canvas);
  return canvas;
}

/**
 * Consolidate the 51 precomposed sweets into one texture. Crowded Practice can
 * draw more than a thousand pickups; using one canvas source avoids switching
 * among 51 little source canvases while preserving the exact glow/base pixels.
 */
function combinedPortionFieldAtlas(image: CanvasImageSource): PortionFieldAtlas | undefined {
  if (portionFieldAtlas) return portionFieldAtlas;
  if (typeof document === "undefined") return undefined;
  const cellSize = 128;
  const columns = 8;
  const rows = Math.ceil(WORMATE_PARENT_PORTIONS.length / columns);
  const canvas = document.createElement("canvas");
  canvas.width = columns * cellSize;
  canvas.height = rows * cellSize;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return undefined;
  context.imageSmoothingEnabled = true;
  for (let index = 0; index < WORMATE_PARENT_PORTIONS.length; index += 1) {
    const portion = WORMATE_PARENT_PORTIONS[index];
    const composite = combinedPortionSprite(
      image,
      portion.glow as WormateParentRegionId,
      portion.base as WormateParentRegionId,
    );
    if (!composite) return undefined;
    context.drawImage(
      composite,
      (index % columns) * cellSize,
      Math.floor(index / columns) * cellSize,
      cellSize,
      cellSize,
    );
  }
  portionFieldAtlas = { canvas, cellSize, columns };
  return portionFieldAtlas;
}

function drawCombinedPortionAt(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  glowRegionId: WormateParentRegionId,
  baseRegionId: WormateParentRegionId,
  center: Readonly<Vec2>,
  logicalExtent: number,
) {
  const composite = combinedPortionSprite(image, glowRegionId, baseRegionId);
  if (!composite) {
    drawTrimmedRegionAt(context, image, glowRegionId, center, logicalExtent);
    drawTrimmedRegionAt(context, image, baseRegionId, center, logicalExtent);
    return;
  }
  context.drawImage(
    composite,
    center.x - logicalExtent / 2,
    center.y - logicalExtent / 2,
    logicalExtent,
    logicalExtent,
  );
}

function drawWearRegion(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  regionId: WormateParentRegionId,
  headRadius: number,
) {
  drawTrimmedRegionAt(context, image, regionId, { x: 0, y: 0 }, headRadius * 2);
}

export interface DrawWormateParentSpriteOptions {
  x: number;
  y: number;
  size: number;
  rotation?: number;
  alpha?: number;
}

export function drawWormateParentPortion(
  context: CanvasRenderingContext2D,
  portionId: WormateParentPortionId,
  options: DrawWormateParentSpriteOptions,
): boolean {
  const atlas = readyAtlas(portionAtlas, PORTION_ATLAS_SOURCE);
  if (!atlas || !Number.isFinite(options.size) || options.size <= 0) return false;
  const portion = getWormateParentPortion(portionId);
  context.save();
  context.translate(options.x, options.y);
  context.rotate(options.rotation ?? 0);
  context.globalAlpha *= Math.max(0, Math.min(1, options.alpha ?? 1));
  context.imageSmoothingEnabled = true;
  drawCombinedPortionAt(
    context,
    atlas,
    portion.glow as WormateParentRegionId,
    portion.base as WormateParentRegionId,
    { x: 0, y: 0 },
    options.size,
  );
  context.restore();
  return true;
}

export function drawWormateParentAbility(
  context: CanvasRenderingContext2D,
  abilityId: WormateParentAbilityId,
  options: DrawWormateParentSpriteOptions,
): boolean {
  const atlas = readyAtlas(abilityAtlas, ABILITY_ATLAS_SOURCE);
  if (!atlas || !Number.isFinite(options.size) || options.size <= 0) return false;
  const ability = getWormateParentAbility(abilityId);
  context.save();
  context.translate(options.x, options.y);
  context.rotate(options.rotation ?? 0);
  context.globalAlpha *= Math.max(0, Math.min(1, options.alpha ?? 1));
  context.imageSmoothingEnabled = true;
  drawTrimmedRegionAt(
    context,
    atlas,
    ability.base as WormateParentRegionId,
    { x: 0, y: 0 },
    options.size,
  );
  context.restore();
  return true;
}

export interface WormateParentPortionFieldItem {
  id: string;
  position: Vec2;
  radius: number;
  seed: number;
  opacity?: number;
  screenX?: number;
  screenY?: number;
}

/**
 * Draws the complete official sweet catalog as the primary ordinary arena
 * field. One atlas draw pair per pickup replaces the former multi-effect
 * treasure treatment and keeps crowded frames bounded.
 */
export function drawWormateParentPortionField(
  context: CanvasRenderingContext2D,
  items: readonly WormateParentPortionFieldItem[],
  worldToScreen: (point: Vec2) => Vec2,
  zoom: number,
  width: number,
  height: number,
): boolean {
  const atlas = readyAtlas(portionAtlas, PORTION_ATLAS_SOURCE);
  if (!atlas) return false;
  const fieldAtlas = combinedPortionFieldAtlas(atlas);
  const previousAlpha = context.globalAlpha;
  const previousSmoothing = context.imageSmoothingEnabled;
  const minimumSize = height <= 500 || width <= 700 ? 30 : 36;
  context.imageSmoothingEnabled = true;
  try {
    for (const item of items) {
      const opacity = Math.max(0, Math.min(1, item.opacity ?? 1));
      if (opacity <= 0) continue;
      const projected = item.screenX === undefined || item.screenY === undefined
        ? worldToScreen(item.position)
        : undefined;
      const x = item.screenX ?? projected!.x;
      const y = item.screenY ?? projected!.y;
      const size = Math.max(minimumSize, item.radius * zoom * 4.05);
      const cull = size * 0.62;
      if (x < -cull || y < -cull || x > width + cull || y > height + cull) continue;
      const safeSeed = Number.isFinite(item.seed) ? Math.abs(Math.trunc(item.seed)) : 0;
      const portionIndex = safeSeed % WORMATE_PARENT_PORTIONS.length;
      const portion = WORMATE_PARENT_PORTIONS[portionIndex];
      context.globalAlpha = previousAlpha * opacity;
      if (fieldAtlas) {
        context.drawImage(
          fieldAtlas.canvas,
          (portionIndex % fieldAtlas.columns) * fieldAtlas.cellSize,
          Math.floor(portionIndex / fieldAtlas.columns) * fieldAtlas.cellSize,
          fieldAtlas.cellSize,
          fieldAtlas.cellSize,
          x - size / 2,
          y - size / 2,
          size,
          size,
        );
      } else {
        drawCombinedPortionAt(
          context,
          atlas,
          portion.glow as WormateParentRegionId,
          portion.base as WormateParentRegionId,
          { x, y },
          size,
        );
      }
    }
  } finally {
    context.globalAlpha = previousAlpha;
    context.imageSmoothingEnabled = previousSmoothing;
  }
  return true;
}

export interface DrawWormateParentWormOptions {
  points: readonly Vec2[];
  headRadius: number;
  bodyRadius: number;
  direction: Readonly<Vec2>;
  skinId: WormateParentSkinId;
  outfit?: Readonly<WormateParentOutfit>;
  shielded?: boolean;
  viewportWidth?: number;
  viewportHeight?: number;
}

/**
 * Paint the authorized parent body's exact atlas sprites on Wormifi geometry.
 * The simulation and board remain Wormifi-owned; only the visual skin layer is
 * replaced. Returns false until both first-party atlases are decoded.
 */
export function drawWormateParentWorm(
  context: CanvasRenderingContext2D,
  options: DrawWormateParentWormOptions,
): boolean {
  const skins = readyAtlas(skinAtlas, SKIN_ATLAS_SOURCE);
  const wear = readyAtlas(wearAtlas, WEAR_ATLAS_SOURCE);
  if (!skins || !wear || options.points.length < 2) return false;

  const points = options.points;
  const skin = getWormateParentSkin(options.skinId);
  const outfit = options.outfit ?? DEFAULT_WORMATE_PARENT_OUTFIT;
  context.save();
  context.imageSmoothingEnabled = true;
  context.globalAlpha = 1;
  context.shadowBlur = 0;

  // Walk the spine and stamp densely rather than once per chain point, so the
  // circles merge into one tube instead of reading as separate beads. Painted
  // tail-to-head so every forward stamp cleanly overlaps the one behind it.
  const taperFor = (distanceFromTail: number) => distanceFromTail === 0
    ? 0.72
    : distanceFromTail === 1
      ? 0.88
      : distanceFromTail === 2
        ? 0.97
        : 1;
  const stampStep = Math.max(1.2, options.bodyRadius * SMOOTH_BODY_STEP);
  const tailIndex = points.length - 1;

  for (let index = tailIndex; index >= 1; index -= 1) {
    const point = points[index];
    const ahead = points[index - 1];
    const taper = taperFor(tailIndex - index);
    const aheadTaper = taperFor(tailIndex - index + 1);
    const spanX = ahead.x - point.x;
    const spanY = ahead.y - point.y;
    const span = Math.hypot(spanX, spanY);
    const stamps = Math.max(1, Math.ceil(span / stampStep));
    const baseRegion = skin.base[index % skin.base.length] as WormateParentRegionId;
    const glowRegion = skin.glow[index % skin.glow.length] as WormateParentRegionId;
    for (let step = 0; step < stamps; step += 1) {
      const t = step / stamps;
      const x = point.x + spanX * t;
      const y = point.y + spanY * t;
      // Taper interpolated across the span so the tail thins evenly.
      const radius = options.bodyRadius * 1.12 * (taper + (aheadTaper - taper) * t);
      if (
        options.viewportWidth !== undefined &&
        options.viewportHeight !== undefined &&
        (
          x + radius < 0 || y + radius < 0 ||
          x - radius > options.viewportWidth || y - radius > options.viewportHeight
        )
      ) continue;
      drawBodySegment(context, skins, baseRegion, glowRegion, { x, y }, radius);
    }
  }

  {
    const headPoint = points[0];
    const headRadius = options.headRadius * 1.04;
    const offScreen = options.viewportWidth !== undefined &&
      options.viewportHeight !== undefined &&
      (
        headPoint.x + headRadius < 0 || headPoint.y + headRadius < 0 ||
        headPoint.x - headRadius > options.viewportWidth ||
        headPoint.y - headRadius > options.viewportHeight
      );
    if (!offScreen) {
      drawBodySegment(
        context,
        skins,
        skin.base[0] as WormateParentRegionId,
        skin.glow[0] as WormateParentRegionId,
        headPoint,
        headRadius,
      );
    }
  }

  const head = points[0];
  const angle = Math.atan2(options.direction.y, options.direction.x);
  context.save();
  context.translate(head.x, head.y);
  context.rotate(angle);
  context.translate(options.headRadius * FACE_FORWARD_OFFSET, 0);
  for (const item of [
    getWormateParentWearable("eyes", outfit.eyeId),
    getWormateParentWearable("mouth", outfit.mouthId),
    getWormateParentWearable("glasses", outfit.glassesId),
    getWormateParentWearable("hat", outfit.hatId),
  ]) {
    for (const regionId of item.base) {
      drawWearRegion(
        context,
        wear,
        regionId as WormateParentRegionId,
        options.headRadius,
      );
    }
  }
  context.restore();

  if (options.shielded) {
    context.strokeStyle = "rgba(225,255,252,0.86)";
    context.lineWidth = Math.max(1, options.headRadius * 0.09);
    context.beginPath();
    context.arc(head.x, head.y, options.headRadius * 1.03, 0, TAU);
    context.stroke();
  }
  context.restore();
  return true;
}

if (typeof Image !== "undefined") void preloadWormateParentVisuals();
