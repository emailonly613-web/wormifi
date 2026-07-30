import { describe, expect, it } from "vitest";
import {
  advanceGame,
  calculateScore,
  createGameState,
  getBodyRadius,
  getPlayerRank,
  getPlayerRadius,
  getRankings,
  getPlayerTurboReserveRatio,
  getPlayerTurboSecondsRemaining,
  isPlayerBoosting,
  spawnDrop,
  spawnPlayer,
  stepGame,
  sweptCircleHitTime,
} from "../src/game/core";
import { STARTER_TREASURE_MASS } from "../src/game/treasureEconomy";
import type { BotInputProvider, GameState, PlayerState } from "../src/game/types";

function snapshotPlayer(player: PlayerState) {
  return {
    position: player.position,
    direction: player.direction,
    body: player.body,
    mass: player.mass,
    alive: player.alive,
    shield: player.shieldTicksRemaining,
  };
}

function collisionFixture(shieldSeconds = 0): {
  state: GameState;
  attacker: PlayerState;
  owner: PlayerState;
} {
  const state = createGameState("sweep-fixture", {
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
    shieldSeconds,
  });
  return { state, attacker, owner };
}

describe("deterministic game core", () => {
  it("replays seeded spawning and fixed steps identically across render chunking", () => {
    const first = createGameState("launch-room");
    const second = createGameState("launch-room");
    spawnPlayer(first, { id: "alpha" });
    spawnPlayer(first, { id: "beta" });
    spawnPlayer(second, { id: "alpha" });
    spawnPlayer(second, { id: "beta" });

    const input = {
      alpha: { sequence: 1, direction: { x: 0.4, y: 1 }, boost: false },
      beta: { sequence: 1, direction: { x: -1, y: 0.1 }, boost: false },
    };
    advanceGame(first, 0.25, input);
    advanceGame(first, 0.75, input);
    advanceGame(second, 1, input);

    expect(first.tick).toBe(30);
    expect(second.tick).toBe(30);
    expect(snapshotPlayer(first.players.alpha)).toEqual(
      snapshotPlayer(second.players.alpha),
    );
    expect(snapshotPlayer(first.players.beta)).toEqual(
      snapshotPlayer(second.players.beta),
    );
    expect(first.randomState).toBe(second.randomState);
  });

  it("reuses same-player history buffers without changing captured geometry", () => {
    const state = createGameState("history-buffer-reuse", {
      arenaRadius: 10_000,
    });
    const player = spawnPlayer(state, {
      id: "buffered",
      position: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      shieldSeconds: 30,
    });
    const previousPosition = player.previousPosition;
    const previousSegments = [...player.previousBody];
    const beforeFirstStep = {
      position: { ...player.position },
      body: player.body.map((point) => ({ ...point })),
    };

    stepGame(state, {
      buffered: { sequence: 1, direction: { x: 0.5, y: 1 }, boost: false },
    });

    expect(player.previousPosition).toBe(previousPosition);
    expect(player.previousBody).toHaveLength(previousSegments.length);
    expect(player.previousBody.every((point, index) => point === previousSegments[index]))
      .toBe(true);
    expect(player.previousPosition).toEqual(beforeFirstStep.position);
    expect(player.previousBody).toEqual(beforeFirstStep.body);

    const beforeSecondStep = {
      position: { ...player.position },
      body: player.body.map((point) => ({ ...point })),
    };
    stepGame(state, {
      buffered: { sequence: 2, direction: { x: -0.5, y: 1 }, boost: false },
    });

    expect(player.previousPosition).toBe(previousPosition);
    expect(player.previousBody.every((point, index) => point === previousSegments[index]))
      .toBe(true);
    expect(player.previousPosition).toEqual(beforeSecondStep.position);
    expect(player.previousBody).toEqual(beforeSecondStep.body);
  });

  it("collects drops, grows mass, and adds body segments at thresholds", () => {
    const state = createGameState("growth", { baseSpeed: 0 });
    const player = spawnPlayer(state, {
      id: "grower",
      position: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      shieldSeconds: 0,
    });
    const initialSegments = player.body.length;
    spawnDrop(state, {
      id: "meal",
      position: { x: 0, y: 0 },
      mass: state.config.massPerSegment,
    });

    const result = stepGame(state, {
      grower: { sequence: 1, direction: { x: 1, y: 0 }, boost: false },
    });

    expect(player.mass).toBe(state.config.startMass + state.config.massPerSegment);
    expect(player.body).toHaveLength(initialSegments + 1);
    expect(player.stats.collectedMass).toBe(state.config.massPerSegment);
    expect(result.events).toContainEqual({
      type: "dropCollected",
      tick: 1,
      playerId: "grower",
      dropId: "meal",
      mass: state.config.massPerSegment,
    });
  });

  it("starts as a readable six-follower chain and makes the first four Spark pickups visible", () => {
    const state = createGameState("small-start-visible-growth", { baseSpeed: 0 });
    const player = spawnPlayer(state, {
      id: "grower",
      position: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      shieldSeconds: 0,
    });
    const initialRadius = getPlayerRadius(player, state.config);
    const initialTailDistance = Math.hypot(
      player.position.x - player.body.at(-1)!.x,
      player.position.y - player.body.at(-1)!.y,
    );

    expect(player.mass).toBe(48);
    expect(player.body).toHaveLength(6);
    const initialBodyRadius = getBodyRadius(player, state.config);
    expect(initialRadius).toBeGreaterThanOrEqual(12);
    expect(initialBodyRadius / initialRadius).toBeGreaterThanOrEqual(0.97);
    expect(initialTailDistance).toBeLessThan(130);

    const segmentCounts: number[] = [];
    const radii: number[] = [];
    for (let pickup = 1; pickup <= 4; pickup += 1) {
      spawnDrop(state, {
        id: `early-spark-${pickup}`,
        position: { ...player.position },
        mass: STARTER_TREASURE_MASS,
        radius: 7.5,
      });
      const result = stepGame(state, {
        grower: { sequence: pickup, direction: { x: 1, y: 0 }, boost: false },
      });
      expect(result.events.filter((event) => event.type === "dropCollected")).toHaveLength(1);
      segmentCounts.push(player.body.length);
      radii.push(getPlayerRadius(player, state.config));
    }

    expect(segmentCounts).toEqual([6, 6, 6, 6]);
    expect(radii.every((radius, index) =>
      radius > (index === 0 ? initialRadius : radii[index - 1])
    )).toBe(true);
    expect(radii.at(-1)! / initialRadius).toBeLessThan(1.02);
    expect(player.mass).toBeCloseTo(48 + 4 * STARTER_TREASURE_MASS, 10);
  });

  it("grows from a short plump spawn into a materially longer and thicker worm", () => {
    const state = createGameState("plump-growth-contract", { baseSpeed: 0 });
    const player = spawnPlayer(state, {
      id: "growth-contract",
      position: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      shieldSeconds: 0,
    });
    const startHeadRadius = getPlayerRadius(player, state.config);
    const startBodyRadius = getBodyRadius(player, state.config);
    const startLength = player.body.length;

    player.mass = 500;
    spawnDrop(state, {
      id: "growth-sync",
      position: { ...player.position },
      mass: state.config.massPerSegment,
      radius: state.config.dropRadius,
    });
    stepGame(state, {
      "growth-contract": { sequence: 1, direction: { x: 1, y: 0 }, boost: false },
    });

    expect(player.body.length).toBeGreaterThan(startLength * 3);
    expect(getPlayerRadius(player, state.config)).toBeGreaterThan(startHeadRadius * 1.5);
    expect(getBodyRadius(player, state.config)).toBeGreaterThan(startBodyRadius * 1.5);
  });

  it("places compact spawns clear of every existing head-to-crew path", () => {
    const state = createGameState("whole-chain-spawn-clearance", {
      arenaRadius: 1_850,
      baseSpeed: 0,
      boostSpeed: 0,
    });
    for (let index = 0; index < 24; index += 1) {
      spawnPlayer(state, { id: `spawn-${index}`, shieldSeconds: 0 });
    }

    stepGame(state);

    expect(Object.values(state.players).every((player) => player.alive)).toBe(true);
  });

  it("rejects non-finite and fractional body caps before simulation", () => {
    expect(() => createGameState("nan-cap", { maximumBodySegments: Number.NaN })).toThrow();
    expect(() => createGameState("infinite-cap", { maximumBodySegments: Infinity })).toThrow();
    expect(() => createGameState("fractional-cap", { maximumBodySegments: 72.5 })).toThrow();
  });

  it("boosts faster, sheds conserved mass into locked drops, and stops at the floor", () => {
    const state = createGameState("boost", {
      arenaRadius: 50_000,
      fixedStepSeconds: 0.1,
      startMass: 70,
      minimumBoostMass: 60,
      baseSpeed: 10,
      boostSpeed: 20,
      boostMassPerSecond: 10,
      shedDropMass: 2,
      startingBodySegments: 5,
      minimumBodySegments: 3,
      massPerSegment: 5,
    });
    const player = spawnPlayer(state, {
      id: "sprinter",
      position: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      shieldSeconds: 0,
    });

    expect(isPlayerBoosting(player, state.config)).toBe(false);

    advanceGame(state, 2, {
      sprinter: { sequence: 1, direction: { x: 1, y: 0 }, boost: true },
    });

    const shedDrops = state.drops.filter((drop) => drop.source === "boost");
    expect(player.mass).toBeCloseTo(60, 8);
    expect(shedDrops.reduce((total, drop) => total + drop.mass, 0)).toBeCloseTo(10, 8);
    expect(player.position.x).toBeCloseTo(30, 8);
    expect(shedDrops).toHaveLength(5);
    expect(shedDrops.every((drop) => drop.blockedPlayerId === player.id)).toBe(true);
    expect(isPlayerBoosting(player, state.config)).toBe(false);
  });

  it("reports sprint only when living server movement can actually grant it", () => {
    const state = createGameState("boost-signal", { minimumBoostMass: 60 });
    const player = spawnPlayer(state, { id: "signaled", mass: 61 });
    player.lastInput = { sequence: 1, direction: { x: 1, y: 0 }, boost: true };

    expect(isPlayerBoosting(player, state.config)).toBe(true);
    player.mass = 60;
    expect(isPlayerBoosting(player, state.config)).toBe(false);
    player.mass = 61;
    player.alive = false;
    expect(isPlayerBoosting(player, state.config)).toBe(false);
  });

  it("maps spendable size to one truthful Turbo reserve and duration", () => {
    const state = createGameState("turbo-reserve");
    const player = spawnPlayer(state, { id: "gauge" });

    expect(state.config.boostMassPerSecond).toBe(4);
    expect(getPlayerTurboReserveRatio(player, state.config)).toBe(1);
    expect(getPlayerTurboSecondsRemaining(player, state.config)).toBeCloseTo(3.5, 8);

    player.mass = (state.config.startMass + state.config.minimumBoostMass) / 2;
    expect(getPlayerTurboReserveRatio(player, state.config)).toBeCloseTo(0.5, 8);
    expect(getPlayerTurboSecondsRemaining(player, state.config)).toBeCloseTo(1.75, 8);

    player.mass = state.config.minimumBoostMass;
    expect(getPlayerTurboReserveRatio(player, state.config)).toBe(0);
    expect(getPlayerTurboSecondsRemaining(player, state.config)).toBe(0);
  });

  it("detects swept moving-circle contact even when endpoints do not overlap", () => {
    const hitTime = sweptCircleHitTime(
      { x: -10, y: 0 },
      { x: 10, y: 0 },
      1,
      { x: 0, y: -10 },
      { x: 0, y: 10 },
      1,
    );

    expect(hitTime).not.toBeNull();
    expect(hitTime).toBeCloseTo(0.429289, 5);
  });

  it("kills a head crossing a moving enemy body and emits mass-conserving drops", () => {
    const { state, attacker, owner } = collisionFixture();
    // Simulate a sub-drop boost remainder that must not disappear on death.
    attacker.shedMassRemainder = 0.75;
    const victimMass = attacker.mass + attacker.shedMassRemainder;
    const ownerMassBeforeCollision = owner.mass;

    const result = stepGame(state, {
      attacker: { sequence: 1, direction: { x: 1, y: 0 }, boost: false },
      owner: { sequence: 1, direction: { x: 0, y: 1 }, boost: false },
    });

    expect(attacker.alive).toBe(false);
    expect(attacker.killedBy).toBe(owner.id);
    expect(owner.stats.kills).toBe(1);
    const death = result.events.find(
      (event) => event.type === "playerDied" && event.playerId === attacker.id,
    );
    expect(death?.type).toBe("playerDied");
    if (!death || death.type !== "playerDied") throw new Error("missing collision death");
    expect(death.collisionTime).toBeGreaterThan(0);
    expect(death.collisionTime).toBeLessThan(1);
    expect(attacker.position.x).toBeCloseTo(-10 + 20 * death.collisionTime, 8);
    expect(attacker.position.y).toBeCloseTo(10, 8);
    expect(state.drops.find((drop) =>
      drop.source === "death" && drop.originPlayerId === attacker.id
    )?.position).toEqual(attacker.position);
    const uncollectedDeathMass =
      state.drops
        .filter((drop) => drop.source === "death")
        .reduce((total, drop) => total + drop.mass, 0);
    const immediatelyCollectedDeathMass = owner.mass - ownerMassBeforeCollision;
    expect(uncollectedDeathMass + immediatelyCollectedDeathMass).toBeCloseTo(
      victimMass,
      8,
    );
  });

  it("kills a boosted head crossing the visible link between separated body samples", () => {
    const state = createGameState("body-link-gap", {
      fixedStepSeconds: 1,
      arenaRadius: 1_000,
      startMass: 70,
      minimumBoostMass: 60,
      baseSpeed: 0,
      boostSpeed: 20,
      boostMassPerSecond: 10,
      shedDropMass: 100,
      baseRadius: 2,
      massRadiusFactor: 0,
      bodyRadiusFactor: 1,
      segmentSpacingFactor: 3.75,
      startingBodySegments: 3,
      minimumBodySegments: 3,
      massPerSegment: 1_000,
    });
    const owner = spawnPlayer(state, {
      id: "owner",
      position: { x: 0, y: 30 },
      direction: { x: 0, y: 1 },
      shieldSeconds: 0,
    });
    const attacker = spawnPlayer(state, {
      id: "attacker",
      position: { x: -10, y: 7.5 },
      direction: { x: 1, y: 0 },
      mass: 70,
      shieldSeconds: 0,
    });

    // The two nearest follower centers are 7.5px away and their combined
    // solid radii are only 4px. A point-only body test misses this visibly
    // connected neck; the shared swept-link law must not.
    expect(Math.abs(owner.body[0].y - attacker.position.y)).toBe(7.5);
    expect(Math.abs(owner.body[1].y - attacker.position.y)).toBe(7.5);
    expect(getPlayerRadius(attacker, state.config) + getBodyRadius(owner, state.config)).toBe(4);

    const result = stepGame(state, {
      attacker: { sequence: 1, direction: { x: 1, y: 0 }, boost: true },
      owner: { sequence: 1, direction: { x: 0, y: 1 }, boost: false },
    });

    expect(attacker.alive).toBe(false);
    expect(attacker.killedBy).toBe(owner.id);
    expect(result.events).toContainEqual(expect.objectContaining({
      type: "playerDied",
      playerId: attacker.id,
      killerId: owner.id,
    }));
  });

  it("protects only the spawning head while its visible body stays lethal", () => {
    const { state, attacker, owner } = collisionFixture(2);

    stepGame(state, {
      attacker: { sequence: 1, direction: { x: 1, y: 0 }, boost: false },
      owner: { sequence: 1, direction: { x: 0, y: 1 }, boost: false },
    });

    expect(attacker.alive).toBe(false);
    expect(attacker.killedBy).toBe(owner.id);
    expect(owner.alive).toBe(true);
  });

  it("keeps spawn grace exact and makes the body lethal on the first unshielded tick", () => {
    const state = createGameState("exact-spawn-grace", {
      fixedStepSeconds: 0.25,
      arenaRadius: 1_000,
      baseSpeed: 0,
      boostSpeed: 0,
      spawnShieldSeconds: 1,
    });
    const owner = spawnPlayer(state, {
      id: "owner",
      position: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      shieldSeconds: 0,
    });
    const protectedPlayer = spawnPlayer(state, {
      id: "protected",
      position: { ...owner.body[0] },
      // Trail away from the owner so the now-continuous protected neck cannot
      // kill the unshielded fixture owner before this head-grace check expires.
      direction: { x: 1, y: 0 },
    });

    expect(protectedPlayer.shieldTicksRemaining).toBe(4);
    for (let protectedTick = 1; protectedTick <= 4; protectedTick += 1) {
      stepGame(state);
      expect(protectedPlayer.alive).toBe(true);
      expect(protectedPlayer.shieldTicksRemaining).toBe(4 - protectedTick);
    }

    const lethalTick = stepGame(state);
    expect(protectedPlayer.alive).toBe(false);
    expect(lethalTick.events).toContainEqual(expect.objectContaining({
      type: "playerDied",
      playerId: protectedPlayer.id,
      killerId: owner.id,
    }));
  });

  it("never lets head-safe spawn grace cross the arena boundary", () => {
    const state = createGameState("shielded-boundary", {
      fixedStepSeconds: 1,
      arenaRadius: 100,
      baseSpeed: 20,
      boostSpeed: 20,
      spawnShieldSeconds: 10,
    });
    const player = spawnPlayer(state, {
      id: "boundary-runner",
      position: { x: 79, y: 0 },
      direction: { x: 1, y: 0 },
    });

    const result = stepGame(state);

    expect(player.shieldTicksRemaining).toBeGreaterThan(0);
    expect(player.alive).toBe(false);
    expect(result.events).toContainEqual(expect.objectContaining({
      type: "playerDied",
      playerId: player.id,
      cause: "boundary",
    }));
  });

  it("lets a bot provide the same sequenced input packet as a network client", () => {
    const state = createGameState("bot-input", {
      fixedStepSeconds: 1,
      arenaRadius: 10_000,
      baseSpeed: 10,
    });
    const bot = spawnPlayer(state, {
      id: "bot-1",
      kind: "bot",
      position: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      shieldSeconds: 0,
    });
    const provider: BotInputProvider = {
      nextInput: (context) => ({
        sequence: context.tick,
        clientTick: context.tick,
        direction: { x: 1, y: 0 },
        boost: false,
      }),
    };

    stepGame(state, {}, { "bot-1": provider });

    expect(bot.lastInput.sequence).toBe(1);
    expect(bot.position.x).toBeCloseTo(10, 8);
  });

  it("ranks deterministically by mass or score with stable tie breaking", () => {
    const state = createGameState("ranking", { baseSpeed: 0 });
    const alpha = spawnPlayer(state, { id: "alpha", mass: 120, shieldSeconds: 0 });
    const beta = spawnPlayer(state, { id: "beta", mass: 160, shieldSeconds: 0 });
    const gamma = spawnPlayer(state, { id: "gamma", mass: 120, shieldSeconds: 0 });
    alpha.stats.kills = 2;
    gamma.stats.kills = 2;

    expect(getRankings(state, "mass").map((entry) => entry.playerId)).toEqual([
      "beta",
      "alpha",
      "gamma",
    ]);
    expect(getPlayerRank(state, "beta", "mass")).toBe(1);
    expect(calculateScore(alpha, state.config)).toBeGreaterThan(
      calculateScore(beta, state.config),
    );
    expect(getRankings(state, "score")[0].playerId).toBe("alpha");
  });
});
