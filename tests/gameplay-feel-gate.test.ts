import { describe, expect, it } from "vitest";

import {
  createGameState,
  getBodyRadius,
  getPlayerRadius,
  spawnPlayer,
  stepGame,
} from "../src/game/core";
import type { PirateRelicKind, PlayerState } from "../src/game/types";

const FRAME_SECONDS = 1 / 30;
const PASS_SPEEDS = [100, 170, 212, 330] as const;
const MASS_PAIRS = [
  [48, 48],
  [1_500, 48],
  [48, 1_500],
  [1_500, 1_500],
] as const;

function runParallelBodyPass(
  speed: number,
  attackerMass: number,
  ownerMass: number,
  clearanceDelta: number,
) {
  const state = createGameState(
    `feel-pass-${speed}-${attackerMass}-${ownerMass}-${clearanceDelta}`,
    {
      fixedStepSeconds: FRAME_SECONDS,
      arenaRadius: 10_000,
      baseSpeed: 0,
      boostSpeed: speed,
      boostMassPerSecond: 0,
      shedDropMass: 100,
      startingBodySegments: 6,
      minimumBodySegments: 6,
      maximumBodySegments: 6,
      massPerSegment: 1_000_000,
      spawnShieldSeconds: 0,
    },
  );
  const owner = spawnPlayer(state, {
    id: "owner",
    position: { x: 500, y: 0 },
    direction: { x: 1, y: 0 },
    mass: ownerMass,
    // The gate measures only whether the moving head hits this body. Prevent
    // the stationary owner's head from becoming a second result.
    shieldSeconds: 30,
  });
  const combinedRadius =
    getPlayerRadius({ mass: attackerMass }, state.config) +
    getBodyRadius(owner, state.config);
  const attacker = spawnPlayer(state, {
    id: "attacker",
    position: { x: 0, y: combinedRadius + clearanceDelta },
    direction: { x: 1, y: 0 },
    mass: attackerMass,
    shieldSeconds: 0,
  });

  for (let sequence = 0; sequence < 300 && attacker.alive && attacker.position.x < 650; sequence += 1) {
    stepGame(state, {
      attacker: {
        sequence,
        direction: { x: 1, y: 0 },
        boost: true,
      },
      owner: {
        sequence,
        direction: { x: 1, y: 0 },
        boost: false,
      },
    });
  }

  return attacker;
}

function turnForTenTicks(mass: number, boost: boolean): PlayerState {
  const state = createGameState(`feel-turn-${mass}-${boost}`, {
    fixedStepSeconds: FRAME_SECONDS,
    arenaRadius: 10_000,
    baseSpeed: 100,
    boostSpeed: 170,
    boostMassPerSecond: 0,
    shedDropMass: 100,
    spawnShieldSeconds: 0,
  });
  const player = spawnPlayer(state, {
    id: "captain",
    position: { x: 0, y: 0 },
    direction: { x: 1, y: 0 },
    mass,
    shieldSeconds: 0,
  });
  for (let sequence = 0; sequence < 10; sequence += 1) {
    stepGame(state, {
      captain: {
        sequence,
        direction: { x: -1, y: 0 },
        boost,
      },
    });
  }
  return player;
}

describe("gameplay feel release gate", () => {
  it.each(PASS_SPEEDS)(
    "keeps a visible near miss alive and a visible overlap lethal at speed %i",
    (speed) => {
      for (const [attackerMass, ownerMass] of MASS_PAIRS) {
        const miss = runParallelBodyPass(speed, attackerMass, ownerMass, 0.2);
        const hit = runParallelBodyPass(speed, attackerMass, ownerMass, -0.2);

        expect(miss.alive, `miss ${speed}/${attackerMass}/${ownerMass}`).toBe(true);
        expect(hit.alive, `hit ${speed}/${attackerMass}/${ownerMass}`).toBe(false);
        expect(hit.killedBy, `killer ${speed}/${attackerMass}/${ownerMass}`).toBe("owner");
      }
    },
  );

  it("keeps launch and large-creature turn curves exact while Turbo changes speed only", () => {
    const launchOrdinary = turnForTenTicks(48, false);
    const launchTurbo = turnForTenTicks(48, true);
    const largeOrdinary = turnForTenTicks(1_500, false);
    const largeTurbo = turnForTenTicks(1_500, true);

    expect(Math.atan2(launchOrdinary.direction.y, launchOrdinary.direction.x)).toBeCloseTo(-Math.PI / 2, 8);
    expect(launchTurbo.direction).toEqual(launchOrdinary.direction);
    expect(Math.hypot(launchTurbo.position.x, launchTurbo.position.y) /
      Math.hypot(launchOrdinary.position.x, launchOrdinary.position.y)).toBeCloseTo(1.7, 8);

    const expectedLargeTurn = -(145 * Math.PI / 180) / 3;
    expect(Math.atan2(largeOrdinary.direction.y, largeOrdinary.direction.x)).toBeCloseTo(expectedLargeTurn, 8);
    expect(largeTurbo.direction).toEqual(largeOrdinary.direction);
  });

  it("proves Maelstrom can execute a zero-clearance 360-degree loop repeatedly", () => {
    const state = createGameState("feel-maelstrom-loop", {
      fixedStepSeconds: FRAME_SECONDS,
      arenaRadius: 10_000,
      baseSpeed: 100,
      boostSpeed: 170,
      boostMassPerSecond: 0,
      shedDropMass: 100,
      spawnShieldSeconds: 0,
    });
    const captain = spawnPlayer(state, {
      id: "captain",
      position: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      shieldSeconds: 0,
    });
    const relicKind: PirateRelicKind = "maelstrom-wheel";
    captain.specialist = {
      kind: "collector",
      relicKind,
      activatedAtTick: 0,
      expiresAtTick: 100,
      durationTicks: 100,
    };

    const headings = [
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 0, y: -1 },
      { x: 1, y: 0 },
    ];
    for (let loop = 0; loop < 3; loop += 1) {
      const loopStart = { ...captain.position };
      headings.forEach((direction, index) => {
        stepGame(state, {
          captain: {
            sequence: loop * headings.length + index,
            direction,
            boost: true,
          },
        });
        expect(captain.direction.x).toBeCloseTo(direction.x, 10);
        expect(captain.direction.y).toBeCloseTo(direction.y, 10);
      });
      expect(captain.position.x).toBeCloseTo(loopStart.x, 8);
      expect(captain.position.y).toBeCloseTo(loopStart.y, 8);
      expect(captain.alive).toBe(true);
    }
  });
});
