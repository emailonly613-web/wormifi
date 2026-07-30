import assert from "node:assert/strict";
import test from "node:test";
import type WebSocket from "ws";

import { getDropStoredMass, spawnDrop } from "../../../src/game/core.ts";
import {
  MIXED_ECHO_ORIGIN_ID,
  packSnapshotForWire,
  type ServerMessage,
  type SnapshotMessage,
  type WorldMessage,
} from "../../src/protocol.ts";
import { ArenaRoom } from "../../src/room.ts";

interface RoomTestSurface {
  simulationStep(): void;
  snapshot(): SnapshotMessage;
}

class CaptureSocket {
  readonly OPEN = 1;
  readonly bufferedAmount = 0;
  readyState = this.OPEN;
  readonly messages: ServerMessage[] = [];

  send(encoded: string): void {
    this.messages.push(JSON.parse(encoded) as ServerMessage);
  }

  close(): void {
    this.readyState = 3;
  }

  latest<T extends ServerMessage["type"]>(type: T): Extract<ServerMessage, { type: T }> {
    for (let index = this.messages.length - 1; index >= 0; index -= 1) {
      const message = this.messages[index];
      if (message?.type === type) return message as Extract<ServerMessage, { type: T }>;
    }
    throw new Error(`expected a ${type} message`);
  }
}

const options = {
  targetPopulation: 0,
  targetDropCount: 0,
  heatRing: false as const,
  now: () => 1_700_000_000_000,
};

function addCycle(room: ArenaRoom, cycle: number): void {
  for (let index = 0; index < 20; index += 1) {
    spawnDrop(room.state, {
      position: { x: 900 + cycle * 20 + index, y: cycle },
      mass: 2,
      source: "boost",
      originPlayerId: "booster",
    });
  }
  for (let index = 0; index < 32; index += 1) {
    spawnDrop(room.state, {
      position: { x: -900 - cycle * 32 - index, y: -cycle },
      mass: 5,
      source: "death",
      originPlayerId: "rival",
    });
  }
}

