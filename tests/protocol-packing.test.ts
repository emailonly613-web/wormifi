import { describe, expect, it } from "vitest";
import {
  decodeSnapshotFromWire,
  MAX_PACKED_BODY_SEGMENTS,
  packPresenceForWire,
  packSnapshotForWire,
  PROTOCOL_VERSION,
  type PresenceMessage,
  type PublicPlayerState,
  type SnapshotMessage,
} from "../server/src/protocol";

function fullPlayer(index: number): PublicPlayerState {
  const position = { x: index * 90 - 480, y: index * -55 + 300 };
  return {
    id: `max-player-${index}`,
    name: `MAX CREW ${index}`,
    kind: index === 0 ? "human" : "bot",
    connected: true,
    alive: true,
    position,
    direction: { x: 1, y: 0 },
    body: Array.from({ length: MAX_PACKED_BODY_SEGMENTS }, (_, segment) => ({
      x: position.x - (segment + 1) * 18.375,
      y: position.y + Math.sin(segment * 0.31) * 120.125,
    })),
    mass: 462,
    kills: index,
    score: 12_345 + index,
    shieldTicksRemaining: 0,
  };
}

function fullSnapshot(players = 12): SnapshotMessage {
  return {
    type: "snapshot",
    protocolVersion: PROTOCOL_VERSION,
    authority: "server",
    roomId: "packed-max-room",
    tick: 12_000,
    serverTimeMs: 400_000,
    players: Array.from({ length: players }, (_, index) => fullPlayer(index)),
    dropUpserts: [],
    removedDropIds: [],
    events: [],
  };
}

describe("protocol-v5 packed body paths", () => {
  it("keeps a twelve-player 72-piece room below the 24 KiB steady snapshot budget", () => {
    const packed = packSnapshotForWire(fullSnapshot());
    const encoded = JSON.stringify(packed);
    expect(encoded).not.toContain('"body":');
    expect(encoded).toContain('"bodyQ4":');
    expect(new TextEncoder().encode(encoded).byteLength).toBeLessThanOrEqual(24 * 1_024);
  });

  it("round-trips all pieces with at most quarter-unit radial error", () => {
    const original = fullSnapshot(1);
    const decoded = decodeSnapshotFromWire(
      JSON.parse(JSON.stringify(packSnapshotForWire(original))),
    ) as SnapshotMessage;
    expect(decoded.players[0].body).toHaveLength(MAX_PACKED_BODY_SEGMENTS);
    decoded.players[0].body.forEach((segment, index) => {
      const source = original.players[0].body[index];
      expect(Math.hypot(segment.x - source.x, segment.y - source.y)).toBeLessThanOrEqual(0.18);
    });
  });

  it("fails closed on malformed, oversized, or out-of-range packed paths", () => {
    const packed = packSnapshotForWire(fullSnapshot(1));
    const corrupt = structuredClone(packed) as unknown as {
      players: Array<{ bodyQ4: string }>;
    };
    corrupt.players[0].bodyQ4 = "not base64";
    expect(decodeSnapshotFromWire(corrupt)).toBeNull();

    const oversized = fullSnapshot(1);
    oversized.players[0].body.push({ x: 0, y: 0 });
    expect(() => packSnapshotForWire(oversized)).toThrow(/exceeds 72/u);

    const outOfRange = fullSnapshot(1);
    outOfRange.players[0].body[0] = { x: 100_000, y: 0 };
    expect(() => packSnapshotForWire(outOfRange)).toThrow(/Int16 range/u);
  });
});

describe("protocol-v5 compact room presence", () => {
  it("round-trips an honest 200-seat roster below the steady snapshot budget", () => {
    const presence: PresenceMessage = {
      type: "presence",
      protocolVersion: PROTOCOL_VERSION,
      authority: "server",
      roomId: "public-1",
      tick: 1_500,
      players: Array.from({ length: 200 }, (_, index) => {
        const player = fullPlayer(index);
        return {
          id: player.id,
          name: player.name,
          kind: player.kind,
          connected: player.connected,
          alive: player.alive,
          position: player.position,
          mass: player.mass + index / 10,
          kills: player.kills,
          score: player.score,
        };
      }),
    };
    const encoded = JSON.stringify(packPresenceForWire(presence));
    expect(new TextEncoder().encode(encoded).byteLength).toBeLessThan(24 * 1_024);
    const decoded = decodeSnapshotFromWire(JSON.parse(encoded)) as PresenceMessage;
    expect(decoded.players).toHaveLength(200);
    expect(decoded.players[0]).toMatchObject(presence.players[0]);
    expect(decoded.players[199].id).toBe("max-player-199");
    expect(decoded.players[199].mass).toBeCloseTo(presence.players[199].mass, 1);
  });

  it("fails closed on malformed compact presence tuples", () => {
    const malformed = {
      type: "presence",
      protocolVersion: PROTOCOL_VERSION,
      authority: "server",
      roomId: "public-1",
      tick: 10,
      players: [["bot-1", "BOT ONE", 0]],
    };
    expect(decodeSnapshotFromWire(malformed)).toBeNull();
  });
});
