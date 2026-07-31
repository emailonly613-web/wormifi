import { describe, expect, it } from "vitest";
import { createGameState, spawnDrop } from "../src/game/core";
import { treasurePointValue } from "../src/game/treasureEconomy";
import {
  AMBIENT_TREASURE_MAX_LIFETIME_SECONDS,
  AMBIENT_TREASURE_MIN_LIFETIME_SECONDS,
  ambientTreasureLifetimeTicks,
  ambientTreasureOpacity,
  expireAmbientTreasure,
} from "../src/game/treasureFlow";

describe("living ambient treasure field", () => {
  it("stagger-fades ordinary treasure in and out within the published lifetime band", () => {
    const fixedStepSeconds = 1 / 30;
    const lifetimeTicks = ambientTreasureLifetimeTicks(42, fixedStepSeconds);
    expect(lifetimeTicks * fixedStepSeconds).toBeGreaterThanOrEqual(
      AMBIENT_TREASURE_MIN_LIFETIME_SECONDS - fixedStepSeconds,
    );
    expect(lifetimeTicks * fixedStepSeconds).toBeLessThanOrEqual(
      AMBIENT_TREASURE_MAX_LIFETIME_SECONDS + fixedStepSeconds,
    );

    const drop = { spawnedAtTick: 100, expiresAtTick: 100 + lifetimeTicks };
    expect(ambientTreasureOpacity(drop, 100, fixedStepSeconds)).toBe(0);
    expect(ambientTreasureOpacity(drop, 130, fixedStepSeconds)).toBe(1);
    expect(ambientTreasureOpacity(drop, drop.expiresAtTick - 1, fixedStepSeconds)).toBeLessThan(0.02);
  });

  it("relocates only expired neutral treasure and never deletes Echo mass or Relics", () => {
    const state = createGameState("ambient-relocation", { fixedStepSeconds: 0.1 });
    const ordinary = spawnDrop(state, {
      id: "ordinary",
      position: { x: 0, y: 0 },
      mass: 0.4,
      source: "arena",
      lifetimeTicks: 10,
    });
    spawnDrop(state, {
      id: "death-echo",
      position: { x: 10, y: 0 },
      mass: 5,
      source: "death",
    });
    spawnDrop(state, {
      id: "relic",
      position: { x: 20, y: 0 },
      mass: 0,
      source: "arena",
      relicKind: "emerald-spyglass",
    });

    state.tick = ordinary.expiresAtTick!;
    expect(expireAmbientTreasure(state)).toBe(1);
    expect(state.drops.map((drop) => drop.id).sort()).toEqual(["death-echo", "relic"]);
  });

  it("calculates the final positive pickup popup after any multiplier", () => {
    expect(treasurePointValue(0.2)).toBe(2);
    expect(treasurePointValue(0.6)).toBe(7);
    expect(treasurePointValue(3.5)).toBe(42);
    expect(treasurePointValue(3.5 * 10)).toBe(420);
    expect(treasurePointValue(0.6 * 5)).toBe(36);
  });
});
