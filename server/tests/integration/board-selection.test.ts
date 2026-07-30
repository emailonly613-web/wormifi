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

test("the first join selects a known room board and later joins cannot override it", async () => {
  const server = new AuthoritativeArenaServer({
    targetPopulation: 0,
    targetDropCount: 0,
    heatRing: false,
  });
  const started = await server.start();
  const sockets: WebSocket[] = [];

  try {
    const creator = await connect(started.websocketUrl);
    sockets.push(creator);
    const creatorWorld = nextMatching(creator, isWorld);
    creator.send(JSON.stringify({
      type: "join",
      roomId: "relay-crew",
      name: "Anne",
      boardId: "black-pearl-relay",
    }));
    const world = await creatorWorld;
    assert.equal(world.board?.id, "black-pearl-relay");
    assert.equal(world.board?.chargingStations.length, 2);

    const ordinaryJoin = await connect(started.websocketUrl);
    sockets.push(ordinaryJoin);
    const ordinaryWorld = nextMatching(ordinaryJoin, isWorld);
    ordinaryJoin.send(JSON.stringify({
      type: "join",
      roomId: "relay-crew",
      name: "Mary",
    }));
    assert.equal((await ordinaryWorld).board?.id, "black-pearl-relay");

    const mismatch = await connect(started.websocketUrl);
    sockets.push(mismatch);
    const mismatchError = nextMatching(
      mismatch,
      (message): message is Extract<ServerMessage, { type: "error" }> =>
        message.type === "error" && message.code === "ROOM_BOARD_MISMATCH",
    );
    mismatch.send(JSON.stringify({
      type: "join",
      roomId: "relay-crew",
      name: "Grace",
      boardId: "open-seas",
    }));
    assert.match((await mismatchError).message, /Black Pearl Relay/u);

    const unknown = await connect(started.websocketUrl);
    sockets.push(unknown);
    const unknownError = nextMatching(
      unknown,
      (message): message is Extract<ServerMessage, { type: "error" }> =>
        message.type === "error" && message.code === "UNKNOWN_BOARD",
    );
    unknown.send(JSON.stringify({
      type: "join",
      roomId: "unknown-board-room",
      name: "Ada",
      boardId: "ghost-fleet",
    }));
    assert.match((await unknownError).message, /ghost-fleet/u);
  } finally {
    for (const socket of sockets) socket.close();
    await server.stop();
  }
});
