import { describe, expect, it } from "vitest";

import {
  GAME_BOARD_CATALOG,
  HONEYCOMB_COVE_BOARD,
  cloneAndValidateBoard,
  getGameBoardProfile,
} from "../src/game/chargingStations";
import { BOARD_OPTIONS, isGameBoardId } from "../src/game/boardPreference";
import {
  createHoneycombPatternCache,
  drawHoneycombLattice,
} from "../src/game/honeycombLattice";

describe("Honeycomb Cove — the classic board (owner order 2026-08-03)", () => {
  it("is a real catalog board with ZERO stations — the simplicity is the design", () => {
    expect(isGameBoardId("honeycomb-cove")).toBe(true);
    expect(getGameBoardProfile("honeycomb-cove")).toBe(HONEYCOMB_COVE_BOARD);
    expect(GAME_BOARD_CATALOG["honeycomb-cove"].chargingStations).toHaveLength(0);
  });

  it("survives board validation with an empty station list", () => {
    const prepared = cloneAndValidateBoard(HONEYCOMB_COVE_BOARD, 1 / 30, 2_400);
    expect(prepared.board.id).toBe("honeycomb-cove");
    expect(prepared.board.chargingStations).toHaveLength(0);
  });

  it("is offered on the picker with an honest zero-objective disclosure", () => {
    const option = BOARD_OPTIONS.find((entry) => entry.id === "honeycomb-cove");
    expect(option).toBeDefined();
    expect(option?.objectiveCount).toBe(0);
    expect(option?.name).toBe("Honeycomb Cove");
  });

  it("keeps Open Seas the default: the classic board is offered, never imposed", () => {
    expect(BOARD_OPTIONS[0]?.id).toBe("open-seas");
  });

  it("lattice drawing fails safe without a DOM instead of crashing the frame", () => {
    const cache = createHoneycombPatternCache();
    const drewWithoutDom = drawHoneycombLattice(
      // No canvas context exists in this node environment; the guard path
      // must return false before ever touching one.
      {} as CanvasRenderingContext2D,
      cache,
      1_280,
      720,
      { x: 0, y: 0 },
      0,
    );
    expect(drewWithoutDom).toBe(false);
  });
});
