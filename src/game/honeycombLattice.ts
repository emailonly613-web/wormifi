/**
 * The Honeycomb Cove sea floor (owner order 2026-08-03: "honeycomb
 * background"). A world-anchored golden hex lattice drawn UNDER the treasure
 * layer on both arena canvases whenever the room's board is honeycomb-cove.
 *
 * Cost discipline: the lattice is rasterized ONCE into a small repeating
 * tile; each frame is a single pattern-fill with a camera/zoom transform.
 * Never stroke thousands of hexagons per frame — a zoomed-out 4K viewport
 * would hold ~2,000 of them.
 *
 * Client-only module (Canvas APIs) — never import from server code; pattern
 * names live apart from renderers exactly like wormMaterials vs
 * wormMaterialPatterns.
 */

/** Hex circumradius in world units. Sized so a spawn worm spans ~1.5 cells. */
export const HONEYCOMB_CELL_RADIUS = 46;

/** Lattice line styling — warm gold, deliberately faint under the treasure. */
const LATTICE_LINE = "rgba(255, 196, 84, 0.16)";
const LATTICE_GLOW = "rgba(255, 173, 40, 0.05)";
const LATTICE_LINE_WIDTH = 2.2;

/** Rasterization scale of the cached tile (crisper than 1:1 under zoom-in). */
const TILE_RESOLUTION = 2;

export interface HoneycombPatternCache {
  pattern: CanvasPattern | null;
  matrix: DOMMatrix | null;
  built: boolean;
}

export function createHoneycombPatternCache(): HoneycombPatternCache {
  return { pattern: null, matrix: null, built: false };
}

/**
 * The repeat unit of a pointy-top hex grid is (3*R) wide by (sqrt(3)*R) tall
 * with two half-offset hexes. Drawing the unit's six unique edge runs tiles
 * seamlessly in both axes.
 */
function buildTile(): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const radius = HONEYCOMB_CELL_RADIUS * TILE_RESOLUTION;
  const width = 3 * radius;
  const height = Math.sqrt(3) * radius;
  const tile = document.createElement("canvas");
  tile.width = Math.round(width);
  tile.height = Math.round(height);
  const context = tile.getContext("2d");
  if (!context) return null;

  const hexPath = (centerX: number, centerY: number) => {
    for (let corner = 0; corner <= 6; corner += 1) {
      const angle = (Math.PI / 3) * corner;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      if (corner === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
  };

  // Two passes: a soft wide glow, then the crisp line. The 3x3 stamp of the
  // two offset hex centers guarantees every edge crossing the tile boundary
  // is drawn on both sides of the seam.
  const centers: Array<[number, number]> = [];
  for (let column = -1; column <= 1; column += 1) {
    for (let row = -1; row <= 1; row += 1) {
      centers.push([
        column * width,
        row * height,
      ]);
      centers.push([
        column * width + width / 2,
        row * height + height / 2,
      ]);
    }
  }
  for (const [pass, style, lineWidth] of [
    [0, LATTICE_GLOW, LATTICE_LINE_WIDTH * 3.2],
    [1, LATTICE_LINE, LATTICE_LINE_WIDTH],
  ] as const) {
    void pass;
    context.strokeStyle = style;
    context.lineWidth = lineWidth * TILE_RESOLUTION;
    context.beginPath();
    for (const [x, y] of centers) hexPath(x, y);
    context.stroke();
  }
  return tile;
}

/**
 * Fills the viewport with the world-anchored lattice. Returns false (and
 * draws nothing) when the environment cannot build the tile — the board is
 * still fully playable on a plain floor.
 */
export function drawHoneycombLattice(
  context: CanvasRenderingContext2D,
  cache: HoneycombPatternCache,
  width: number,
  height: number,
  camera: { x: number; y: number },
  zoom: number,
): boolean {
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) return false;
  if (!Number.isFinite(camera.x) || !Number.isFinite(camera.y)) return false;
  if (!Number.isFinite(zoom) || zoom <= 0) return false;
  if (!cache.built) {
    cache.built = true;
    const tile = buildTile();
    if (tile) {
      cache.pattern = context.createPattern(tile, "repeat");
      cache.matrix = typeof DOMMatrix === "undefined" ? null : new DOMMatrix();
    }
  }
  const pattern = cache.pattern;
  const matrix = cache.matrix;
  if (!pattern || !matrix) return false;

  // World origin maps to screen center minus camera; the tile was drawn at
  // TILE_RESOLUTION x world scale, so the pattern shrinks by that factor.
  const scale = zoom / TILE_RESOLUTION;
  matrix.a = scale; matrix.b = 0; matrix.c = 0; matrix.d = scale;
  matrix.e = width / 2 - camera.x * zoom;
  matrix.f = height / 2 - camera.y * zoom;
  pattern.setTransform(matrix);

  context.save();
  context.fillStyle = pattern;
  context.fillRect(0, 0, width, height);
  context.restore();
  return true;
}
