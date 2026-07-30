import { describe, expect, it } from "vitest";
import {
  advanceGame,
  calculateScore,
  createGameState,
  getPlayerRank,
  getRankings,
  spawnDrop,
  spawnPlayer,
  stepGame,
  sweptCircleHitTime,
} from "../src/game/core";
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

    advanceGame(state, 2, {
      sprinter: { sequence: 1, direction: { x: 1, y: 0 }, boost: true },
    });

    const shedDrops = state.drops.filter((drop) => drop.source === "boost");
    expect(player.mass).toBeCloseTo(60, 8);
    expect(shedDrops.reduce((total, drop) => total + drop.mass, 0)).toBeCloseTo(10, 8);
    expect(player.position.x).toBeCloseTo(30, 8);
    expect(shedDrops).toHaveLength(5);
    expect(shedDrops.every((drop) => drop.blockedPlayerId === player.id)).toBe(true);
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
    expect(result.events.some(
      (event) => event.type === "playerDied" && event.playerId === attacker.id,
    )).toBe(true);
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

  it("makes a spawn shield protect both its owner and approaching players", () => {
    const { state, attacker, owner } = collisionFixture(2);

    stepGame(state, {
      attacker: { sequence: 1, direction: { x: 1, y: 0 }, boost: false },
      owner: { sequence: 1, direction: { x: 0, y: 1 }, boost: false },
    });

    expect(attacker.alive).toBe(true);
    expect(owner.alive).toBe(true);
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
