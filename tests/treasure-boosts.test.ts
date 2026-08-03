import { describe, expect, it } from "vitest";

import {
  TREASURE_BOOST_DURATION_SECONDS,
  activeTreasureBoostChips,
  effectiveTreasureBoost,
  grantTreasureBoost,
  packTreasureBoostChips,
  parseTreasureBoostChips,
  pruneTreasureBoosts,
  type TreasureBoostStack,
} from "../src/game/treasureBoosts";
import {
  LOCAL_PLAYER_ID,
  buildLocalArena,
  sanitizeLocalInput,
  stepLocalArena,
} from "../src/game/localArena";
import { spawnDrop } from "../src/game/core";

const STEP = 1 / 30;

describe("stacking treasure multipliers (owner spec 2026-08-03)", () => {
  it("matches the owner's duration table exactly", () => {
    expect(TREASURE_BOOST_DURATION_SECONDS).toEqual({ 2: 20, 3: 15, 4: 10, 5: 10, 10: 5 });
  });

  it("stacks additively with no cap: a second 2x makes 40 seconds", () => {
    const stack: TreasureBoostStack = {};
    grantTreasureBoost(stack, 2, 0, STEP);
    expect(stack[2]).toBe(600); // 20s at 30Hz
    grantTreasureBoost(stack, 2, 30, STEP);
    expect(stack[2]).toBe(1_200); // the spec's "that's 40 seconds"
    grantTreasureBoost(stack, 2, 1_500, STEP); // expired -> restart from now
    expect(stack[2]).toBe(2_100);
  });

  it("runs tiers together and multiplies them", () => {
    const stack: TreasureBoostStack = {};
    grantTreasureBoost(stack, 2, 0, STEP);
    grantTreasureBoost(stack, 3, 0, STEP);
    expect(effectiveTreasureBoost(stack, 100)).toBe(6);
    // 3x (15s = 450 ticks) lapses first; 2x (600) alone remains.
    expect(effectiveTreasureBoost(stack, 500)).toBe(2);
    expect(effectiveTreasureBoost(stack, 700)).toBe(1);
  });

  it("chips list the running tiers high-first and survive the wire roundtrip", () => {
    const stack: TreasureBoostStack = {};
    grantTreasureBoost(stack, 2, 0, STEP);
    grantTreasureBoost(stack, 10, 0, STEP);
    const chips = activeTreasureBoostChips(stack, 30, STEP);
    expect(chips.map((chip) => chip.tier)).toEqual([10, 2]);
    expect(chips[0]?.remainingSeconds).toBe(4);
    const parsed = parseTreasureBoostChips(packTreasureBoostChips(stack, 30, STEP));
    expect(parsed).toEqual(chips);
    expect(parseTreasureBoostChips("garbage")).toEqual([]);
    expect(parseTreasureBoostChips([[7, 5], [2, -1], [3, 8]])).toEqual([
      { tier: 3, remainingSeconds: 8 },
    ]);
  });

  it("prunes expired tiers", () => {
    const stack: TreasureBoostStack = {};
    grantTreasureBoost(stack, 5, 0, STEP);
    pruneTreasureBoosts(stack, 10_000);
    expect(stack[5]).toBeUndefined();
  });

  it("through the real engine: a token grants the stack and treasure pays multiplied", () => {
    const session = buildLocalArena("boost-proof", "Stacker", "practice", "open-seas", "classic");
    const player = session.state.players[LOCAL_PLAYER_ID]!;

    spawnDrop(session.state, {
      position: { x: player.position.x + 6, y: player.position.y },
      mass: 0,
      radius: 9,
      source: "arena",
      relicKind: "gilded-ledger",
      relicDurationSeconds: 20,
      relicTier: 2,
    });
    stepLocalArena(session, sanitizeLocalInput(1, player.direction, false, player.direction));
    expect(player.treasureBoosts[2]).toBeGreaterThan(session.state.tick);
    const firstExpiry = player.treasureBoosts[2]!;

    // A second 2x token EXTENDS the same timer (never replaces a relic slot).
    spawnDrop(session.state, {
      position: { x: player.position.x + 6, y: player.position.y },
      mass: 0,
      radius: 9,
      source: "arena",
      relicKind: "gilded-ledger",
      relicDurationSeconds: 20,
      relicTier: 2,
    });
    stepLocalArena(session, sanitizeLocalInput(2, player.direction, false, player.direction));
    expect(player.treasureBoosts[2]!).toBeGreaterThan(firstExpiry);
    expect(player.specialist?.relicKind).not.toBe("gilded-ledger");

    // Treasure now pays double.
    const massBefore = player.mass;
    spawnDrop(session.state, {
      position: { x: player.position.x + 6, y: player.position.y },
      mass: 2,
      source: "arena",
    });
    stepLocalArena(session, sanitizeLocalInput(3, player.direction, false, player.direction));
    expect(player.mass - massBefore).toBeCloseTo(4, 5);
  });
});
