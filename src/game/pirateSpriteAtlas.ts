export const PIRATE_SPRITE_NAMES = [
  "serpent-head",
  "serpent-body-porthole",
  "serpent-body-sash",
  "serpent-tail",
  "doubloon-stack",
  "ruby-skull",
  "sapphire-anchor",
  "emerald-spyglass",
  "pearl-shell",
  "ornate-key",
  "treasure-map",
  "treasure-chest",
  "loot-compass",
  "vortex-astrolabe",
  "pepper-cutlass",
  "shipwheel-shield",
] as const;

export type PirateSpriteName = (typeof PIRATE_SPRITE_NAMES)[number];

// BASE_URL is `/` on Wormifi.com and `./` inside the portable CrazyGames ZIP.
// Keeping the artwork relative in the portal build avoids requests escaping the
// uploaded game folder when CrazyGames hosts it below a versioned sub-path.
const SPRITE_ROOT = `${import.meta.env.BASE_URL}assets/sprites/pirate-atlas`;
const COMMON_TREASURE = [
  "doubloon-stack",
  "ruby-skull",
  "sapphire-anchor",
  "emerald-spyglass",
  "pearl-shell",
  "ornate-key",
  "treasure-map",
] as const satisfies readonly PirateSpriteName[];

type DrawableSprite = HTMLImageElement | HTMLCanvasElement;

const sourceImages = new Map<PirateSpriteName, HTMLImageElement>();
const hueVariants = new Map<string, HTMLCanvasElement>();
const GROUND_TREASURE_SPRITE_LOGICAL_EXTENT = 48;
const GROUND_TREASURE_SOURCE_SCALES = [1, 2] as const;
const GROUND_TREASURE_ROTATION_MIN = -8;
const GROUND_TREASURE_ROTATION_COUNT = 17;
const GROUND_TREASURE_ATLAS_COLUMNS = 10;
const GROUND_TREASURE_ATLAS_ROWS = Math.ceil(
  COMMON_TREASURE.length * GROUND_TREASURE_ROTATION_COUNT /
    GROUND_TREASURE_ATLAS_COLUMNS,
);
type GroundTreasureSourceScale = (typeof GROUND_TREASURE_SOURCE_SCALES)[number];
interface GroundTreasureRotationAtlas {
  image: HTMLImageElement;
  cellLogicalExtent: number;
  cellPixelExtent: number;
}
const groundTreasureRotationAtlases = new Map<
  GroundTreasureSourceScale,
  GroundTreasureRotationAtlas
>();
const pendingGroundTreasureRotationAtlases = new Map<
  GroundTreasureSourceScale,
  HTMLImageElement
>();
const failedGroundTreasureRotationAtlases = new Set<GroundTreasureSourceScale>();
const queuedGroundTreasureRotationAtlases = new Set<GroundTreasureSourceScale>();
const groundTreasureAtlasQueue: GroundTreasureSourceScale[] = [];
let groundTreasureAtlasPumpScheduled = false;
let groundTreasureAtlasFirstPaintScheduled = false;
export const PIRATE_GROUND_TREASURE_CACHE_LIMIT = GROUND_TREASURE_SOURCE_SCALES.length;

export function pirateSpritePath(name: PirateSpriteName): string {
  return `${SPRITE_ROOT}/${name}.png`;
}

export function commonTreasureSprite(seed: number): PirateSpriteName {
  const safeSeed = Number.isFinite(seed) ? Math.abs(Math.trunc(seed)) : 0;
  return COMMON_TREASURE[safeSeed % COMMON_TREASURE.length];
}

export function serpentBodySprite(
  index: number,
): "serpent-body-porthole" | "serpent-body-sash" {
  return Math.abs(Math.trunc(index)) % 4 === 2
    ? "serpent-body-sash"
    : "serpent-body-porthole";
}

function imageFor(name: PirateSpriteName): HTMLImageElement | undefined {
  if (typeof Image === "undefined") return undefined;
  let image = sourceImages.get(name);
  if (!image) {
    image = new Image();
    image.decoding = "async";
    image.src = pirateSpritePath(name);
    sourceImages.set(name, image);
  }
  return image.complete && image.naturalWidth > 0 ? image : undefined;
}

function quantizedHue(hueDegrees: number): number {
  if (!Number.isFinite(hueDegrees)) return 0;
  const normalized = ((hueDegrees % 360) + 360) % 360;
  return Math.round(normalized / 30) * 30 % 360;
}

