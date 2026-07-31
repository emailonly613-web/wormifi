import {
  WORM_MATERIAL_PATTERNS,
  type WormMaterialPattern,
} from "./wormMaterialPatterns";

const HEAD_ROOT = `${import.meta.env.BASE_URL}art/cinematic-heads/`;
const PORTRAIT_ROOT = `${import.meta.env.BASE_URL}art/captain-portraits/`;

/**
 * Production cutouts for the cinematic head layer. The PNGs contain alpha and
 * no baked square, floor, shadow, or scenery. Runtime motion supplies the small
 * float and light pulse so reduced-motion can freeze them cleanly.
 */
export const CINEMATIC_HEAD_CATALOG = [
  { pattern: "tidal-ribbon", id: "tidal-navigator", label: "TIDAL NAVIGATOR", file: "tidal-navigator-v1.png" },
  { pattern: "crown-wake", id: "sunken-crown", label: "SUNKEN CROWN", file: "sunken-crown-v1.png" },
  { pattern: "signal-bloom", id: "coral-signal", label: "CORAL SIGNAL", file: "coral-signal-v1.png" },
  { pattern: "faceted-wake", id: "emerald-privateer", label: "EMERALD PRIVATEER", file: "emerald-privateer-v1.png" },
  { pattern: "raider-chevron", id: "ruby-raider", label: "RUBY RAIDER", file: "ruby-raider-v1.png" },
  { pattern: "spectral-ripple", id: "pearl-wraith", label: "PEARL WRAITH", file: "pearl-wraith-v1.png" },
  { pattern: "cutlass-flame", id: "magma-corsair", label: "MAGMA CORSAIR", file: "magma-corsair-v1.png" },
  { pattern: "broadside-bolt", id: "brass-broadside", label: "BRASS BROADSIDE", file: "brass-broadside-v1.png" },
  { pattern: "oracle-spiral", id: "vortex-oracle", label: "VORTEX ORACLE", file: "vortex-oracle-v1.png" },
  { pattern: "kraken-ink", id: "kraken-ink", label: "KRAKEN INK CAPTAIN", file: "kraken-ink-v1.png" },
  { pattern: "phoenix-wake", id: "phoenix-wake", label: "PHOENIX WAKE", file: "phoenix-wake-v1.png" },
  { pattern: "leviathan-scale", id: "leviathan-scale", label: "LEVIATHAN SCALE", file: "leviathan-scale-v1.png" },
] as const satisfies readonly {
  pattern: WormMaterialPattern;
  id: string;
  label: string;
  file: string;
}[];

const HEAD_BY_PATTERN = new Map<WormMaterialPattern, (typeof CINEMATIC_HEAD_CATALOG)[number]>(
  CINEMATIC_HEAD_CATALOG.map((head) => [head.pattern, head]),
);

if (WORM_MATERIAL_PATTERNS.some((pattern) => !HEAD_BY_PATTERN.has(pattern))) {
  throw new Error("Every authored Wormifi material requires one cinematic head.");
}

export function cinematicHeadSource(pattern: WormMaterialPattern): string {
  const head = HEAD_BY_PATTERN.get(pattern);
  if (!head) throw new Error(`Missing cinematic head for ${pattern}`);
  return `${HEAD_ROOT}${head.file}`;
}

/**
 * Lightweight launcher portrait derived from the same authored head used in
 * play. Keeping the file mapping shared prevents the menu avatar from drifting
 * away from the captain the player actually equipped.
 */
export function captainPortraitSource(pattern: WormMaterialPattern): string {
  const head = HEAD_BY_PATTERN.get(pattern);
  if (!head) throw new Error(`Missing captain portrait for ${pattern}`);
  return `${PORTRAIT_ROOT}${head.file.replace(/\.png$/u, ".webp")}`;
}
