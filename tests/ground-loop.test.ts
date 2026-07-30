import { describe, expect, it } from "vitest";
import {
  calculateScore,
  createGameState,
  getBodyRadius,
  getPlayerRadius,
  getSpecialistSecondsRemaining,
  isSpecialistActive,
  spawnDrop,
  spawnPlayer,
  stepGame,
} from "../src/game/core";
import type { GameState, PlayerState } from "../src/game/types";

function stationaryState(seed: string) {
  const state = createGameState(seed, {
    fixedStepSeconds: 0.1,
    arenaRadius: 10_000,
    baseSpeed: 0,
    boostSpeed: 0,
    spawnShieldSeconds: 0,
    collectorDurationSeconds: 0.3,
    collectorPickupRadiusMultiplier: 1.35,
  });
  const player = spawnPlayer(state, {
    id: "collector",
    position: { x: 0, y: 0 },
    direction: { x: 1, y: 0 },
    shieldSeconds: 0,
  });
  return { state, player };
}

function activateCollector(state: GameState, player: PlayerState) {
  spawnDrop(state, {
    id: "collector-beacon",
    position: { ...player.position },
    mass: 0,
    radius: 2,
    specialist: "collector",
    specialistDurationSeconds: 0.3,
  });
  return stepGame(state);
}

function extendedOnlyDistance(state: GameState, player: PlayerState, dropRadius = 4) {
  const baseReach = getPlayerRadius(player, state.config) + dropRadius;
  return baseReach * 1.2;
}