function drawableFor(
  name: PirateSpriteName,
  hueDegrees: number,
): DrawableSprite | undefined {
  const image = imageFor(name);
  if (!image) return undefined;
  const hue = quantizedHue(hueDegrees);
  if (hue === 0 || typeof document === "undefined") return image;

  const key = `${name}:${hue}`;
  const cached = hueVariants.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) return image;
  context.filter = `hue-rotate(${hue}deg)`;
  context.drawImage(image, 0, 0);
  context.filter = "none";
  hueVariants.set(key, canvas);
  return canvas;
}

function groundTreasureSourceScale(
  context: CanvasRenderingContext2D,
): GroundTreasureSourceScale {
  if (typeof context.getTransform !== "function") return 1;
  const transform = context.getTransform();
  const destinationScale = Math.max(Math.abs(transform.a), Math.abs(transform.d));
  return destinationScale > 1.25 ? 2 : 1;
}

function groundTreasureRotationAtlasPath(
  sourceScale: GroundTreasureSourceScale,
): string {
  return `${SPRITE_ROOT}/ground-treasure-rotations-${sourceScale}x.png`;
}

function pumpGroundTreasureRotationAtlases(): void {
  const sourceScale = groundTreasureAtlasQueue.shift();
  if (!sourceScale) return;
  queuedGroundTreasureRotationAtlases.delete(sourceScale);
  if (
    groundTreasureRotationAtlases.has(sourceScale) ||
    pendingGroundTreasureRotationAtlases.has(sourceScale) ||
    failedGroundTreasureRotationAtlases.has(sourceScale) ||
    typeof Image === "undefined"
  ) {
    scheduleGroundTreasureAtlasPump();
    return;
  }

  const image = new Image();
  image.decoding = "async";
  pendingGroundTreasureRotationAtlases.set(sourceScale, image);
  let settled = false;
  const fail = () => {
    if (settled) return;
    settled = true;
    pendingGroundTreasureRotationAtlases.delete(sourceScale);
    failedGroundTreasureRotationAtlases.add(sourceScale);
  };
  const publish = () => {
    if (settled) return;
    const cellPixelExtent = Math.ceil(
      GROUND_TREASURE_SPRITE_LOGICAL_EXTENT * sourceScale * Math.SQRT2,
    );
    const expectedWidth = cellPixelExtent * GROUND_TREASURE_ATLAS_COLUMNS;
    const expectedHeight = cellPixelExtent * GROUND_TREASURE_ATLAS_ROWS;
    if (
      image.naturalWidth !== expectedWidth ||
      image.naturalHeight !== expectedHeight
    ) {
      fail();
      return;
    }
    settled = true;
    pendingGroundTreasureRotationAtlases.delete(sourceScale);
    groundTreasureRotationAtlases.set(sourceScale, {
      image,
      cellLogicalExtent: cellPixelExtent / sourceScale,
      cellPixelExtent,
    });
  };
  image.addEventListener("error", fail, { once: true });
  image.src = groundTreasureRotationAtlasPath(sourceScale);
  if (typeof image.decode === "function") {
    void image.decode().then(publish, fail);
  } else {
    image.addEventListener("load", publish, { once: true });
    if (image.complete && image.naturalWidth > 0) queueMicrotask(publish);
  }
  scheduleGroundTreasureAtlasPump();
}

function scheduleGroundTreasureAtlasPump(): void {
  if (groundTreasureAtlasPumpScheduled || groundTreasureAtlasQueue.length === 0) return;
  groundTreasureAtlasPumpScheduled = true;
  const runPump = () => {
    groundTreasureAtlasPumpScheduled = false;
    pumpGroundTreasureRotationAtlases();
  };

  if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
    queueMicrotask(runPump);
    return;
  }
  const scheduleIdle = () => {
    const idleWindow = window as typeof window & {
      requestIdleCallback?: (
        callback: () => void,
        options?: { timeout: number },
      ) => number;
    };
    if (typeof idleWindow.requestIdleCallback === "function") {
      idleWindow.requestIdleCallback(runPump, { timeout: 250 });
    } else {
      window.setTimeout(runPump, 0);
    }
  };
  if (!groundTreasureAtlasFirstPaintScheduled) {
    groundTreasureAtlasFirstPaintScheduled = true;
    window.requestAnimationFrame(() => window.requestAnimationFrame(scheduleIdle));
  } else {
    scheduleIdle();
  }
}

