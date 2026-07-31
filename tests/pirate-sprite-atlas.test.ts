import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  commonTreasureSprite,
  drawGroundTreasureSpriteField,
  drawPickupRewardPopup,
  GROUND_TREASURE_COMPACT_MIN_LOGICAL_SIZE,
  GROUND_TREASURE_MIN_LOGICAL_SIZE,
  pirateSpritePath,
  PIRATE_SPRITE_NAMES,
  serpentBodySprite,
} from "../src/game/pirateSpriteAtlas";

describe("original pirate sprite atlas", () => {
  it("keeps ordinary prizes legible at desktop and compact gameplay sizes", () => {
    expect(GROUND_TREASURE_MIN_LOGICAL_SIZE).toBeGreaterThanOrEqual(40);
    expect(GROUND_TREASURE_COMPACT_MIN_LOGICAL_SIZE).toBeGreaterThanOrEqual(34);
  });

  it("uses a soft oval float shadow without square or diamond framing", () => {
    const shadow = readFileSync(resolve(
      "public/assets/sprites/pirate-atlas/treasure-float-shadow-v1.svg",
    ), "utf8");
    expect(shadow).toContain("<ellipse");
    expect(shadow).not.toMatch(/<rect|<polygon/i);
    const glint = readFileSync(resolve(
      "public/assets/sprites/pirate-atlas/treasure-glint-v1.svg",
    ), "utf8");
    expect(glint).toContain("<ellipse");
    expect(glint).not.toMatch(/<rect|<polygon/i);
  });

  it("maps ordinary pickups to semantic treasure silhouettes, never dots", () => {
    const expected = new Set([
      "treasure-doubloons",
      "treasure-ruby-cluster",
      "treasure-sapphire-anchor",
      "treasure-emerald-spyglass",
      "treasure-pearl-shell",
      "treasure-ornate-key",
      "treasure-chart-scroll",
    ]);
    const selected = new Set(Array.from({ length: 70 }, (_, seed) => commonTreasureSprite(seed)));
    expect(selected).toEqual(expected);
    expect([...selected].some((name) => /dot|mote|pellet/i.test(name))).toBe(false);
  });

  it("uses long-form serpent hull sections rather than portrait beads", () => {
    expect(serpentBodySprite(0)).toBe("serpent-body-porthole");
    expect(serpentBodySprite(2)).toBe("serpent-body-sash");
    expect(serpentBodySprite(6)).toBe("serpent-body-sash");
  });

  it("publishes one stable path for every authored sprite", () => {
    expect(PIRATE_SPRITE_NAMES).toHaveLength(24);
    for (const name of PIRATE_SPRITE_NAMES) {
      expect(pirateSpritePath(name)).toBe(`/assets/sprites/pirate-atlas/${name}.png`);
      const bytes = readFileSync(resolve(`public/assets/sprites/pirate-atlas/${name}.png`));
      expect(bytes.subarray(0, 8).toString("hex"), name).toBe("89504e470d0a1a0a");
    }
  });

  it("uses caller-projected ground coordinates without repeating the transform", () => {
    let projections = 0;
    drawGroundTreasureSpriteField(
      {} as CanvasRenderingContext2D,
      [{
        id: "cached-treasure",
        position: { x: 10, y: 20 },
        radius: 8,
        seed: 1,
        screenX: 32,
        screenY: 48,
      }],
      () => {
        projections += 1;
        return { x: 32, y: 48 };
      },
      1,
      320,
      180,
      0,
    );
    expect(projections).toBe(0);
  });

  it("falls back to world projection when cached coordinates are absent", () => {
    let projections = 0;
    drawGroundTreasureSpriteField(
      {} as CanvasRenderingContext2D,
      [{
        id: "uncached-treasure",
        position: { x: 10, y: 20 },
        radius: 8,
        seed: 1,
      }],
      () => {
        projections += 1;
        return { x: 32, y: 48 };
      },
      1,
      320,
      180,
      0,
    );
    expect(projections).toBe(1);
  });

  it("never prints values on the ground and draws +points only when explicitly collected", () => {
    const fieldText: string[] = [];
    const fieldContext = new Proxy({} as CanvasRenderingContext2D, {
      get(_target, key) {
        if (key === "fillText" || key === "strokeText") {
          return (value: string) => fieldText.push(value);
        }
        return undefined;
      },
      set() { return true; },
    });
    drawGroundTreasureSpriteField(
      fieldContext,
      [{
        id: "ground-with-legacy-value",
        position: { x: 0, y: 0 },
        radius: 8,
        seed: 2,
        screenX: 50,
        screenY: 50,
        points: 420,
      } as never],
      () => ({ x: 50, y: 50 }),
      1,
      100,
      100,
      0,
    );
    expect(fieldText).toEqual([]);

    const pickupText: string[] = [];
    const popupContext = new Proxy({ globalAlpha: 1 } as CanvasRenderingContext2D, {
      get(target, key) {
        if (key === "fillText" || key === "strokeText") {
          return (value: string) => pickupText.push(value);
        }
        if (key === "save" || key === "restore") return () => undefined;
        return Reflect.get(target, key);
      },
      set(target, key, value) {
        return Reflect.set(target, key, value);
      },
    });
    drawPickupRewardPopup(popupContext, 420, 50, 40, 30, 0.8);
    expect(pickupText).toEqual(["+420", "+420"]);
  });
});
