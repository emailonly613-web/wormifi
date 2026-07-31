import assert from "node:assert/strict";
import test from "node:test";
import type WebSocket from "ws";

import type {
  ServerMessage,
  WelcomeMessage,
} from "../../src/protocol";
import {
  ArenaRoom,
  type AuthoritativeLifeResult,
} from "../../src/room";

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

  latest<T extends ServerMessage["type"]>(type: T): Extract<ServerMessage, { type: T }> {
    for (let index = this.messages.length - 1; index >= 0; index -= 1) {
      const message = this.messages[index];
      if (message?.type === type) return message as Extract<ServerMessage, { type: T }>;
    }
    throw new Error(`expected a ${type} message`);
  }
}

test("authenticated sockets emit one server-owned life result and reject cross-account reconnect", () => {
  const awards: AuthoritativeLifeResult[] = [];
  const room = new ArenaRoom("passport-authority", {
    targetPopulation: 0,
    targetDropCount: 0,
    fixedStepHz: 10,
    snapshotHz: 5,
    heatRing: false,
    now: () => 1_700_000_000_000,
    onAuthoritativeLifeEnded: (award) => awards.push(award),
  });
  const surface = room as unknown as RoomTestSurface;
  const captainSocket = new CaptureSocket();
  const witnessSocket = new CaptureSocket();

  try {
    const captainJoin = room.join(
      captainSocket as unknown as WebSocket,
      { type: "join", roomId: room.id, name: "Saved Captain" },
      { accountId: "00000000-0000-4000-8000-000000000001" },
    );
    const witnessJoin = room.join(
      witnessSocket as unknown as WebSocket,
      { type: "join", roomId: room.id, name: "Witness" },
    );
    assert.ok(captainJoin.session);
    assert.ok(witnessJoin.session);

    const welcome = captainSocket.latest("welcome") as WelcomeMessage;
    const witnessWelcome = witnessSocket.latest("welcome") as WelcomeMessage;
    const captain = room.state.players[welcome.playerId];
    const witness = room.state.players[witnessWelcome.playerId];
    assert.ok(captain);
    assert.ok(witness);

    room.state.config.baseSpeed = 0;
    room.state.config.boostSpeed = 0;
    captain.position = { x: 2_100, y: 0 };
    captain.previousPosition = { ...captain.position };
    captain.mass = 80;
    captain.stats.peakMass = 94;
    captain.stats.kills = 2;
    captain.stats.collectedMass = 20;
    captain.stats.survivalTicks = 120;
    captain.shieldTicksRemaining = 0;
    captain.body = [
      { x: 2_086, y: 0 },
      { x: 2_080, y: 12 },
    ];
    captain.previousBody = captain.body.map((point) => ({ ...point }));
    witness.position = { x: 0, y: 0 };
    witness.previousPosition = { ...witness.position };
    witness.shieldTicksRemaining = 0;

    surface.simulationStep();
    surface.simulationStep();
    assert.equal(awards.length, 1);
    assert.equal(awards[0].accountId, "00000000-0000-4000-8000-000000000001");
    assert.equal(awards[0].roomId, room.id);
    assert.equal(awards[0].peakMass, 94);
    assert.equal(awards[0].kills, 2);
    assert.equal(awards[0].rulesetVersion, "protocol-5");
    assert.match(awards[0].idempotencyKey, /^passport-life:passport-authority:/u);

    room.disconnect(captainJoin.session, captainSocket as unknown as WebSocket);
    const wrongAccount = room.join(
      new CaptureSocket() as unknown as WebSocket,
      {
        type: "join",
        roomId: room.id,
        name: "Wrong account",
        reconnectToken: welcome.reconnectToken,
      },
      { accountId: "00000000-0000-4000-8000-000000000002" },
    );
    assert.equal(wrongAccount.error?.code, "INVALID_RECONNECT_TOKEN");
  } finally {
    room.stop();
  }
});
