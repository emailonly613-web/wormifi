/** Public-safe authored cosmetics. This catalog contains no local photo data. */
export const COSMETIC_THEME_CATALOG = [
  {
    id: "tideglass-corsair",
    label: "TIDEGLASS CORSAIR",
    description: "Sea-glass teal with moonlit pearl seams.",
    palette: ["#64ffe1", "#166d83", "#effff8"],
    pattern: "tidal-ribbon",
  },
  {
    id: "sunken-crown",
    label: "SUNKEN CROWN",
    description: "Deep royal blue crossed by recovered gold.",
    palette: ["#f4c75b", "#163868", "#fff2b8"],
    pattern: "crown-wake",
  },
  {
    id: "coral-signal",
    label: "CORAL SIGNAL",
    description: "Warm coral flares over a midnight current.",
    palette: ["#ff806d", "#39245f", "#ffd7a2"],
    pattern: "signal-bloom",
  },
  {
    id: "emerald-privateer",
    label: "EMERALD PRIVATEER",
    description: "Cut-jewel green over a deep bottle-glass hull.",
    palette: ["#44f0a5", "#07524f", "#dbff8e"],
    pattern: "faceted-wake",
  },
  {
    id: "ruby-raider",
    label: "RUBY RAIDER",
    description: "Ruby flare, black-cherry shadow, and captured gold.",
    palette: ["#ff4f6d", "#4a102c", "#ffd36a"],
    pattern: "raider-chevron",
  },
  {
    id: "pearl-wraith",
    label: "PEARL WRAITH",
    description: "Ghost pearl drifting through cold blue moonlight.",
    palette: ["#fff4dd", "#526b91", "#8dfff0"],
    pattern: "spectral-ripple",
  },
  {
    id: "pepper-flare",
    label: "PEPPER FLARE",
    description: "Hot cutlass orange against a smoke-purple wake.",
    palette: ["#ff5b32", "#35162f", "#ffe05e"],
    pattern: "cutlass-flame",
  },
  {
    id: "storm-cannon",
    label: "STORM CANNON",
    description: "Gunmetal surf split by lightning-brass seams.",
    palette: ["#a9bfd2", "#202d45", "#f2c75c"],
    pattern: "broadside-bolt",
  },
  {
    id: "vortex-oracle",
    label: "VORTEX ORACLE",
    description: "Astrolabe violet twisting into electric blue.",
    palette: ["#c27cff", "#21164f", "#50d8ff"],
    pattern: "oracle-spiral",
  },
] as const;

export type CosmeticTheme = typeof COSMETIC_THEME_CATALOG[number];
export type CosmeticThemeId = CosmeticTheme["id"];
export const DEFAULT_COSMETIC_THEME_ID: CosmeticThemeId = "tideglass-corsair";

const COSMETIC_THEME_IDS: ReadonlySet<string> = new Set(
  COSMETIC_THEME_CATALOG.map((theme) => theme.id),
);

export function isCosmeticThemeId(value: unknown): value is CosmeticThemeId {
  return typeof value === "string" && COSMETIC_THEME_IDS.has(value);
}

export function isCosmeticTheme(value: unknown): value is CosmeticTheme {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as {
    id?: unknown;
    label?: unknown;
    description?: unknown;
    palette?: unknown;
    pattern?: unknown;
  };
  if (!isCosmeticThemeId(candidate.id)) return false;
  const canonical = getCosmeticTheme(candidate.id);
  return candidate.label === canonical.label &&
    candidate.description === canonical.description &&
    candidate.pattern === canonical.pattern &&
    Array.isArray(candidate.palette) &&
    candidate.palette.length === canonical.palette.length &&
    candidate.palette.every((color, index) => color === canonical.palette[index]);
}

export function getCosmeticTheme(themeId: unknown): CosmeticTheme {
  return COSMETIC_THEME_CATALOG.find((theme) => theme.id === themeId) ??
    COSMETIC_THEME_CATALOG[0];
}
