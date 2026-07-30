import { describe, expect, it } from "vitest";
import {
  RollingReplayBuffer,
  parseChallengePayload,
  serializeChallengePayload,
} from "../src/game/replay";
import type {
  ChallengePayloadInput,
  ReplaySnapshot,
} from "../src/game/replay";
import type { GameEvent } from "../src/game/types";

function snapshot(tick: number, heroMass = 100): ReplaySnapshot {
  return {
    tick,
    timeSeconds: tick,
    players: [
      {
        id: "hero",
        name: "Hero",
        kind: "human",
        position: { x: tick, y: 0 },
        direction: { x: 1, y: 0 },
        body: [{ x: tick - 1, y: 0 }],
        mass: heroMass,
        alive: true,
        shieldTicksRemaining: 0,
      },
      {
        id: "rival",
        name: "Rival",
        kind: "human",
        position: { x: 0, y: tick },
        direction: { x: 0, y: 1 },
        body: [{ x: 0, y: tick - 1 }],
        mass: 90,
        alive: true,
        shieldTicksRemaining: 0,
      },
    ],
  };
}

function deathEvent(
  tick: number,
  playerId: string,
  killerId?: string,
): GameEvent {
  return {
    type: "playerDied",
    tick,
    playerId,
    cause: killerId ? "collision" : "boundary",
    killerId,
    collisionTime: 0.5,
  };
}

describe("RollingReplayBuffer", () => {
  it("retains only the latest deterministic twelve-second window", () => {
    const buffer = new RollingReplayBuffer();
    const mutable = snapshot(0);
    buffer.record(mutable);
    mutable.players[0].position.x = 999;

    for (let tick = 1; tick <= 15; tick += 1) buffer.record(snapshot(tick));

    const frames = buffer.getSnapshots();
    expect(frames.map((frame) => frame.tick)).toEqual([
      3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    ]);
    expect(frames.every((frame) => frame.timeSeconds >= 3)).toBe(true);
  });

  it("selects a six-second elimination window with four seconds of lead-in", () => {
    const buffer = new RollingReplayBuffer();
    for (let tick = 0; tick <= 12; tick += 1) {
      buffer.record(
        snapshot(tick, 100 + tick),
        tick === 10 ? [deathEvent(10, "rival", "hero")] : [],
      );
    }

    const highlight = buffer.selectHighlight("hero");
    expect(highlight?.reason).toBe("elimination");
    expect(highlight?.rivalId).toBe("rival");
    expect(highlight?.startTimeSeconds).toBe(6);
    expect(highlight?.endTimeSeconds).toBe(12);
    expect(highlight?.snapshots.map((frame) => frame.tick)).toEqual([
      6, 7, 8, 9, 10, 11, 12,
    ]);
  });

  it("identifies death and personal-peak alternatives deterministically", () => {
    const buffer = new RollingReplayBuffer();
    const masses = [100, 105, 110, 120, 130, 150, 170, 200, 180, 170, 160, 150, 140];
    for (let tick = 0; tick <= 12; tick += 1) {
      buffer.record(
        snapshot(tick, masses[tick]),
        tick === 8 ? [deathEvent(8, "hero", "rival")] : [],
      );
    }

    const highlights = buffer.getHighlights("hero");
    expect(highlights.map((highlight) => highlight.reason)).toEqual([
      "death",
      "personalPeak",
    ]);
    expect(highlights[0].startTimeSeconds).toBe(4);
    expect(highlights[0].endTimeSeconds).toBe(10);
    expect(highlights[1].anchorTick).toBe(7);
    expect(highlights[1].peakMass).toBe(200);
    expect(highlights[1].endTimeSeconds - highlights[1].startTimeSeconds).toBe(6);
  });

  it("rejects non-monotonic snapshots and mismatched event ticks", () => {
    const buffer = new RollingReplayBuffer();
    buffer.record(snapshot(1));
    expect(() => buffer.record(snapshot(1))).toThrow(/increasing/u);
    expect(() =>
      buffer.record(snapshot(2), [deathEvent(1, "hero")]),
    ).toThrow(/match/u);
  });
});

describe("challenge payloads", () => {
  const challenge: ChallengePayloadInput = {
    seed: "rush-room-2026-07-29",
    mode: "rush",
    target: { metric: "score", value: 42_500, playerId: "hero-7" },
    playerLook: {
      coreId: "starlight",
      followerId: "jelly-crew",
      trailId: "electric-blue",
      paletteId: "midnight",
    },
  };

  it("serializes deterministically to compact URL-safe base64 and round-trips", () => {
    const first = serializeChallengePayload(challenge);
    const second = serializeChallengePayload({ ...challenge });

    expect(first).toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9_-]+$/u);
    expect(first).not.toContain("=");
    expect(parseChallengePayload(first)).toEqual({
      ok: true,
      value: { version: 1, ...challenge },
    });
  });

  it("fails closed for malformed, oversized, corrupt, and invalid-schema data", () => {
    expect(parseChallengePayload("")).toEqual({ ok: false, error: "empty" });
    expect(parseChallengePayload("a".repeat(2_049))).toEqual({
      ok: false,
      error: "too_long",
    });
    expect(parseChallengePayload("not+url/safe=")).toEqual({
      ok: false,
      error: "invalid_encoding",
    });

    const corruptJson = btoa("not json").replace(/=+$/u, "");
    expect(parseChallengePayload(corruptJson)).toEqual({
      ok: false,
      error: "invalid_json",
    });

    const wrongVersion = btoa('{"v":2}').replace(/=+$/u, "");
    expect(parseChallengePayload(wrongVersion)).toEqual({
      ok: false,
      error: "invalid_schema",
    });
  });

  it("refuses unsafe identifiers and impossible target values before encoding", () => {
    expect(() =>
      serializeChallengePayload({
        ...challenge,
        playerLook: { ...challenge.playerLook, coreId: "<script>" },
      }),
    ).toThrow(/invalid/u);
    expect(() =>
      serializeChallengePayload({
        ...challenge,
        target: { metric: "score", value: Number.POSITIVE_INFINITY },
      }),
    ).toThrow(/invalid/u);
  });
});
