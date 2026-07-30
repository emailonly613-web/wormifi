import { describe, expect, it } from "vitest";
import {
  DOUBLOON_STORAGE_KEY,
  grantDoubloons,
  readDoubloons,
} from "../src/game/doubloons";

function memoryStorage(initial?: string) {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(DOUBLOON_STORAGE_KEY, initial);
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("doubloon wallet", () => {
  it("starts safely at zero for missing or malformed values", () => {
    expect(readDoubloons(memoryStorage())).toBe(0);
    expect(readDoubloons(memoryStorage("not-a-number"))).toBe(0);
    expect(readDoubloons(memoryStorage("-10"))).toBe(0);
  });

  it("persists an exact positive reward", () => {
    const storage = memoryStorage("50");
    expect(grantDoubloons(100, storage)).toBe(150);
    expect(readDoubloons(storage)).toBe(150);
  });

  it("never mints negative, fractional, or unbounded balances", () => {
    const storage = memoryStorage("20");
    expect(grantDoubloons(-100, storage)).toBe(20);
    expect(grantDoubloons(9.8, storage)).toBe(29);
    expect(grantDoubloons(Number.POSITIVE_INFINITY, storage)).toBe(29);
    expect(grantDoubloons(2_000_000_000, storage)).toBe(999_999_999);
  });
});
