import { describe, expect, it } from "vitest";

import {
  createGameState,
  getDropStoredMass,
  spawnDrop,
  spawnPlayer,
  stepGame,
} from "../src/game/core";
import {
  GALE_PENNANT_SPEED_MULTIPLIER,
  getCameraZoomMultiplier,
  SPYGLASS_CAMERA_ZOOM_MULTIPLIER,
} from "../src/game/relics";
import type { ActiveSpecialist } from "../src/game/types";

function active(
  relicKind: NonNullable<ActiveSpecialist["relicKind"]>,
  relicTier?: ActiveSpecialist["relicTier"],
): ActiveSpecialist {
  return {
    kind: "collector",
    relicKind,
    ...(relicTier ? { relicTier } : {}),
    activatedAtTick: 0,
    expiresAtTick: 100,
    durationTicks: 100,
  };
}

function movementState(id: string) {
  const state = createGameState(id, {
    fixedStepSeconds: 0.1,
    arenaRadius: 10_000,
    startMass: 100,
    minimumMass: 24,
    minimumBoostMass: 34,
    baseSpeed: 10,
    boostSpeed: 20,
    boostMassPerSecond: 1,
    shedDropMass: 2,
    deathDropTargetMass: 2,
    spawnShieldSeconds: 0,
  });
  const player = spawnPlayer(state, {
    id: "captain",
    position: { x: 0, y: 0 },
    direction: { x: 1, y: 0 },
    mass: 100,
    shieldSeconds: 0,
  });
  return { state, player };
}

