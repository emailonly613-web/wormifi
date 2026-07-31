import assert from "node:assert/strict";
import { test } from "node:test";
import WebSocket from "ws";

import {
  CAPTAIN_ROOM_TIERS,
  createCaptainRoomId,
} from "../../../src/game/captainRooms.ts";
import { captainRoomOptionsForTier } from "../../src/captain-rooms.ts";
import type { ServerMessage, WorldMessage } from "../../src/protocol.ts";
import { ArenaRoom } from "../../src/room.ts";
import { AuthoritativeArenaServer } from "../../src/server.ts";

class CaptureSocket {
  readonly OPEN = 1;
  readonly bufferedAmount = 0;
  readyState = this.OPEN;
  readonly messages: string[] = [];

  send(encoded: string): void {
    this.messages.push(encoded);
  }

  close(): void {
    this.readyState = 3;
  }
}

test("trusted Captain Room tiers enforce 10, 20, and 30 real-human seats on separate boards", () => {
  for (const tier of CAPTAIN_ROOM_TIERS) {
    const options = captainRoomOptionsForTier(tier.id);
    assert.equal(options.maxHumanPlayers, tier.humanSeats);
    assert.equal(options.targetPopulation, 0);
    assert.equal(options.arenaRadius, tier.arenaRadius);
    assert.equal(options.targetDropCount, tier.targetDropCount);
    assert.equal(options.board?.id, tier.boardId);
    assert.equal(options.heatRing, false);

    const room = new ArenaRoom(`hosted-${tier.humanSeats}`, options);
    try {
      for (let index = 0; index < tier.humanSeats; index += 1) {
        const result = room.join(new CaptureSocket() as unknown as WebSocket, {
          type: "join",
          roomId: room.id,
          name: `Invite ${index + 1}`,
        });
        assert.ok(result.session, `seat ${index + 1} must be admitted`);
      }
      const overflow = room.join(new CaptureSocket() as unknown as WebSocket, {
        type: "join",
        roomId: room.id,
        name: "Overflow",
      });
      assert.equal(overflow.error?.code, "ROOM_FULL");
      assert.match(overflow.error?.message ?? "", new RegExp(`${tier.humanSeats} human captains`));
      assert.equal(
        Object.values(room.state.players).filter((player) => player.kind === "bot").length,
        0,
      );
    } finally {
      room.stop();
    }
  }
});

async function connect(url: string): Promise<WebSocket> {
  return await new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.once("open", () => resolve(socket));
    socket.once("error", reject);
  });
}

function nextMatching<T extends ServerMessage>(
  socket: WebSocket,
  predicate: (message: ServerMessage) => message is T,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off("message", onMessage);
      reject(new Error("timed out waiting for Captain Room server message"));
    }, 2_000);
    const onMessage = (data: WebSocket.RawData) => {
      const message = JSON.parse(data.toString()) as ServerMessage;
      if (!predicate(message)) return;
      clearTimeout(timeout);
      socket.off("message", onMessage);
      resolve(message);
    };
    socket.on("message", onMessage);
  });
}

test("a free opaque Captain Room link selects its server-owned capacity and board", async () => {
  const server = new AuthoritativeArenaServer({
    targetPopulation: 28,
    targetDropCount: 600,
  });
  const started = await server.start();
  const sockets: WebSocket[] = [];
  const roomId = createCaptainRoomId(
    "captain-room-20-session-v1",
    new Uint32Array([0x0badcafe, 0x12345678, 0x90abcdef]),
  );

  try {
    const guest = await connect(started.websocketUrl);
    sockets.push(guest);
    const worldPromise = nextMatching(
      guest,
      (message): message is WorldMessage => message.type === "world",
    );
    guest.send(JSON.stringify({ type: "join", roomId, name: "Free Guest" }));
    const world = await worldPromise;
    assert.equal(world.roomId, roomId);
    assert.equal(world.board?.id, "captain-cove-20");
    assert.equal(world.board?.chargingStations.length, 3);

    const override = await connect(started.websocketUrl);
    sockets.push(override);
    const errorPromise = nextMatching(
      override,
      (message): message is Extract<ServerMessage, { type: "error" }> =>
        message.type === "error" && message.code === "ROOM_BOARD_MISMATCH",
    );
    override.send(JSON.stringify({
      type: "join",
      roomId,
      name: "Override",
      boardId: "black-pearl-relay",
    }));
    assert.match((await errorPromise).message, /server-owned board and pace/iu);
  } finally {
    for (const socket of sockets) socket.close();
    await server.stop();
  }
});