function queueGroundTreasureRotationAtlas(
  sourceScale: GroundTreasureSourceScale,
): void {
  if (
    groundTreasureRotationAtlases.has(sourceScale) ||
    pendingGroundTreasureRotationAtlases.has(sourceScale) ||
    failedGroundTreasureRotationAtlases.has(sourceScale) ||
    queuedGroundTreasureRotationAtlases.has(sourceScale)
  ) return;
  queuedGroundTreasureRotationAtlases.add(sourceScale);
  groundTreasureAtlasQueue.push(sourceScale);
  scheduleGroundTreasureAtlasPump();
}

function groundTreasureRotationAtlasFor(
  sourceScale: GroundTreasureSourceScale,
): GroundTreasureRotationAtlas | undefined {
  const ready = groundTreasureRotationAtlases.get(sourceScale);
  if (ready) return ready;
  queueGroundTreasureRotationAtlas(sourceScale);
  return undefined;
}

export interface AtlasDrawOptions {
  x: number;
  y: number;
  size: number;
  rotation?: number;
  hueDegrees?: number;
  alpha?: number;
  flipY?: boolean;
}

export interface AtlasStripOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  hueDegrees?: number;
  alpha?: number;
}

/**
 * Draws one authored square-cell sprite. Transparent padding is intentional:
 * it gives every asset safe rotation space while retaining its natural aspect.
 * Returns false during the first loading frames so callers can render a
 * geometry fallback without blocking gameplay.
 */
export function drawPirateAtlasSprite(
  context: CanvasRenderingContext2D,
  name: PirateSpriteName,
  options: AtlasDrawOptions,
): boolean {
  if (!Number.isFinite(options.size) || options.size <= 0) return false;
  const sprite = drawableFor(name, options.hueDegrees ?? 0);
  if (!sprite) return false;

  context.save();
  context.translate(options.x, options.y);
  context.rotate(options.rotation ?? 0);
  if (options.flipY) context.scale(1, -1);
  context.globalAlpha *= Math.max(0, Math.min(1, options.alpha ?? 1));
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    sprite,
    -options.size / 2,
    -options.size / 2,
    options.size,
    options.size,
  );
  context.restore();
  return true;
}

/**
 * Draws only the seamless center of an authored serpent hull section. The
 * generated end caps are deliberately excluded so consecutive links overlap
 * as one continuous creature instead of reading as stacked rectangles.
 */
export function drawPirateAtlasStrip(
  context: CanvasRenderingContext2D,
  name: "serpent-body-porthole" | "serpent-body-sash",
  options: AtlasStripOptions,
): boolean {
  if (
    !Number.isFinite(options.width) || options.width <= 0 ||
    !Number.isFinite(options.height) || options.height <= 0
  ) return false;
  const sprite = drawableFor(name, options.hueDegrees ?? 0);
  if (!sprite) return false;

  const sourceWidth = sprite.width;
  const sourceHeight = sprite.height;
  const sx = sourceWidth * 0.18;
  const sy = sourceHeight * 0.08;
  const sw = sourceWidth * 0.72;
  const sh = sourceHeight * 0.88;

  context.save();
  context.translate(options.x, options.y);
  context.rotate(options.rotation);
  context.globalAlpha *= Math.max(0, Math.min(1, options.alpha ?? 1));
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    sprite,
    sx,
    sy,
    sw,
    sh,
    -options.width / 2,
    -options.height / 2,
    options.width,
    options.height,
  );
  context.restore();
  return true;
}

export interface GroundTreasureSpriteItem {
  id: string;
  position: { x: number; y: number };
  radius: number;
  seed: number;
  /** Optional caller-projected coordinates avoid a second allocation/transform. */
  screenX?: number;
  screenY?: number;
}

/**
 * Bounded field renderer for ordinary ground loot. Unlike the old radial gem
 * field, every object has a semantic, asymmetric pirate-treasure silhouette.
 */
