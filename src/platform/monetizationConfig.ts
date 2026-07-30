export type MenuMonetizationMode = "off" | "rewarded-skin" | "currency-store";
export type CurrencyStoreLayout = "disabled" | "currency-packs";

export interface MonetizationEnvironment {
  VITE_CRAZYGAMES_MENU_MONETIZATION?: string;
  VITE_CRAZYGAMES_REWARDED_ENABLED?: string;
  VITE_CRAZYGAMES_IAP_AUTHORIZED?: string;
  VITE_CRAZYGAMES_STORE_LAYOUT?: string;
}

function menuMonetizationMode(value: string | undefined): MenuMonetizationMode {
  if (value === "rewarded-skin" || value === "currency-store") return value;
  return "off";
}

function normalizeCurrencyStoreLayout(value: string | undefined): CurrencyStoreLayout {
  return value === "currency-packs" ? value : "disabled";
}

/**
 * Resolves the one menu monetization switch against the platform capability
 * gates. A requested surface never appears unless its corresponding platform
 * approval is also present in the build environment.
 */
export function resolveMonetizationConfig(env: MonetizationEnvironment) {
  const requestedMenuMode = menuMonetizationMode(
    env.VITE_CRAZYGAMES_MENU_MONETIZATION,
  );
  const rewardedAdsEnabled = env.VITE_CRAZYGAMES_REWARDED_ENABLED === "true";
  const iapAuthorized = env.VITE_CRAZYGAMES_IAP_AUTHORIZED === "true";
  const requestedStoreLayout = normalizeCurrencyStoreLayout(
    env.VITE_CRAZYGAMES_STORE_LAYOUT,
  );
  const currencyStoreLayout = iapAuthorized
    ? requestedStoreLayout
    : "disabled" as CurrencyStoreLayout;

  const menuMode: MenuMonetizationMode =
    requestedMenuMode === "rewarded-skin" && rewardedAdsEnabled
      ? "rewarded-skin"
      : requestedMenuMode === "currency-store" && currencyStoreLayout === "currency-packs"
        ? "currency-store"
        : "off";

  return Object.freeze({
    /** The single build-time switch selected by the operator. */
    requestedMenuMode,
    /** The capability-checked surface that the player is allowed to see. */
    menuMode,
    rewardedAdsEnabled,
    /** A purchase layout can never become visible from a layout flag alone.
     * CrazyGames must first invite the title to IAP and issue its Xsolla setup. */
    currencyStoreLayout,
    iapAuthorized,
  });
}

export const monetizationConfig = resolveMonetizationConfig({
  VITE_CRAZYGAMES_MENU_MONETIZATION: import.meta.env.VITE_CRAZYGAMES_MENU_MONETIZATION,
  VITE_CRAZYGAMES_REWARDED_ENABLED: import.meta.env.VITE_CRAZYGAMES_REWARDED_ENABLED,
  VITE_CRAZYGAMES_IAP_AUTHORIZED: import.meta.env.VITE_CRAZYGAMES_IAP_AUTHORIZED,
  VITE_CRAZYGAMES_STORE_LAYOUT: import.meta.env.VITE_CRAZYGAMES_STORE_LAYOUT,
});

export const CURRENCY_PACK_LAYOUT = Object.freeze([
  { sku: "doubloons-500", label: "Deckhand Purse", amount: 500 },
  { sku: "doubloons-1400", label: "Captain's Chest", amount: 1_400 },
  { sku: "doubloons-3200", label: "Admiral's Hoard", amount: 3_200 },
]);
