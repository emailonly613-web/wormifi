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
    const timeout = setTimeout(() => reject(new Error("timed out waiting for server message")), 2_000);
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

const isWorld = (message: ServerMessage): message is WorldMessage => message.type === "world";

test("the first join locks one authoritative pace for every captain", async () => {
  const server = new AuthoritativeArenaServer({ targetPopulation: 0, targetDropCount: 0, heatRing: false });
  const started = await server.start();
  const sockets: WebSocket[] = [];
  try {
    const creator = await connect(started.websocketUrl);
    sockets.push(creator);
    const creatorWorld = nextMatching(creator, isWorld);
    creator.send(JSON.stringify({ type: "join", roomId: "tempest-crew", name: "Anne", paceId: "tempest" }));
    assert.deepEqual((await creatorWorld).pace, {
      id: "tempest",
      name: "Tempest",
      baseSpeed: 235,
      boostSpeed: 420,
    });

    const ordinary = await connect(started.websocketUrl);
    sockets.push(ordinary);
    const ordinaryWorld = nextMatching(ordinary, isWorld);
    ordinary.send(JSON.stringify({ type: "join", roomId: "tempest-crew", name: "Mary" }));
    assert.equal((await ordinaryWorld).pace?.id, "tempest");

    const mismatch = await connect(started.websocketUrl);
    sockets.push(mismatch);
    const mismatchError = nextMatching(
      mismatch,
      (message): message is Extract<ServerMessage, { type: "error" }> =>
        message.type === "error" && message.code === "ROOM_PACE_MISMATCH",
    );
    mismatch.send(JSON.stringify({ type: "join", roomId: "tempest-crew", name: "Grace", paceId: "harbor" }));
    assert.match((await mismatchError).message, /Tempest speed/u);

    const unknown = await connect(started.websocketUrl);
    sockets.push(unknown);
    const unknownError = nextMatching(
      unknown,
      (message): message is Extract<ServerMessage, { type: "error" }> =>
        message.type === "error" && message.code === "UNKNOWN_PACE",
    );
    unknown.send(JSON.stringify({ type: "join", roomId: "unknown-pace", name: "Ada", paceId: "warp-nine" }));
    assert.match((await unknownError).message, /warp-nine/u);

    const defaultCaptain = await connect(started.websocketUrl);
    sockets.push(defaultCaptain);
    const defaultWorld = nextMatching(defaultCaptain, isWorld);
    defaultCaptain.send(JSON.stringify({
      type: "join",
      roomId: "patient-default",
      name: "Patient captain",
    }));
    assert.deepEqual((await defaultWorld).pace, {
      id: "harbor",
      name: "Harbor",
      baseSpeed: 100,
      boostSpeed: 200,
    });
  } finally {
    for (const socket of sockets) socket.close();
    await server.stop();
  }
});
