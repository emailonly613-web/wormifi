import assert from "node:assert/strict";
import { test } from "node:test";
import type WebSocket from "ws";

import type { ServerMessage, SnapshotMessage, WorldMessage } from "../../src/protocol.ts";
import { PROTOCOL_VERSION } from "../../src/protocol.ts";
import {
  PIRATE_RELIC_RESPAWN_SECONDS,
} from "../../src/relic-director.ts";
import { ArenaRoom } from "../../src/room.ts";

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

const roomOptions = {
  targetPopulation: 0,
  targetDropCount: 0,
  fixedStepHz: 10,
  snapshotHz: 5,
  heatRing: false as const,
};

test("rooms seed the complete Relic set deterministically without changing the v5 Collector shape", () => {
  const first = new ArenaRoom("relic-determinism", roomOptions);
  const second = new ArenaRoom("relic-determinism", roomOptions);
  try {
    const firstCollector = first.state.drops.filter((drop) => drop.specialist === "collector");
    const firstNamed = first.state.drops.filter((drop) => drop.relicKind);
    const secondNamed = second.state.drops.filter((drop) => drop.relicKind);
    assert.equal(firstCollector.length, 1, "legacy Collector remains exactly one beacon");
    assert.deepEqual(firstNamed, secondNamed);
    assert.deepEqual(firstNamed.map((drop) => ({
      id: drop.id,
      relicKind: drop.relicKind,
      durationTicks: drop.relicDurationTicks,
      specialist: drop.specialist,
      mass: drop.mass,
    })), [
      {
        id: "emerald-spyglass-relic-1",
        relicKind: "emerald-spyglass",
        durationTicks: 100,
        specialist: undefined,
        mass: 0,
      },
      {
        id: "pepper-cutlass-relic-1",
        relicKind: "pepper-cutlass",
        durationTicks: 80,
        specialist: undefined,
        mass: 0,
      },
    ]);

    const capture = new CaptureSocket();
    const join = first.join(capture as unknown as WebSocket, {
      type: "join",
      roomId: first.id,
      name: "Wire probe",
    });
    assert.ok(join.session);
    const world = capture.latest("world") as WorldMessage;
    assert.equal(world.protocolVersion, PROTOCOL_VERSION);
    assert.equal(PROTOCOL_VERSION, 5, "optional Relic fields do not force a protocol bump");
    assert.equal(world.drops.filter((drop) => drop.specialist === "collector").length, 1);
    assert.deepEqual(
      world.drops.filter((drop) => drop.relicKind).map((drop) => ({
        relicKind: drop.relicKind,
        relicDurationTicks: drop.relicDurationTicks,
        specialist: drop.specialist,
        specialistDurationTicks: drop.specialistDurationTicks,
      })),
      [
        {
          relicKind: "emerald-spyglass",
          relicDurationTicks: 100,
          specialist: undefined,
          specialistDurationTicks: undefined,
        },
        {
          relicKind: "pepper-cutlass",
          relicDurationTicks: 80,
          specialist: undefined,
          specialistDurationTicks: undefined,
        },
      ],
    );
  } finally {
    first.stop();
    second.stop();
  }
});

