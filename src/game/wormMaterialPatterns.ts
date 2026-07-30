/**
 * The authored material pattern names, alone.
 *
 * The theme catalog is compiled by BOTH the browser bundle and the DOM-less
 * authoritative server (themes are the multiplayer-safe cosmetic), so the
 * catalog may only depend on this pure module. The canvas renderers for these
 * patterns live in wormMaterials.ts, which only the client imports.
 */

/**
 * Patterns every crew can wear. Identity-assigned bot materials draw ONLY from
 * this list, so the free spectrum stays rich while paid patterns stay earned.
 */
export const FREE_WORM_MATERIAL_PATTERNS = [
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

/** Founder's Pack materials — authored for the paid legend themes only. */
export const PREMIUM_WORM_MATERIAL_PATTERNS = [
  "kraken-ink",
  "phoenix-wake",
  "leviathan-scale",
] as const;

export const WORM_MATERIAL_PATTERNS = [
  ...FREE_WORM_MATERIAL_PATTERNS,
  ...PREMIUM_WORM_MATERIAL_PATTERNS,
] as const;

export type WormMaterialPattern = typeof WORM_MATERIAL_PATTERNS[number];

const PATTERN_SET: ReadonlySet<string> = new Set(WORM_MATERIAL_PATTERNS);

export function isWormMaterialPattern(value: unknown): value is WormMaterialPattern {
  return typeof value === "string" && PATTERN_SET.has(value);
}

/**
 * Gives unthemed AI crews a stable authored material instead of a flat hull.
 * Draws exclusively from the FREE list: a bot must never wear a paid material.
 */
export function wormMaterialForIdentity(identity: number): WormMaterialPattern {
  const stableIdentity = Number.isFinite(identity) ? Math.abs(Math.trunc(identity)) : 0;
  return FREE_WORM_MATERIAL_PATTERNS[stableIdentity % FREE_WORM_MATERIAL_PATTERNS.length];
}
