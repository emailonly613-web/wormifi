/**
 * Local render preferences for the animated worm materials.
 *
 * These are graphics settings, not cosmetics: they change how THIS device
 * paints every worm and never travel to the server. The arena render loops
 * read them once per frame, so reads go through a module cache exactly like
 * the rewarded-skin equip flag; the Skin Studio writes through this module so
 * the cache and gameplay update the same instant the control is touched.
 */

export const RENDER_PREFERENCES_STORAGE_KEY = "wormifi.render-preferences.v1";

export const MATERIAL_MOTION_LEVELS = ["full", "subtle", "off"] as const;
export type MaterialMotionLevel = typeof MATERIAL_MOTION_LEVELS[number];

export interface RenderPreferences {
  materialMotion: MaterialMotionLevel;
  materialGlow: boolean;
}

export const DEFAULT_RENDER_PREFERENCES: RenderPreferences = {
  materialMotion: "full",
  materialGlow: true,
};

/** Motion scale each level feeds into the material time term. */
const MOTION_SCALE: Record<MaterialMotionLevel, number> = {
  full: 1,
  subtle: 0.45,
  off: 0,
};

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function browserStorage(): StorageLike | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

let browserCache: RenderPreferences | undefined;

function isMotionLevel(value: unknown): value is MaterialMotionLevel {
  return typeof value === "string" &&
    (MATERIAL_MOTION_LEVELS as readonly string[]).includes(value);
}

export function normalizeRenderPreferences(value: unknown): RenderPreferences {
  if (typeof value !== "object" || value === null) return { ...DEFAULT_RENDER_PREFERENCES };
  const candidate = value as { materialMotion?: unknown; materialGlow?: unknown };
  return {
    materialMotion: isMotionLevel(candidate.materialMotion)
      ? candidate.materialMotion
      : DEFAULT_RENDER_PREFERENCES.materialMotion,
    materialGlow: typeof candidate.materialGlow === "boolean"
      ? candidate.materialGlow
      : DEFAULT_RENDER_PREFERENCES.materialGlow,
  };
}

export function readRenderPreferences(
  storage: StorageLike | undefined = browserStorage(),
): RenderPreferences {
  const usingBrowser = storage === browserStorage();
  if (usingBrowser && browserCache) return browserCache;
  let preferences = { ...DEFAULT_RENDER_PREFERENCES };
  try {
    const raw = storage?.getItem(RENDER_PREFERENCES_STORAGE_KEY);
    if (raw) preferences = normalizeRenderPreferences(JSON.parse(raw));
  } catch {
    // A corrupted entry falls back to defaults rather than breaking rendering.
  }
  if (usingBrowser) browserCache = preferences;
  return preferences;
}

export function writeRenderPreferences(
  preferences: RenderPreferences,
  storage: StorageLike | undefined = browserStorage(),
): RenderPreferences {
  const normalized = normalizeRenderPreferences(preferences);
  try {
    storage?.setItem(RENDER_PREFERENCES_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Storage can be unavailable in hardened modes; the in-memory cache still
    // applies for this session.
  }
  if (storage === browserStorage()) browserCache = normalized;
  return normalized;
}

/** Per-frame gameplay read: the motion scale the material layer should use. */
export function materialMotionScale(
  storage: StorageLike | undefined = browserStorage(),
): number {
  return MOTION_SCALE[readRenderPreferences(storage).materialMotion];
}

/** Per-frame gameplay read: whether materials may spend shadowBlur on bloom. */
export function materialGlowEnabled(
  storage: StorageLike | undefined = browserStorage(),
): boolean {
  return readRenderPreferences(storage).materialGlow;
}

/** Test seam: clears the module cache the way a fresh page load would. */
export function resetRenderPreferencesCache(): void {
  browserCache = undefined;
}
