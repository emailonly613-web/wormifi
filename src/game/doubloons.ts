export const DOUBLOON_STORAGE_KEY = "wormifi.doubloons.v1";
export const REWARDED_VIDEO_DOUBLOONS = 100;
const MAX_DOUBLOONS = 999_999_999;

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

export function readDoubloons(storage: StorageLike | undefined = browserStorage()): number {
  if (!storage) return 0;
  try {
    const parsed = Number(storage.getItem(DOUBLOON_STORAGE_KEY));
    return Number.isSafeInteger(parsed) && parsed >= 0
      ? Math.min(parsed, MAX_DOUBLOONS)
      : 0;
  } catch {
    return 0;
  }
}

export function grantDoubloons(
  amount: number,
  storage: StorageLike | undefined = browserStorage(),
): number {
  const safeAmount = Number.isFinite(amount) ? Math.max(0, Math.trunc(amount)) : 0;
  const next = Math.min(MAX_DOUBLOONS, readDoubloons(storage) + safeAmount);
  try {
    storage?.setItem(DOUBLOON_STORAGE_KEY, String(next));
  } catch {
    // A blocked local store never blocks the game or an ad settlement. The
    // caller still receives the in-memory balance for this browser session.
  }
  return next;
}
