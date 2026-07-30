import { describe, expect, it } from "vitest";

import {
  createGameState,
  spawnDrop,
  spawnPlayer,
  stepGame,
} from "../src/game/core";
import {
  COMMON_TREASURE_MAX_MASS,
  COMMON_TREASURE_MIN_MASS,
  MASS_PER_BODY_SEGMENT,
  RARE_TREASURE_CHEST_MASS,
  selectNeutralTreasureMass,
} from "../src/game/treasureEconomy";

describe("long-run treasure growth economy", () => {
  it("keeps ordinary food inside one small bounded progress range", () => {
    expect(selectNeutralTreasureMass(0, 0)).toBe(COMMON_TREASURE_MIN_MASS);
    expect(selectNeutralTreasureMass(1, 0)).toBe(COMMON_TREASURE_MAX_MASS);
    expect(selectNeutralTreasureMass(Number.NaN, Number.NaN))
      .toBe(COMMON_TREASURE_MIN_MASS);
  });

  it("reserves large single-pickup progress for a rare chest", () => {
    expect(selectNeutralTreasureMass(0.5, 0.965)).toBe(RARE_TREASURE_CHEST_MASS);
    expect(RARE_TREASURE_CHEST_MASS).toBeLessThan(MASS_PER_BODY_SEGMENT / 3);
  });

  it("requires sustained ordinary collection before adding body length", () => {
    const state = createGameState("slow-growth-proof", {
      baseSpeed: 0,
      boostSpeed: 0,
      arenaRadius: 10_000,
    });
    const player = spawnPlayer(state, {
      id: "patient-captain",
      position: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      shieldSeconds: 0,
    });
    const startingLength = player.body.length;
    const pickupCountForFirstFollower = Math.ceil(
      MASS_PER_BODY_SEGMENT / COMMON_TREASURE_MAX_MASS,
    );
    expect(pickupCountForFirstFollower).toBe(50);

    for (let pickup = 1; pickup < pickupCountForFirstFollower; pickup += 1) {
      spawnDrop(state, {
        id: `ordinary-${pickup}`,
        position: { ...player.position },
        mass: COMMON_TREASURE_MAX_MASS,
        source: "arena",
      });
      stepGame(state, {
        [player.id]: {
          sequence: pickup,
          direction: { x: 1, y: 0 },
          boost: false,
        },
      });
    }

    expect(player.mass).toBeCloseTo(
      48 + (pickupCountForFirstFollower - 1) * COMMON_TREASURE_MAX_MASS,
      10,
    );
    expect(player.body).toHaveLength(startingLength);

    spawnDrop(state, {
      id: "fiftieth-ordinary",
      position: { ...player.position },
      mass: COMMON_TREASURE_MAX_MASS,
      source: "arena",
    });
    stepGame(state, {
      [player.id]: {
        sequence: pickupCountForFirstFollower,
        direction: { x: 1, y: 0 },
        boost: false,
      },
    });
    expect(player.body).toHaveLength(startingLength + 1);
  });
});
