import { describe, expect, it } from "vitest";
import {
  grantRewardedCorsairSkin,
  isRewardedCorsairSkinEquipped,
} from "../src/game/rewardedSkin";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("rewarded cosmetic skin", () => {
  it("starts locked and becomes equipped only after settlement", () => {
    const storage = memoryStorage();
    expect(isRewardedCorsairSkinEquipped(storage)).toBe(false);
    expect(grantRewardedCorsairSkin(storage)).toBe(true);
    expect(isRewardedCorsairSkinEquipped(storage)).toBe(true);
  });
});
