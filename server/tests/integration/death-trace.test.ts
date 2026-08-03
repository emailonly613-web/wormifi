import assert from "node:assert/strict";
import test from "node:test";
import type WebSocket from "ws";

import {
  getDropStoredMass,
  sampleDeathTracePositions,
} from "../../../src/game/core.ts";
import type {
  ServerMessage,
  SnapshotMessage,
  WelcomeMessage,
} from "../../src/protocol.ts";
import { ArenaRoom } from "../../src/room.ts";
import { LIVE_SPATIAL_PROFILE } from "../../../src/game/spatialFeel.ts";

// The defeated captain must start OUTSIDE the arena so the boundary ends the
// life and spills the hoard. Derived from the live profile so a board resize
// can never silently park them back inside.
const BEYOND_BOUNDARY_X = LIVE_SPATIAL_PROFILE.arenaRadius + 650;

interface RoomTestSurface {
  simulationStep(): void;
  broadcastSnapshot(): void;
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

test("two live clients receive the same mass-conserving body-shaped death hoard", () => {
  const room = new ArenaRoom("death-trace-authority", {
    targetPopulation: 0,
    targetDropCount: 0,
    fixedStepHz: 10,
    snapshotHz: 5,
    heatRing: false,
  });
  const surface = room as unknown as RoomTestSurface;
  const firstCapture = new CaptureSocket();
  const secondCapture = new CaptureSocket();

  try {
    const firstJoin = room.join(firstCapture as unknown as WebSocket, {
      type: "join",
      roomId: room.id,
      name: "Fallen Captain",
    });
    const secondJoin = room.join(secondCapture as unknown as WebSocket, {
      type: "join",
      roomId: room.id,
      name: "Witness Captain",
    });
    assert.ok(firstJoin.session);
    assert.ok(secondJoin.session);

    const firstWelcome = firstCapture.latest("welcome") as WelcomeMessage;
    const secondWelcome = secondCapture.latest("welcome") as WelcomeMessage;
    const defeated = room.state.players[firstWelcome.playerId];
    const witness = room.state.players[secondWelcome.playerId];
    assert.ok(defeated);
    assert.ok(witness);

    room.state.config.baseSpeed = 0;
    room.state.config.boostSpeed = 0;
    defeated.position = { x: BEYOND_BOUNDARY_X, y: 0 };
    defeated.previousPosition = { ...defeated.position };
    defeated.mass = 48;
    defeated.stats.peakMass = 48;
    defeated.shieldTicksRemaining = 0;
    defeated.body = [
      { x: BEYOND_BOUNDARY_X - 14, y: 0 },
      { x: BEYOND_BOUNDARY_X - 20, y: 12 },
      { x: BEYOND_BOUNDARY_X - 30, y: 20 },
    ];
    defeated.previousBody = defeated.body.map((point) => ({ ...point }));
    witness.position = { x: 0, y: 0 };
    witness.previousPosition = { ...witness.position };
    witness.shieldTicksRemaining = 0;

    surface.simulationStep();
    surface.broadcastSnapshot();

    const firstSnapshot = firstCapture.latest("snapshot") as SnapshotMessage;
    const secondSnapshot = secondCapture.latest("snapshot") as SnapshotMessage;
    const firstHoard = firstSnapshot.dropUpserts.filter((drop) =>
      drop.source === "death" && drop.originPlayerId === defeated.id
    );
    const secondHoard = secondSnapshot.dropUpserts.filter((drop) =>
      drop.source === "death" && drop.originPlayerId === defeated.id
    );
    const internalHoard = room.state.drops.filter((drop) =>
      drop.source === "death" && drop.originPlayerId === defeated.id
    );
    const expectedTrace = sampleDeathTracePositions(defeated, firstHoard.length);

    assert.equal(defeated.alive, false);
    assert.deepEqual(secondHoard, firstHoard, "both clients receive the identical hoard delta");
    assert.deepEqual(firstHoard.map((drop) => drop.position), expectedTrace);
    assert.deepEqual(firstHoard[0]?.position, defeated.position);
    assert.deepEqual(firstHoard.at(-1)?.position, defeated.body.at(-1));
    assert.ok(
      Math.abs(
        internalHoard.reduce((sum, drop) => sum + getDropStoredMass(drop), 0) - 48,
      ) < 1e-9,
      "the visible trace plus any private bank retains the exact defeated mass",
    );
    assert.ok(firstSnapshot.events.some((event) =>
      event.type === "playerDied" && event.playerId === defeated.id
    ));
  } finally {
    room.stop();
  }
});
