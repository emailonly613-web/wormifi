import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { describe, expect, it } from "vitest";
import { spawnBotRoster } from "../src/game/bots";
import {
  calculateScore,
  createGameState,
  spawnDrop,
  spawnPlayer,
  stepGame,
} from "../src/game/core";
import { randomPointInCircle } from "../src/game/random";
import type { GameState, PlayerState } from "../src/game/types";

const BOT_COUNT = 24;
const SOAK_ARENAS = 12;
const SOAK_STEPS_PER_ARENA = 360;
const SOAK_INITIAL_DROPS = 256;
const DETERMINISM_ARENAS = 4;
const DETERMINISM_STEPS_PER_ARENA = 180;
const DETERMINISM_INITIAL_DROPS = 128;

// Deliberately generous cross-machine ceilings: these catch runaway work or
// retained arena state without making a normally slower CI worker flaky.
const MAX_SOAK_RUNTIME_MS = 30_000;
const MAX_HEAP_GROWTH_BYTES = 256 * 1024 * 1024;
const MAX_DROPS_PER_ARENA = 8_000;
const MAX_BODY_SEGMENTS_PER_ARENA = 8_000;

interface BatchOptions {
  arenas: number;
  stepsPerArena: number;
  initialDrops: number;
  collectMemoryMetrics?: boolean;
}

interface BatchMetrics {
  checksum: string;
  arenas: number;
  stepsPerArena: number;
  totalArenaSteps: number;
  simulatedSeconds: number;
  playerTicks: number;
  deaths: number;
  respawns: number;
  pickups: number;
  shedEvents: number;
  maximumDrops: number;
  maximumBodySegments: number;
  peakMass: number;
  peakScore: number;
  elapsedMs: number;
  peakHeapGrowthBytes: number;
}

