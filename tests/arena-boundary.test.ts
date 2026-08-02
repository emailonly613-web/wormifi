import { describe, expect, it } from "vitest";
import {
  clipCanvasToArenaCircle,
  confinePointToArenaCircle,
  pointFitsArenaCircle,
} from "../src/game/arenaBoundary";
import { isPlayerGeometryInsideArena } from "../src/game/core";
import {
  buildLocalArena,
  LOCAL_PLAYER_ID,
  sanitizeLocalInput,
  stepLocalArena,
} from "../src/game/localArena";

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
});
