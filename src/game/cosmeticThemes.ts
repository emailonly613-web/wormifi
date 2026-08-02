import { WORM_MATERIAL_PATTERNS, type WormMaterialPattern } from "./wormMaterialPatterns";
import {
  isWormateParentThemeId,
  type WormateParentThemeId,
} from "./wormateParentCatalog";

/**
 * Visual-complexity ladder for the catalog. Every tier is free and equippable
 * today; the tiers grade how elaborate a theme's animated material is, which
 * is the honest ordering any future storefront would need.
 */
export const COSMETIC_THEME_TIERS = ["standard", "rare", "legend"] as const;
export type CosmeticThemeTier = typeof COSMETIC_THEME_TIERS[number];

/** Public-safe authored cosmetics. This catalog contains no local photo data. */
export const COSMETIC_THEME_CATALOG = [
  {
    id: "tideglass-corsair",
    label: "TIDEGLASS CORSAIR",
    description: "Sea-glass teal with moonlit pearl seams.",
    palette: ["#64ffe1", "#166d83", "#effff8"],
    pattern: "tidal-ribbon",
    tier: "standard",
  },
  {
    id: "sunken-crown",
    label: "SUNKEN CROWN",
    description: "Deep royal blue crossed by recovered gold.",
    palette: ["#f4c75b", "#163868", "#fff2b8"],
    pattern: "crown-wake",
    tier: "legend",
  },
  {
    id: "coral-signal",
    label: "CORAL SIGNAL",
    description: "Warm coral flares over a midnight current.",
    palette: ["#ff806d", "#39245f", "#ffd7a2"],
    pattern: "signal-bloom",
    tier: "standard",
  },
  {
    id: "emerald-privateer",
    label: "EMERALD PRIVATEER",
    description: "Cut-jewel green over a deep bottle-glass hull.",
    palette: ["#44f0a5", "#07524f", "#dbff8e"],
    pattern: "faceted-wake",
    tier: "rare",
  },
  {
    id: "ruby-raider",
    label: "RUBY RAIDER",
    description: "Ruby flare, black-cherry shadow, and captured gold.",
    palette: ["#ff4f6d", "#4a102c", "#ffd36a"],
    pattern: "raider-chevron",
    tier: "standard",
  },
  {
    id: "pearl-wraith",
    label: "PEARL WRAITH",
    description: "Ghost pearl drifting through cold blue moonlight.",
    palette: ["#fff4dd", "#526b91", "#8dfff0"],
    pattern: "spectral-ripple",
    tier: "rare",
  },
  {
    id: "pepper-flare",
    label: "PEPPER FLARE",
    description: "Hot cutlass orange against a smoke-purple wake.",
    palette: ["#ff5b32", "#35162f", "#ffe05e"],
    pattern: "cutlass-flame",
    tier: "legend",
  },
  {
    id: "storm-cannon",
    label: "STORM CANNON",
    description: "Gunmetal surf split by lightning-brass seams.",
    palette: ["#a9bfd2", "#202d45", "#f2c75c"],
    pattern: "broadside-bolt",
    tier: "legend",
  },
  {
    id: "vortex-oracle",
    label: "VORTEX ORACLE",
    description: "Astrolabe violet twisting into electric blue.",
    palette: ["#c27cff", "#21164f", "#50d8ff"],
    pattern: "oracle-spiral",
    tier: "rare",
  },
  {
    id: "gumball-armada",
    label: "GUMBALL ARMADA",
    description: "Glossy candy orbs popping through a bubble-bright wake.",
    palette: ["#ff4fa3", "#24c7f4", "#ffd62e", "#8b5cf6", "#ff8a1f", "#9bea42"],
    pattern: "gumball-pop",
    tier: "rare",
    headHue: 0,
  },
  {
    id: "gumball-berry",
    label: "GUMBALL · BERRY",
    description: "Pink, raspberry, grape, and cream candy spheres.",
    palette: ["#ff4f9a", "#e52b50", "#9c4dff", "#ffd0e5", "#fff0cf"],
    pattern: "gumball-pop",
    tier: "rare",
    headHue: 320,
  },
  {
    id: "gumball-ocean",
    label: "GUMBALL · OCEAN",
    description: "Cyan, cobalt, violet, and sea-glass candy spheres.",
    palette: ["#27d7f5", "#2374ff", "#7657ff", "#72f1c7", "#e8ffff"],
    pattern: "gumball-pop",
    tier: "rare",
    headHue: 175,
  },
  {
    id: "gumball-citrus",
    label: "GUMBALL · CITRUS",
    description: "Lemon, orange, lime, and mango candy spheres.",
    palette: ["#ffe23f", "#ff8a1f", "#9bea42", "#ffbf37", "#fff7b2"],
    pattern: "gumball-pop",
    tier: "rare",
    headHue: 48,
  },
  {
    id: "prism-plume",
    label: "PRISM PLUME",
    description: "Winged rainbow petals braided into a joyful sky-blue flight.",
    palette: ["#43c9ff", "#ffca42", "#ff5988", "#8c5cf5", "#f4fbff"],
    pattern: "prism-plume",
    tier: "rare",
  },
  // FOUNDER'S PACK — the paid legend trio. New content only: every theme above
  // this line was free before the pack existed and stays free forever.
  {
    id: "krakens-ink",
    label: "KRAKEN'S INK",
    description: "Abyssal ink billows and curling tentacle shadow.",
    palette: ["#8a5cff", "#140b2e", "#d9c6ff"],
    pattern: "kraken-ink",
    tier: "legend",
    premium: true,
  },
  {
    id: "phoenix-wake",
    label: "PHOENIX WAKE",
    description: "Rising embers over a charred crimson keel.",
    palette: ["#ff7a2f", "#3a0d08", "#ffd36a"],
    pattern: "phoenix-wake",
    tier: "legend",
    premium: true,
  },
  {
    id: "leviathan-scale",
    label: "LEVIATHAN SCALE",
    description: "Deep-sea plate armor rolling with iridescent light.",
    palette: ["#2fd6c3", "#0a2b40", "#9a7bff"],
    pattern: "leviathan-scale",
    tier: "legend",
    premium: true,
  },
] as const satisfies readonly {
  id: string;
  label: string;
  description: string;
  palette: readonly string[];
  pattern: WormMaterialPattern;
  tier: CosmeticThemeTier;
  premium?: true;
  /** Optional art-directed hue rotation for recolorable cinematic head cutouts. */
  headHue?: number;
}[];

