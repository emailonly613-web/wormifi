import { expect, test } from "@playwright/test";
import {
  PROTOCOL_VERSION,
  type PublicPlayerState,
  type SnapshotMessage,
  type WelcomeMessage,
  type WorldMessage,
} from "../../server/src/protocol";

test("captures the compact plump spawn and the same worm's length-and-girth build-up", async ({ page }, testInfo) => {
  test.setTimeout(30_000);
  const roomId = `growth-proof-${testInfo.project.name.replace(/[^a-z0-9]+/giu, "-").toLowerCase()}`;
  const playerId = "human-growth-proof";
  let socketSend: ((data: string) => void) | undefined;

  const playerAt = (mass: number, body: PublicPlayerState["body"]): PublicPlayerState => ({
    id: playerId,
    name: "Growth Captain",
    kind: "human",
    connected: true,
    alive: true,
    position: { x: 200, y: 0 },
    direction: { x: 1, y: 0 },
    body,
    mass,
    kills: 0,
    score: Math.max(0, Math.round((mass - 48) * 10)),
    shieldTicksRemaining: 0,
    themeId: "tideglass-corsair",
  });
  const spawnPlayer = playerAt(48, [
    { x: 182, y: 0 },
    { x: 164, y: 0 },
    { x: 146, y: 0 },
    { x: 128, y: 0 },
    { x: 110, y: 0 },
    { x: 92, y: 0 },
  ]);
  const grownPlayer = playerAt(480, Array.from({ length: 20 }, (_, index) => ({
    x: 200 - (index + 1) * 18,
    y: Math.sin(index * 0.34) * 62,
  })));

  const snapshot = (tick: number, player: PublicPlayerState): SnapshotMessage => ({
    type: "snapshot",
    protocolVersion: PROTOCOL_VERSION,
    authority: "server",
    roomId,
    tick,
    serverTimeMs: tick * 1_000,
    players: [player],
    dropUpserts: [],
    removedDropIds: [],
    events: [],
  });

  await page.routeWebSocket(/\/arena$/u, (socket) => {
    socketSend = (data) => socket.send(data);
    socket.onMessage((raw) => {
      const message = JSON.parse(typeof raw === "string" ? raw : raw.toString()) as { type?: string };
      if (message.type !== "join") return;
      const welcome: WelcomeMessage = {
        type: "welcome",
        protocolVersion: PROTOCOL_VERSION,
        authority: "server",
        roomId,
        playerId,
        reconnectToken: "growth-proof-reconnect-token-0001",
        reconnected: false,
        tick: 10,
        fixedStepSeconds: 1 / 30,
        lastAcceptedSequence: -1,
      };
      const world: WorldMessage = {
        type: "world",
        protocolVersion: PROTOCOL_VERSION,
        authority: "server",
        roomId,
        tick: 10,
        arenaRadius: 1_500,
        collisionRadii: {
          baseRadius: 8,
          massRadiusFactor: 0.68,
          bodyRadiusFactor: 0.98,
        },
        drops: [],
        board: { id: "open-seas", name: "Open Seas", chargingStations: [] },
      };
      socket.send(JSON.stringify(welcome));
      socket.send(JSON.stringify(world));
      socket.send(JSON.stringify(snapshot(10, spawnPlayer)));
    });
  });

  await page.goto(`/?room=${roomId}`);
  await page.getByTestId("live-lab-button").click();
  const arena = page.getByTestId("live-arena-canvas");
  await expect(arena).toHaveAttribute("data-authority", "server-confirmed");
  await expect(arena).toHaveAttribute("data-player-mass", "48");
  await expect(arena).toHaveAttribute("data-player-length", "6");
  const spawnBodyRadius = Number(await arena.getAttribute("data-collision-body-radius"));
  await page.screenshot({
    path: `proof/browser/growth-${testInfo.project.name}-spawn.png`,
    fullPage: true,
  });

  socketSend?.(JSON.stringify(snapshot(90, grownPlayer)));
  await expect(arena).toHaveAttribute("data-player-mass", "480");
  await expect(arena).toHaveAttribute("data-player-length", "20");
  const grownBodyRadius = Number(await arena.getAttribute("data-collision-body-radius"));
  expect(grownBodyRadius).toBeGreaterThan(spawnBodyRadius * 1.65);
  await page.screenshot({
    path: `proof/browser/growth-${testInfo.project.name}-grown.png`,
    fullPage: true,
  });
});
