import { describe, expect, it } from "vitest";
import {
  FOUNDER_PACK,
  canEquipTheme,
  clearFounderPackGrant,
  isFounderPackUnlocked,
  normalizeFounderPackGrant,
  readFounderPackGrant,
  storeFounderPackGrant,
} from "../src/game/premiumSkins";
import {
  COSMETIC_THEME_CATALOG,
  PREMIUM_COSMETIC_THEME_IDS,
  isCosmeticThemeId,
  isPremiumCosmeticThemeId,
} from "../src/game/cosmeticThemes";
import {
  FREE_WORM_MATERIAL_PATTERNS,
  PREMIUM_WORM_MATERIAL_PATTERNS,
  wormMaterialForIdentity,
} from "../src/game/wormMaterialPatterns";
import {
  checkoutSessionFields,
  createRateLimiter,
  formEncode,
  isValidSessionId,
  mintGrantToken,
  stripeKeyMode,
  verifyGrantToken,
  // eslint-disable-next-line import/no-relative-packages
} from "../store/src/lib.mjs";

function memoryStorage() {
  const entries = new Map<string, string>();
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => void entries.set(key, value),
    removeItem: (key: string) => void entries.delete(key),
  };
}

const GRANT = {
  sessionId: "cs_test_a1B2c3D4e5F6g7H8",
  token: "ab12cd34ef56ab12cd34ef56ab12cd34",
  grantedAtMs: 1_700_000_000_000,
};

describe("founder pack catalog contract", () => {
  it("sells exactly three premium legend themes that are valid catalog citizens", () => {
    expect(FOUNDER_PACK.themeIds).toHaveLength(3);
    for (const themeId of FOUNDER_PACK.themeIds) {
      expect(isCosmeticThemeId(themeId), themeId).toBe(true);
      expect(isPremiumCosmeticThemeId(themeId), themeId).toBe(true);
      const theme = COSMETIC_THEME_CATALOG.find((entry) => entry.id === themeId)!;
      expect(theme.tier).toBe("legend");
    }
  });

  it("never marks a previously free theme premium", () => {
    const freeIds = COSMETIC_THEME_CATALOG
      .filter((theme) => !PREMIUM_COSMETIC_THEME_IDS.has(theme.id))
      .map((theme) => theme.id);
    // The original nine stay at the front forever; new free identities may be
    // appended without weakening the no-retroactive-paywall contract.
    expect(freeIds.slice(0, 9)).toEqual([
      "tideglass-corsair",
      "sunken-crown",
      "coral-signal",
      "emerald-privateer",
      "ruby-raider",
      "pearl-wraith",
      "pepper-flare",
      "storm-cannon",
      "vortex-oracle",
    ]);
    expect(freeIds).toHaveLength(14);
    for (const id of freeIds) expect(isPremiumCosmeticThemeId(id)).toBe(false);
  });

  it("keeps paid materials off identity-assigned bot crews", () => {
    const seen = new Set<string>();
    for (let identity = 0; identity < 200; identity += 1) {
      seen.add(wormMaterialForIdentity(identity));
    }
    for (const premium of PREMIUM_WORM_MATERIAL_PATTERNS) {
      expect(seen.has(premium), premium).toBe(false);
    }
    expect(seen.size).toBe(FREE_WORM_MATERIAL_PATTERNS.length);
  });
});

describe("founder pack grant storage", () => {
  it("stores, reads and clears a valid grant", () => {
    const storage = memoryStorage();
    expect(isFounderPackUnlocked(storage)).toBe(false);
    expect(storeFounderPackGrant(GRANT, storage)).toEqual(GRANT);
    expect(readFounderPackGrant(storage)).toEqual(GRANT);
    expect(isFounderPackUnlocked(storage)).toBe(true);
    clearFounderPackGrant(storage);
    expect(isFounderPackUnlocked(storage)).toBe(false);
  });

  it("rejects malformed or tampered grants", () => {
    expect(normalizeFounderPackGrant(null)).toBeNull();
    expect(normalizeFounderPackGrant({ ...GRANT, sessionId: "not-a-session" })).toBeNull();
    expect(normalizeFounderPackGrant({ ...GRANT, token: "<script>" })).toBeNull();
    expect(normalizeFounderPackGrant({ ...GRANT, grantedAtMs: "yesterday" })).toBeNull();
    const storage = memoryStorage();
    storage.setItem("wormifi.founder-pack.v1", "{broken json");
    expect(readFounderPackGrant(storage)).toBeNull();
  });

  it("gates premium equips on the unlock and never gates free themes", () => {
    const storage = memoryStorage();
    expect(canEquipTheme("krakens-ink", storage)).toBe(false);
    expect(canEquipTheme("tideglass-corsair", storage)).toBe(true);
    storeFounderPackGrant(GRANT, storage);
    expect(canEquipTheme("krakens-ink", storage)).toBe(true);
  });
});

describe("store service helpers", () => {
  it("builds a complete inline-priced checkout session", () => {
    const fields = checkoutSessionFields("https://wormifi.com");
    expect(fields.mode).toBe("payment");
    expect(fields["line_items[0][price_data][unit_amount]"]).toBe(299);
    expect(fields.success_url).toBe("https://wormifi.com/?founder_session={CHECKOUT_SESSION_ID}");
    const encoded = formEncode(fields);
    expect(encoded).toContain("line_items%5B0%5D%5Bprice_data%5D%5Bcurrency%5D=usd");
    expect(encoded).toContain("%7BCHECKOUT_SESSION_ID%7D");
  });

  it("validates session ids hard", () => {
    expect(isValidSessionId("cs_test_a1B2c3D4e5F6")).toBe(true);
    expect(isValidSessionId("cs_live_a1B2c3D4e5F6")).toBe(true);
    expect(isValidSessionId("cs_x")).toBe(false);
    expect(isValidSessionId("pi_12345678901234")).toBe(false);
    expect(isValidSessionId("cs_test_../../etc")).toBe(false);
  });

  it("mints and verifies grant tokens; a wrong secret or session fails", () => {
    const token = mintGrantToken(GRANT.sessionId, "secret-a");
    expect(verifyGrantToken(GRANT.sessionId, token, "secret-a")).toBe(true);
    expect(verifyGrantToken(GRANT.sessionId, token, "secret-b")).toBe(false);
    expect(verifyGrantToken("cs_test_otherSession1", token, "secret-a")).toBe(false);
    expect(verifyGrantToken(GRANT.sessionId, "deadbeef", "secret-a")).toBe(false);
  });

  it("reports the stripe key mode without leaking the key", () => {
    expect(stripeKeyMode("sk_test_abcdefghijk")).toBe("test");
    expect(stripeKeyMode("sk_live_abcdefghijk")).toBe("live");
    expect(stripeKeyMode("")).toBe("absent");
    expect(stripeKeyMode("banana")).toBe("unknown");
  });

  it("rate limits inside a window and resets after it", () => {
    const allow = createRateLimiter(2, 1_000);
    expect(allow("ip", 0)).toBe(true);
    expect(allow("ip", 10)).toBe(true);
    expect(allow("ip", 20)).toBe(false);
    expect(allow("ip", 1_500)).toBe(true);
    expect(allow("other", 20)).toBe(true);
  });
});
