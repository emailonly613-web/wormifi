import { describe, expect, it } from "vitest";

import {
  createGameState,
  getDropStoredMass,
  sampleDeathTracePositions,
  spawnPlayer,
  stepGame,
} from "../src/game/core";

describe("defeated-worm treasure trace", () => {
  it("samples a curved final centerline from exact head to exact tail", () => {
    const positions = sampleDeathTracePositions({
      position: { x: 0, y: 0 },
      body: [
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ],
    }, 5);
    expect(positions).toEqual([
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 5 },
      { x: 10, y: 10 },
    ]);
    expect(sampleDeathTracePositions({
      position: { x: 0, y: 0 },
      body: [{ x: 10, y: 0 }, { x: 10, y: 10 }],
    }, 1)).toEqual([{ x: 10, y: 0 }]);
  });

  it("turns a real boundary defeat into the same ordered body path with exact mass", () => {
    const makeDefeat = () => {
      const state = createGameState("body-shaped-hoard", {
        fixedStepSeconds: 0.1,
        arenaRadius: 100,
        baseSpeed: 0,
        boostSpeed: 0,
        spawnShieldSeconds: 0,
        maximumDeathDrops: 80,
      });
      const defeated = spawnPlayer(state, {
        id: "curved-captain",
        position: { x: 180, y: 0 },
        direction: { x: 1, y: 0 },
        mass: 48,
        shieldSeconds: 0,
      });
      defeated.body = [
        { x: 166, y: 0 },
        { x: 160, y: 12 },
        { x: 150, y: 20 },
      ];
      defeated.previousBody = defeated.body.map((point) => ({ ...point }));
      stepGame(state);
      return { state, defeated };
    };

    const first = makeDefeat();
    const second = makeDefeat();
    const echoes = first.state.drops.filter((drop) => drop.source === "death");
    const expectedTrace = sampleDeathTracePositions(first.defeated, echoes.length);

    expect(first.defeated.alive).toBe(false);
    expect(echoes.map((drop) => drop.position)).toEqual(expectedTrace);
    expect(echoes[0].position).toEqual(first.defeated.position);
    expect(echoes.at(-1)?.position).toEqual(first.defeated.body.at(-1));
    expect(echoes.reduce((sum, drop) => sum + getDropStoredMass(drop), 0))
      .toBeCloseTo(48, 10);
    expect(second.state.drops).toEqual(first.state.drops);
    expect(second.state.randomState).toBe(first.state.randomState);
  });

  it("fails safely for invalid sample counts and collapsed bodies", () => {
    expect(() => sampleDeathTracePositions({
      position: { x: 1, y: 2 },
      body: [],
    }, 0)).toThrow(/positive safe integer/u);
    expect(sampleDeathTracePositions({
      position: { x: 1, y: 2 },
      body: [{ x: 1, y: 2 }, { x: 1, y: 2 }],
    }, 3)).toEqual([
      { x: 1, y: 2 },
      { x: 1, y: 2 },
      { x: 1, y: 2 },
    ]);
  });
});
