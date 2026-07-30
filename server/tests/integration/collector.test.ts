import assert from "node:assert/strict";
import { test } from "node:test";
import type WebSocket from "ws";

import { getPlayerRadius, spawnDrop } from "../../../src/game/core.ts";
import type { ServerMessage, SnapshotMessage, WelcomeMessage, WorldMessage } from "../../src/protocol.ts";
import { PROTOCOL_VERSION } from "../../src/protocol.ts";
import {
  ArenaRoom,
  COLLECTOR_BEACON_RESPAWN_SECONDS,
} from "../../src/room.ts";

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

function collectorBeacons(room: ArenaRoom) {
  return room.state.drops.filter((drop) => drop.specialist === "collector");
}

test("rooms seed exactly one deterministic, zero-mass Collector beacon", () => {
  const options = {
    targetPopulation: 0,
    targetDropCount: 0,
    fixedStepHz: 10,
    snapshotHz: 5,
  };
  const first = new ArenaRoom("collector-determinism", options);
  const second = new ArenaRoom("collector-determinism", options);
  try {
    const firstBeacon = collectorBeacons(first);
    const secondBeacon = collectorBeacons(second);
    assert.equal(firstBeacon.length, 1);
    assert.equal(secondBeacon.length, 1);
    assert.deepEqual(firstBeacon[0], secondBeacon[0]);
    assert.equal(firstBeacon[0]?.id, "collector-beacon-1");
    assert.equal(firstBeacon[0]?.mass, 0);
    assert.equal(firstBeacon[0]?.source, "arena");
    assert.equal(firstBeacon[0]?.originPlayerId, undefined);
    assert.equal(firstBeacon[0]?.collectorReachPolicy, "none");
    assert.equal(firstBeacon[0]?.specialistDurationTicks, 120);
  } finally {
    first.stop();
    second.stop();
  }
});

