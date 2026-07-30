import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { test } from "node:test";
import type WebSocket from "ws";

import {
  decodeSnapshotFromWire,
  type ServerMessage,
  type SnapshotMessage,
} from "../../src/protocol.ts";
import { ArenaRoom } from "../../src/room.ts";

const FIXED_STEP_HZ = 30;
const SNAPSHOT_HZ = 15;
const STEP_MILLISECONDS = 1_000 / FIXED_STEP_HZ;
const MAX_SNAPSHOT_BUFFER_BYTES = 256 * 1024;

interface RoomSchedulerSurface {
  schedulerAccumulatorMs: number;
  schedulerLastMs: number;
  schedulerWake(): void;
}

class CaptureSocket {
  readonly OPEN = 1;
  bufferedAmount = 0;
  readyState = this.OPEN;
  readonly messages: ServerMessage[] = [];

  send(encoded: string): void {
    const decoded = decodeSnapshotFromWire(JSON.parse(encoded));
    if (decoded !== null) this.messages.push(decoded as ServerMessage);
  }

  close(): void {
    this.readyState = 3;
  }

  snapshots(): SnapshotMessage[] {
    return this.messages.filter(
      (message): message is SnapshotMessage => message.type === "snapshot",
    );
  }
}

function createJoinedRoom(id: string): {
  room: ArenaRoom;
  scheduler: RoomSchedulerSurface;
  capture: CaptureSocket;
} {
  const room = new ArenaRoom(id, {
    targetPopulation: 0,
    targetDropCount: 0,
    fixedStepHz: FIXED_STEP_HZ,
    snapshotHz: SNAPSHOT_HZ,
    heatRing: false,
  });
  const capture = new CaptureSocket();
  const joined = room.join(capture as unknown as WebSocket, {
    type: "join",
    roomId: id,
    name: "Scheduler probe",
  });
  assert.ok(joined.session);
  capture.messages.length = 0;
  return {
    room,
    scheduler: room as unknown as RoomSchedulerSurface,
    capture,
  };
}

function runCatchUp(surface: RoomSchedulerSurface, steps: number): void {
  surface.schedulerAccumulatorMs = steps * STEP_MILLISECONDS;
  surface.schedulerLastMs = performance.now();
  surface.schedulerWake();
}

test("a delayed scheduler wake publishes every due authoritative snapshot", () => {
  const { room, scheduler, capture } = createJoinedRoom("scheduler-catch-up");
  try {
    runCatchUp(scheduler, 4);
    assert.deepEqual(
      capture.snapshots().map((snapshot) => snapshot.tick),
      [2, 4],
      "four caught-up 30 Hz steps must retain both due 15 Hz snapshots",
    );
  } finally {
    room.stop();
  }
});

test("backpressure may skip self-healing frames without slowing simulation", () => {
  const { room, scheduler, capture } = createJoinedRoom("scheduler-backpressure");
  try {
    capture.bufferedAmount = MAX_SNAPSHOT_BUFFER_BYTES + 1;
    runCatchUp(scheduler, 2);
    assert.equal(room.state.tick, 2);
    assert.equal(capture.snapshots().length, 0);

    capture.bufferedAmount = 0;
    runCatchUp(scheduler, 2);
    assert.equal(room.state.tick, 4);
    assert.deepEqual(capture.snapshots().map((snapshot) => snapshot.tick), [4]);
  } finally {
    room.stop();
  }
});
