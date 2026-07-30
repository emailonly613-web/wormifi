import type { Vec2 } from "./types";
import { drawWormMaterial, type WormMaterialPattern } from "./wormMaterials";

const TAU = Math.PI * 2;
const gemSpriteCache = new Map<string, HTMLCanvasElement>();
const positionedGemSpriteCache = new Map<string, HTMLCanvasElement>();
const chestSpriteCache = new Map<string, HTMLCanvasElement>();
const creatureSpriteCache = new Map<string, HTMLCanvasElement>();
const floorSpriteCache = new Map<string, HTMLCanvasElement>();
const vignetteSpriteCache = new Map<string, HTMLCanvasElement>();
const renderImageCache = new Map<string, HTMLImageElement>();

const CREATURE_CACHE_LIMIT = 640;
const SCREEN_LAYER_CACHE_LIMIT = 8;

/**
 * Both arena renderers paint an opaque floor before any world content. Asking
 * Chromium for an opaque, desynchronized backing store avoids an otherwise
 * unnecessary page-compositing blend and lets Canvas2D present without waiting
 * on the DOM compositor. Geometry, authored sprites and CSS dimensions stay
 * unchanged.
 */
export const ARENA_CANVAS_CONTEXT_OPTIONS = Object.freeze({
  alpha: false,
  desynchronized: true,
}) satisfies CanvasRenderingContext2DSettings;

const PUBLIC_ASSET_ROOT = import.meta.env.BASE_URL;

export const PIRATE_RENDER_ASSETS = Object.freeze({
  wormHead: `${PUBLIC_ASSET_ROOT}assets/sprites/pirate-atlas/serpent-head.png`,
  wormBodyPorthole: `${PUBLIC_ASSET_ROOT}assets/sprites/pirate-atlas/serpent-body-porthole.png`,
  wormBodySash: `${PUBLIC_ASSET_ROOT}assets/sprites/pirate-atlas/serpent-body-sash.png`,
  wormTail: `${PUBLIC_ASSET_ROOT}assets/sprites/pirate-atlas/serpent-tail.png`,
  cutJewel: `${PUBLIC_ASSET_ROOT}art/cut-jewel-v1.png`,
  treasureChest: `${PUBLIC_ASSET_ROOT}art/treasure-chest-v3.png`,
});

/**
 * Browser art loads opportunistically. The deterministic procedural renderer
 * remains the first-frame and failure fallback, so a slow or unavailable image
 * can never block steering, simulation, or treasure visibility.
 */
function readyRenderImage(source: string): HTMLImageElement | undefined {
  if (typeof Image === "undefined") return undefined;
  let image = renderImageCache.get(source);
  if (!image) {
    image = new Image();
    image.decoding = "async";
    image.src = source;
    renderImageCache.set(source, image);
  }
  return image.complete && image.naturalWidth > 0 ? image : undefined;
}

function paintRenderImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
  tint?: string,
  shadowColor?: string,
) {
  context.save();
  if (shadowColor) {
    context.shadowColor = shadowColor;
    context.shadowBlur = Math.min(14, Math.max(width, height) * 0.28);
  }
  context.drawImage(image, -width / 2, -height / 2, width, height);
  context.shadowBlur = 0;
  if (tint) {
    context.globalCompositeOperation = "source-atop";
    context.globalAlpha = 0.2;
    context.fillStyle = tint;
    context.fillRect(-width / 2, -height / 2, width, height);
  }
  context.restore();
}

/**
 * Large desktop canvases use a modest internal render scale so native raster
 * work cannot outrun input. CSS size, geometry and hitboxes remain exact; HUD
 * and controls are DOM-rendered at full device resolution.
 */
export function arenaBackingScale(
  width: number,
  height: number,
  devicePixelRatio: number,
  groundDropCount = 0,
) {
  const cappedDeviceScale = Math.min(1.75, Math.max(1, devicePixelRatio || 1));
  if (width * height <= 1_000_000) return cappedDeviceScale;
  // The 28-bot / 1,050-treasure scene and full 24-actor rooms need a slightly
  // leaner desktop backing than ordinary scenes. CSS geometry, authored art,
  // HUD, hitboxes and mobile density are unchanged.
  const desktopScale = groundDropCount >= 900 ? 0.64 : 0.85;
  return Math.max(desktopScale, cappedDeviceScale * desktopScale);
}

/**
 * Full-screen cached layers must match the canvas backing store. Rendering a
 * 1x offscreen floor into a reduced crowded canvas makes Chromium resample more
 * than twice as many source pixels across the floor, ship and vignette every
 * frame, without adding any visible detail to the final backing store.
 */
export function screenLayerBackingScale(contextScale: number) {
  if (!Number.isFinite(contextScale) || contextScale <= 0) return 1;
  return Math.min(2, Math.max(0.5, contextScale));
}

function spriteRadius(value: number) {
  for (const bucket of [5, 7, 9, 12, 16, 22]) {
    if (value <= bucket) return bucket;
  }
  return Math.ceil(value / 6) * 6;
}

function buildSprite(
  key: string,
  cache: Map<string, HTMLCanvasElement>,
  halfSize: number,
  paint: (context: CanvasRenderingContext2D) => void,
  limit = Number.POSITIVE_INFINITY,
) {
  if (typeof document === "undefined") return undefined;
  const cached = cache.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = Math.ceil(halfSize * 2);
  const context = canvas.getContext("2d");
  if (!context) return undefined;
  context.translate(canvas.width / 2, canvas.height / 2);
  paint(context);
  if (cache.size >= limit) {
    const oldestKey = cache.keys().next().value as string | undefined;
    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }
  cache.set(key, canvas);
  return canvas;
}

function rememberSprite(
  cache: Map<string, HTMLCanvasElement>,
  key: string,
  canvas: HTMLCanvasElement,
  limit: number,
) {
  if (cache.size >= limit) {
    const oldestKey = cache.keys().next().value as string | undefined;
    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }
  cache.set(key, canvas);
}