export function drawGroundTreasureSpriteField(
  context: CanvasRenderingContext2D,
  items: readonly GroundTreasureSpriteItem[],
  worldToScreen: (point: { x: number; y: number }) => { x: number; y: number },
  zoom: number,
  width: number,
  height: number,
  now: number,
): void {
  // One mutable options record keeps a crowded field from allocating hundreds
  // of short-lived objects every frame. drawPirateAtlasSprite consumes the
  // values synchronously and never retains this object.
  const spriteOptions = { x: 0, y: 0, size: 0, rotation: 0 };
  // The arena transform is stable for the entire field. Querying it once avoids
  // allocating/reading hundreds of DOMMatrix objects in every crowded frame.
  const sourceScale = typeof Image === "undefined"
    ? 1
    : groundTreasureSourceScale(context);
  const rotationAtlas = typeof Image === "undefined"
    ? undefined
    : groundTreasureRotationAtlasFor(sourceScale);
  const treasureSizeScale = zoom * 2.08;
  const pulseTime = now * 0.0024;
  const bobTime = now * 0.002;
  const atlasDestinationScale = rotationAtlas
    ? rotationAtlas.cellLogicalExtent / GROUND_TREASURE_SPRITE_LOGICAL_EXTENT
    : 0;
  const previousSmoothingEnabled = context.imageSmoothingEnabled;
  const previousSmoothingQuality = context.imageSmoothingQuality;
  context.imageSmoothingEnabled = true;
  // Atlas cells were already rotated and resampled at high quality offline.
  // Medium runtime filtering keeps small treasure crisp without repeating an
  // expensive high-quality resample for every visible pickup on every frame.
  context.imageSmoothingQuality = "medium";
  try {
    for (const item of items) {
      const projected = item.screenX === undefined || item.screenY === undefined
        ? worldToScreen(item.position)
        : undefined;
      const screenX = item.screenX ?? projected!.x;
      const screenY = item.screenY ?? projected!.y;
      const baseSize = Math.max(12, item.radius * treasureSizeScale);
      // Atlas content can extend at most sqrt(2)/2 of its requested size from
      // center; vertical bob adds another 4.5%. Cull with those true maxima
      // before running trigonometry for the many offscreen world pickups.
      const horizontalCullExtent = baseSize * 0.708;
      const verticalCullExtent = baseSize * 0.753;
      if (
        screenX < -horizontalCullExtent ||
        screenY < -verticalCullExtent ||
        screenX > width + horizontalCullExtent ||
        screenY > height + verticalCullExtent
      ) continue;

      const pulse = 0.97 + Math.sin(pulseTime + item.seed * 0.017) * 0.03;
      const size = baseSize * pulse;
      spriteOptions.x = screenX;
      spriteOptions.y = screenY + Math.sin(bobTime + item.seed) * size * 0.045;
      spriteOptions.size = size;
      const safeSeed = Number.isFinite(item.seed) ? Math.abs(Math.trunc(item.seed)) : 0;
      const rotationIndex = safeSeed % GROUND_TREASURE_ROTATION_COUNT;
      if (rotationAtlas) {
        const treasureIndex = safeSeed % COMMON_TREASURE.length;
        const flatIndex = treasureIndex * GROUND_TREASURE_ROTATION_COUNT +
          rotationIndex;
        const atlasColumn = flatIndex % GROUND_TREASURE_ATLAS_COLUMNS;
        const atlasRow = Math.floor(flatIndex / GROUND_TREASURE_ATLAS_COLUMNS);
        const destinationExtent = spriteOptions.size * atlasDestinationScale;
        context.drawImage(
          rotationAtlas.image,
          atlasColumn * rotationAtlas.cellPixelExtent,
          atlasRow * rotationAtlas.cellPixelExtent,
          rotationAtlas.cellPixelExtent,
          rotationAtlas.cellPixelExtent,
          spriteOptions.x - destinationExtent / 2,
          spriteOptions.y - destinationExtent / 2,
          destinationExtent,
          destinationExtent,
        );
      } else {
        const rotationClass = GROUND_TREASURE_ROTATION_MIN + rotationIndex;
        spriteOptions.rotation = rotationClass * 0.035;
        const spriteName = commonTreasureSprite(item.seed);
        drawPirateAtlasSprite(context, spriteName, spriteOptions);
      }
    }
  } finally {
    context.imageSmoothingEnabled = previousSmoothingEnabled;
    context.imageSmoothingQuality = previousSmoothingQuality;
  }
}

export function preloadPirateSpriteAtlas(): void {
  if (typeof Image === "undefined") return;
  for (const name of PIRATE_SPRITE_NAMES) imageFor(name);
}