test("long live rooms conserve Echo mass inside deterministic caps and stable snapshot budgets", () => {
  const first = new ArenaRoom("transient-cap-proof", options);
  const replay = new ArenaRoom("transient-cap-proof", options);
  const rooms = [first, replay];
  const surfaces = rooms.map((room) => room as unknown as RoomTestSurface);

  for (const room of rooms) {
    spawnDrop(room.state, {
      id: "neutral-proof",
      position: { x: 0, y: 700 },
      mass: 4,
      source: "arena",
    });
    spawnDrop(room.state, {
      id: "relic-proof",
      position: { x: 0, y: -700 },
      mass: 0,
      source: "arena",
      relicKind: "emerald-spyglass",
    });
  }

  let expectedBoostMass = 0;
  let expectedDeathMass = 0;
  let maximumPackedSnapshotBytes = 0;

  for (let cycle = 0; cycle < 24; cycle += 1) {
    expectedBoostMass += 20 * 2;
    expectedDeathMass += 32 * 5;
    const packed: string[] = [];

    for (let roomIndex = 0; roomIndex < rooms.length; roomIndex += 1) {
      const room = rooms[roomIndex];
      addCycle(room, cycle);
      surfaces[roomIndex].simulationStep();

      const boostDrops = room.state.drops.filter((drop) => drop.source === "boost");
      const deathDrops = room.state.drops.filter((drop) => drop.source === "death");
      assert.ok(boostDrops.length <= room.state.config.maximumBoostDropsInWorld);
      assert.ok(deathDrops.length <= room.state.config.maximumDeathDropsInWorld);
      assert.equal(
        boostDrops.reduce((sum, drop) => sum + getDropStoredMass(drop), 0),
        expectedBoostMass,
      );
      assert.equal(
        deathDrops.reduce((sum, drop) => sum + getDropStoredMass(drop), 0),
        expectedDeathMass,
      );
      assert.ok(boostDrops.every((drop) => drop.mass <= room.state.config.shedDropMass));
      assert.ok(deathDrops.every((drop) => drop.mass <= room.state.config.deathDropTargetMass));
      assert.ok(room.state.drops.some((drop) => drop.id === "neutral-proof"));
      assert.ok(room.state.drops.some((drop) => drop.id === "relic-proof"));

      const encoded = JSON.stringify(packSnapshotForWire(surfaces[roomIndex].snapshot()));
      assert.equal(encoded.includes("bankedMass"), false, "private banks never enter snapshot deltas");
      maximumPackedSnapshotBytes = Math.max(maximumPackedSnapshotBytes, Buffer.byteLength(encoded));
      packed.push(encoded);
    }

    assert.deepEqual(first.state.drops, replay.state.drops);
    assert.equal(packed[0], packed[1]);
  }

  assert.ok(
    maximumPackedSnapshotBytes < 64 * 1024,
    `largest packed snapshot was ${maximumPackedSnapshotBytes} bytes`,
  );

  const firstSocket = new CaptureSocket();
  const joined = first.join(firstSocket as unknown as WebSocket, {
    type: "join",
    roomId: "transient-cap-proof",
    name: "Cache Captain",
  });
  assert.ok(joined.session);
  const initialWorld = firstSocket.latest("world") as WorldMessage;
  assert.equal(JSON.stringify(initialWorld).includes("bankedMass"), false);
  assert.ok(Buffer.byteLength(JSON.stringify(initialWorld)) < 64 * 1024);

  first.disconnect(joined.session, firstSocket as unknown as WebSocket);
  const reconnectSocket = new CaptureSocket();
  const reconnected = first.join(reconnectSocket as unknown as WebSocket, {
    type: "join",
    roomId: "transient-cap-proof",
    name: "Cache Captain",
    reconnectToken: joined.session.token,
  });
  assert.equal(reconnected.session?.playerId, joined.session.playerId);
  const reconnectWorld = reconnectSocket.latest("world") as WorldMessage;
  assert.deepEqual(reconnectWorld.drops, initialWorld.drops);
  assert.ok(Buffer.byteLength(JSON.stringify(reconnectWorld)) < 64 * 1024);
});

test("mixed-owner Echo banks stay visible with an explicit non-player wire identity", () => {
  const room = new ArenaRoom("mixed-origin-wire-proof", options);
  const surface = room as unknown as RoomTestSurface;
  room.state.config.maximumBoostDropsInWorld = 1;
  spawnDrop(room.state, {
    position: { x: 900, y: 900 },
    mass: 2,
    source: "boost",
    originPlayerId: "alpha",
    blockedPlayerId: "alpha",
    blockedUntilTick: 10,
  });
  spawnDrop(room.state, {
    position: { x: 901, y: 900 },
    mass: 2,
    source: "boost",
    originPlayerId: "bravo",
    blockedPlayerId: "bravo",
    blockedUntilTick: 8,
  });
  surface.simulationStep();

  const internalCache = room.state.drops.find((drop) => drop.source === "boost");
  assert.equal(internalCache?.originPlayerId, undefined, "mixed mass has no false owner internally");
  assert.equal(internalCache && getDropStoredMass(internalCache), 4);

  const socket = new CaptureSocket();
  const joined = room.join(socket as unknown as WebSocket, {
    type: "join",
    roomId: "mixed-origin-wire-proof",
    name: "Wire Captain",
  });
  assert.ok(joined.session);
  const world = socket.latest("world") as WorldMessage;
  const publicCache = world.drops.find((drop) => drop.source === "boost");
  assert.equal(publicCache?.originPlayerId, MIXED_ECHO_ORIGIN_ID);
  assert.equal(publicCache?.mixedOrigin, true);
  assert.equal(JSON.stringify(world).includes("bankedMass"), false);
});