test("wire state exposes Collector activation while core reach, conservation, expiry, and respawn stay exact", () => {
  const fixedStepHz = 10;
  const room = new ArenaRoom("collector-authority", {
    targetPopulation: 0,
    targetDropCount: 0,
    fixedStepHz,
    snapshotHz: 5,
  });
  const surface = room as unknown as RoomTestSurface;
  const capture = new CaptureSocket();
  const socket = capture as unknown as WebSocket;

  try {
    const join = room.join(socket, {
      type: "join",
      roomId: room.id,
      name: "Collector probe",
    });
    assert.ok(join.session);

    const welcome = capture.latest("welcome") as WelcomeMessage;
    const world = capture.latest("world") as WorldMessage;
    assert.equal(world.protocolVersion, PROTOCOL_VERSION);
    const initialBeacons = world.drops.filter((drop) => drop.specialist === "collector");
    assert.equal(initialBeacons.length, 1);
    const initialBeacon = initialBeacons[0];
    assert.ok(initialBeacon);
    assert.deepEqual(initialBeacon, {
      id: "collector-beacon-1",
      position: initialBeacon.position,
      mass: 0,
      radius: 9,
      source: "arena",
      specialist: "collector",
      specialistDurationTicks: 120,
    });

    const player = room.state.players[welcome.playerId];
    assert.ok(player);
    // Freeze the test actor without adding a second collection implementation.
    // simulationStep still delegates every reach decision to shared stepGame.
    room.state.config.baseSpeed = 0;
    room.state.config.boostSpeed = 0;
    player.position = { ...initialBeacon.position };
    player.previousPosition = { ...initialBeacon.position };

    const massBeforeBeacon = player.mass;
    surface.simulationStep();
    assert.equal(room.state.tick, 1);
    assert.equal(player.mass, massBeforeBeacon, "the zero-mass beacon cannot mint growth");
    assert.equal(collectorBeacons(room).length, 0, "no second beacon exists while Collector is active");
    assert.deepEqual(player.specialist, {
      kind: "collector",
      activatedAtTick: 1,
      expiresAtTick: 121,
      durationTicks: 120,
    });

    surface.broadcastSnapshot();
    const activeSnapshot = capture.latest("snapshot") as SnapshotMessage;
    const activePlayer = activeSnapshot.players.find((candidate) => candidate.id === player.id);
    assert.deepEqual(activePlayer?.specialist, player.specialist);
    assert.ok(activeSnapshot.removedDropIds.includes(initialBeacon.id));
    assert.ok(activeSnapshot.events.some((event) =>
      event.type === "specialistActivated" && event.playerId === player.id
    ));

    const baseReach = getPlayerRadius(player, room.state.config) + 4;
    const collectorOnlyDistance = baseReach * 1.2;
    spawnDrop(room.state, {
      id: "rival-remains",
      position: { x: player.position.x + collectorOnlyDistance, y: player.position.y },
      mass: 8,
      radius: 4,
      source: "death",
      originPlayerId: "defeated-rival",
    });
    spawnDrop(room.state, {
      id: "neutral-spark",
      position: { x: player.position.x - collectorOnlyDistance, y: player.position.y },
      mass: 3,
      radius: 4,
      source: "arena",
    });
    const conservedBefore = player.mass + room.state.drops.reduce((sum, drop) => sum + drop.mass, 0);

    surface.simulationStep();
    const remainingIds = room.state.drops.map((drop) => drop.id);
    assert.ok(remainingIds.includes("rival-remains"), "Collector must not vacuum rival remains");
    assert.ok(!remainingIds.includes("neutral-spark"), "shared core grants extended neutral reach");
    const conservedAfter = player.mass + room.state.drops.reduce((sum, drop) => sum + drop.mass, 0);
    assert.equal(conservedAfter, conservedBefore, "beacon and reach preserve authoritative mass");

    surface.broadcastSnapshot();
    const echoSnapshot = capture.latest("snapshot") as SnapshotMessage;
    const rivalEcho = echoSnapshot.dropUpserts.find((drop) => drop.id === "rival-remains");
    assert.equal(rivalEcho?.source, "death");
    assert.equal(rivalEcho?.originPlayerId, "defeated-rival");
    assert.equal(rivalEcho?.specialist, undefined);

    while (room.state.tick < 120) surface.simulationStep();
    assert.equal(player.specialist?.kind, "collector");
    assert.equal(collectorBeacons(room).length, 0);

    surface.simulationStep();
    assert.equal(room.state.tick, 121);
    assert.equal(player.specialist, undefined);
    surface.broadcastSnapshot();
    const expiredSnapshot = capture.latest("snapshot") as SnapshotMessage;
    assert.equal(
      expiredSnapshot.players.find((candidate) => candidate.id === player.id)?.specialist,
      undefined,
    );
    assert.ok(expiredSnapshot.events.some((event) =>
      event.type === "specialistExpired" && event.playerId === player.id
    ));

    const expectedRespawnTick =
      1 + 120 + COLLECTOR_BEACON_RESPAWN_SECONDS * fixedStepHz;
    while (room.state.tick < expectedRespawnTick - 1) surface.simulationStep();
    assert.equal(collectorBeacons(room).length, 0);
    surface.simulationStep();
    assert.equal(room.state.tick, expectedRespawnTick);
    const replacement = collectorBeacons(room);
    assert.equal(replacement.length, 1);
    assert.equal(replacement[0]?.id, "collector-beacon-2");

    surface.broadcastSnapshot();
    const respawnSnapshot = capture.latest("snapshot") as SnapshotMessage;
    assert.ok(respawnSnapshot.dropUpserts.some((drop) =>
      drop.id === "collector-beacon-2" &&
      drop.mass === 0 &&
      drop.specialist === "collector" &&
      drop.specialistDurationTicks === 120
    ));
  } finally {
    room.stop();
  }
});
