export const REWARDED_CORSAIR_SKIN_ID = "gilded-corsair" as const;
export const REWARDED_CORSAIR_SKIN_LABEL = "GILDED CORSAIR";
const STORAGE_KEY = "wormifi.rewarded-skin.gilded-corsair.v1";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

let browserEquippedCache: boolean | undefined;

function browserStorage(): StorageLike | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

export function isRewardedCorsairSkinEquipped(
  storage: StorageLike | undefined = browserStorage(),
): boolean {
  if (storage === browserStorage() && browserEquippedCache !== undefined) {
    return browserEquippedCache;
  }
  let equipped = false;
  try {
    equipped = storage?.getItem(STORAGE_KEY) === "equipped";
  } catch {
    equipped = false;
  }
  if (storage === browserStorage()) browserEquippedCache = equipped;
  return equipped;
}

export function grantRewardedCorsairSkin(
  storage: StorageLike | undefined = browserStorage(),
): boolean {
  try {
    storage?.setItem(STORAGE_KEY, "equipped");
    if (storage === browserStorage()) browserEquippedCache = true;
    return true;
  } catch {
    return false;
  }
}

export const GILDED_CORSAIR_PALETTE = ["#ffe98b", "#8f4c16", "#fff8cf"] as const;
