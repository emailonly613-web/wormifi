import { describe, expect, it } from "vitest";
import {
  CURRENCY_PACK_LAYOUT,
  resolveMonetizationConfig,
  type MonetizationEnvironment,
} from "../src/platform/monetizationConfig";

function config(overrides: MonetizationEnvironment = {}) {
  return resolveMonetizationConfig({
    VITE_CRAZYGAMES_MENU_MONETIZATION: "off",
    VITE_CRAZYGAMES_REWARDED_ENABLED: "false",
    VITE_CRAZYGAMES_IAP_AUTHORIZED: "false",
    VITE_CRAZYGAMES_STORE_LAYOUT: "disabled",
    ...overrides,
  });
}

describe("monetization configuration", () => {
  it("shows no monetization surface by default", () => {
    expect(config().requestedMenuMode).toBe("off");
    expect(config().menuMode).toBe("off");
  });

  it("fails unsupported or loosely cased build flags closed", () => {
    const unsupportedMode = config({
      VITE_CRAZYGAMES_MENU_MONETIZATION: "both",
      VITE_CRAZYGAMES_REWARDED_ENABLED: "true",
      VITE_CRAZYGAMES_IAP_AUTHORIZED: "true",
      VITE_CRAZYGAMES_STORE_LAYOUT: "currency-packs",
    });
    const looseRewardGate = config({
      VITE_CRAZYGAMES_MENU_MONETIZATION: "rewarded-skin",
      VITE_CRAZYGAMES_REWARDED_ENABLED: "TRUE",
    });
    const looseStoreLayout = config({
      VITE_CRAZYGAMES_MENU_MONETIZATION: "currency-store",
      VITE_CRAZYGAMES_IAP_AUTHORIZED: "true",
      VITE_CRAZYGAMES_STORE_LAYOUT: "Currency-Packs",
    });

    expect(unsupportedMode.requestedMenuMode).toBe("off");
    expect(unsupportedMode.menuMode).toBe("off");
    expect(looseRewardGate.menuMode).toBe("off");
    expect(looseStoreLayout.currencyStoreLayout).toBe("disabled");
    expect(looseStoreLayout.menuMode).toBe("off");
  });

  it("enables the rewarded skin surface only behind its ad capability gate", () => {
    const blocked = config({
      VITE_CRAZYGAMES_MENU_MONETIZATION: "rewarded-skin",
    });
    const enabled = config({
      VITE_CRAZYGAMES_MENU_MONETIZATION: "rewarded-skin",
      VITE_CRAZYGAMES_REWARDED_ENABLED: "true",
    });

    expect(blocked.requestedMenuMode).toBe("rewarded-skin");
    expect(blocked.menuMode).toBe("off");
    expect(enabled.menuMode).toBe("rewarded-skin");
  });

  it("fails the currency store closed unless both IAP gates are open", () => {
    const missingAuthorization = config({
      VITE_CRAZYGAMES_MENU_MONETIZATION: "currency-store",
      VITE_CRAZYGAMES_STORE_LAYOUT: "currency-packs",
    });
    const missingLayout = config({
      VITE_CRAZYGAMES_MENU_MONETIZATION: "currency-store",
      VITE_CRAZYGAMES_IAP_AUTHORIZED: "true",
    });
    const enabled = config({
      VITE_CRAZYGAMES_MENU_MONETIZATION: "currency-store",
      VITE_CRAZYGAMES_IAP_AUTHORIZED: "true",
      VITE_CRAZYGAMES_STORE_LAYOUT: "currency-packs",
    });

    expect(missingAuthorization.currencyStoreLayout).toBe("disabled");
    expect(missingAuthorization.menuMode).toBe("off");
    expect(missingLayout.menuMode).toBe("off");
    expect(enabled.currencyStoreLayout).toBe("currency-packs");
    expect(enabled.menuMode).toBe("currency-store");
  });

  it("keeps the two approved surfaces mutually exclusive", () => {
    const rewarded = config({
      VITE_CRAZYGAMES_MENU_MONETIZATION: "rewarded-skin",
      VITE_CRAZYGAMES_REWARDED_ENABLED: "true",
      VITE_CRAZYGAMES_IAP_AUTHORIZED: "true",
      VITE_CRAZYGAMES_STORE_LAYOUT: "currency-packs",
    });
    const store = config({
      VITE_CRAZYGAMES_MENU_MONETIZATION: "currency-store",
      VITE_CRAZYGAMES_REWARDED_ENABLED: "true",
      VITE_CRAZYGAMES_IAP_AUTHORIZED: "true",
      VITE_CRAZYGAMES_STORE_LAYOUT: "currency-packs",
    });

    expect(rewarded.menuMode).toBe("rewarded-skin");
    expect(store.menuMode).toBe("currency-store");
  });

  it("defines cosmetic currency packs without gameplay power", () => {
    expect(CURRENCY_PACK_LAYOUT.map((pack) => pack.sku)).toEqual([
      "doubloons-500",
      "doubloons-1400",
      "doubloons-3200",
    ]);
    expect(CURRENCY_PACK_LAYOUT.every((pack) => pack.amount > 0)).toBe(true);
  });
});
