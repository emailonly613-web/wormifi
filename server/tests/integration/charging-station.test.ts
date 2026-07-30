import assert from "node:assert/strict";
import { test } from "node:test";
import type WebSocket from "ws";

import {
  getBodyRadius,
} from "../../../src/game/core.ts";
import { getChargingDockPosition } from "../../../src/game/chargingStations.ts";
import type {
  ChargingStationConfig,
  GameBoardConfig,
  PlayerState,
} from "../../../src/game/types.ts";
import {
  decodeSnapshotFromWire,
  type ServerMessage,
  type SnapshotMessage,
  type WelcomeMessage,
  type WorldMessage,
} from "../../src/protocol.ts";
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
    const parsed = JSON.parse(encoded) as unknown;
    const decoded = decodeSnapshotFromWire(parsed);
    this.messages.push((decoded ?? parsed) as ServerMessage);
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

const STATION: ChargingStationConfig = {
  id: "authority-capstan",
  name: "Authority Capstan",
  position: { x: 0, y: 0 },
  coreRadius: 30,
  wrapRadius: 110,
  wrapTolerance: 20,
  dockAngleRadians: 0,
  dockRadius: 4,
  requiredWrapRadians: 4,
  minimumWrappedSegments: 14,
  chargeDurationSeconds: 2 / 30,
  massReward: 10,
  interruptionGraceSeconds: 1 / 30,
  interruptionDecayTicksPerTick: 2,
  completionCooldownSeconds: 20,
  resetCooldownSeconds: 4,
};

const BOARD: GameBoardConfig = {
  id: "authority-relay",
  name: "Authority Relay",
  chargingStations: [STATION],
};

function coilPlayer(player: PlayerState, spacing: number): void {
  const segmentCount = 18;
  const anglePerSegment = 2 * Math.asin(spacing / (2 * STATION.wrapRadius));
  player.position = getChargingDockPosition(STATION);
  player.previousPosition = { ...player.position };
  player.body = Array.from({ length: segmentCount }, (_, index) => {
    const angle = anglePerSegment * (index + 1);
    return {
      x: Math.cos(angle) * STATION.wrapRadius,
      y: Math.sin(angle) * STATION.wrapRadius,
    };
  });
  player.previousBody = player.body.map((segment) => ({ ...segment }));
  player.direction = { x: 0, y: 1 };
  player.lastInput = {
    sequence: 0,
    direction: { ...player.direction },
    boost: false,
  };
}

