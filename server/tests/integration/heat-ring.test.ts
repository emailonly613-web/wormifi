import assert from "node:assert/strict";
import { test } from "node:test";
import type WebSocket from "ws";

import { packSnapshotForWire } from "../../src/protocol.ts";
import {
  decodeSnapshotFromWire,
  type HeatRingEvent,
  type ServerMessage,
  type SnapshotMessage,
  type WelcomeMessage,
  type WorldMessage,
} from "../../src/protocol.ts";
import { ArenaRoom } from "../../src/room.ts";
import { DEFAULT_HEAT_RING_CONFIG } from "../../src/heat-ring.ts";

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
    const decoded = decodeSnapshotFromWire(JSON.parse(encoded));
    if (decoded === null) throw new Error("server emitted an invalid packed snapshot");
    this.messages.push(decoded as ServerMessage);
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

function joinFirstHuman(room: ArenaRoom, name = "First Mate") {
  const capture = new CaptureSocket();
  const socket = capture as unknown as WebSocket;
  const result = room.join(socket, { type: "join", roomId: room.id, name });
  assert.ok(result.session);
  return {
    capture,
    socket,
    session: result.session,
    welcome: capture.latest("welcome") as WelcomeMessage,
    world: capture.latest("world") as WorldMessage,
    initial: capture.latest("snapshot") as SnapshotMessage,
  };
}

function heatEvent<T extends HeatRingEvent["type"]>(
  snapshot: SnapshotMessage,
  type: T,
): Extract<HeatRingEvent, { type: T }> | undefined {
  return snapshot.events.find((event) => event.type === type) as
    Extract<HeatRingEvent, { type: T }> | undefined;
}

function distance(first: { x: number; y: number }, second: { x: number; y: number }) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