function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite; received ${String(value)}`);
  }
}

function assertFiniteVector(
  vector: Readonly<{ x: number; y: number }>,
  label: string,
): void {
  assertFiniteNumber(vector.x, `${label}.x`);
  assertFiniteNumber(vector.y, `${label}.y`);
}

function assertPlayerIsNumericallySafe(
  player: Readonly<PlayerState>,
  state: Readonly<GameState>,
  location: string,
): void {
  assertFiniteVector(player.position, `${location}.position`);
  assertFiniteVector(player.previousPosition, `${location}.previousPosition`);
  assertFiniteVector(player.direction, `${location}.direction`);
  player.body.forEach((segment, index) => {
    assertFiniteVector(segment, `${location}.body[${index}]`);
  });
  player.previousBody.forEach((segment, index) => {
    assertFiniteVector(segment, `${location}.previousBody[${index}]`);
  });

  assertFiniteNumber(player.mass, `${location}.mass`);
  assertFiniteNumber(player.shedMassRemainder, `${location}.shedMassRemainder`);
  assertFiniteNumber(player.stats.collectedMass, `${location}.stats.collectedMass`);
  assertFiniteNumber(player.stats.peakMass, `${location}.stats.peakMass`);
  assertFiniteNumber(player.stats.kills, `${location}.stats.kills`);
  assertFiniteNumber(player.stats.survivalTicks, `${location}.stats.survivalTicks`);
  assertFiniteNumber(calculateScore(player, state.config), `${location}.score`);

  if (player.mass < 0) throw new Error(`${location}.mass became negative`);
  if (player.shedMassRemainder < -1e-9) {
    throw new Error(`${location}.shedMassRemainder became negative`);
  }
  if (player.stats.collectedMass < 0 || player.stats.peakMass < 0) {
    throw new Error(`${location} contains negative accumulated mass`);
  }
  if (player.stats.kills < 0 || player.stats.survivalTicks < 0) {
    throw new Error(`${location} contains negative counters`);
  }
}

function assertStateIsNumericallySafe(
  state: Readonly<GameState>,
  arenaIndex: number,
): { bodySegments: number } {
  const prefix = `arena[${arenaIndex}]@tick[${state.tick}]`;
  assertFiniteNumber(state.tick, `${prefix}.tick`);
  assertFiniteNumber(state.randomState, `${prefix}.randomState`);
  assertFiniteNumber(state.accumulatorSeconds, `${prefix}.accumulatorSeconds`);

  const playerIds = Object.keys(state.players);
  if (new Set(playerIds).size !== playerIds.length) {
    throw new Error(`${prefix} contains duplicate player ids`);
  }

  let bodySegments = 0;
  for (const playerId of playerIds) {
    const player = state.players[playerId];
    assertPlayerIsNumericallySafe(player, state, `${prefix}.players.${playerId}`);
    bodySegments += player.body.length + player.previousBody.length;
  }

  const dropIds = new Set<string>();
  for (const [index, drop] of state.drops.entries()) {
    const label = `${prefix}.drops[${index}]`;
    if (dropIds.has(drop.id)) throw new Error(`${prefix} contains duplicate drop ${drop.id}`);
    dropIds.add(drop.id);
    assertFiniteVector(drop.position, `${label}.position`);
    assertFiniteNumber(drop.mass, `${label}.mass`);
    assertFiniteNumber(drop.radius, `${label}.radius`);
    assertFiniteNumber(drop.blockedUntilTick, `${label}.blockedUntilTick`);
    if (drop.mass <= 0) throw new Error(`${label}.mass must remain positive`);
    if (drop.radius <= 0) throw new Error(`${label}.radius must remain positive`);
  }

  if (state.drops.length > MAX_DROPS_PER_ARENA) {
    throw new Error(
      `${prefix} retained ${state.drops.length} drops; ceiling is ${MAX_DROPS_PER_ARENA}`,
    );
  }
  if (bodySegments > MAX_BODY_SEGMENTS_PER_ARENA) {
    throw new Error(
      `${prefix} retained ${bodySegments} body snapshots; ceiling is ${MAX_BODY_SEGMENTS_PER_ARENA}`,
    );
  }

  return { bodySegments };
}

function addSeededDrops(state: GameState, count: number): void {
  for (let index = 0; index < count; index += 1) {
    const point = randomPointInCircle(state.randomState, state.config.arenaRadius * 0.9);
    state.randomState = point.state;
    spawnDrop(state, {
      position: point.value,
      mass: 1 + (index % 7),
      source: "arena",
    });
  }
}

function canonicalState(state: Readonly<GameState>): string {
  const players = Object.values(state.players)
    .sort((first, second) => first.id.localeCompare(second.id))
    .map((player) => ({
      id: player.id,
      alive: player.alive,
      position: player.position,
      previousPosition: player.previousPosition,
      direction: player.direction,
      body: player.body,
      previousBody: player.previousBody,
      mass: player.mass,
      shieldTicksRemaining: player.shieldTicksRemaining,
      spawnedAtTick: player.spawnedAtTick,
      diedAtTick: player.diedAtTick,
      killedBy: player.killedBy,
      deathCause: player.deathCause,
      lastInput: player.lastInput,
      shedMassRemainder: player.shedMassRemainder,
      stats: player.stats,
    }));
  const drops = [...state.drops]
    .sort((first, second) => first.id.localeCompare(second.id))
    .map((drop) => ({ ...drop }));

  return JSON.stringify({
    tick: state.tick,
    accumulatorSeconds: state.accumulatorSeconds,
    nextEntityNumber: state.nextEntityNumber,
    players,
    drops,
  });
}

function runBatch(baseSeed: string, options: BatchOptions): BatchMetrics {
  const startedAt = performance.now();
  const heapAtStart = process.memoryUsage().heapUsed;
  let peakHeapUsed = heapAtStart;
  const checksum = createHash("sha256");

  let playerTicks = 0;
  let deaths = 0;
  let respawns = 0;
  let pickups = 0;
  let shedEvents = 0;
  let maximumDrops = 0;
  let maximumBodySegments = 0;
  let peakMass = 0;
  let peakScore = 0;

  for (let arenaIndex = 0; arenaIndex < options.arenas; arenaIndex += 1) {
    const state = createGameState(`${baseSeed}:arena:${arenaIndex}`, {
      arenaRadius: 2_800,
      spawnRadiusFactor: 0.78,
      spawnShieldSeconds: 0.6,
    });
    const roster = spawnBotRoster(state, BOT_COUNT);
    const names = new Map(
      roster.ids.map((id) => [id, state.players[id].name] as const),
    );
    addSeededDrops(state, options.initialDrops);

    for (let step = 0; step < options.stepsPerArena; step += 1) {
      const livingBeforeStep = Object.values(state.players).filter((player) => player.alive);
      playerTicks += livingBeforeStep.length;
      const result = stepGame(state, {}, roster.providers);

      for (const event of result.events) {
        if (event.type === "playerDied") deaths += 1;
        if (event.type === "dropCollected") pickups += 1;
        if (event.type === "massShed") shedEvents += 1;
      }

      const safety = assertStateIsNumericallySafe(state, arenaIndex);
      maximumDrops = Math.max(maximumDrops, state.drops.length);
      maximumBodySegments = Math.max(maximumBodySegments, safety.bodySegments);
      for (const player of Object.values(state.players)) {
        peakMass = Math.max(peakMass, player.mass);
        peakScore = Math.max(peakScore, calculateScore(player, state.config));
      }

      // Keep all 24 independent controllers exercising the core throughout the
      // soak. A provider survives respawn because it emits the same input
      // contract a connected client would use.
      for (const id of roster.ids) {
        const player = state.players[id];
        if (player.alive) continue;
        delete state.players[id];
        spawnPlayer(state, {
          id,
          name: names.get(id) ?? id,
          kind: "bot",
          shieldSeconds: state.config.spawnShieldSeconds,
        });
        respawns += 1;
      }

      if (options.collectMemoryMetrics && step % 60 === 0) {
        peakHeapUsed = Math.max(peakHeapUsed, process.memoryUsage().heapUsed);
      }
    }

    assertStateIsNumericallySafe(state, arenaIndex);
    checksum.update(canonicalState(state));
    peakHeapUsed = Math.max(peakHeapUsed, process.memoryUsage().heapUsed);
  }

  const elapsedMs = performance.now() - startedAt;
  return {
    checksum: checksum.digest("hex"),
    arenas: options.arenas,
    stepsPerArena: options.stepsPerArena,
    totalArenaSteps: options.arenas * options.stepsPerArena,
    simulatedSeconds:
      options.arenas * options.stepsPerArena * (1 / 30),
    playerTicks,
    deaths,
    respawns,
    pickups,
    shedEvents,
    maximumDrops,
    maximumBodySegments,
    peakMass,
    peakScore,
    elapsedMs,
    peakHeapGrowthBytes: Math.max(0, peakHeapUsed - heapAtStart),
  };
}

function reportMetrics(label: string, metrics: BatchMetrics): void {
  console.info(
    `[wormifi:${label}] ` +
      JSON.stringify({
        checksum: metrics.checksum.slice(0, 16),
        arenas: metrics.arenas,
        arenaSteps: metrics.totalArenaSteps,
        simulatedSeconds: Number(metrics.simulatedSeconds.toFixed(1)),
        playerTicks: metrics.playerTicks,
        deaths: metrics.deaths,
        respawns: metrics.respawns,
        pickups: metrics.pickups,
        shedEvents: metrics.shedEvents,
        maximumDrops: metrics.maximumDrops,
        maximumBodySegments: metrics.maximumBodySegments,
        peakMass: Number(metrics.peakMass.toFixed(3)),
        peakScore: metrics.peakScore,
        elapsedMs: Number(metrics.elapsedMs.toFixed(1)),
        peakHeapGrowthMiB: Number(
          (metrics.peakHeapGrowthBytes / 1024 / 1024).toFixed(1),
        ),
      }),
  );
}

describe("deterministic multi-arena stress and soak", () => {
  it("keeps 12 bot-filled arenas numerically safe inside runtime and memory ceilings", () => {
    const metrics = runBatch("soak-primary", {
      arenas: SOAK_ARENAS,
      stepsPerArena: SOAK_STEPS_PER_ARENA,
      initialDrops: SOAK_INITIAL_DROPS,
      collectMemoryMetrics: true,
    });
    reportMetrics("soak", metrics);

    expect(metrics.totalArenaSteps).toBe(SOAK_ARENAS * SOAK_STEPS_PER_ARENA);
    expect(metrics.playerTicks).toBeGreaterThan(100_000);
    expect(metrics.pickups).toBeGreaterThan(0);
    expect(metrics.deaths).toBe(metrics.respawns);
    expect(metrics.elapsedMs).toBeLessThan(MAX_SOAK_RUNTIME_MS);
    expect(metrics.peakHeapGrowthBytes).toBeLessThan(MAX_HEAP_GROWTH_BYTES);
    expect(metrics.maximumDrops).toBeLessThanOrEqual(MAX_DROPS_PER_ARENA);
    expect(metrics.maximumBodySegments).toBeLessThanOrEqual(
      MAX_BODY_SEGMENTS_PER_ARENA,
    );
  }, MAX_SOAK_RUNTIME_MS + 5_000);

  it("produces an identical checksum for identical seeds and diverges for another seed", () => {
    const options: BatchOptions = {
      arenas: DETERMINISM_ARENAS,
      stepsPerArena: DETERMINISM_STEPS_PER_ARENA,
      initialDrops: DETERMINISM_INITIAL_DROPS,
    };
    const first = runBatch("checksum-same", options);
    const replay = runBatch("checksum-same", options);
    const alternateSeed = runBatch("checksum-different", options);
    reportMetrics("determinism", first);

    expect(first.checksum).toHaveLength(64);
    expect(replay.checksum).toBe(first.checksum);
    expect(alternateSeed.checksum).not.toBe(first.checksum);
    expect([
      alternateSeed.deaths,
      alternateSeed.pickups,
      alternateSeed.shedEvents,
      alternateSeed.peakScore,
    ]).not.toEqual([
      first.deaths,
      first.pickups,
      first.shedEvents,
      first.peakScore,
    ]);
    expect(replay.deaths).toBe(first.deaths);
    expect(replay.pickups).toBe(first.pickups);
    expect(replay.shedEvents).toBe(first.shedEvents);
  }, MAX_SOAK_RUNTIME_MS + 5_000);
});
