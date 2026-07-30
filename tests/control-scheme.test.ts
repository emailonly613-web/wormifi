import { describe, expect, it } from "vitest";
import {
  CONTROL_SCHEME_STORAGE_KEY,
  fixedHelmAnchor,
  readControlScheme,
  touchStartsHelm,
  writeControlScheme,
} from "../src/game/controlScheme";

describe("mobile helm choices", () => {
  it("defaults invalid or unavailable storage to drag-anywhere", () => {
    expect(readControlScheme({ getItem: () => "tiny-unusable-control" })).toBe("drag-anywhere");
    expect(readControlScheme({ getItem: () => { throw new Error("blocked"); } })).toBe("drag-anywhere");
  });

  it("persists an explicit handed helm without changing gameplay input law", () => {
    const saved = new Map<string, string>();
    const storage = {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => saved.set(key, value),
    };
    writeControlScheme("left-helm", storage);
    expect(saved.get(CONTROL_SCHEME_STORAGE_KEY)).toBe("left-helm");
    expect(readControlScheme(storage)).toBe("left-helm");
  });

  it("mirrors fixed anchors and rejects unrelated screen touches", () => {
    const left = fixedHelmAnchor(390, 844, "left-helm");
    const right = fixedHelmAnchor(390, 844, "right-helm");
    expect(left).toEqual({ x: 78, y: 717 });
    expect(right).toEqual({ x: 312, y: 717 });
    expect(touchStartsHelm({ x: 82, y: 720 }, left)).toBe(true);
    expect(touchStartsHelm({ x: 300, y: 180 }, left)).toBe(false);
    expect(fixedHelmAnchor(390, 844, "drag-anywhere")).toBeUndefined();
  });
});