test("fresh-room Heat Rings resolve through ordinary collisions into conserved real jewels", () => {
  const measurements: Array<{
    hz: number;
    seed: number;
    resolutionTick: number;
    seconds: number;
    jewels: number;
    mass: number;
    wireBytes: number;
  }> = [];

  for (const hz of [20, 30, 60]) {
    for (let seed = 0; seed < 10; seed += 1) {
      const room = new ArenaRoom(`heat-${hz}-${seed}`, {
        targetPopulation: 12,
        targetDropCount: 720,
        fixedStepHz: hz,
        snapshotHz: Math.min(15, hz),
      });
      const surface = room as unknown as RoomTestSurface;
      try {
        const joined = joinFirstHuman(room);
        const descriptor = joined.world.heatRing;
        assert.ok(descriptor, "a safe fresh room must advertise its authoritative Heat Ring");
        assert.equal(descriptor.theme, "corsair");
        assert.equal(descriptor.botIds.length, 2);
        assert.ok(heatEvent(joined.initial, "heatRingStarted"));

        const human = room.state.players[joined.welcome.playerId];
        assert.ok(human);
        assert.ok(
          human.position.x * human.direction.x + human.position.y * human.direction.y <= 1e-8,
          "the unlocked default heading faces inward",
        );

        for (const botId of descriptor.botIds) {
          const bot = room.state.players[botId];
          assert.ok(bot);
          assert.equal(bot.kind, "bot");
          assert.match(bot.name, /Ruby Wake|Jade Jib/u);
          for (const point of [bot.position, ...bot.body]) {
            assert.ok(
              distance(point, human.position) >= descriptor.safeSpawnRadius,
              "the labeled AI solid begins outside the human safe envelope",
            );
          }
        }

        for (const player of Object.values(room.state.players)) {
          if (player.kind !== "bot" || descriptor.botIds.includes(player.id)) continue;
          for (const point of [player.position, ...player.body]) {
            assert.ok(
              distance(point, descriptor.center) >= 700,
              "ordinary AI starts completely outside the reserved contest zone",
            );
          }
        }
        assert.ok(
          room.state.drops.every((drop) =>
            distance(drop.position, descriptor.center) >=
              DEFAULT_HEAT_RING_CONFIG.lootClearRadius
          ),
          "the duel lane is clear of pre-existing ground loot",
        );

        while (
          room.state.tick < descriptor.deadlineTick &&
          descriptor.botIds.some((id) => room.state.players[id]?.alive)
        ) {
          surface.simulationStep();
          if (room.state.tick < descriptor.earliestResolveTick) {
            assert.ok(
              descriptor.botIds.every((id) => room.state.players[id]?.alive),
              "the payout cannot occur before its telegraphed contest window",
            );
          }
        }

        assert.ok(human.alive, "the default-path first human survives the encounter");
        assert.ok(descriptor.botIds.every((id) => room.state.players[id]?.alive === false));
        const snapshot = surface.snapshot();
        const resolved = heatEvent(snapshot, "heatRingResolved");
        assert.ok(resolved, "the server must verify the mutual collision before announcing a hoard");
        assert.ok(resolved.tick >= descriptor.earliestResolveTick);
        assert.ok(resolved.tick <= descriptor.deadlineTick);

        const deaths = snapshot.events.filter((event) =>
          event.type === "playerDied" && descriptor.botIds.includes(event.playerId)
        );
        assert.equal(deaths.length, 2);
        for (const death of deaths) {
          assert.equal(death.type, "playerDied");
          assert.equal(death.cause, "collision");
          assert.equal(
            death.killerId,
            descriptor.botIds.find((id) => id !== death.playerId),
          );
        }

        const released = resolved.dropIds.map((id) => room.state.drops.find((drop) => drop.id === id));
        assert.ok(released.every(Boolean));
        assert.ok(released.every((drop) =>
          drop?.source === "death" &&
          drop.originPlayerId !== undefined &&
          descriptor.botIds.includes(drop.originPlayerId)
        ));
        const releasedMass = released.reduce((sum, drop) => sum + (drop?.mass ?? 0), 0);
        assert.ok(Math.abs(releasedMass - resolved.totalMass) <= 1e-8);
        assert.ok(
          Math.abs(releasedMass - 96) <= 1e-8,
          `the two mass-48 rivals conserve 96 size (received ${releasedMass})`,
        );
        assert.equal(resolved.dropIds.length, 20, "drop count comes from the real death output");

        const wireBytes = Buffer.byteLength(JSON.stringify(packSnapshotForWire(snapshot)));
        assert.ok(wireBytes < 24 * 1024, `resolved snapshot is ${wireBytes} bytes`);
        measurements.push({
          hz,
          seed,
          resolutionTick: resolved.tick,
          seconds: resolved.tick / hz,
          jewels: resolved.dropIds.length,
          mass: resolved.totalMass,
          wireBytes,
        });
      } finally {
        room.stop();
      }
    }
  }

  const seconds = measurements.map((entry) => entry.seconds);
  const bytes = measurements.map((entry) => entry.wireBytes);
  console.log("HEAT_RING_MEASUREMENTS", JSON.stringify({
    runs: measurements.length,
    minimumSeconds: Math.min(...seconds),
    maximumSeconds: Math.max(...seconds),
    minimumWireBytes: Math.min(...bytes),
    maximumWireBytes: Math.max(...bytes),
    failures: 0,
  }));
});

test("a second genuine human cancels before the next simulation step", () => {
  for (const joinTick of [0, 30, 89]) {
    const room = new ArenaRoom(`second-human-${joinTick}`, {
      targetPopulation: 12,
      targetDropCount: 0,
      fixedStepHz: 30,
      snapshotHz: 15,
    });
    const surface = room as unknown as RoomTestSurface;
    try {
      const first = joinFirstHuman(room, "Alice");
      const descriptor = first.world.heatRing;
      assert.ok(descriptor);
      while (room.state.tick < joinTick) surface.simulationStep();

      const secondCapture = new CaptureSocket();
      const second = room.join(secondCapture as unknown as WebSocket, {
        type: "join",
        roomId: room.id,
        name: "Bob",
      });
      assert.ok(second.session);
      const secondWorld = secondCapture.latest("world") as WorldMessage;
      const secondSnapshot = secondCapture.latest("snapshot") as SnapshotMessage;
      assert.equal(secondWorld.heatRing, undefined);
      assert.equal(room.state.tick, joinTick, "joining never advances hidden simulation time");
      assert.equal(heatEvent(secondSnapshot, "heatRingAborted")?.reason, "second-human");
      assert.equal(heatEvent(secondSnapshot, "heatRingResolved"), undefined);
      assert.equal(secondSnapshot.players.filter((player) => player.kind === "human").length, 2);
      assert.equal(secondSnapshot.players.length, 12);
      assert.equal(
        room.state.drops.filter((drop) =>
          drop.source === "death" &&
          drop.originPlayerId !== undefined &&
          descriptor.botIds.includes(drop.originPlayerId)
        ).length,
        0,
        "cancellation cannot synthesize a consolation hoard",
      );
    } finally {
      room.stop();
    }
  }
});

