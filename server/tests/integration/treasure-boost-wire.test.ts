import assert from "node:assert/strict";
import { test } from "node:test";
import type WebSocket from "ws";

import type { ServerMessage } from "../../src/protocol.ts";
import { ArenaRoom } from "../../src/room.ts";
import { grantTreasureBoost } from "../../../src/game/treasureBoosts.ts";

class CaptureSocket {
  readonly OPEN = 1;
  readonly bufferedAmount = 0;
  readyState = this.OPEN;
  readonly messages: string[] = [];
  send(encoded: string): void { this.messages.push(encoded); }
  close(): void { this.readyState = 3; }
}

interface SnapshotSurface { broadcastSnapshot(): void }

test("the recipient's stacking boosts ride the snapshot; a rival never sees them", () => {
  const room = new ArenaRoom("boost-wire", {
    targetPopulation: 0,
    targetDropCount: 0,
    heatRing: false,
  });
  try {
    const boosted = new CaptureSocket();
    const rival = new CaptureSocket();
    const boostedJoin = room.join(boosted as unknown as WebSocket, {
      type: "join", roomId: room.id, name: "Boosted", snapshotTupleV1: true,
    });
    const rivalJoin = room.join(rival as unknown as WebSocket, {
      type: "join", roomId: room.id, name: "Rival", snapshotTupleV1: true,
    });
    assert.ok(boostedJoin.session);
    assert.ok(rivalJoin.session);

    const boostedPlayer = room.state.players[boostedJoin.session.playerId]!;
    grantTreasureBoost(boostedPlayer.treasureBoosts, 2, room.state.tick, room.state.config.fixedStepSeconds);
    grantTreasureBoost(boostedPlayer.treasureBoosts, 10, room.state.tick, room.state.config.fixedStepSeconds);

    boosted.messages.length = 0;
    rival.messages.length = 0;
    (room as unknown as SnapshotSurface).broadcastSnapshot();

    const boostedSnapshot = boosted.messages
      .map((encoded) => JSON.parse(encoded) as ServerMessage & { boosts?: unknown })
      .find((message) => message.type === "snapshot");
    const rivalSnapshot = rival.messages
      .map((encoded) => JSON.parse(encoded) as ServerMessage & { boosts?: unknown })
      .find((message) => message.type === "snapshot");
    assert.ok(boostedSnapshot);
    assert.ok(rivalSnapshot);
    assert.deepEqual(boostedSnapshot.boosts, [[10, 5], [2, 20]]);
    assert.equal(rivalSnapshot.boosts, undefined);
  } finally {
    room.stop();
  }
});
