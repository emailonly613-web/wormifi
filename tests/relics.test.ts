import { describe, expect, it } from "vitest";

import {
  createGameState,
  getPlayerRadius,
  getRelicSecondsRemaining,
  getSpecialistSecondsRemaining,
  spawnDrop,
  spawnPlayer,
  stepGame,
} from "../src/game/core";
import {
  getActiveRelicKind,
  getSpyglassDangerBearings,
  PEPPER_CUTLASS_BOOST_COST_MULTIPLIER,
} from "../src/game/relics";
import type { PirateRelicKind, PlayerState } from "../src/game/types";

function stationaryRelicState(seed: string) {
  const state = createGameState(seed, {
    fixedStepSeconds: 0.1,
    arenaRadius: 10_000,
    baseSpeed: 0,
    boostSpeed: 0,
    spawnShieldSeconds: 0,
  });
  const player = spawnPlayer(state, {
    id: "relic-runner",
    position: { x: 0, y: 0 },
    direction: { x: 1, y: 0 },
    shieldSeconds: 0,
  });
  return { state, player };
}

describe("first-launch pirate Relics", () => {
  it("uses one exact slot with deterministic duration, replacement, and expiry", () => {
    const { state, player } = stationaryRelicState("relic-slot");
    spawnDrop(state, {
      id: "legacy-collector",
      position: { ...player.position },
      mass: 0,
      specialist: "collector",
    });

    let result = stepGame(state);
    expect(player.specialist).toEqual({
      kind: "collector",
      activatedAtTick: 1,
      expiresAtTick: 121,
      durationTicks: 120,
    });
    expect(getActiveRelicKind(player.specialist)).toBe("loot-compass");
    expect(getSpecialistSecondsRemaining(state, player)).toBe(12);
    expect(result.events).toContainEqual({
      type: "specialistActivated",
      tick: 1,
      playerId: player.id,
      dropId: "legacy-collector",
      specialist: "collector",
      durationTicks: 120,
    });

    spawnDrop(state, {
      id: "spyglass",
      position: { ...player.position },
      mass: 0,
      relicKind: "emerald-spyglass",
    });
    result = stepGame(state);
    expect(player.specialist).toEqual({
      kind: "collector",
      relicKind: "emerald-spyglass",
      activatedAtTick: 2,
      expiresAtTick: 102,
      durationTicks: 100,
    });
    expect(getSpecialistSecondsRemaining(state, player)).toBe(0);
    expect(getRelicSecondsRemaining(state, player, "emerald-spyglass")).toBe(10);
    expect(result.events).toContainEqual({
      type: "specialistExpired",
      tick: 2,
      playerId: player.id,
      specialist: "collector",
    });

    spawnDrop(state, {
      id: "cutlass",
      position: { ...player.position },
      mass: 0,
      relicKind: "pepper-cutlass",
    });
    result = stepGame(state);
    expect(player.specialist).toEqual({
      kind: "collector",
      relicKind: "pepper-cutlass",
      activatedAtTick: 3,
      expiresAtTick: 83,
      durationTicks: 80,
    });
    expect(result.events).toEqual(expect.arrayContaining([
      {
        type: "specialistExpired",
        tick: 3,
        playerId: player.id,
        specialist: "collector",
        relicKind: "emerald-spyglass",
      },
      {
        type: "specialistActivated",
        tick: 3,
        playerId: player.id,
        dropId: "cutlass",
        specialist: "collector",
        relicKind: "pepper-cutlass",
        durationTicks: 80,
      },
    ]));

    while (state.tick < 82) stepGame(state);
    expect(getRelicSecondsRemaining(state, player, "pepper-cutlass")).toBeCloseTo(0.1, 8);
    result = stepGame(state);
    expect(state.tick).toBe(83);
    expect(player.specialist).toBeUndefined();
    expect(result.events).toContainEqual({
      type: "specialistExpired",
      tick: 83,
      playerId: player.id,
      specialist: "collector",
      relicKind: "pepper-cutlass",
    });
  });

  it("reduces only Pepper Cutlass boost mass cost by exactly 25 percent", () => {
    const makeState = () => {
      const state = createGameState("pepper-cost", {
        fixedStepSeconds: 0.1,
        arenaRadius: 10_000,
        startMass: 100,
        minimumMass: 24,
        minimumBoostMass: 34,
        baseSpeed: 10,
        boostSpeed: 20,
        boostMassPerSecond: 20,
        shedDropMass: 1_000,
        massPerSegment: 1_000,
        spawnShieldSeconds: 0,
      });
      const player = spawnPlayer(state, {
        id: "runner",
        position: { x: 0, y: 0 },
        direction: { x: 1, y: 0 },
        mass: 100,
        shieldSeconds: 0,
      });
      return { state, player };
    };
    const baseline = makeState();
    const pepper = makeState();
    pepper.player.specialist = {
      kind: "collector",
      relicKind: "pepper-cutlass",
      activatedAtTick: 0,
      expiresAtTick: 80,
      durationTicks: 80,
    };
    const input = {
      runner: { sequence: 1, direction: { x: 1, y: 0 }, boost: true },
    };

    stepGame(baseline.state, input);
    stepGame(pepper.state, input);

    expect(pepper.player.position).toEqual(baseline.player.position);
    expect(pepper.player.direction).toEqual(baseline.player.direction);
    expect(pepper.player.lastInput).toEqual(baseline.player.lastInput);
    expect(pepper.state.config.boostSpeed).toBe(baseline.state.config.boostSpeed);
    const baselineCost = 100 - baseline.player.mass;
    const pepperCost = 100 - pepper.player.mass;
    expect(pepperCost).toBeCloseTo(
      baselineCost * PEPPER_CUTLASS_BOOST_COST_MULTIPLIER,
      10,
    );
    expect(pepperCost).toBeCloseTo(1.5, 10);
    expect(pepper.player.shedMassRemainder).toBeCloseTo(pepperCost, 10);
    expect(pepper.state.drops).toEqual([]);
  });

  it("never gives Compass reach to Spyglass or Pepper through the v5 envelope", () => {
    for (const relicKind of ["emerald-spyglass", "pepper-cutlass"] as const) {
      const { state, player } = stationaryRelicState(`no-compass-${relicKind}`);
      player.specialist = {
        kind: "collector",
        relicKind,
        activatedAtTick: 0,
        expiresAtTick: 100,
        durationTicks: 100,
      };
      const normalReach = getPlayerRadius(player, state.config) + 4;
      spawnDrop(state, {
        id: `neutral-${relicKind}`,
        position: { x: normalReach * 1.2, y: 0 },
        mass: 3,
        radius: 4,
        source: "arena",
      });
      const startingMass = player.mass;

      stepGame(state);

      expect(player.mass, relicKind).toBe(startingMass);
      expect(state.drops.map((drop) => drop.id), relicKind).toContain(
        `neutral-${relicKind}`,
      );
    }
  });

  it("keeps Compass and Spyglass physics checksums unchanged and every Relic lethal", () => {
    const movementChecksum = (relicKind?: PirateRelicKind) => {
      const state = createGameState("relic-physics-checksum", {
        fixedStepSeconds: 0.1,
        arenaRadius: 10_000,
        baseSpeed: 10,
        boostSpeed: 20,
        boostMassPerSecond: 1,
        shedDropMass: 100,
        spawnShieldSeconds: 0,
      });
      const player = spawnPlayer(state, {
        id: "runner",
        position: { x: 0, y: 0 },
        direction: { x: 1, y: 0 },
        shieldSeconds: 0,
      });
      if (relicKind) {
        player.specialist = {
          kind: "collector",
          ...(relicKind === "loot-compass" ? {} : { relicKind }),
          activatedAtTick: 0,
          expiresAtTick: 100,
          durationTicks: 100,
        };
      }
      const events = stepGame(state, {
        runner: { sequence: 1, direction: { x: 0.8, y: 0.2 }, boost: false },
      }).events;
      return JSON.stringify({
        position: player.position,
        direction: player.direction,
        body: player.body,
        mass: player.mass,
        alive: player.alive,
        events,
      });
    };

    const baseline = movementChecksum();
    expect(movementChecksum("loot-compass")).toBe(baseline);
    expect(movementChecksum("emerald-spyglass")).toBe(baseline);

    for (const relicKind of [
      "loot-compass",
      "emerald-spyglass",
      "pepper-cutlass",
    ] as const) {
      const state = createGameState(`relic-lethal-${relicKind}`, {
        fixedStepSeconds: 1,
        arenaRadius: 1_000,
        baseSpeed: 20,
        boostSpeed: 20,
        baseRadius: 2,
        massRadiusFactor: 0,
        bodyRadiusFactor: 1,
        segmentSpacingFactor: 3.75,
        startingBodySegments: 3,
        minimumBodySegments: 3,
        massPerSegment: 1_000,
        spawnShieldSeconds: 0,
      });
      const attacker = spawnPlayer(state, {
        id: "attacker",
        position: { x: -10, y: 10 },
        direction: { x: 1, y: 0 },
        shieldSeconds: 0,
      });
      const owner = spawnPlayer(state, {
        id: "owner",
        position: { x: 0, y: 15 },
        direction: { x: 0, y: 1 },
        shieldSeconds: 0,
      });
      attacker.specialist = {
        kind: "collector",
        ...(relicKind === "loot-compass" ? {} : { relicKind }),
        activatedAtTick: 0,
        expiresAtTick: 10,
        durationTicks: 10,
      };
      stepGame(state, {
        attacker: { sequence: 1, direction: { x: 1, y: 0 }, boost: false },
        owner: { sequence: 1, direction: { x: 0, y: 1 }, boost: false },
      });
      expect(attacker.alive, relicKind).toBe(false);
      expect(attacker.killedBy, relicKind).toBe(owner.id);
    }
  });

  it("reveals only coarse, bounded Spyglass danger sectors", () => {
    const carrier = {
      id: "carrier",
      position: { x: 0, y: 0 },
      specialist: {
        kind: "collector" as const,
        relicKind: "emerald-spyglass" as const,
        activatedAtTick: 0,
        expiresAtTick: 20,
        durationTicks: 20,
      },
    };
    const rival = (id: string, x: number, y: number, alive = true) => ({
      id,
      position: { x, y },
      alive,
    });
    const bearings = getSpyglassDangerBearings(carrier, [
      rival("east-near", 150, 0),
      rival("east-far", 250, 10),
      rival("north", 0, -160),
      rival("northwest", -190, -190),
      rival("visible", 60, 0),
      rival("outside-scan", 301, 0),
      rival("dead", 0, 170, false),
    ], 5, 100);

    expect(bearings).toEqual([
      { sector: "E", distanceBand: "near", threatCount: 2 },
      { sector: "NW", distanceBand: "far", threatCount: 1 },
      { sector: "N", distanceBand: "near", threatCount: 1 },
    ]);
    expect(Object.keys(bearings[0] ?? {})).toEqual([
      "sector",
      "distanceBand",
      "threatCount",
    ]);
    expect(JSON.stringify(bearings)).not.toContain("east-near");
    expect(getSpyglassDangerBearings(carrier, [], 20, 100)).toEqual([]);

    const noRelicCarrier = {
      ...carrier,
      specialist: undefined,
    } satisfies Pick<PlayerState, "id" | "position" | "specialist">;
    expect(getSpyglassDangerBearings(noRelicCarrier, [], 5, 100)).toEqual([]);
  });
});