describe("owner-required pirate power parity", () => {
  it("Gale Pennant raises normal and sprint movement by exactly 18 percent", () => {
    const baseline = movementState("gale-baseline");
    const gale = movementState("gale-active");
    gale.player.specialist = active("gale-pennant");
    const input = {
      captain: { sequence: 1, direction: { x: 1, y: 0 }, boost: false },
    };
    stepGame(baseline.state, input);
    stepGame(gale.state, input);
    expect(gale.player.position.x).toBeCloseTo(
      baseline.player.position.x * GALE_PENNANT_SPEED_MULTIPLIER,
      10,
    );

    const sprintBaseline = movementState("gale-sprint-baseline");
    const sprintGale = movementState("gale-sprint-active");
    sprintGale.player.specialist = active("gale-pennant");
    const sprintInput = {
      captain: { sequence: 1, direction: { x: 1, y: 0 }, boost: true },
    };
    stepGame(sprintBaseline.state, sprintInput);
    stepGame(sprintGale.state, sprintInput);
    expect(sprintGale.player.position.x).toBeCloseTo(
      sprintBaseline.player.position.x * GALE_PENNANT_SPEED_MULTIPLIER,
      10,
    );
    expect(sprintGale.player.mass).toBeCloseTo(sprintBaseline.player.mass, 10);
  });

  it("Maelstrom Wheel repeats zero-clearance 360 loops while active, including during sprint", () => {
    const baseline = movementState("turn-baseline");
    const wheel = movementState("turn-wheel");
    wheel.player.specialist = active("maelstrom-wheel");
    const reverse = {
      captain: { sequence: 1, direction: { x: -1, y: 0 }, boost: false },
    };
    stepGame(baseline.state, reverse);
    stepGame(wheel.state, reverse);
    expect(wheel.player.direction.x).toBeCloseTo(-1, 12);
    expect(wheel.player.direction.y).toBeCloseTo(0, 12);
    expect(baseline.player.direction.x).not.toBeCloseTo(-1, 4);

    const diagonal = Math.SQRT1_2;
    const loop = [
      { x: -diagonal, y: diagonal },
      { x: 0, y: 1 },
      { x: diagonal, y: diagonal },
      { x: 1, y: 0 },
      { x: diagonal, y: -diagonal },
      { x: 0, y: -1 },
      { x: -diagonal, y: -diagonal },
      { x: -1, y: 0 },
    ] as const;
    let sequence = 2;
    for (let lap = 0; lap < 2; lap += 1) {
      for (const direction of loop) {
        stepGame(wheel.state, {
          captain: { sequence, direction, boost: true },
        });
        expect(wheel.player.direction.x).toBeCloseTo(direction.x, 12);
        expect(wheel.player.direction.y).toBeCloseTo(direction.y, 12);
        expect(wheel.player.alive).toBe(true);
        sequence += 1;
      }
    }

    // The zero-clearance law belongs to the timed Relic, not the player.
    // On the exact expiry tick, ordinary turn radius is restored.
    wheel.player.specialist!.expiresAtTick = wheel.state.tick + 1;
    stepGame(wheel.state, {
      captain: { sequence, direction: { x: 1, y: 0 }, boost: false },
    });
    expect(wheel.player.specialist).toBeUndefined();
    expect(wheel.player.direction.x).not.toBeCloseTo(1, 4);
  });

  it("Emerald Spyglass exposes the exact camera pullback only while active", () => {
    expect(getCameraZoomMultiplier(undefined, 1)).toBe(1);
    const spyglass = active("emerald-spyglass");
    expect(getCameraZoomMultiplier(spyglass, 1)).toBe(
      SPYGLASS_CAMERA_ZOOM_MULTIPLIER,
    );
    expect(1 / SPYGLASS_CAMERA_ZOOM_MULTIPLIER).toBe(1.25);
    expect(getCameraZoomMultiplier(spyglass, 100)).toBe(1);
  });

  it("Twin Turbo Lightning never charges size during its seven-second authoritative window", () => {
    const state = createGameState("storm-two-tanks", {
      fixedStepSeconds: 0.1,
      arenaRadius: 10_000,
    });
    const player = spawnPlayer(state, {
      id: "storm-captain",
      shieldSeconds: 60,
    });
    player.specialist = {
      kind: "collector",
      relicKind: "storm-battery",
      activatedAtTick: 0,
      expiresAtTick: 70,
      durationTicks: 70,
    };
    const startingMass = player.mass;
    for (let tick = 0; tick < 69; tick += 1) {
      stepGame(state, {
        [player.id]: {
          sequence: tick + 1,
          direction: { x: 1, y: 0 },
          boost: true,
        },
      });
    }
    expect(player.mass).toBeCloseTo(startingMass, 8);
    stepGame(state, {
      [player.id]: {
        sequence: 70,
        direction: { x: 1, y: 0 },
        boost: true,
      },
    });
    expect(player.mass).toBeLessThan(startingMass);
  });

  it("Treasure Multiplier applies every 2x/3x/4x/5x/10x tier to positive-mass pickups", () => {
    for (const tier of [2, 3, 4, 5, 10] as const) {
      const { state, player } = movementState(`ledger-${tier}`);
      state.config.baseSpeed = 0;
      state.config.boostSpeed = 0;
      player.specialist = active("gilded-ledger", tier);
      const startingMass = player.mass;
      spawnDrop(state, {
        id: `neutral-${tier}`,
        position: { ...player.position },
        mass: 4,
        source: "arena",
      });
      const result = stepGame(state);
      expect(player.mass - startingMass).toBe(4 * tier);
      expect(result.events).toContainEqual({
        type: "dropCollected",
        tick: 1,
        playerId: player.id,
        dropId: `neutral-${tier}`,
        mass: 4 * tier,
      });
    }

    for (const source of ["boost", "death"] as const) {
      const { state, player } = movementState(`ledger-excluded-${source}`);
      state.config.baseSpeed = 0;
      state.config.boostSpeed = 0;
      player.specialist = active("gilded-ledger", 5);
      const startingMass = player.mass;
      spawnDrop(state, {
        id: `${source}-echo`,
        position: { ...player.position },
        mass: 2,
        bankedMass: 8,
        source,
        originPlayerId: player.id,
      });
      stepGame(state);
      expect(player.mass - startingMass).toBe(10);
      expect(state.drops).toHaveLength(1);
      expect(getDropStoredMass(state.drops[0])).toBe(8);
    }
  });

  it("requires an explicit legal Ledger tier and carries it through activation", () => {
    const { state, player } = movementState("ledger-wire-identity");
    state.config.baseSpeed = 0;
    state.config.boostSpeed = 0;
    expect(() => spawnDrop(state, {
      id: "missing-tier",
      position: { ...player.position },
      mass: 0,
      relicKind: "gilded-ledger",
    })).toThrow(/2×, 3×, 4×, 5×, or rare 10×/u);
    expect(() => spawnDrop(state, {
      id: "wrong-owner",
      position: { ...player.position },
      mass: 0,
      relicKind: "gale-pennant",
      relicTier: 5,
    })).toThrow(/Only a Treasure Multiplier/u);

    spawnDrop(state, {
      id: "ledger-x5",
      position: { ...player.position },
      mass: 0,
      relicKind: "gilded-ledger",
      relicTier: 5,
    });
    const result = stepGame(state);
    expect(player.specialist).toMatchObject({
      relicKind: "gilded-ledger",
      relicTier: 5,
    });
    expect(result.events).toContainEqual(expect.objectContaining({
      type: "specialistActivated",
      relicKind: "gilded-ledger",
      relicTier: 5,
    }));
  });
});