test("disconnects and reconnects never re-arm the one-time encounter", () => {
  const room = new ArenaRoom("heat-reconnect", {
    targetPopulation: 12,
    targetDropCount: 0,
    fixedStepHz: 30,
    snapshotHz: 15,
  });
  try {
    const first = joinFirstHuman(room, "Alice");
    assert.ok(first.world.heatRing);
    room.disconnect(first.session, first.socket);

    const reconnectCapture = new CaptureSocket();
    const reconnected = room.join(reconnectCapture as unknown as WebSocket, {
      type: "join",
      roomId: room.id,
      name: "Alice",
      reconnectToken: first.welcome.reconnectToken,
    });
    assert.ok(reconnected.session);
    const welcome = reconnectCapture.latest("welcome") as WelcomeMessage;
    const world = reconnectCapture.latest("world") as WorldMessage;
    const snapshot = reconnectCapture.latest("snapshot") as SnapshotMessage;
    assert.equal(welcome.reconnected, true);
    assert.equal(world.heatRing, undefined);
    assert.equal(
      snapshot.events.filter((event) => event.type === "heatRingStarted").length,
      0,
      "the reconnect receives no second start event",
    );
    assert.equal(heatEvent(snapshot, "heatRingAborted")?.reason, "first-human-disconnected");
  } finally {
    room.stop();
  }
});

test("ordinary collision remains lethal when the human deliberately enters the ring", () => {
  const room = new ArenaRoom("heat-adversarial-human", {
    targetPopulation: 12,
    targetDropCount: 0,
    fixedStepHz: 30,
    snapshotHz: 15,
  });
  const surface = room as unknown as RoomTestSurface;
  try {
    const joined = joinFirstHuman(room);
    const descriptor = joined.world.heatRing;
    assert.ok(descriptor);
    const human = room.state.players[joined.welcome.playerId];
    const heatBot = room.state.players[descriptor.botIds[0]];
    assert.ok(human && heatBot);
    const bodyPoint = heatBot.body[1] ?? heatBot.body[0];
    assert.ok(bodyPoint);
    human.position = { ...bodyPoint };
    human.previousPosition = { ...bodyPoint };
    human.body = human.body.map((_, index) => ({
      x: bodyPoint.x - human.direction.x * (index + 1) * 20,
      y: bodyPoint.y - human.direction.y * (index + 1) * 20,
    }));
    human.previousBody = human.body.map((point) => ({ ...point }));
    human.shieldTicksRemaining = 0;

    surface.simulationStep();
    const snapshot = surface.snapshot();
    assert.ok(snapshot.events.some((event) =>
      event.type === "playerDied" && event.playerId === human.id && event.cause === "collision"
    ));
    assert.equal(heatEvent(snapshot, "heatRingAborted")?.reason, "unsafe-state");
    assert.equal(heatEvent(snapshot, "heatRingResolved"), undefined);
  } finally {
    room.stop();
  }
});

test("undersized rooms fail closed and target-24 placement remains bounded", () => {
  const undersized = new ArenaRoom("heat-too-small", {
    targetPopulation: 2,
    targetDropCount: 0,
    fixedStepHz: 30,
  });
  try {
    const joined = joinFirstHuman(undersized);
    assert.equal(joined.world.heatRing, undefined);
    assert.equal(heatEvent(joined.initial, "heatRingStarted"), undefined);
    assert.equal(joined.initial.players.length, 2);
  } finally {
    undersized.stop();
  }

  for (let seed = 0; seed < 100; seed += 1) {
    const room = new ArenaRoom(`heat-capacity-${seed}`, {
      targetPopulation: 24,
      targetDropCount: 0,
      fixedStepHz: 30,
    });
    try {
      const joined = joinFirstHuman(room);
      assert.ok(joined.world.heatRing, `target-24 seed ${seed} must prepare or fail before exposure`);
      assert.equal(joined.initial.players.length, 24);
    } finally {
      room.stop();
    }
  }
});
