import { describe, expect, it } from "vitest";

import {
  PROTOCOL_VERSION,
  packSnapshotForWire,
  type PublicPlayerState,
  type SnapshotMessage,
} from "../server/src/protocol";
import {
  createSnapshotInterestIndex,
  scopeSnapshotForPlayer,
} from "../server/src/room";

function player(id: string, x: number, bodyX = x - 20): PublicPlayerState {
  return {
    id,
    name: id.toUpperCase(),
    kind: id === "human-1" ? "human" : "bot",
    connected: true,
    alive: true,
    position: { x, y: 0 },
    direction: { x: 1, y: 0 },
    body: [{ x: bodyX, y: 0 }],
    mass: 48,
    kills: 0,
    score: 0,
    shieldTicksRemaining: 0,
  };
}

function snapshot(players: PublicPlayerState[]): SnapshotMessage {
  return {
    type: "snapshot",
    protocolVersion: PROTOCOL_VERSION,
    authority: "server",
    roomId: "public-1",
    tick: 90,
    serverTimeMs: 3_000,
    players,
    dropUpserts: [],
    removedDropIds: [],
    events: [],
  };
}

describe("nearby animated snapshot scope", () => {
  it("includes the human, nearby heads, and bodies crossing the visible collision neighborhood", () => {
    const original = snapshot([
      player("human-1", 0),
      player("near-head", 400),
      player("crossing-body", 2_000, 500),
      player("far-away", 2_500, 2_400),
    ]);
    const scoped = scopeSnapshotForPlayer(original, "human-1", 600);
    expect(scoped.players.map((candidate) => candidate.id)).toEqual([
      "human-1",
      "near-head",
      "crossing-body",
    ]);
  });

  it("retains a remote killer in the local death frame but removes unrelated events", () => {
    const original = snapshot([
      player("human-1", 0),
      player("remote-killer", 2_000),
      player("unrelated", -2_000),
    ]);
    original.events = [
      {
        type: "playerDied",
        tick: original.tick,
        playerId: "human-1",
        killerId: "remote-killer",
        cause: "collision",
        collisionTime: 0.4,
      },
      {
        type: "massShed",
        tick: original.tick,
        playerId: "unrelated",
        dropId: "remote-drop",
        mass: 1,
      },
    ];
    const scoped = scopeSnapshotForPlayer(original, "human-1", 600);
    expect(scoped.players.map((candidate) => candidate.id)).toEqual([
      "human-1",
      "remote-killer",
    ]);
    expect(scoped.events).toHaveLength(1);
    expect(scoped.events[0].type).toBe("playerDied");
  });

  it("keeps the 15 Hz body payload bounded when a 200-seat arena is spatially distributed", () => {
    const players = Array.from({ length: 200 }, (_, index) => {
      const angle = index * Math.PI * (3 - Math.sqrt(5));
      const radius = index === 0 ? 0 : 250 + Math.sqrt(index / 199) * 3_200;
      const candidate = player(
        index === 0 ? "human-1" : `bot-${index}`,
        Math.cos(angle) * radius,
      );
      candidate.position.y = Math.sin(angle) * radius;
      candidate.body = Array.from({ length: 18 }, (_, segment) => ({
        x: candidate.position.x - (segment + 1) * 18,
        y: candidate.position.y,
      }));
      return candidate;
    });
    const scoped = scopeSnapshotForPlayer(snapshot(players), "human-1", 1_000);
    const bytes = new TextEncoder().encode(JSON.stringify(packSnapshotForWire(scoped))).byteLength;
    expect(scoped.players.length).toBeGreaterThan(1);
    expect(scoped.players.length).toBeLessThan(40);
    expect(bytes).toBeLessThan(24 * 1_024);
  });

  it("the spatial index preserves exact head, body-crossing, and event scope", () => {
    const original = snapshot([
      player("human-1", 0),
      player("near-head", 400),
      player("crossing-body", 2_000, 500),
      player("remote-killer", 2_400),
      player("far-away", -2_500),
    ]);
    original.events = [{
      type: "playerDied",
      tick: original.tick,
      playerId: "human-1",
      killerId: "remote-killer",
      cause: "collision",
      collisionTime: 0.4,
    }];
    const baseline = scopeSnapshotForPlayer(original, "human-1", 600);
    const indexed = scopeSnapshotForPlayer(
      original,
      "human-1",
      600,
      createSnapshotInterestIndex(original, 600),
    );
    expect(indexed).toEqual(baseline);
  });
});
