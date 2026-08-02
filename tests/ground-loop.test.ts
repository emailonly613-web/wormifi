import { describe, expect, it } from "vitest";
import {
  calculateScore,
  createGameState,
  getBodyRadius,
  getDropStoredMass,
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
      boostEchoes.reduce((sum, drop) => sum + getDropStoredMass(drop), 0),
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
    expect(rivalEchoes.reduce((sum, drop) => sum + getDropStoredMass(drop), 0)).toBeCloseTo(
      deathState.config.startMass + 0.75,
      8,
    );

    const giantState = createGameState("giant-rival-echo-bank", {
      arenaRadius: 5_000,
      baseSpeed: 1_000,
      boostSpeed: 1_000,
    });
    const giant = spawnPlayer(giantState, {
      id: "giant",
      position: { x: 5_000, y: 0 },
      direction: { x: 1, y: 0 },
      mass: 400_000,
      shieldSeconds: 0,
    });
    stepGame(giantState);
    const giantEchoes = giantState.drops.filter((drop) => drop.source === "death");
    expect(giant.alive).toBe(false);
    expect(giantEchoes).toHaveLength(giantState.config.maximumDeathDrops);
    expect(giantEchoes.every((drop) =>
      drop.mass <= giantState.config.deathDropTargetMass
    )).toBe(true);
    expect(giantEchoes.reduce((sum, drop) => sum + getDropStoredMass(drop), 0))
      .toBeCloseTo(400_000, 6);
  });

  it("deterministically compacts repeated live-room Echoes without losing mass or ground content", () => {
    const makeState = () => createGameState("bounded-live-room-echoes", {
      baseSpeed: 0,
      boostSpeed: 0,
      maximumBoostDropsInWorld: 3,
      maximumDeathDropsInWorld: 4,
    });
    const first = makeState();
    const replay = makeState();

    for (const state of [first, replay]) {
      spawnDrop(state, {
        id: "neutral-treasure",
        position: { x: 0, y: 1_000 },
        mass: 3,
        source: "arena",
      });
      spawnDrop(state, {
        id: "relic-treasure",
        position: { x: 0, y: -1_000 },
        mass: 0,
        source: "arena",
        relicKind: "emerald-spyglass",
      });
    }

    for (let cycle = 0; cycle < 12; cycle += 1) {
      for (const state of [first, replay]) {
        for (let index = 0; index < 4; index += 1) {
          spawnDrop(state, {
            position: { x: 1_000 + cycle * 10 + index, y: cycle },
            mass: 2,
            source: "boost",
            originPlayerId: "booster",
          });
        }
        for (let index = 0; index < 6; index += 1) {
          spawnDrop(state, {
            position: { x: -1_000 - cycle * 10 - index, y: -cycle },
            mass: 5,
            source: "death",
            originPlayerId: "rival",
          });
        }
        stepGame(state);
      }

      expect(first.drops.filter((drop) => drop.source === "boost")).toHaveLength(3);
      expect(first.drops.filter((drop) => drop.source === "death")).toHaveLength(4);
      expect(first.drops.map((drop) => drop.id)).toEqual(replay.drops.map((drop) => drop.id));
      expect(first.drops).toEqual(replay.drops);
    }

    expect(first.drops.filter((drop) => drop.source === "boost")
      .reduce((sum, drop) => sum + getDropStoredMass(drop), 0)).toBe(12 * 4 * 2);
    expect(first.drops.filter((drop) => drop.source === "death")
      .reduce((sum, drop) => sum + getDropStoredMass(drop), 0)).toBe(12 * 6 * 5);
    expect(first.drops.filter((drop) => drop.source === "boost")
      .every((drop) => drop.mass <= first.config.shedDropMass)).toBe(true);
    expect(first.drops.filter((drop) => drop.source === "death")
      .every((drop) => drop.mass <= first.config.deathDropTargetMass)).toBe(true);
    expect(first.drops.map((drop) => drop.id)).toContain("neutral-treasure");
    expect(first.drops.map((drop) => drop.id)).toContain("relic-treasure");
    expect(JSON.stringify(first.drops).length).toBeLessThan(4_000);
  });

  it("releases a compacted cache in ordinary pickup chunks instead of one mega-growth event", () => {
    const state = createGameState("bounded-cache-payout", {
      baseSpeed: 0,
      boostSpeed: 0,
      maximumDeathDropsInWorld: 1,
    });
    const collector = spawnPlayer(state, {
      id: "cache-collector",
      position: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      shieldSeconds: 0,
    });
    spawnDrop(state, {
      position: { x: 0, y: 0 },
      mass: state.config.deathDropTargetMass,
      bankedMass: 95,
      source: "death",
      originPlayerId: "old-rival",
    });

    const startingMass = collector.mass;
    const first = stepGame(state);
    expect(collector.mass - startingMass).toBe(state.config.deathDropTargetMass);
    expect(first.events.filter((event) => event.type === "dropCollected")).toHaveLength(1);
    expect(state.drops).toHaveLength(1);
    expect(state.drops[0].mass).toBe(state.config.deathDropTargetMass);
    expect(getDropStoredMass(state.drops[0])).toBe(95);

    stepGame(state);
    expect(collector.mass - startingMass).toBe(state.config.deathDropTargetMass * 2);
    expect(getDropStoredMass(state.drops[0])).toBe(90);
  });

  it("keeps mixed-owner boost caches locked until every original shed lock expires", () => {
    const state = createGameState("mixed-boost-cache-lock", {
      baseSpeed: 0,
      boostSpeed: 0,
      maximumBoostDropsInWorld: 1,
    });
    spawnDrop(state, {
      position: { x: 0, y: 0 },
      mass: 2,
      source: "boost",
      originPlayerId: "alpha",
      blockedPlayerId: "alpha",
      blockedUntilTick: 10,
    });
    spawnDrop(state, {
      position: { x: 1, y: 0 },
      mass: 2,
      source: "boost",
      originPlayerId: "bravo",
      blockedPlayerId: "bravo",
      blockedUntilTick: 8,
    });
    stepGame(state);

    const cache = state.drops.find((drop) => drop.source === "boost");
    expect(cache?.pickupBlockedUntilTick).toBe(10);
    expect(cache && getDropStoredMass(cache)).toBe(4);
    const alpha = spawnPlayer(state, {
      id: "alpha",
      position: { ...cache!.position },
      direction: { x: 1, y: 0 },
      shieldSeconds: 0,
    });
    const startingMass = alpha.mass;

    while (state.tick < 9) stepGame(state);
    expect(alpha.mass).toBe(startingMass);
    stepGame(state);
    expect(alpha.mass).toBe(startingMass + state.config.shedDropMass);
    expect(getDropStoredMass(state.drops[0])).toBe(2);
  });

  it("keeps an accelerated six-hour Echo lifecycle deterministic, bounded, and mass exact", () => {
    const makeState = () => createGameState("six-hour-accelerated-echoes", {
      baseSpeed: 0,
      boostSpeed: 0,
    });
    const first = makeState();
    const replay = makeState();
    const secondsPerCycle = 6;
    const cycles = 6 * 60 * 60 / secondsPerCycle;
    const ticksPerCycle = secondsPerCycle / first.config.fixedStepSeconds;

    for (let cycle = 0; cycle < cycles; cycle += 1) {
      for (const state of [first, replay]) {
        for (let index = 0; index < 8; index += 1) {
          spawnDrop(state, {
            position: { x: 900 + (cycle % 100) * 8 + index, y: cycle % 100 },
            mass: 2,
            source: "boost",
            originPlayerId: `booster-${cycle % 12}`,
            blockedPlayerId: `booster-${cycle % 12}`,
            blockedUntilTick: state.tick + 38,
          });
        }
        for (let index = 0; index < 12; index += 1) {
          spawnDrop(state, {
            position: { x: -900 - (cycle % 100) * 12 - index, y: -(cycle % 100) },
            mass: 5,
            source: "death",
            originPlayerId: `rival-${cycle % 12}`,
          });
        }
        state.tick += ticksPerCycle - 1;
        stepGame(state);
      }
    }

    const boostDrops = first.drops.filter((drop) => drop.source === "boost");
    const deathDrops = first.drops.filter((drop) => drop.source === "death");
    expect(first.tick).toBe(6 * 60 * 60 / first.config.fixedStepSeconds);
    expect(boostDrops).toHaveLength(first.config.maximumBoostDropsInWorld);
    expect(deathDrops).toHaveLength(first.config.maximumDeathDropsInWorld);
    expect(boostDrops.every((drop) => drop.mass <= first.config.shedDropMass)).toBe(true);
    expect(deathDrops.every((drop) => drop.mass <= first.config.deathDropTargetMass)).toBe(true);
    expect(boostDrops.reduce((sum, drop) => sum + getDropStoredMass(drop), 0))
      .toBe(cycles * 8 * 2);
    expect(deathDrops.reduce((sum, drop) => sum + getDropStoredMass(drop), 0))
      .toBe(cycles * 12 * 5);
    expect(first.drops).toEqual(replay.drops);
    expect(first.nextEntityNumber).toBe(replay.nextEntityNumber);
  }, 20_000);

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
