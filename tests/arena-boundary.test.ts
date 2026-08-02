import { describe, expect, it } from "vitest";
import {
  clipCanvasToArenaCircle,
  confinePointToArenaCircle,
  pointFitsArenaCircle,
} from "../src/game/arenaBoundary";
import {
  createGameState,
  getPlayerRadius,
  isPlayerGeometryInsideArena,
  spawnDrop,
  spawnPlayer,
  stepGame,
} from "../src/game/core";
import {
  buildLocalArena,
  LOCAL_PLAYER_ID,
  sanitizeLocalInput,
  stepLocalArena,
} from "../src/game/localArena";

function seededUnitRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

describe("arena boundary defense in depth", () => {
  it("projects outside and non-finite body points into the playable disk", () => {
    const outside = { x: 300, y: 400 };
    expect(confinePointToArenaCircle(outside, 100)).toBe(true);
    expect(Math.hypot(outside.x, outside.y)).toBeCloseTo(100, 8);
    expect(pointFitsArenaCircle(outside, 100)).toBe(true);

    const corrupt = { x: Number.NaN, y: Number.POSITIVE_INFINITY };
    expect(confinePointToArenaCircle(corrupt, 100)).toBe(true);
    expect(corrupt).toEqual({ x: 0, y: 0 });
  });

  it("installs an exact circular canvas clip before any living chain is painted", () => {
    const calls: unknown[][] = [];
    const context = {
      beginPath: () => calls.push(["beginPath"]),
      arc: (...args: unknown[]) => calls.push(["arc", ...args]),
      clip: () => calls.push(["clip"]),
    } as unknown as CanvasRenderingContext2D;

    clipCanvasToArenaCircle(context, { x: 320, y: 180 }, 900);

    expect(calls).toEqual([
      ["beginPath"],
      ["arc", 320, 180, 900, 0, Math.PI * 2],
      ["clip"],
    ]);
  });

  it("keeps every living head and body segment contained during a crowded local voyage", () => {
    const session = buildLocalArena("boundary-integrity-voyage", "Boundary Proof", "rush");
    for (let tick = 1; tick <= 240; tick += 1) {
      const player = session.state.players[LOCAL_PLAYER_ID];
      const angle = tick * 0.024;
      stepLocalArena(session, sanitizeLocalInput(
        tick,
        { x: Math.cos(angle), y: Math.sin(angle) },
        tick % 90 < 18,
        player.direction,
      ));
      for (const candidate of Object.values(session.state.players)) {
        if (!candidate.alive) continue;
        expect(
          isPlayerGeometryInsideArena(candidate, session.state.config),
          `${candidate.id} escaped with living geometry on tick ${tick}`,
        ).toBe(true);
      }
    }
  });

  it("repairs malformed living body state through the real simulation step", () => {
    const session = buildLocalArena("malformed-body-voyage", "Boundary Repair", "practice");
    const player = session.state.players[LOCAL_PLAYER_ID];
    player.body[1] = { x: Number.NaN, y: Number.POSITIVE_INFINITY };
    player.body[3] = { x: 1e12, y: -1e12 };

    stepLocalArena(session, sanitizeLocalInput(
      1,
      { x: 1, y: 0 },
      false,
      player.direction,
    ));

    expect(player.alive).toBe(true);
    expect(isPlayerGeometryInsideArena(player, session.state.config)).toBe(true);
  });

  it("repairs malformed head and history state before the authoritative geometry snapshot", () => {
    const state = createGameState("malformed-head-history", {
      arenaRadius: 200,
      baseSpeed: 0,
      boostSpeed: 0,
      spawnShieldSeconds: 0,
    });
    const player = spawnPlayer(state, {
      id: "malformed-head-history",
      position: { x: 0, y: 0 },
      shieldSeconds: 0,
    });
    player.position = { x: Number.NaN, y: Number.NEGATIVE_INFINITY };
    player.previousPosition = { x: Number.NaN, y: Number.POSITIVE_INFINITY };
    player.body[0] = { x: Number.NaN, y: Number.POSITIVE_INFINITY };
    player.previousBody[0] = { x: Number.NEGATIVE_INFINITY, y: Number.NaN };

    stepGame(state);

    expect(player.alive).toBe(true);
    expect(player.position).toEqual({ x: 0, y: 0 });
    expect(player.previousPosition).toEqual({ x: 0, y: 0 });
    expect(player.previousBody.every((point) =>
      Number.isFinite(point.x) && Number.isFinite(point.y)
    )).toBe(true);
    expect(isPlayerGeometryInsideArena(player, state.config)).toBe(true);
  });

  it("keeps a maximum chain contained through 5,000 high-speed near-wall turns", () => {
    const state = createGameState("long-chain-boundary-turns", {
      fixedStepSeconds: 1 / 30,
      arenaRadius: 320,
      baseSpeed: 170,
      boostSpeed: 340,
      maximumTurnRadiansPerSecond: 12,
      minimumTurnRadiansPerSecond: 12,
      spawnShieldSeconds: 0,
    });
    const player = spawnPlayer(state, {
      id: "long-chain",
      position: { x: 205, y: 0 },
      direction: { x: -1, y: 0 },
      shieldSeconds: 0,
    });
    spawnDrop(state, {
      id: "maximum-growth",
      position: { ...player.position },
      mass: 2_500,
      radius: 8,
      source: "arena",
    });
    stepGame(state, {
      [player.id]: { sequence: 1, direction: { x: -1, y: 0 }, boost: false },
    });
    expect(player.body).toHaveLength(state.config.maximumBodySegments);

    for (let sequence = 2; sequence <= 5_001; sequence += 1) {
      const radius = Math.hypot(player.position.x, player.position.y) || 1;
      const radialX = player.position.x / radius;
      const radialY = player.position.y / radius;
      const targetRadius =
        state.config.arenaRadius - getPlayerRadius(player, state.config) - 36;
      const radialCorrection = (radius - targetRadius) / 48;
      const directionX = -radialY - radialX * radialCorrection;
      const directionY = radialX - radialY * radialCorrection;
      const directionLength = Math.hypot(directionX, directionY) || 1;
      stepGame(state, {
        [player.id]: {
          sequence,
          direction: {
            x: directionX / directionLength,
            y: directionY / directionLength,
          },
          boost: false,
        },
      });

      expect(player.alive, `chain died on turn ${sequence}`).toBe(true);
      expect(
        isPlayerGeometryInsideArena(player, state.config),
        `living geometry escaped on turn ${sequence}`,
      ).toBe(true);
    }
  });

  it("preserves the living-geometry invariant across deterministic corruption and growth seeds", () => {
    let livingGeometryChecks = 0;
    for (let scenario = 1; scenario <= 16; scenario += 1) {
      const random = seededUnitRandom(scenario * 7_919);
      const arenaRadius = 220 + Math.floor(random() * 220);
      const baseSpeed = 80 + random() * 240;
      const state = createGameState(`boundary-seed-${scenario}`, {
        fixedStepSeconds: 1 / 30,
        arenaRadius,
        baseSpeed,
        boostSpeed: baseSpeed * 2,
        maximumTurnRadiansPerSecond: 14,
        minimumTurnRadiansPerSecond: 8,
        spawnShieldSeconds: 0,
      });
      let generation = 0;
      const spawn = () => {
        generation += 1;
        const angle = random() * Math.PI * 2;
        const distance = arenaRadius * (0.15 + random() * 0.9);
        return spawnPlayer(state, {
          id: `seed-${scenario}-generation-${generation}`,
          position: {
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance,
          },
          direction: { x: Math.cos(angle + Math.PI), y: Math.sin(angle + Math.PI) },
          shieldSeconds: 0,
        });
      };
      let player = spawn();

      for (let tick = 1; tick <= 600; tick += 1) {
        if (!player.alive) {
          delete state.players[player.id];
          player = spawn();
        }
        if (tick % 73 === 0) {
          spawnDrop(state, {
            id: `seed-growth-${scenario}-${tick}`,
            position: { ...player.position },
            mass: 10 + random() * 240,
            radius: 5,
            source: "arena",
          });
        }
        if (tick % 127 === 0) {
          const bodyIndex = Math.floor(random() * player.body.length);
          player.body[bodyIndex] = {
            x: random() < 0.5 ? Number.NaN : 1e12,
            y: random() < 0.5 ? Number.POSITIVE_INFINITY : -1e12,
          };
        }
        if (tick % 211 === 0) {
          player.position = {
            x: Number.NaN,
            y: Number.NEGATIVE_INFINITY,
          };
        }
        const inputAngle = random() * Math.PI * 2;
        stepGame(state, {
          [player.id]: {
            sequence: tick,
            direction: { x: Math.cos(inputAngle), y: Math.sin(inputAngle) },
            boost: random() < 0.25,
          },
        });

        for (const candidate of Object.values(state.players)) {
          if (!candidate.alive) continue;
          livingGeometryChecks += 1;
          expect(
            isPlayerGeometryInsideArena(candidate, state.config),
            `scenario ${scenario}, tick ${tick}, player ${candidate.id}`,
          ).toBe(true);
        }
      }
    }
    expect(livingGeometryChecks).toBeGreaterThan(8_000);
  });
});