test("server authority restores, replaces, expires, and respawns one Relic slot", () => {
  const room = new ArenaRoom("relic-authority", roomOptions);
  const surface = room as unknown as RoomTestSurface;
  const firstCapture = new CaptureSocket();
  const firstSocket = firstCapture as unknown as WebSocket;

  try {
    const join = room.join(firstSocket, {
      type: "join",
      roomId: room.id,
      name: "Relic probe",
    });
    const session = join.session;
    assert.ok(session);
    const welcome = firstCapture.latest("welcome");
    const player = room.state.players[welcome.playerId];
    assert.ok(player);
    room.state.config.baseSpeed = 0;
    room.state.config.boostSpeed = 0;

    const spyglass = room.state.drops.find((drop) =>
      drop.relicKind === "emerald-spyglass"
    );
    assert.ok(spyglass);
    player.position = { ...spyglass.position };
    player.previousPosition = { ...spyglass.position };
    surface.simulationStep();
    assert.equal(room.state.tick, 1);
    assert.deepEqual(player.specialist, {
      kind: "collector",
      relicKind: "emerald-spyglass",
      activatedAtTick: 1,
      expiresAtTick: 101,
      durationTicks: 100,
    });
    surface.broadcastSnapshot();
    const activeSnapshot = firstCapture.latest("snapshot") as SnapshotMessage;
    assert.deepEqual(
      activeSnapshot.players.find((candidate) => candidate.id === player.id)?.specialist,
      player.specialist,
    );
    assert.ok(activeSnapshot.events.some((event) =>
      event.type === "specialistActivated" &&
      event.relicKind === "emerald-spyglass"
    ));

    room.disconnect(session, firstSocket);
    const reconnectCapture = new CaptureSocket();
    const reconnect = room.join(reconnectCapture as unknown as WebSocket, {
      type: "join",
      roomId: room.id,
      name: "Relic probe",
      reconnectToken: session.token,
    });
    assert.equal(reconnect.session?.playerId, player.id);
    const restored = reconnectCapture.latest("snapshot") as SnapshotMessage;
    assert.deepEqual(
      restored.players.find((candidate) => candidate.id === player.id)?.specialist,
      player.specialist,
      "reconnect restores the same authoritative active slot",
    );

    const cutlass = room.state.drops.find((drop) =>
      drop.relicKind === "pepper-cutlass"
    );
    assert.ok(cutlass);
    player.position = { ...cutlass.position };
    player.previousPosition = { ...cutlass.position };
    surface.simulationStep();
    assert.equal(room.state.tick, 2);
    assert.deepEqual(player.specialist, {
      kind: "collector",
      relicKind: "pepper-cutlass",
      activatedAtTick: 2,
      expiresAtTick: 82,
      durationTicks: 80,
    });
    surface.broadcastSnapshot();
    const replaced = reconnectCapture.latest("snapshot") as SnapshotMessage;
    assert.ok(replaced.events.some((event) =>
      event.type === "specialistExpired" &&
      event.relicKind === "emerald-spyglass"
    ));
    assert.ok(replaced.events.some((event) =>
      event.type === "specialistActivated" &&
      event.relicKind === "pepper-cutlass"
    ));
    assert.equal(
      replaced.players.find((candidate) => candidate.id === player.id)?.specialist?.relicKind,
      "pepper-cutlass",
    );

    while (room.state.tick < 81) surface.simulationStep();
    assert.equal(player.specialist?.relicKind, "pepper-cutlass");
    surface.simulationStep();
    assert.equal(room.state.tick, 82);
    assert.equal(player.specialist, undefined);

    const respawnTick = 2 + 80 + PIRATE_RELIC_RESPAWN_SECONDS * 10;
    while (room.state.tick < respawnTick - 1) surface.simulationStep();
    assert.equal(
      room.state.drops.some((drop) => drop.relicKind === "pepper-cutlass"),
      false,
    );
    surface.simulationStep();
    assert.equal(room.state.tick, respawnTick);
    assert.ok(room.state.drops.some((drop) =>
      drop.id === "pepper-cutlass-relic-2" &&
      drop.relicKind === "pepper-cutlass" &&
      drop.relicDurationTicks === 80
    ));
  } finally {
    room.stop();
  }
});

test("two clients receive identical active Relic truth from one server tick", () => {
  const room = new ArenaRoom("relic-two-client", roomOptions);
  const surface = room as unknown as RoomTestSurface;
  const alphaCapture = new CaptureSocket();
  const betaCapture = new CaptureSocket();

  try {
    const alphaJoin = room.join(alphaCapture as unknown as WebSocket, {
      type: "join",
      roomId: room.id,
      name: "Alpha",
    });
    const betaJoin = room.join(betaCapture as unknown as WebSocket, {
      type: "join",
      roomId: room.id,
      name: "Beta",
    });
    assert.ok(alphaJoin.session);
    assert.ok(betaJoin.session);
    const alpha = room.state.players[alphaJoin.session.playerId];
    const spyglass = room.state.drops.find((drop) =>
      drop.relicKind === "emerald-spyglass"
    );
    assert.ok(alpha);
    assert.ok(spyglass);
    room.state.config.baseSpeed = 0;
    room.state.config.boostSpeed = 0;
    alpha.position = { ...spyglass.position };
    alpha.previousPosition = { ...spyglass.position };

    surface.simulationStep();
    surface.broadcastSnapshot();
    const alphaView = alphaCapture.latest("snapshot") as SnapshotMessage;
    const betaView = betaCapture.latest("snapshot") as SnapshotMessage;
    const activeFromAlpha = alphaView.players.find((player) =>
      player.id === alpha.id
    )?.specialist;
    const activeFromBeta = betaView.players.find((player) =>
      player.id === alpha.id
    )?.specialist;

    assert.deepEqual(activeFromAlpha, {
      kind: "collector",
      relicKind: "emerald-spyglass",
      activatedAtTick: 1,
      expiresAtTick: 101,
      durationTicks: 100,
    });
    assert.deepEqual(activeFromBeta, activeFromAlpha);
    assert.equal(alphaView.tick, betaView.tick);
    assert.deepEqual(alphaView.events, betaView.events);
    assert.equal(
      betaView.players.find((player) => player.id === betaJoin.session?.playerId)
        ?.specialist,
      undefined,
      "a Relic never leaks into a second player's slot",
    );
  } finally {
    room.stop();
  }
});
