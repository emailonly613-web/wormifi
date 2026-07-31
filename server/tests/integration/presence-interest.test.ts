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

test("new clients receive full presence plus nearby bodies while old v5 clients retain full snapshots", () => {
  const room = new ArenaRoom("presence-proof", {
    targetPopulation: 2,
    targetDropCount: 0,
    heatRing: false,
    playerInterestRadius: 100,
  });
  const oldSocket = new CaptureSocket();
  const newSocket = new CaptureSocket();
  const oldJoin = room.join(oldSocket as unknown as WebSocket, {
    type: "join",
    roomId: room.id,
    name: "Cached Client",
  });
  const newJoin = room.join(newSocket as unknown as WebSocket, {
    type: "join",
    roomId: room.id,
    name: "Current Client",
    presenceV1: true,
  });
  assert.ok(oldJoin.session);
  assert.ok(newJoin.session);

  const oldPlayer = room.state.players[oldJoin.session.playerId];
  const newPlayer = room.state.players[newJoin.session.playerId];
  assert.ok(oldPlayer);
  assert.ok(newPlayer);
  oldPlayer.position = { x: -1_000, y: 0 };
  oldPlayer.body = [{ x: -1_020, y: 0 }];
  newPlayer.position = { x: 1_000, y: 0 };
  newPlayer.body = [{ x: 980, y: 0 }];

  oldSocket.messages = [];
  newSocket.messages = [];
  const surface = room as unknown as PresenceSurface;
  surface.broadcastPresence();
  surface.broadcastSnapshot();

  const oldMessages = decodedMessages(oldSocket);
  const newMessages = decodedMessages(newSocket);
  assert.equal(oldMessages.some((message) => message.type === "presence"), false);
  const oldSnapshot = oldMessages.find((message) => message.type === "snapshot");
  assert.equal(oldSnapshot?.type, "snapshot");
  if (oldSnapshot?.type === "snapshot") assert.equal(oldSnapshot.players.length, 2);

  const presence = newMessages.find((message) => message.type === "presence");
  assert.equal(presence?.type, "presence");
  if (presence?.type === "presence") assert.equal(presence.players.length, 2);
  const newSnapshot = newMessages.find((message) => message.type === "snapshot");
  assert.equal(newSnapshot?.type, "snapshot");
  if (newSnapshot?.type === "snapshot") {
    assert.deepEqual(newSnapshot.players.map((player) => player.id), [newJoin.session.playerId]);
  }
  room.stop();
});
