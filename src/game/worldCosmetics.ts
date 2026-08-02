export const WORLD_COSMETICS_STORAGE_KEY = "wormifi.world-cosmetics.v1";

export type PickupThemeId = "parent-sweet-feast" | "pirate-hoard" | "mixed-bounty";
export type ArenaVisualThemeId = "midnight-chart" | "emerald-depths" | "candy-nebula" | "volcanic-vault";

export interface PickupTheme {
  id: PickupThemeId;
  label: string;
  shortLabel: string;
  description: string;
  mark: string;
}

export interface ArenaVisualTheme {
  id: ArenaVisualThemeId;
  label: string;
  description: string;
  colors: readonly [string, string, string];
}

export interface WorldCosmeticState {
  pickupThemeId: PickupThemeId;
  arenaThemeId: ArenaVisualThemeId;
  updatedAtMs: number;
}

export interface WorldCosmeticBundle {
  id: string;
  label: string;
  description: string;
  pickupThemeId: PickupThemeId;
  arenaThemeId: ArenaVisualThemeId;
}

export interface WorldCosmeticStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const PICKUP_THEME_CATALOG: readonly PickupTheme[] = Object.freeze([
  // Every theme now draws Wormifi's own treasure. The ids are kept so stored
  // player choices still load; what changed is that none of them reach for the
  // parent company's food art, and none of them say its name to a player.
  Object.freeze({
    id: "parent-sweet-feast",
    label: "PACKED HOARD",
    shortLabel: "PACKED",
    description: "Treasure everywhere you look. Grab it fast.",
    mark: "🪙",
  }),
  Object.freeze({
    id: "pirate-hoard",
    label: "CAPTAIN'S TREASURE",
    shortLabel: "TREASURE",
    description: "Big shiny loot with room to swim.",
    mark: "💎",
  }),
  Object.freeze({
    id: "mixed-bounty",
    label: "BUSY SEAS",
    shortLabel: "BUSY",
    description: "A steady stream of loot the whole match.",
    mark: "✦",
  }),
]);

export const ARENA_VISUAL_THEME_CATALOG: readonly ArenaVisualTheme[] = Object.freeze([
  Object.freeze({
    id: "midnight-chart",
    label: "MIDNIGHT NAVIGATOR",
    description: "Deep navy water and classic chart lines.",
    colors: ["#102b4a", "#091b35", "#030a18"] as const,
  }),
  Object.freeze({
    id: "emerald-depths",
    label: "EMERALD KRAKEN DEPTHS",
    description: "Abyssal green water with cold luminous shoals.",
    colors: ["#0d4a45", "#082f38", "#03151f"] as const,
  }),
  Object.freeze({
    id: "candy-nebula",
    label: "CANDY NEBULA",
    description: "Royal berry waters built to make sweets glow.",
    colors: ["#57306f", "#2e204f", "#110d2b"] as const,
  }),
  Object.freeze({
    id: "volcanic-vault",
    label: "DRAGON'S VOLCANIC VAULT",
    description: "Smoldering crimson depths around a black-gold treasury.",
    colors: ["#5a2b2c", "#321b2b", "#160a18"] as const,
  }),
]);

export const WORLD_COSMETIC_BUNDLES: readonly WorldCosmeticBundle[] = Object.freeze([
  Object.freeze({
    id: "sweet-fleet",
    label: "CANDY FLEET",
    description: "Packed treasure in a bright candy-coloured sky.",
    pickupThemeId: "parent-sweet-feast",
    arenaThemeId: "candy-nebula",
  }),
  Object.freeze({
    id: "black-pearl-hoard",
    label: "BLACK PEARL HOARD",
    description: "Wormifi treasure + Midnight Navigator + shark and kraken moat.",
    pickupThemeId: "pirate-hoard",
    arenaThemeId: "midnight-chart",
  }),
  Object.freeze({
    id: "kraken-family",
    label: "KRAKEN FAMILY BOUNTY",
    description: "Mixed bounty + Emerald Depths + abyssal leviathan moat.",
    pickupThemeId: "mixed-bounty",
    arenaThemeId: "emerald-depths",
  }),
  Object.freeze({
    id: "dragon-vault",
    label: "DRAGON VAULT",
    description: "Pirate treasure + Volcanic Vault + magma dragon moat.",
    pickupThemeId: "pirate-hoard",
    arenaThemeId: "volcanic-vault",
  }),
]);

export const DEFAULT_WORLD_COSMETICS: Readonly<WorldCosmeticState> = Object.freeze({
  // Wormifi's own treasure is what a new player should meet first.
  pickupThemeId: "pirate-hoard",
  arenaThemeId: "midnight-chart",
  updatedAtMs: 0,
});

export function isPickupThemeId(value: unknown): value is PickupThemeId {
  return PICKUP_THEME_CATALOG.some((theme) => theme.id === value);
}

export function isArenaVisualThemeId(value: unknown): value is ArenaVisualThemeId {
  return ARENA_VISUAL_THEME_CATALOG.some((theme) => theme.id === value);
}

export function normalizeWorldCosmetics(value: unknown, now = Date.now()): WorldCosmeticState {
  const record = typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  return {
    pickupThemeId: isPickupThemeId(record.pickupThemeId)
      ? record.pickupThemeId
      : DEFAULT_WORLD_COSMETICS.pickupThemeId,
    arenaThemeId: isArenaVisualThemeId(record.arenaThemeId)
      ? record.arenaThemeId
      : DEFAULT_WORLD_COSMETICS.arenaThemeId,
    updatedAtMs: typeof record.updatedAtMs === "number" && Number.isFinite(record.updatedAtMs)
      ? Math.max(0, Math.trunc(record.updatedAtMs))
      : now,
  };
}

function defaultStorage(): WorldCosmeticStorage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

export function readWorldCosmetics(storage = defaultStorage()): WorldCosmeticState {
  if (!storage) return normalizeWorldCosmetics(DEFAULT_WORLD_COSMETICS);
  try {
    const raw = storage.getItem(WORLD_COSMETICS_STORAGE_KEY);
    return normalizeWorldCosmetics(raw ? JSON.parse(raw) : DEFAULT_WORLD_COSMETICS);
  } catch {
    return normalizeWorldCosmetics(DEFAULT_WORLD_COSMETICS);
  }
}

export function writeWorldCosmetics(
  state: WorldCosmeticState,
  storage = defaultStorage(),
): WorldCosmeticState {
  const normalized = normalizeWorldCosmetics(state);
  storage?.setItem(WORLD_COSMETICS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function selectPickupTheme(
  state: WorldCosmeticState,
  pickupThemeId: PickupThemeId,
  now = Date.now(),
): WorldCosmeticState {
  return { ...state, pickupThemeId, updatedAtMs: now };
}

export function selectArenaVisualTheme(
  state: WorldCosmeticState,
  arenaThemeId: ArenaVisualThemeId,
  now = Date.now(),
): WorldCosmeticState {
  return { ...state, arenaThemeId, updatedAtMs: now };
}

export function equipWorldCosmeticBundle(
  state: WorldCosmeticState,
  bundle: WorldCosmeticBundle,
  now = Date.now(),
): WorldCosmeticState {
  return {
    ...state,
    pickupThemeId: bundle.pickupThemeId,
    arenaThemeId: bundle.arenaThemeId,
    updatedAtMs: now,
  };
}

export function getArenaVisualTheme(id: ArenaVisualThemeId): ArenaVisualTheme {
  return ARENA_VISUAL_THEME_CATALOG.find((theme) => theme.id === id)
    ?? ARENA_VISUAL_THEME_CATALOG[0];
}
