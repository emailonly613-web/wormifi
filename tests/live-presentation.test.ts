import { describe, expect, it } from "vitest";
import type { PublicPlayerState, SnapshotMessage } from "../server/src/protocol";
import {
  createLivePresentationBuffer,
  getPresentedSnapshot,
  pushAuthoritativeSnapshot,
  resetLivePresentationBuffer,
} from "../src/game/livePresentation";

function player(overrides: Partial<PublicPlayerState> = {}): PublicPlayerState {
  return {
    id: "player-1",
    name: "Tester",
    kind: "human",
    connected: true,
    alive: true,
    position: { x: 0, y: 0 },
    direction: { x: 1, y: 0 },
    body: [{ x: -10, y: 0 }, { x: -20, y: 0 }, { x: -30, y: 0 }],
    mass: 48,
    kills: 0,
    score: 0,
    shieldTicksRemaining: 0,
    ...overrides,
  };
}

function snapshot(tick: number, state: PublicPlayerState): SnapshotMessage {
  return {
    type: "snapshot",
    protocolVersion: 5,
    authority: "server",
    roomId: "presentation-room",
    tick,
    serverTimeMs: tick * (1_000 / 30),
    players: [state],
    dropUpserts: [],
    removedDropIds: [],
    events: [],
  };
}

describe("live presentation interpolation", () => {
  it("renders the first authority snapshot exactly", () => {
    const buffer = createLivePresentationBuffer();
    const first = snapshot(10, player());
    pushAuthoritativeSnapshot(buffer, first, 1_000, 1 / 30);
    expect(getPresentedSnapshot(buffer, 1_020)).toBe(first);
  });

  it("moves head, body, direction, and visible mass smoothly with delivery headroom", () => {
    const buffer = createLivePresentationBuffer();
    pushAuthoritativeSnapshot(buffer, snapshot(10, player()), 1_000, 1 / 30);
    const next = snapshot(12, player({
      position: { x: 20, y: 10 },
      direction: { x: 0, y: 1 },
      body: [{ x: 8, y: 8 }, { x: -4, y: 6 }, { x: -16, y: 4 }],
      mass: 54,
    }));
    pushAuthoritativeSnapshot(buffer, next, 1_067, 1 / 30);

    const middle = getPresentedSnapshot(buffer, 1_105.333)!;
    expect(middle.players[0].position.x).toBeCloseTo(10, 1);
    expect(middle.players[0].position.y).toBeCloseTo(5, 1);
    expect(middle.players[0].body[0].x).toBeCloseTo(-1, 1);
    expect(middle.players[0].mass).toBeCloseTo(51, 1);
    expect(Math.hypot(
      middle.players[0].direction.x,
      middle.players[0].direction.y,
    )).toBeCloseTo(1, 6);
    expect(getPresentedSnapshot(buffer, 2_000)).toBe(next);
  });

  it("keeps the on-screen pose continuous when the next packet arrives early", () => {
    const buffer = createLivePresentationBuffer();
    pushAuthoritativeSnapshot(buffer, snapshot(10, player()), 1_000, 1 / 30);
    pushAuthoritativeSnapshot(buffer, snapshot(12, player({
      position: { x: 20, y: 0 },
    })), 1_067, 1 / 30);

    const before = getPresentedSnapshot(buffer, 1_127)!.players[0].position.x;
    pushAuthoritativeSnapshot(buffer, snapshot(14, player({
      position: { x: 40, y: 0 },
    })), 1_127, 1 / 30);
    const after = getPresentedSnapshot(buffer, 1_127)!.players[0].position.x;

    expect(before).toBeGreaterThan(15);
    expect(before).toBeLessThan(20);
    expect(after).toBeCloseTo(before, 8);
  });

  it("grows a new crew piece outward from the prior tail", () => {
    const buffer = createLivePresentationBuffer();
    pushAuthoritativeSnapshot(buffer, snapshot(20, player()), 2_000, 1 / 30);
    const grown = snapshot(22, player({
      body: [
        { x: -8, y: 0 },
        { x: -18, y: 0 },
        { x: -28, y: 0 },
        { x: -40, y: 0 },
      ],
      mass: 54,
    }));
    pushAuthoritativeSnapshot(buffer, grown, 2_067, 1 / 30);
    const start = getPresentedSnapshot(buffer, 2_067)!;
    const middle = getPresentedSnapshot(buffer, 2_105.333)!;
    expect(start.players[0].body[3]).toEqual({ x: -30, y: 0 });
    expect(middle.players[0].body[3].x).toBeCloseTo(-35, 1);
  });

  it("snaps teleports, large timeline gaps, and resets", () => {
    const buffer = createLivePresentationBuffer();
    pushAuthoritativeSnapshot(buffer, snapshot(30, player()), 3_000, 1 / 30);
    const teleported = snapshot(32, player({ position: { x: 900, y: 0 } }));
    pushAuthoritativeSnapshot(buffer, teleported, 3_067, 1 / 30);
    expect(getPresentedSnapshot(buffer, 3_067)!.players[0]).toBe(teleported.players[0]);

    const afterGap = snapshot(50, player({ position: { x: 940, y: 0 } }));
    pushAuthoritativeSnapshot(buffer, afterGap, 3_700, 1 / 30);
    expect(getPresentedSnapshot(buffer, 3_700)).toBe(afterGap);

    resetLivePresentationBuffer(buffer);
    expect(getPresentedSnapshot(buffer, 4_000)).toBeNull();
  });
});
