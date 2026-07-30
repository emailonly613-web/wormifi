import assert from "node:assert/strict";
import { test } from "node:test";
import type WebSocket from "ws";

import type { ServerMessage } from "../../src/protocol.ts";
import { ArenaRoom } from "../../src/room.ts";

interface RoomTestSurface {
  simulationStep(): void;
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
}

test("room seats fail closed, reserve reconnect grace, and reopen after expiry", () => {
  let now = 0;
  const room = new ArenaRoom("seat-contract", {
    targetPopulation: 0,
    targetDropCount: 0,
    heatRing: false,
    maxHumanPlayers: 2,
    reconnectGraceMs: 100,
    now: () => now,
  });
  const firstSocket = new CaptureSocket();
  const secondSocket = new CaptureSocket();
  const first = room.join(firstSocket as unknown as WebSocket, {
    type: "join",
    roomId: room.id,
    name: "Anne",
  });
  const second = room.join(secondSocket as unknown as WebSocket, {
    type: "join",
    roomId: room.id,
    name: "Mary",
  });
  assert.ok(first.session);
  assert.ok(second.session);

  const full = room.join(new CaptureSocket() as unknown as WebSocket, {
    type: "join",
    roomId: room.id,
    name: "Grace",
  });
  assert.equal(full.session, undefined);
  assert.equal(full.error?.code, "ROOM_FULL");
  assert.match(full.error?.message ?? "", /2 human captains/u);

  room.disconnect(first.session, firstSocket as unknown as WebSocket);
  const reserved = room.join(new CaptureSocket() as unknown as WebSocket, {
    type: "join",
    roomId: room.id,
    name: "Grace",
  });
  assert.equal(reserved.error?.code, "ROOM_FULL");

  const reconnectSocket = new CaptureSocket();
  const reconnected = room.join(reconnectSocket as unknown as WebSocket, {
    type: "join",
    roomId: room.id,
    name: "Anne",
    reconnectToken: first.session.token,
  });
  assert.ok(reconnected.session);
  assert.equal(reconnected.session.playerId, first.session.playerId);

  room.disconnect(reconnected.session, reconnectSocket as unknown as WebSocket);
  now = 101;
  (room as unknown as RoomTestSurface).simulationStep();

  const reopened = room.join(new CaptureSocket() as unknown as WebSocket, {
    type: "join",
    roomId: room.id,
    name: "Grace",
  });
  assert.ok(reopened.session);
  assert.notEqual(reopened.session.playerId, first.session.playerId);
  room.stop();
});
