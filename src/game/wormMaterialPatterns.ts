/**
 * The authored material pattern names, alone.
 *
 * The theme catalog is compiled by BOTH the browser bundle and the DOM-less
 * authoritative server (themes are the multiplayer-safe cosmetic), so the
 * catalog may only depend on this pure module. The canvas renderers for these
 * patterns live in wormMaterials.ts, which only the client imports.
 */

export const WORM_MATERIAL_PATTERNS = [
  "tidal-ribbon",
  "crown-wake",
  "signal-bloom",
  "faceted-wake",
  "raider-chevron",
  "spectral-ripple",
  "cutlass-flame",
  "broadside-bolt",
  "oracle-spiral",
] as const;

export type WormMaterialPattern = typeof WORM_MATERIAL_PATTERNS[number];

const PATTERN_SET: ReadonlySet<string> = new Set(WORM_MATERIAL_PATTERNS);

export function isWormMaterialPattern(value: unknown): value is WormMaterialPattern {
  return typeof value === "string" && PATTERN_SET.has(value);
}

/** Gives unthemed AI crews a stable authored material instead of a flat hull. */
export function wormMaterialForIdentity(identity: number): WormMaterialPattern {
  const stableIdentity = Number.isFinite(identity) ? Math.abs(Math.trunc(identity)) : 0;
  return WORM_MATERIAL_PATTERNS[stableIdentity % WORM_MATERIAL_PATTERNS.length];
}
