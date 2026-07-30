import { describe, expect, it } from "vitest";
import {
  commonTreasureSprite,
  drawGroundTreasureSpriteField,
  pirateSpritePath,
  PIRATE_SPRITE_NAMES,
  serpentBodySprite,
} from "../src/game/pirateSpriteAtlas";

describe("original pirate sprite atlas", () => {
  it("maps ordinary pickups to semantic treasure silhouettes, never dots", () => {
    const expected = new Set([
      "doubloon-stack",
      "ruby-skull",
      "sapphire-anchor",
      "emerald-spyglass",
      "pearl-shell",
      "ornate-key",
      "treasure-map",
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
    expect(PIRATE_SPRITE_NAMES).toHaveLength(16);
    for (const name of PIRATE_SPRITE_NAMES) {
      expect(pirateSpritePath(name)).toBe(`/assets/sprites/pirate-atlas/${name}.png`);
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
});
