import assert from "node:assert/strict";
import { test } from "node:test";
import WebSocket from "ws";

import type { ServerMessage, WorldMessage } from "../../src/protocol.ts";
import { AuthoritativeArenaServer } from "../../src/server.ts";

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
      reject(new Error("timed out waiting for server message"));
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

const isWorld = (message: ServerMessage): message is WorldMessage =>
  message.type === "world";

test("public matchmaking is board-aware: a Honeycomb Cove captain never lands on an Open Seas room", async () => {
  const server = new AuthoritativeArenaServer({
    targetPopulation: 0,
    targetDropCount: 0,
    heatRing: false,
  });
  const started = await server.start();
  const sockets: WebSocket[] = [];

  try {
    // First captain matchmakes with the default board -> public-1, Open Seas.
    const first = await connect(started.websocketUrl);
    sockets.push(first);
    const firstWorld = nextMatching(first, isWorld);
    first.send(JSON.stringify({
      type: "join",
      roomId: "public-1",
      name: "Anne",
      matchmakingV1: true,
    }));
    const openSeasWorld = await firstWorld;
    assert.equal(openSeasWorld.board?.id, "open-seas");

    // Second captain requests the classic board. public-1 has free seats,
    // but a board-blind balancer would bounce this join off
    // ROOM_BOARD_MISMATCH — the server must open a matching room instead.
    const second = await connect(started.websocketUrl);
    sockets.push(second);
    const secondWorld = nextMatching(second, isWorld);
    second.send(JSON.stringify({
      type: "join",
      roomId: "public-1",
      name: "Mary",
      matchmakingV1: true,
      boardId: "honeycomb-cove",
    }));
    const honeycombWorld = await secondWorld;
    assert.equal(honeycombWorld.board?.id, "honeycomb-cove");
    assert.equal(honeycombWorld.board?.chargingStations.length, 0);
    assert.notEqual(honeycombWorld.roomId, openSeasWorld.roomId);

    // A third classic-board captain matchmakes into the SAME honeycomb room.
    const third = await connect(started.websocketUrl);
    sockets.push(third);
    const thirdWorld = nextMatching(third, isWorld);
    third.send(JSON.stringify({
      type: "join",
      roomId: "public-1",
      name: "Grace",
      matchmakingV1: true,
      boardId: "honeycomb-cove",
    }));
    assert.equal((await thirdWorld).roomId, honeycombWorld.roomId);
  } finally {
    for (const socket of sockets) socket.close();
    await server.stop();
  }
});
