import assert from "node:assert/strict";
import { test } from "node:test";
import type WebSocket from "ws";

import { decodeSnapshotFromWire, type ServerMessage } from "../../src/protocol.ts";
import { ArenaRoom } from "../../src/room.ts";

class CaptureSocket {
  readonly OPEN = 1;
  readyState = 1;
  bufferedAmount = 0;
  messages: string[] = [];

  send(message: string): void {
    this.messages.push(message);
  }

  close(): void {
    this.readyState = 3;
  }
}

interface PresenceSurface {
  broadcastPresence(): void;
  broadcastSnapshot(): void;
}

function decodedMessages(socket: CaptureSocket): ServerMessage[] {
  return socket.messages.flatMap((encoded) => {
    const decoded = decodeSnapshotFromWire(JSON.parse(encoded));
    return decoded === null ? [] : [decoded as ServerMessage];
  });
}

test("tuple clients, cached presence clients, and old v5 clients negotiate compatible snapshots", () => {
  const room = new ArenaRoom("presence-proof", {
    targetPopulation: 3,
    targetDropCount: 0,
    heatRing: false,
    playerInterestRadius: 100,
  });
  const oldSocket = new CaptureSocket();
  const cachedPresenceSocket = new CaptureSocket();
  const newSocket = new CaptureSocket();
  const oldJoin = room.join(oldSocket as unknown as WebSocket, {
    type: "join",
    roomId: room.id,
    name: "Cached Client",
  });
  const cachedPresenceJoin = room.join(cachedPresenceSocket as unknown as WebSocket, {
    type: "join",
    roomId: room.id,
    name: "Cached Presence Client",
    presenceV1: true,
  });
  const newJoin = room.join(newSocket as unknown as WebSocket, {
    type: "join",
    roomId: room.id,
    name: "Current Client",
    presenceV1: true,
    snapshotTupleV1: true,
  });
  assert.ok(oldJoin.session);
  assert.ok(cachedPresenceJoin.session);
  assert.ok(newJoin.session);

  const oldPlayer = room.state.players[oldJoin.session.playerId];
  const cachedPresencePlayer = room.state.players[cachedPresenceJoin.session.playerId];
  const newPlayer = room.state.players[newJoin.session.playerId];
  assert.ok(oldPlayer);
  assert.ok(cachedPresencePlayer);
  assert.ok(newPlayer);
  oldPlayer.position = { x: -1_000, y: 0 };
  oldPlayer.body = [{ x: -1_020, y: 0 }];
  cachedPresencePlayer.position = { x: 0, y: 0 };
  cachedPresencePlayer.body = [{ x: -20, y: 0 }];
  newPlayer.position = { x: 1_000, y: 0 };
  newPlayer.body = [{ x: 980, y: 0 }];

  oldSocket.messages = [];
  cachedPresenceSocket.messages = [];
  newSocket.messages = [];
  const surface = room as unknown as PresenceSurface;
  surface.broadcastPresence();
  surface.broadcastSnapshot();

  const oldMessages = decodedMessages(oldSocket);
  const cachedPresenceMessages = decodedMessages(cachedPresenceSocket);
  const newMessages = decodedMessages(newSocket);
  assert.equal(oldMessages.some((message) => message.type === "presence"), false);
  const oldSnapshot = oldMessages.find((message) => message.type === "snapshot");
  assert.equal(oldSnapshot?.type, "snapshot");
  if (oldSnapshot?.type === "snapshot") assert.equal(oldSnapshot.players.length, 3);

  const cachedPresence = cachedPresenceMessages.find((message) => message.type === "presence");
  assert.equal(cachedPresence?.type, "presence");
  const cachedPresenceSnapshot = cachedPresenceMessages.find((message) => message.type === "snapshot");
  assert.equal(cachedPresenceSnapshot?.type, "snapshot");
  if (cachedPresenceSnapshot?.type === "snapshot") {
    assert.deepEqual(
      cachedPresenceSnapshot.players.map((player) => player.id),
      [cachedPresenceJoin.session.playerId],
    );
  }

  const presence = newMessages.find((message) => message.type === "presence");
  assert.equal(presence?.type, "presence");
  if (presence?.type === "presence") assert.equal(presence.players.length, 3);
  const newSnapshot = newMessages.find((message) => message.type === "snapshot");
  assert.equal(newSnapshot?.type, "snapshot");
  if (newSnapshot?.type === "snapshot") {
    assert.deepEqual(newSnapshot.players.map((player) => player.id), [newJoin.session.playerId]);
  }
  const cachedPresenceWire = cachedPresenceSocket.messages
    .map((encoded) => JSON.parse(encoded) as { type?: string; players?: unknown[] })
    .find((message) => message.type === "snapshot");
  const tupleWire = newSocket.messages
    .map((encoded) => JSON.parse(encoded) as { type?: string; players?: unknown[] })
    .find((message) => message.type === "snapshot");
  assert.ok(cachedPresenceWire?.players?.[0]);
  assert.equal(Array.isArray(cachedPresenceWire.players[0]), false);
  assert.ok(tupleWire?.players?.[0]);
  assert.equal(Array.isArray(tupleWire.players[0]), true);
  room.stop();
});
