/**
 * Founder's Pack — the client side of the paid skin chain.
 *
 * The pack is one one-time purchase that unlocks the three premium legend
 * themes on this device. The unlock is a grant minted by the store service
 * AFTER Stripe confirms payment: { sessionId, token } where the token is an
 * HMAC over the session id with a server-held secret. The client treats the
 * token as opaque and can re-verify it against the store at any time.
 *
 * Honesty notes, engraved:
 * - Cosmetics are client-rendered, so a determined tinkerer can always paint
 *   pixels locally; the grant gates the SUPPORTED path, it is not DRM.
 * - Every previously free theme stays free forever. The pack is new content
 *   only — a purchase adds, it never walls off something players had.
 * - Photos and gameplay are untouched; the grant is the only new stored value.
 */

import { isPremiumCosmeticThemeId, PREMIUM_COSMETIC_THEME_IDS } from "./cosmeticThemes";

export const FOUNDER_PACK = {
  id: "founder-pack",
  label: "FOUNDER'S PACK",
  priceUsdCents: 299,
  priceLabel: "$2.99",
  themeIds: [...PREMIUM_COSMETIC_THEME_IDS] as readonly string[],
} as const;

export const FOUNDER_PACK_STORAGE_KEY = "wormifi.founder-pack.v1";

export interface FounderPackGrant {
  sessionId: string;
  token: string;
  grantedAtMs: number;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function browserStorage(): StorageLike | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

let browserGrantCache: FounderPackGrant | null | undefined;

export function normalizeFounderPackGrant(value: unknown): FounderPackGrant | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as { sessionId?: unknown; token?: unknown; grantedAtMs?: unknown };
  if (
    typeof candidate.sessionId !== "string" ||
    !/^cs_[A-Za-z0-9_]{8,128}$/.test(candidate.sessionId) ||
    typeof candidate.token !== "string" ||
    !/^[a-f0-9]{16,128}$/.test(candidate.token) ||
    typeof candidate.grantedAtMs !== "number" ||
    !Number.isFinite(candidate.grantedAtMs)
  ) return null;
  return {
    sessionId: candidate.sessionId,
    token: candidate.token,
    grantedAtMs: candidate.grantedAtMs,
  };
}

export function readFounderPackGrant(
  storage: StorageLike | undefined = browserStorage(),
): FounderPackGrant | null {
  const usingBrowser = storage === browserStorage();
  if (usingBrowser && browserGrantCache !== undefined) return browserGrantCache;
  let grant: FounderPackGrant | null = null;
  try {
    const raw = storage?.getItem(FOUNDER_PACK_STORAGE_KEY);
    if (raw) grant = normalizeFounderPackGrant(JSON.parse(raw));
  } catch {
    grant = null;
  }
  if (usingBrowser) browserGrantCache = grant;
  return grant;
}

export function storeFounderPackGrant(
  grant: FounderPackGrant,
  storage: StorageLike | undefined = browserStorage(),
): FounderPackGrant | null {
  const normalized = normalizeFounderPackGrant(grant);
  if (!normalized) return null;
  try {
    storage?.setItem(FOUNDER_PACK_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Hardened browser modes: the unlock still applies for this session.
  }
  if (storage === browserStorage()) browserGrantCache = normalized;
  return normalized;
}

export function clearFounderPackGrant(
  storage: StorageLike | undefined = browserStorage(),
): void {
  try {
    storage?.removeItem(FOUNDER_PACK_STORAGE_KEY);
  } catch {
    // Nothing stored is the goal state anyway.
  }
  if (storage === browserStorage()) browserGrantCache = null;
}

export function isFounderPackUnlocked(
  storage: StorageLike | undefined = browserStorage(),
): boolean {
  return readFounderPackGrant(storage) !== null;
}

/** A premium theme may only be equipped through an unlock on this device. */
export function canEquipTheme(
  themeId: string,
  storage: StorageLike | undefined = browserStorage(),
): boolean {
  return !isPremiumCosmeticThemeId(themeId) || isFounderPackUnlocked(storage);
}

/** Test seam mirroring the render-preferences module. */
export function resetFounderPackCache(): void {
  browserGrantCache = undefined;
}