describe("approved deterministic ground loop", () => {
  it("activates Collector without mass or pickup score and expires on an exact tick", () => {
    const { state, player } = stationaryState("collector-timer");
    const massBefore = player.mass;
    const collectedBefore = player.stats.collectedMass;
    const scoreBefore = calculateScore(player, state.config);

    const activation = activateCollector(state, player);

    expect(player.mass).toBe(massBefore);
    expect(player.stats.collectedMass).toBe(collectedBefore);
    expect(calculateScore(player, state.config)).toBe(scoreBefore);
    expect(activation.events).toContainEqual({
      type: "specialistActivated",
      tick: 1,
      playerId: player.id,
      dropId: "collector-beacon",
      specialist: "collector",
      durationTicks: 3,
    });
    expect(isSpecialistActive(state, player)).toBe(true);
    expect(getSpecialistSecondsRemaining(state, player)).toBeCloseTo(0.3, 8);

    stepGame(state);
    expect(getSpecialistSecondsRemaining(state, player)).toBeCloseTo(0.2, 8);
    stepGame(state);
    expect(getSpecialistSecondsRemaining(state, player)).toBeCloseTo(0.1, 8);
    const expiry = stepGame(state);

    expect(isSpecialistActive(state, player)).toBe(false);
    expect(getSpecialistSecondsRemaining(state, player)).toBe(0);
    expect(expiry.events).toContainEqual({
      type: "specialistExpired",
      tick: 4,
      playerId: player.id,
      specialist: "collector",
    });
  });

  it("extends reach only for neutral Pulse Motes, never specialists or objectives", () => {
    const { state, player } = stationaryState("collector-neutral-policy");
    activateCollector(state, player);
    const distance = extendedOnlyDistance(state, player);

    spawnDrop(state, {
      id: "objective",
      position: { x: -distance, y: 0 },
      mass: 5,
      radius: 4,
      source: "arena",
      collectorReachPolicy: "none",
    });
    spawnDrop(state, {
      id: "second-specialist",
      position: { x: 0, y: distance },
      mass: 0,
      radius: 4,
      specialist: "collector",
    });
    spawnDrop(state, {
      id: "pulse-mote",
      position: { x: distance, y: 0 },
      mass: 4,
      radius: 4,
      source: "arena",
    });

    stepGame(state);

    expect(state.drops.map((drop) => drop.id).sort()).toEqual([
      "objective",
      "second-specialist",
    ]);
    expect(player.stats.collectedMass).toBe(4);
  });

  it("extends reach for the carrier's Boost Echoes but not a rival's", () => {
    const { state, player } = stationaryState("collector-owner-policy");
    spawnPlayer(state, {
      id: "rival",
      position: { x: 1_000, y: 1_000 },
      direction: { x: -1, y: 0 },
      shieldSeconds: 100,
    });
    activateCollector(state, player);
    const distance = extendedOnlyDistance(state, player);

    spawnDrop(state, {
      id: "rival-boost-echo",
      position: { x: -distance, y: 0 },
      mass: 2,
      radius: 4,
      source: "boost",
      originPlayerId: "rival",
    });
    spawnDrop(state, {
      id: "own-boost-echo",
      position: { x: distance, y: 0 },
      mass: 2,
      radius: 4,
      source: "boost",
      originPlayerId: player.id,
    });

    stepGame(state);

    expect(state.drops.map((drop) => drop.id)).toEqual(["rival-boost-echo"]);
    expect(player.stats.collectedMass).toBe(2);
  });

  it("never extends reach for Rival Echoes", () => {
    const { state, player } = stationaryState("collector-rival-echo");
    activateCollector(state, player);
    const distance = extendedOnlyDistance(state, player);

    const echo = spawnDrop(state, {
      id: "rival-echo",
      position: { x: distance, y: 0 },
      mass: 8,
      radius: 4,
      source: "death",
      originPlayerId: "defeated-rival",
      // Even a mistaken override cannot make rival remains Collector-eligible.
      collectorReachPolicy: "neutral",
    });
    stepGame(state);

    expect(echo.collectorReachPolicy).toBe("none");
    expect(state.drops.map((drop) => drop.id)).toContain("rival-echo");
    expect(player.stats.collectedMass).toBe(0);
  });

  it("does not apply a newly collected specialist to later drops in the same tick", () => {
    for (const reverseOrder of [false, true]) {
      const { state, player } = stationaryState(`collector-order-${reverseOrder}`);
      const distance = extendedOnlyDistance(state, player);
      const spawnBeacon = () => spawnDrop(state, {
        id: "beacon",
        position: { x: 0, y: 0 },
        mass: 0,
        radius: 2,
        specialist: "collector",
      });
      const spawnPulse = () => spawnDrop(state, {
        id: "pulse",
        position: { x: distance, y: 0 },
        mass: 3,
        radius: 4,
        source: "arena",
      });
      if (reverseOrder) {
        spawnPulse();
        spawnBeacon();
      } else {
        spawnBeacon();
        spawnPulse();
      }

      stepGame(state);
      expect(state.drops.map((drop) => drop.id)).toContain("pulse");
      expect(isSpecialistActive(state, player)).toBe(true);

      stepGame(state);
      expect(state.drops.map((drop) => drop.id)).not.toContain("pulse");
    }
  });

  it("conserves boost and defeat mass and records which player produced each Echo", () => {
    const boostState = createGameState("boost-echo-conservation", {
      fixedStepSeconds: 0.1,
      arenaRadius: 50_000,
      startMass: 70,
      minimumBoostMass: 60,
      baseSpeed: 0,
      boostSpeed: 20,
      boostMassPerSecond: 10,
      shedDropMass: 2,
      shedPickupLockSeconds: 100,
    });
    const booster = spawnPlayer(boostState, {
      id: "booster",
      position: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      shieldSeconds: 0,
    });
    for (let tick = 0; tick < 10; tick += 1) {
      stepGame(boostState, {
        booster: { sequence: tick, direction: { x: 1, y: 0 }, boost: true },
      });
    }
    const boostEchoes = boostState.drops.filter((drop) => drop.source === "boost");
    expect(boostEchoes.every((drop) => drop.originPlayerId === booster.id)).toBe(true);
    expect(
      booster.mass +
      booster.shedMassRemainder +
      boostEchoes.reduce((sum, drop) => sum + drop.mass, 0),
    ).toBeCloseTo(70, 8);

    const deathState = createGameState("rival-echo-conservation", {
      fixedStepSeconds: 1,
      arenaRadius: 24,
      baseSpeed: 50,
      boostSpeed: 50,
    });
    const defeated = spawnPlayer(deathState, {
      id: "defeated",
      position: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      shieldSeconds: 0,
    });
    defeated.shedMassRemainder = 0.75;
    stepGame(deathState, {
      defeated: { sequence: 1, direction: { x: 1, y: 0 }, boost: false },
    });
    const rivalEchoes = deathState.drops.filter((drop) => drop.source === "death");
    expect(defeated.alive).toBe(false);
    expect(rivalEchoes.every((drop) => drop.originPlayerId === defeated.id)).toBe(true);
    expect(rivalEchoes.reduce((sum, drop) => sum + drop.mass, 0)).toBeCloseTo(100.75, 8);
  });

  it("does not alter top speed, solid radii, or lethal collision behavior", () => {
    const makeMovementState = (withCollector: boolean) => {
      const state = createGameState(`movement-${withCollector}`, {
        fixedStepSeconds: 0.1,
        arenaRadius: 10_000,
        baseSpeed: 10,
        boostSpeed: 20,
        boostMassPerSecond: 1,
        shedDropMass: 100,
      });
      const player = spawnPlayer(state, {
        id: "runner",
        position: { x: 0, y: 0 },
        direction: { x: 1, y: 0 },
        shieldSeconds: 0,
      });
      if (withCollector) {
        player.specialist = {
          kind: "collector",
          activatedAtTick: 0,
          expiresAtTick: 100,
          durationTicks: 100,
        };
      }
      return { state, player };
    };
    const base = makeMovementState(false);
    const collector = makeMovementState(true);
    const input = {
      runner: { sequence: 1, direction: { x: 1, y: 0 }, boost: true },
    };
    stepGame(base.state, input);
    stepGame(collector.state, input);

    expect(collector.player.position).toEqual(base.player.position);
    expect(collector.player.mass).toBe(base.player.mass);
    expect(getPlayerRadius(collector.player, collector.state.config)).toBe(
      getPlayerRadius(base.player, base.state.config),
    );
    expect(getBodyRadius(collector.player, collector.state.config)).toBe(
      getBodyRadius(base.player, base.state.config),
    );

    const collisionState = createGameState("collector-lethal-collision", {
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
    });
    const attacker = spawnPlayer(collisionState, {
      id: "attacker",
      position: { x: -10, y: 10 },
      direction: { x: 1, y: 0 },
      shieldSeconds: 0,
    });
    const owner = spawnPlayer(collisionState, {
      id: "owner",
      position: { x: 0, y: 15 },
      direction: { x: 0, y: 1 },
      shieldSeconds: 0,
    });
    attacker.specialist = {
      kind: "collector",
      activatedAtTick: 0,
      expiresAtTick: 10,
      durationTicks: 10,
    };
    stepGame(collisionState, {
      attacker: { sequence: 1, direction: { x: 1, y: 0 }, boost: false },
      owner: { sequence: 1, direction: { x: 0, y: 1 }, boost: false },
    });
    expect(attacker.alive).toBe(false);
    expect(attacker.killedBy).toBe(owner.id);
  });
});