/** Paid catalog entries. Equipping one requires an unlock; seeing one never does. */
export const PREMIUM_COSMETIC_THEME_IDS: ReadonlySet<string> = new Set(
  COSMETIC_THEME_CATALOG.filter((theme) => "premium" in theme && theme.premium).map((theme) => theme.id),
);

export function isPremiumCosmeticThemeId(value: unknown): boolean {
  return typeof value === "string" && PREMIUM_COSMETIC_THEME_IDS.has(value);
}

/** Every animated material must be reachable through some authored theme. */
const UNUSED_PATTERNS = WORM_MATERIAL_PATTERNS.filter(
  (pattern) => !COSMETIC_THEME_CATALOG.some((theme) => theme.pattern === pattern),
);
if (UNUSED_PATTERNS.length > 0) {
  throw new Error(`Authored themes are missing materials: ${UNUSED_PATTERNS.join(", ")}`);
}

export type CosmeticTheme = typeof COSMETIC_THEME_CATALOG[number];
export type AuthoredCosmeticThemeId = CosmeticTheme["id"];
/**
 * Parent skin IDs share the existing public-safe theme wire field. This keeps
 * protocol v5 tuple shape stable while making all authorized Wormate bodies
 * visible to every client. Wormifi originals remain authored catalog entries.
 */
export type CosmeticThemeId = AuthoredCosmeticThemeId | WormateParentThemeId;
export const DEFAULT_COSMETIC_THEME_ID: AuthoredCosmeticThemeId = "tideglass-corsair";

const COSMETIC_THEME_IDS: ReadonlySet<string> = new Set(
  COSMETIC_THEME_CATALOG.map((theme) => theme.id),
);

export function isCosmeticThemeId(value: unknown): value is CosmeticThemeId {
  return (typeof value === "string" && COSMETIC_THEME_IDS.has(value)) ||
    isWormateParentThemeId(value);
}

export function isCosmeticTheme(value: unknown): value is CosmeticTheme {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as {
    id?: unknown;
    label?: unknown;
    description?: unknown;
    palette?: unknown;
    pattern?: unknown;
    headHue?: unknown;
  };
  if (!isCosmeticThemeId(candidate.id)) return false;
  const canonical = getCosmeticTheme(candidate.id);
  return candidate.label === canonical.label &&
    candidate.description === canonical.description &&
    candidate.pattern === canonical.pattern &&
    (typeof candidate.headHue === "number" ? candidate.headHue : 0) === cosmeticThemeHeadHue(canonical) &&
    Array.isArray(candidate.palette) &&
    candidate.palette.length === canonical.palette.length &&
    candidate.palette.every((color, index) => color === canonical.palette[index]);
}

export function getCosmeticTheme(themeId: unknown): CosmeticTheme {
  return COSMETIC_THEME_CATALOG.find((theme) => theme.id === themeId) ??
    COSMETIC_THEME_CATALOG[0];
}

/** Head-only colorway. Body palette selection remains completely independent. */
export function cosmeticThemeHeadHue(theme: CosmeticTheme): number {
  return "headHue" in theme && typeof theme.headHue === "number"
    ? theme.headHue
    : 0;
}