test("two clients receive the same server-owned board, charge, reward, and cooldown", () => {
  const room = new ArenaRoom("charging-authority", {
    targetPopulation: 0,
    targetDropCount: 0,
    fixedStepHz: 30,
    snapshotHz: 15,
    heatRing: false,
    board: BOARD,
  });
  const surface = room as unknown as RoomTestSurface;
  const firstCapture = new CaptureSocket();
  const secondCapture = new CaptureSocket();

  try {
    const firstJoin = room.join(firstCapture as unknown as WebSocket, {
      type: "join",
      roomId: room.id,
      name: "Anne",
    });
    const secondJoin = room.join(secondCapture as unknown as WebSocket, {
      type: "join",
      roomId: room.id,
      name: "Mary",
    });
    assert.ok(firstJoin.session);
    assert.ok(secondJoin.session);

    const firstWorld = firstCapture.latest("world") as WorldMessage;
    const secondWorld = secondCapture.latest("world") as WorldMessage;
    assert.deepEqual(firstWorld.board, secondWorld.board);
    assert.equal(firstWorld.board?.id, BOARD.id);
    assert.deepEqual(firstWorld.board?.chargingStations, [STATION]);

    const firstWelcome = firstCapture.latest("welcome") as WelcomeMessage;
    const captain = room.state.players[firstWelcome.playerId];
    assert.ok(captain);
    room.state.config.baseSpeed = 0;
    room.state.config.boostSpeed = 0;
    captain.mass = 300;
    captain.stats.peakMass = 300;
    const spacing = getBodyRadius(captain, room.state.config) * 2 *
      room.state.config.segmentSpacingFactor;
    coilPlayer(captain, spacing);

    surface.simulationStep();
    surface.simulationStep();
    surface.broadcastSnapshot();

    const firstSnapshot = firstCapture.latest("snapshot") as SnapshotMessage;
    const secondSnapshot = secondCapture.latest("snapshot") as SnapshotMessage;
    assert.deepEqual(firstSnapshot.chargingStations, secondSnapshot.chargingStations);
    assert.deepEqual(firstSnapshot.events, secondSnapshot.events);
    assert.ok(firstSnapshot.events.some((event) =>
      event.type === "chargingStarted" && event.playerId === captain.id
    ));
    assert.ok(firstSnapshot.events.some((event) =>
      event.type === "chargingCompleted" &&
      event.playerId === captain.id &&
      event.massAwarded === STATION.massReward
    ));
    assert.deepEqual(firstSnapshot.chargingStations, [{
      stationId: STATION.id,
      phase: "cooldown",
      playerId: captain.id,
      windingDirection: 1,
      progressTicks: 2,
      requiredTicks: 2,
      graceTicksRemaining: 0,
      cooldownTicksRemaining: 600,
      massAwarded: 10,
    }]);
    assert.equal(
      firstSnapshot.players.find((player) => player.id === captain.id)?.mass,
      310,
    );
    assert.equal(
      secondSnapshot.players.find((player) => player.id === captain.id)?.mass,
      310,
    );
  } finally {
    room.stop();
  }
});

test("an ordinary room publishes and authoritatively pays all Open Seas growth pads", () => {
  const room = new ArenaRoom("normal-authority", {
    targetPopulation: 0,
    targetDropCount: 0,
    heatRing: false,
  });
  const capture = new CaptureSocket();
  const surface = room as unknown as RoomTestSurface;
  try {
    room.join(capture as unknown as WebSocket, {
      type: "join",
      roomId: room.id,
      name: "Ordinary",
    });
    const world = capture.latest("world") as WorldMessage;
    const snapshot = capture.latest("snapshot") as SnapshotMessage;
    assert.equal(world.board?.id, "open-seas");
    assert.deepEqual(
      world.board?.chargingStations.map((station) => [station.id, station.kind, station.massReward]),
      [
        ["coin-cay", "harbor", 9],
        ["coral-key", "harbor", 20],
        ["kraken-atoll", "harbor", 42],
      ],
    );
    assert.equal(snapshot.chargingStations?.length, 3);
    assert.ok(snapshot.chargingStations?.every((station) => station.phase === "ready"));

    const welcome = capture.latest("welcome") as WelcomeMessage;
    const captain = room.state.players[welcome.playerId];
    const coinCay = room.state.board.chargingStations[0];
    assert.ok(captain);
    assert.ok(coinCay);
    room.state.config.baseSpeed = 0;
    room.state.config.boostSpeed = 0;
    const startingMass = captain.mass;
    captain.position = { ...coinCay.position };
    captain.previousPosition = { ...captain.position };
    const requiredTicks = room.state.chargingStations[coinCay.id].requiredTicks;
    surface.simulationStep();
    assert.ok(captain.mass > startingMass, "the first authoritative pad tick grows immediately");
    for (let tick = 1; tick < requiredTicks; tick += 1) {
      surface.simulationStep();
    }
    surface.broadcastSnapshot();

    const completed = capture.latest("snapshot") as SnapshotMessage;
    assert.ok(completed.events.some((event) =>
      event.type === "chargingCompleted" &&
      event.stationId === coinCay.id &&
      event.playerId === captain.id &&
      event.massAwarded === coinCay.massReward
    ));
    assert.equal(room.state.chargingStations[coinCay.id].phase, "cooldown");
    assert.ok(Math.abs(captain.mass - (startingMass + coinCay.massReward)) <= 1e-8);
  } finally {
    room.stop();
  }
});