function buildScreenLayer(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  key: string,
  cache: Map<string, HTMLCanvasElement>,
  paint: (layerContext: CanvasRenderingContext2D) => void,
) {
  if (typeof document === "undefined") return undefined;
  const deviceScale = screenLayerBackingScale(context.getTransform().a);
  const cacheKey = `${key}:${Math.round(width)}:${Math.round(height)}:${deviceScale}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(width * deviceScale));
  canvas.height = Math.max(1, Math.ceil(height * deviceScale));
  const layerContext = canvas.getContext("2d");
  if (!layerContext) return undefined;
  layerContext.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
  paint(layerContext);
  rememberSprite(cache, cacheKey, canvas, SCREEN_LAYER_CACHE_LIMIT);
  return canvas;
}

/** Cached full-canvas color field; the arena still receives the exact same stops. */
export function drawArenaFloor(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  centerColor: string,
  middleColor = "#091b35",
  edgeColor = "#030a18",
) {
  const layer = buildScreenLayer(
    context,
    width,
    height,
    `floor:${centerColor}:${middleColor}:${edgeColor}`,
    floorSpriteCache,
    (layerContext) => {
      const background = layerContext.createRadialGradient(
        width * 0.45,
        height * 0.42,
        0,
        width * 0.5,
        height * 0.5,
        Math.max(width, height),
      );
      background.addColorStop(0, centerColor);
      background.addColorStop(0.52, middleColor);
      background.addColorStop(1, edgeColor);
      layerContext.fillStyle = background;
      layerContext.fillRect(0, 0, width, height);
    },
  );
  if (layer) context.drawImage(layer, 0, 0, width, height);
}

/** Cached screen-space vignette avoids rebuilding and rasterizing a full gradient each frame. */
export function drawArenaVignette(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const layer = buildScreenLayer(
    context,
    width,
    height,
    "vignette",
    vignetteSpriteCache,
    (layerContext) => {
      const vignette = layerContext.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.32,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.7,
      );
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(0,4,14,0.48)");
      layerContext.fillStyle = vignette;
      layerContext.fillRect(0, 0, width, height);
    },
  );
  if (layer) context.drawImage(layer, 0, 0, width, height);
}

function drawCompassRose(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
) {
  context.save();
  context.translate(x, y);
  context.strokeStyle = "rgba(108, 205, 214, 0.11)";
  context.fillStyle = "rgba(89, 181, 199, 0.055)";
  context.lineWidth = Math.max(1, radius * 0.035);
  context.beginPath();
  for (let point = 0; point < 16; point += 1) {
    const angle = -Math.PI / 2 + point * (Math.PI / 8);
    const length = point % 2 === 0 ? radius : radius * 0.43;
    const px = Math.cos(angle) * length;
    const py = Math.sin(angle) * length;
    if (point === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  }
  context.closePath();
  context.fill();
  context.stroke();
  context.beginPath();
  context.moveTo(0, -radius * 1.18);
  context.lineTo(0, radius * 1.18);
  context.moveTo(-radius * 1.18, 0);
  context.lineTo(radius * 1.18, 0);
  context.stroke();
  context.restore();
}

/**
 * Low-cost nautical chart texture. There are deliberately no pellet/dot marks:
 * the arena floor is made from rolling tide contours, chart routes and sparse
 * compass roses, so every small solid object still reads as real treasure.
 */
export function drawNauticalChart(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  camera: Vec2,
  zoom: number,
  now: number,
) {
  const waveSpacing = Math.max(82, 132 * zoom);
  const waveOffset = ((-camera.y * zoom) % waveSpacing + waveSpacing) % waveSpacing;
  const scroll = ((-camera.x * zoom) % 180 + 180) % 180;
  context.save();
  context.strokeStyle = "rgba(73, 175, 195, 0.105)";
  context.lineWidth = Math.max(1, zoom * 1.2);
  let hasWavePath = false;
  for (let y = waveOffset - waveSpacing; y < height + waveSpacing; y += waveSpacing) {
    if (!hasWavePath) {
      context.beginPath();
      hasWavePath = true;
    }
    for (let x = -80; x <= width + 80; x += 56) {
      const wave = Math.sin((x + scroll) * 0.019 + y * 0.004 + now * 0.00008) * 9 * zoom;
      if (x === -80) context.moveTo(x, y + wave);
      else context.lineTo(x, y + wave);
    }
  }
  if (hasWavePath) context.stroke();

  const routeSpacing = Math.max(360, 620 * zoom);
  const routeOffset = ((-camera.x * zoom) % routeSpacing + routeSpacing) % routeSpacing;
  context.strokeStyle = "rgba(246, 205, 105, 0.08)";
  context.lineWidth = 1;
  context.setLineDash([18, 15]);
  let hasRoutePath = false;
  for (let x = routeOffset - routeSpacing; x < width + routeSpacing; x += routeSpacing) {
    if (!hasRoutePath) {
      context.beginPath();
      hasRoutePath = true;
    }
    context.moveTo(x - height * 0.28, -30);
    context.lineTo(x + height * 0.28, height + 30);
  }
  if (hasRoutePath) context.stroke();
  context.setLineDash([]);

  const roseSpacing = Math.max(720, 980 * zoom);
  const roseX = ((-camera.x * zoom + roseSpacing * 0.31) % roseSpacing + roseSpacing) % roseSpacing;
  const roseY = ((-camera.y * zoom + roseSpacing * 0.57) % roseSpacing + roseSpacing) % roseSpacing;
  for (let x = roseX - roseSpacing; x < width + roseSpacing; x += roseSpacing) {
    for (let y = roseY - roseSpacing; y < height + roseSpacing; y += roseSpacing) {
      drawCompassRose(context, x, y, Math.max(34, 54 * zoom));
    }
  }
  context.restore();
}

/**
 * A screen-space ship silhouette and timber rail make the fantasy literal
 * without creating an interactive-looking world object or another collider.
 */
function paintPirateShipBackdrop(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const scale = Math.max(0.72, Math.min(1.35, Math.min(width / 900, height / 720)));
  const mastX = width * (width < 520 ? 0.74 : 0.8);
  const mastTop = height * 0.2;
  const deckY = height * 0.62;
  context.save();
  context.globalAlpha = width < 520 ? 0.105 : 0.085;
  context.strokeStyle = "#d5ad62";
  context.fillStyle = "#18424c";
  context.lineWidth = Math.max(2, 4 * scale);
  context.lineCap = "round";

  context.beginPath();
  context.moveTo(mastX, mastTop);
  context.lineTo(mastX, deckY);
  context.stroke();

  context.beginPath();
  context.moveTo(mastX - 4 * scale, mastTop + 24 * scale);
  context.lineTo(mastX - 126 * scale, deckY - 38 * scale);
  context.lineTo(mastX - 4 * scale, deckY - 54 * scale);
  context.closePath();
  context.fill();
  context.stroke();
  context.beginPath();
  context.moveTo(mastX + 5 * scale, mastTop + 58 * scale);
  context.lineTo(mastX + 78 * scale, deckY - 42 * scale);
  context.lineTo(mastX + 5 * scale, deckY - 56 * scale);
  context.closePath();
  context.fill();
  context.stroke();

  context.fillStyle = "#8f342f";
  context.beginPath();
  context.moveTo(mastX, mastTop);
  context.lineTo(mastX + 58 * scale, mastTop + 16 * scale);
  context.lineTo(mastX, mastTop + 34 * scale);
  context.closePath();
  context.fill();

  context.fillStyle = "#4d2b18";
  context.beginPath();
  context.moveTo(mastX - 148 * scale, deckY - 20 * scale);
  context.quadraticCurveTo(mastX - 30 * scale, deckY + 72 * scale, mastX + 110 * scale, deckY - 6 * scale);
  context.lineTo(mastX + 88 * scale, deckY + 34 * scale);
  context.quadraticCurveTo(mastX - 30 * scale, deckY + 106 * scale, mastX - 126 * scale, deckY + 26 * scale);
  context.closePath();
  context.fill();
  context.stroke();

  context.globalAlpha = 0.23;
  context.fillStyle = "#5c321a";
  context.fillRect(0, height - 12, width, 12);
  context.strokeStyle = "#e3bc68";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, height - 14);
  context.quadraticCurveTo(width * 0.25, height - 5, width * 0.5, height - 14);
  context.quadraticCurveTo(width * 0.75, height - 23, width, height - 14);
  context.stroke();
  context.restore();
}

export function drawPirateShipBackdrop(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  // This is a small vector scene with one thin full-width rail. Painting it
  // directly preserves every authored path while avoiding a transparent
  // full-canvas drawImage/compositor pass on every gameplay frame.
  paintPirateShipBackdrop(context, width, height);
}

function traceGemPath(
  context: CanvasRenderingContext2D,
  radius: number,
  variant: number,
) {
  const points = gemShapePoints(variant);
  context.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) context.moveTo(x * radius, y * radius);
    else context.lineTo(x * radius, y * radius);
  });
  context.closePath();
}

function gemShapePoints(variant: number): ReadonlyArray<readonly [number, number]> {
  return variant === 0
    ? [[0, -1], [0.82, -0.32], [0.56, 0.78], [0, 1], [-0.56, 0.78], [-0.82, -0.32]]
    : variant === 1
      ? [[-0.54, -1], [0.54, -1], [0.92, -0.42], [0.72, 0.82], [0, 1], [-0.72, 0.82], [-0.92, -0.42]]
      : variant === 2
        ? [[0, -1], [0.88, -0.42], [0.68, 0.62], [0, 1], [-0.68, 0.62], [-0.88, -0.42]]
        : variant === 3
          ? [[-0.5, -1], [0.5, -1], [0.92, -0.5], [0.92, 0.5], [0.5, 1], [-0.5, 1], [-0.92, 0.5], [-0.92, -0.5]]
          : [[0, -1], [0.72, -0.72], [1, 0], [0.72, 0.72], [0, 1], [-0.72, 0.72], [-1, 0], [-0.72, -0.72]];
}

function paintFacetedGem(
  context: CanvasRenderingContext2D,
  gemRadius: number,
  color: string,
  variant: number,
) {
  if (gemRadius >= 9) {
    context.shadowColor = color;
    context.shadowBlur = Math.min(11, gemRadius * 1.25);
  }
  context.fillStyle = color;
  context.strokeStyle = "rgba(235, 255, 255, 0.82)";
  context.lineWidth = Math.max(0.85, gemRadius * 0.11);
  traceGemPath(context, gemRadius, variant);
  context.fill();
  context.shadowBlur = 0;
  context.stroke();

  context.fillStyle = "rgba(255, 255, 255, 0.42)";
  context.beginPath();
  context.moveTo(0, -gemRadius * 0.77);
  context.lineTo(gemRadius * 0.5, -gemRadius * 0.28);
  context.lineTo(0, -gemRadius * 0.08);
  context.lineTo(-gemRadius * 0.35, -gemRadius * 0.34);
  context.closePath();
  context.fill();
  context.strokeStyle = "rgba(3, 22, 37, 0.34)";
  context.lineWidth = Math.max(0.65, gemRadius * 0.075);
  context.beginPath();
  context.moveTo(-gemRadius * 0.8, -gemRadius * 0.28);
  context.lineTo(0, -gemRadius * 0.08);
  context.lineTo(gemRadius * 0.8, -gemRadius * 0.28);
  context.moveTo(0, -gemRadius * 0.08);
  context.lineTo(0, gemRadius * 0.82);
  context.stroke();
}

/** A legible cut jewel, intentionally never rendered as a circular pellet. */
export function drawFacetedGem(
  context: CanvasRenderingContext2D,
  radius: number,
  color: string,
  now: number,
  seed: number,
) {
  // A roughly 24px minimum silhouette keeps ordinary treasure recognizable on
  // a phone. Smaller faceting still collapses into the colored-dot look the
  // owner rejected at native gameplay scale.
  const gemRadius = spriteRadius(Math.max(10.5, radius * 1.28));
  const variant = seed % 5;
  const sway = Math.sin(now * 0.0022 + seed * 0.013) * 0.11;
  const image = readyRenderImage(PIRATE_RENDER_ASSETS.cutJewel);
  const spriteHalfSize = gemRadius * (image ? 1.65 : 2.25);
  const sprite = buildSprite(
    `gem:${image ? "authored" : "fallback"}:${variant}:${gemRadius}:${color}`,
    gemSpriteCache,
    spriteHalfSize,
    (spriteContext) => {
      if (image) {
        paintRenderImage(
          spriteContext,
          image,
          gemRadius * 2.72,
          gemRadius * 2.72,
          color,
          color,
        );
      } else {
        paintFacetedGem(spriteContext, gemRadius, color, variant);
      }
    },
  );
  context.save();
  context.rotate(sway + ((seed % 17) - 8) * 0.018);
  if (sprite) {
    context.drawImage(
      sprite,
      -sprite.width / 2,
      -sprite.height / 2,
      sprite.width,
      sprite.height,
    );
  } else {
    paintFacetedGem(context, gemRadius, color, variant);
  }
  context.restore();
}

/**
 * Fast path for the numerous neutral field jewels. Rotation is baked into a
 * 32-step sprite, removing nested save/translate/rotate work while retaining
 * the faceted silhouette, highlight, glow, minimum size and gentle sway.
 */
export function drawFacetedGemAt(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  now: number,
  seed: number,
) {
  const gemRadius = spriteRadius(Math.max(10.5, radius * 1.28));
  const variant = seed % 5;
  const angle = Math.sin(now * 0.0022 + seed * 0.013) * 0.11 + ((seed % 17) - 8) * 0.018;
  const angleBin = Math.round(angle / TAU * 32);
  const quantizedAngle = angleBin / 32 * TAU;
  const image = readyRenderImage(PIRATE_RENDER_ASSETS.cutJewel);
  const spriteHalfSize = gemRadius * (image ? 1.65 : 2.25);
  const sprite = buildSprite(
    `gem-at:${image ? "authored" : "fallback"}:${variant}:${gemRadius}:${color}:${angleBin}`,
    positionedGemSpriteCache,
    spriteHalfSize,
    (spriteContext) => {
      spriteContext.rotate(quantizedAngle);
      if (image) {
        paintRenderImage(
          spriteContext,
          image,
          gemRadius * 2.72,
          gemRadius * 2.72,
          color,
          color,
        );
      } else {
        paintFacetedGem(spriteContext, gemRadius, color, variant);
      }
    },
    768,
  );
  if (sprite) {
    context.drawImage(
      sprite,
      x - sprite.width / 2,
      y - sprite.height / 2,
      sprite.width,
      sprite.height,
    );
    return;
  }
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  paintFacetedGem(context, gemRadius, color, variant);
  context.restore();
}

export interface FacetedGemFieldItem {
  id: string;
  position: Vec2;
  radius: number;
  color: string;
  seed: number;
}

/**
 * Common neutral gems keep the proven bounded sprite fast path. Rare chests,
 * rival loot and relics remain individually animated.
 */
export function drawFacetedGemField(
  context: CanvasRenderingContext2D,
  _namespace: string,
  items: readonly FacetedGemFieldItem[],
  worldToScreen: (point: Vec2) => Vec2,
  zoom: number,
  width: number,
  height: number,
  now: number,
) {
  for (const item of items) {
    const screen = worldToScreen(item.position);
    const radius = Math.max(2.2, item.radius * zoom);
    if (
      screen.x < -radius * 3 ||
      screen.y < -radius * 3 ||
      screen.x > width + radius * 3 ||
      screen.y > height + radius * 3
    ) continue;
    drawFacetedGemAt(context, screen.x, screen.y, radius, item.color, now, item.seed);
  }
}

function paintTreasureChest(
  context: CanvasRenderingContext2D,
  size: number,
  color: string,
) {
  context.shadowColor = "#ffcb57";
  context.shadowBlur = size >= 8 ? 13 : 7;
  context.strokeStyle = "#ffd86b";
  context.lineWidth = Math.max(1.2, size * 0.16);
  context.fillStyle = "#6f321d";
  context.beginPath();
  context.roundRect(-size * 1.18, -size * 0.08, size * 2.36, size * 1.02, size * 0.14);
  context.fill();
  context.stroke();
  context.fillStyle = "#8c4726";
  context.beginPath();
  context.moveTo(-size * 1.16, -size * 0.08);
  context.quadraticCurveTo(-size * 0.88, -size * 0.9, 0, -size * 0.88);
  context.quadraticCurveTo(size * 0.88, -size * 0.9, size * 1.16, -size * 0.08);
  context.closePath();
  context.fill();
  context.stroke();
  context.shadowBlur = 0;
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(-size * 0.62, -size * 0.46);
  context.lineTo(-size * 0.28, -size * 1.15);
  context.lineTo(0, -size * 0.42);
  context.lineTo(size * 0.34, -size * 1.08);
  context.lineTo(size * 0.67, -size * 0.39);
  context.closePath();
  context.fill();
  context.fillStyle = "#ffe992";
  context.fillRect(-size * 0.18, -size * 0.18, size * 0.36, size * 0.64);
  context.fillStyle = "#26150f";
  context.beginPath();
  context.moveTo(0, size * 0.05);
  context.lineTo(size * 0.11, size * 0.3);
  context.lineTo(-size * 0.11, size * 0.3);
  context.closePath();
  context.fill();
}

/** One high-value collider presented as an unmistakable treasure chest. */
export function drawTreasureChest(
  context: CanvasRenderingContext2D,
  radius: number,
  color: string,
  now: number,
  seed: number,
) {
  const size = spriteRadius(Math.max(12, radius * 1.35));
  const bob = Math.sin(now * 0.0035 + seed * 0.021) * size * 0.08;
  const image = readyRenderImage(PIRATE_RENDER_ASSETS.treasureChest);
  const spriteHalfSize = size * (image ? 2.2 : 2.35);
  const sprite = buildSprite(
    `chest:${image ? "authored" : "fallback"}:${size}:${color}`,
    chestSpriteCache,
    spriteHalfSize,
    (spriteContext) => {
      if (image) {
        paintRenderImage(
          spriteContext,
          image,
          size * 3.45,
          size * 3.45,
          undefined,
          "#ffcb57",
        );
      } else {
        paintTreasureChest(spriteContext, size, color);
      }
    },
  );
  context.save();
  context.translate(0, bob);
  context.rotate(Math.sin(now * 0.0014 + seed) * 0.045);
  if (sprite) {
    context.drawImage(
      sprite,
      -sprite.width / 2,
      -sprite.height / 2,
      sprite.width,
      sprite.height,
    );
  } else {
    paintTreasureChest(context, size, color);
  }
  context.restore();
}

/** Defeated-chain loot reads as a marked rival gem, not another food pellet. */
export function drawRivalHoardGem(
  context: CanvasRenderingContext2D,
  radius: number,
  color: string,
  now: number,
  seed: number,
) {
  const gemRadius = Math.max(5.2, radius * 1.35);
  drawFacetedGem(context, gemRadius, color, now * 0.72, seed);
  context.save();
  context.rotate(-0.38);
  context.strokeStyle = "rgba(255, 221, 113, 0.94)";
  context.lineWidth = Math.max(1.1, gemRadius * 0.13);
  context.beginPath();
  context.moveTo(-gemRadius * 0.92, -gemRadius * 0.92);
  context.lineTo(gemRadius * 0.92, gemRadius * 0.92);
  context.stroke();
  context.restore();
}

/** A brass loot compass used for the temporary pickup-attraction relic. */
export function drawLootCompass(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  timerRatio = 1,
) {
  if (radius < 3) return;
  context.save();
  context.translate(x, y);
  context.fillStyle = "#123843";
  context.strokeStyle = "#ffd56c";
  context.lineWidth = Math.max(1, radius * 0.12);
  context.beginPath();
  context.arc(0, 0, radius, 0, TAU);
  context.fill();
  context.stroke();
  context.rotate(-0.32);
  context.fillStyle = "#fff1a9";
  context.beginPath();
  context.moveTo(0, -radius * 0.76);
  context.lineTo(radius * 0.24, 0);
  context.lineTo(0, radius * 0.18);
  context.lineTo(-radius * 0.24, 0);
  context.closePath();
  context.fill();
  context.fillStyle = "#f15d62";
  context.beginPath();
  context.moveTo(0, radius * 0.76);
  context.lineTo(radius * 0.24, 0);
  context.lineTo(0, -radius * 0.18);
  context.lineTo(-radius * 0.24, 0);
  context.closePath();
  context.fill();
  context.rotate(0.32);
  context.strokeStyle = "rgba(222, 255, 249, 0.94)";
  context.lineWidth = Math.max(0.9, radius * 0.1);
  context.beginPath();
  context.arc(0, 0, radius * 0.82, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0, Math.min(1, timerRatio)));
  context.stroke();
  context.restore();
}

/** Small burst fragments remain faceted treasure instead of round particles. */
export function drawTreasureShard(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  rotation: number,
) {
  const size = Math.max(1.8, radius);
  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(0, -size);
  context.lineTo(size * 0.72, size * 0.55);
  context.lineTo(-size * 0.62, size * 0.78);
  context.closePath();
  context.fill();
  context.restore();
}

export interface ContinuousPirateWormOptions {
  /** Screen-space centers from the authoritative head through the final body sample. */
  points: readonly Vec2[];
  headRadius: number;
  bodyRadius: number;
  palette: readonly string[];
  direction: Vec2;
  shielded: boolean;
  identity: number;
  now: number;
  /** Authored animated material; omitted → the plain surface, byte-identical to before. */
  pattern?: WormMaterialPattern;
  /** 0 = still material composition, 1 = full motion. Defaults to full. */
  materialMotion?: number;
  /** Allows the material's brightest pass to spend shadowBlur on bloom. */
  materialGlow?: boolean;
}

function traceWormCenterline(
  context: CanvasRenderingContext2D,
  points: readonly Vec2[],
) {
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index].x, points[index].y);
  }
}

function unitVector(from: Vec2, to: Vec2, fallback: Vec2): Vec2 {
  const x = to.x - from.x;
  const y = to.y - from.y;
  const length = Math.hypot(x, y);
  return length > 0.0001 ? { x: x / length, y: y / length } : fallback;
}

function drawClippedAtlasPart(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  point: Vec2,
  radius: number,
  angle: number,
  tint: string,
  alpha = 1,
  scale = 2.25,
) {
  context.save();
  context.translate(point.x, point.y);
  context.beginPath();
  context.arc(0, 0, radius, 0, TAU);
  context.clip();
  context.rotate(angle);
  context.globalAlpha = alpha;
  paintRenderImage(context, image, radius * scale, radius * scale, tint);
  context.restore();
}

function drawProceduralWormHead(
  context: CanvasRenderingContext2D,
  point: Vec2,
  radius: number,
  angle: number,
  palette: readonly string[],
  shielded: boolean,
) {
  context.save();
  context.translate(point.x, point.y);
  context.rotate(angle);

  // One expressive lead head is allowed; the body behind it remains one skin,
  // rather than a row of repeated portrait tokens.
  context.fillStyle = palette[2] ?? "#8affea";
  context.beginPath();
  context.ellipse(radius * 0.16, radius * 0.04, radius * 0.68, radius * 0.56, 0, 0, TAU);
  context.fill();
  context.fillStyle = "rgba(255,255,255,0.96)";
  context.beginPath();
  context.ellipse(radius * 0.25, -radius * 0.22, radius * 0.2, radius * 0.24, 0, 0, TAU);
  context.fill();
  context.fillStyle = "#071326";
  context.beginPath();
  context.arc(radius * 0.32, -radius * 0.2, radius * 0.085, 0, TAU);
  context.fill();
  context.strokeStyle = "rgba(4,22,36,0.9)";
  context.lineWidth = Math.max(1, radius * 0.08);
  context.lineCap = "round";
  context.beginPath();
  context.arc(radius * 0.34, radius * 0.08, radius * 0.3, 0.18 * Math.PI, 0.78 * Math.PI);
  context.stroke();

  context.fillStyle = "#5b1b2d";
  context.strokeStyle = "#ffd56c";
  context.lineWidth = Math.max(0.8, radius * 0.07);
  context.beginPath();
  context.moveTo(-radius * 0.68, -radius * 0.34);
  context.quadraticCurveTo(-radius * 0.12, -radius * 0.86, radius * 0.58, -radius * 0.4);
  context.quadraticCurveTo(radius * 0.14, -radius * 0.18, -radius * 0.68, -radius * 0.34);
  context.closePath();
  context.fill();
  context.stroke();

  if (shielded) {
    context.strokeStyle = "rgba(225,255,252,0.8)";
    context.lineWidth = Math.max(1, radius * 0.07);
    context.beginPath();
    context.arc(0, 0, radius * 0.79, 0, TAU);
    context.stroke();
  }
  context.restore();
}

function drawProceduralWormTail(
  context: CanvasRenderingContext2D,
  point: Vec2,
  radius: number,
  angle: number,
  palette: readonly string[],
) {
  context.save();
  context.translate(point.x, point.y);
  context.rotate(angle);
  context.fillStyle = palette[0] ?? "#4ee5cf";
  context.strokeStyle = "#ffd56c";
  context.lineWidth = Math.max(0.8, radius * 0.07);
  context.beginPath();
  context.moveTo(-radius * 0.24, 0);
  context.quadraticCurveTo(radius * 0.28, -radius * 0.16, radius * 0.68, -radius * 0.65);
  context.quadraticCurveTo(radius * 0.58, 0, radius * 0.68, radius * 0.65);
  context.quadraticCurveTo(radius * 0.28, radius * 0.16, -radius * 0.24, 0);
  context.closePath();
  context.fill();
  context.stroke();
  context.restore();
}

/**
 * Paints one continuous, collision-faithful worm surface. The widest stroke is
 * exactly the authoritative body diameter; all authored atlas pieces are
 * clipped inside the corresponding head/body circle. No face-bead loop exists.
 */
export function drawContinuousPirateWorm(
  context: CanvasRenderingContext2D,
  options: ContinuousPirateWormOptions,
) {
  const {
    points,
    headRadius,
    bodyRadius,
    palette,
    direction,
    shielded,
    identity,
    now,
    pattern,
    materialMotion,
    materialGlow,
  } = options;
  if (points.length < 2 || headRadius <= 0 || bodyRadius <= 0) return;

  const outer = palette[1] ?? "#075d69";
  const skin = palette[0] ?? "#19cbb8";
  const highlight = palette[2] ?? "#a0fff0";

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.shadowBlur = 0;

  // The dark keel, skin, and highlight are nested. Only the first stroke
  // reaches the exact collider edge; every detail remains inside it.
  // Trace the moving centerline once, then repaint that same path at each
  // nested width. Rebuilding an identical path four times per player was a
  // large avoidable command stream in crowded 29-chain scenes.
  traceWormCenterline(context, points);
  context.globalAlpha = 1;
  context.strokeStyle = "#052532";
  context.lineWidth = bodyRadius * 2;
  context.stroke();
  context.strokeStyle = outer;
  context.lineWidth = bodyRadius * 1.86;
  context.stroke();
  context.strokeStyle = skin;
  context.lineWidth = bodyRadius * 1.42;
  context.stroke();
  context.globalAlpha = 0.46 + Math.sin(now * 0.0015 + identity) * 0.05;
  context.strokeStyle = highlight;
  context.lineWidth = Math.max(1.2, bodyRadius * 0.2);
  context.stroke();

  // Sparse scale chevrons read as one flowing hide, not one token per sample.
  context.globalAlpha = 0.34;
  context.strokeStyle = "rgba(4,31,41,0.92)";
  context.lineWidth = Math.max(0.7, bodyRadius * 0.07);
  let hasChevronPath = false;
  for (let index = 1 + (Math.abs(identity) % 2); index < points.length - 1; index += 2) {
    const tangent = unitVector(points[index - 1], points[index + 1], direction);
    const normal = { x: -tangent.y, y: tangent.x };
    const center = points[index];
    if (!hasChevronPath) {
      context.beginPath();
      hasChevronPath = true;
    }
    context.moveTo(
      center.x - normal.x * bodyRadius * 0.43 - tangent.x * bodyRadius * 0.17,
      center.y - normal.y * bodyRadius * 0.43 - tangent.y * bodyRadius * 0.17,
    );
    context.quadraticCurveTo(
      center.x + tangent.x * bodyRadius * 0.28,
      center.y + tangent.y * bodyRadius * 0.28,
      center.x + normal.x * bodyRadius * 0.43 - tangent.x * bodyRadius * 0.17,
      center.y + normal.y * bodyRadius * 0.43 - tangent.y * bodyRadius * 0.17,
    );
  }
  if (hasChevronPath) context.stroke();
  context.restore();

  // The theme's animated material rides on top of the plain surface and stays
  // inside the skin stroke by construction, so the collider silhouette that the
  // widest keel stroke established is never widened.
  if (pattern) {
    drawWormMaterial(context, pattern, {
      points,
      bodyRadius,
      palette,
      identity,
      now,
      motion: materialMotion ?? 1,
      glow: materialGlow,
    });
  }

  // A single inset body emblem enriches larger worms without reconstructing a
  // chain of repeated body blocks.
  if (points.length >= 6) {
    const markIndex = Math.min(points.length - 2, Math.max(2, Math.floor(points.length * 0.42)));
    const tangent = unitVector(points[markIndex - 1], points[markIndex + 1], direction);
    const bodyImage = readyRenderImage(
      identity % 2 === 0
        ? PIRATE_RENDER_ASSETS.wormBodyPorthole
        : PIRATE_RENDER_ASSETS.wormBodySash,
    );
    if (bodyImage) {
      drawClippedAtlasPart(
        context,
        bodyImage,
        points[markIndex],
        bodyRadius * 0.9,
        Math.atan2(tangent.y, tangent.x),
        skin,
        0.72,
        2.35,
      );
    }
  }

  const tailPoint = points.at(-1)!;
  const beforeTail = points.at(-2)!;
  const tailDirection = unitVector(beforeTail, tailPoint, { x: -direction.x, y: -direction.y });
  const tailAngle = Math.atan2(tailDirection.y, tailDirection.x);
  const tailImage = readyRenderImage(PIRATE_RENDER_ASSETS.wormTail);
  if (tailImage) {
    drawClippedAtlasPart(context, tailImage, tailPoint, bodyRadius, tailAngle, skin, 0.96, 2.38);
  } else {
    drawProceduralWormTail(context, tailPoint, bodyRadius, tailAngle, palette);
  }

  const headPoint = points[0];
  context.save();
  context.fillStyle = outer;
  context.beginPath();
  context.arc(headPoint.x, headPoint.y, headRadius, 0, TAU);
  context.fill();
  context.fillStyle = skin;
  context.beginPath();
  context.arc(headPoint.x, headPoint.y, headRadius * 0.88, 0, TAU);
  context.fill();
  context.restore();

  const headAngle = Math.atan2(direction.y, direction.x);
  const headImage = readyRenderImage(PIRATE_RENDER_ASSETS.wormHead);
  if (headImage) {
    drawClippedAtlasPart(context, headImage, headPoint, headRadius, headAngle, skin, 0.98, 2.32);
  } else {
    drawProceduralWormHead(context, headPoint, headRadius, headAngle, palette, shielded);
  }

  // The outline is inset so it communicates the exact lethal edge without
  // extending the visible worm beyond the authoritative head circle.
  context.save();
  const outlineWidth = Math.max(1, headRadius * 0.08);
  context.strokeStyle = "rgba(255,233,153,0.82)";
  context.lineWidth = outlineWidth;
  context.beginPath();
  context.arc(headPoint.x, headPoint.y, Math.max(0, headRadius - outlineWidth / 2), 0, TAU);
  context.stroke();
  context.restore();
}

/** Pirate identity marks stay inside the solid crew silhouette. */
export function drawPirateCrewMark(
  context: CanvasRenderingContext2D,
  radius: number,
  identity: number,
  index: number,
  head: boolean,
) {
  if (radius < 5.5) return;
  const cloth = ["#5b1b2d", "#163f6a", "#5a3218", "#2c5945"][identity % 4];
  context.save();
  context.lineJoin = "round";
  if (head) {
    // Compact tricorn: decorative, but entirely within the lethal head circle.
    context.fillStyle = cloth;
    context.strokeStyle = "rgba(255, 214, 110, .86)";
    context.lineWidth = Math.max(0.8, radius * 0.08);
    context.beginPath();
    context.moveTo(-radius * 0.76, -radius * 0.43);
    context.quadraticCurveTo(-radius * 0.32, -radius * 0.82, 0, -radius * 0.7);
    context.quadraticCurveTo(radius * 0.32, -radius * 0.82, radius * 0.76, -radius * 0.43);
    context.quadraticCurveTo(radius * 0.28, -radius * 0.16, 0, -radius * 0.34);
    context.quadraticCurveTo(-radius * 0.28, -radius * 0.16, -radius * 0.76, -radius * 0.43);
    context.closePath();
    context.fill();
    context.stroke();

    if (identity % 2 === 0) {
      const patchX = identity % 4 === 0 ? radius * 0.34 : -radius * 0.34;
      context.strokeStyle = "rgba(9, 13, 20, .9)";
      context.fillStyle = "#101016";
      context.lineWidth = Math.max(0.9, radius * 0.085);
      context.beginPath();
      context.moveTo(-radius * 0.64, -radius * 0.33);
      context.lineTo(radius * 0.64, -radius * 0.04);
      context.stroke();
      context.beginPath();
      context.ellipse(patchX, -radius * 0.11, radius * 0.2, radius * 0.24, 0, 0, TAU);
      context.fill();
    }
  } else if ((identity + index) % 3 === 0) {
    context.strokeStyle = cloth;
    context.lineWidth = Math.max(1.2, radius * 0.18);
    context.beginPath();
    context.moveTo(-radius * 0.62, radius * 0.42);
    context.lineTo(radius * 0.62, radius * 0.18);
    context.stroke();
    context.strokeStyle = "rgba(255, 222, 130, .78)";
    context.lineWidth = Math.max(0.6, radius * 0.045);
    context.stroke();
  }
  context.restore();
}

function tracePirateCreatureSilhouette(
  context: CanvasRenderingContext2D,
  radius: number,
  variant: number,
) {
  if (variant === 0) {
    context.ellipse(0, 0, radius * 0.98, radius * 0.9, 0, 0, TAU);
    return;
  }
  if (variant === 1) {
    context.roundRect(
      -radius * 0.66,
      -radius * 0.66,
      radius * 1.32,
      radius * 1.32,
      radius * 0.34,
    );
    return;
  }
  const points = variant === 2 ? 6 : variant === 3 ? 5 : 8;
  const innerFactor = variant === 3 ? 0.58 : variant === 4 ? 0.72 : 1;
  const pointCount = innerFactor < 1 ? points * 2 : points;
  for (let point = 0; point < pointCount; point += 1) {
    const angle = -Math.PI / 2 + (point / pointCount) * TAU;
    const radial = point % 2 === 1 && innerFactor < 1
      ? radius * innerFactor
      : radius * 0.94;
    const x = Math.cos(angle) * radial;
    const y = Math.sin(angle) * radial;
    if (point === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
}

function paintPirateCreature(
  context: CanvasRenderingContext2D,
  radius: number,
  palette: readonly string[],
  primarySlot: number,
  variant: number,
  direction: Vec2,
  head: boolean,
  shielded: boolean,
  identity: number,
  index: number,
) {
  const primary = palette[primarySlot];
  context.shadowColor = primary;
  context.shadowBlur = head ? 18 : 10;
  const gradient = context.createRadialGradient(
    -radius * 0.34,
    -radius * 0.42,
    radius * 0.05,
    0,
    0,
    radius * 1.2,
  );
  gradient.addColorStop(0, palette[2]);
  gradient.addColorStop(0.25, primary);
  gradient.addColorStop(1, palette[(primarySlot + 1) % 2]);
  context.fillStyle = gradient;
  context.beginPath();
  tracePirateCreatureSilhouette(context, radius, variant);
  context.fill();
  context.shadowBlur = 0;

  if (radius < 5.5) return;
  const eyeOffset = radius * 0.34;
  const eyeY = -radius * 0.13;
  const pupilX = direction.x * radius * 0.08;
  const pupilY = direction.y * radius * 0.08;
  context.fillStyle = "rgba(255,255,255,0.94)";
  context.beginPath();
  context.ellipse(-eyeOffset, eyeY, radius * 0.25, radius * 0.31, 0, 0, TAU);
  context.ellipse(eyeOffset, eyeY, radius * 0.25, radius * 0.31, 0, 0, TAU);
  context.fill();
  context.fillStyle = "#061326";
  context.beginPath();
  context.arc(-eyeOffset + pupilX, eyeY + pupilY, radius * 0.105, 0, TAU);
  context.arc(eyeOffset + pupilX, eyeY + pupilY, radius * 0.105, 0, TAU);
  context.fill();
  context.fillStyle = "#fff";
  context.beginPath();
  context.arc(-eyeOffset + pupilX - radius * 0.025, eyeY + pupilY - radius * 0.035, radius * 0.03, 0, TAU);
  context.arc(eyeOffset + pupilX - radius * 0.025, eyeY + pupilY - radius * 0.035, radius * 0.03, 0, TAU);
  context.fill();

  context.strokeStyle = "rgba(4,22,36,0.82)";
  context.lineWidth = Math.max(1.1, radius * 0.09);
  context.lineCap = "round";
  context.beginPath();
  if (shielded) {
    context.arc(0, radius * 0.19, radius * 0.18, 0.15 * Math.PI, 0.85 * Math.PI, true);
  } else if (head) {
    context.arc(0, radius * 0.15, radius * 0.28, 0.12 * Math.PI, 0.88 * Math.PI);
  } else {
    context.moveTo(-radius * 0.16, radius * 0.23);
    context.quadraticCurveTo(0, radius * 0.32, radius * 0.16, radius * 0.23);
  }
  context.stroke();

  // Limbs and pirate marks remain completely inside the collision silhouette.
  context.strokeStyle = "rgba(4,24,39,0.55)";
  context.lineWidth = Math.max(1, radius * 0.07);
  context.beginPath();
  context.moveTo(-radius * 0.76, radius * 0.18);
  context.lineTo(-radius * 0.53, radius * 0.03);
  context.moveTo(radius * 0.76, radius * 0.18);
  context.lineTo(radius * 0.53, radius * 0.03);
  context.stroke();
  drawPirateCrewMark(context, radius, identity, index, head);
}

/**
 * Complete living-chain crew portrait cached as semantic visual classes.
 * Gaze is quantized to four positions while whole-body lean remains continuous;
 * location, authoritative radius and chain collision geometry stay exact.
 */
export function drawPirateCreature(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  palette: readonly string[],
  index: number,
  direction: Vec2,
  head: boolean,
  shielded: boolean,
  identity: number,
) {
  if (radius < 1.5) return;
  // One high-resolution source per role prevents size-bucket churn while the
  // destination stays scaled to the exact authoritative radius.
  const bucketRadius = head ? 32 : 24;
  const identityKey = ((identity % 60) + 60) % 60;
  const indexKey = ((index % 30) + 30) % 30;
  const primarySlot = indexKey % 2;
  const variant = (identityKey + indexKey * 7 + (head ? 3 : 0)) % 5;
  const markClass = head
    ? `head-${identityKey % 4}`
    : (identityKey + indexKey) % 3 === 0
      ? `sash-${identityKey % 4}`
      : "plain";
  // Spawn grace protects only the head, so body portraits never need a second
  // shield-expression cache class.
  const effectiveShielded = head && shielded;
  const directionAngle = Math.atan2(direction.y, direction.x);
  // Only the lead pirate needs directional gaze. Crew members keep a neutral
  // gaze while their complete chain still leans continuously with direction.
  // This removes four native textures per body class without changing shape,
  // color, clothing, highlight, collision silhouette or movement.
  const directionBin = head
    ? ((Math.round(directionAngle / TAU * 4) % 4) + 4) % 4
    : 0;
  const quantizedAngle = directionBin / 4 * TAU;
  const quantizedDirection = head
    ? { x: Math.cos(quantizedAngle), y: Math.sin(quantizedAngle) }
    : { x: 0, y: 0 };
  const key = [
    bucketRadius,
    palette.join("/"),
    primarySlot,
    variant,
    markClass,
    directionBin,
    head ? 1 : 0,
    effectiveShielded ? 1 : 0,
  ].join(":");
  let sprite = creatureSpriteCache.get(key);
  if (!sprite && typeof document !== "undefined") {
    const halfSize = Math.ceil(bucketRadius * 1.15 + (head ? 20 : 12));
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = halfSize * 2;
    const spriteContext = canvas.getContext("2d");
    if (spriteContext) {
      spriteContext.translate(halfSize, halfSize);
      paintPirateCreature(
        spriteContext,
        bucketRadius,
        palette,
        primarySlot,
        variant,
        quantizedDirection,
        head,
        effectiveShielded,
        identityKey,
        indexKey,
      );
      rememberSprite(creatureSpriteCache, key, canvas, CREATURE_CACHE_LIMIT);
      sprite = canvas;
    }
  }

  context.save();
  context.translate(x, y);
  context.rotate(directionAngle * 0.07);
  const scale = radius / bucketRadius;
  if (sprite) {
    const width = sprite.width * scale;
    const height = sprite.height * scale;
    context.drawImage(sprite, -width / 2, -height / 2, width, height);
  } else {
    paintPirateCreature(
      context,
      radius,
      palette,
      primarySlot,
      variant,
      direction,
      head,
      effectiveShielded,
      identityKey,
      indexKey,
    );
  }
  context.restore();
}
