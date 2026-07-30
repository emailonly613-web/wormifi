import { expect, test } from "@playwright/test";
import {
  PROTOCOL_VERSION,
  type ErrorMessage,
  type PublicPlayerState,
  type SnapshotMessage,
  type WelcomeMessage,
  type WorldMessage,
} from "../../server/src/protocol";
import {
  BLACK_PEARL_RELAY_BOARD,
  getChargingDockPosition,
  OPEN_SEAS_BOARD,
} from "../../src/game/chargingStations";
import { PHOTO_SKIN_STORAGE_KEY } from "../../src/game/photoSkin";

function publicPlayer(
  id: string,
  name: string,
  kind: PublicPlayerState["kind"],
  themeId?: PublicPlayerState["themeId"],
  bodyLength = 3,
  mass = 48,
): PublicPlayerState {
  const position = kind === "human" ? { x: 0, y: 0 } : { x: 260, y: 100 };
  return {
    id,
    name,
    kind,
    connected: true,
    alive: true,
    position,
    direction: { x: 1, y: 0 },
    body: Array.from({ length: bodyLength }, (_, index) => ({
      x: position.x - (index + 1) * 18,
      y: position.y + Math.sin(index * 0.38) * Math.min(34, bodyLength * 2),
    })),
    mass,
    kills: 0,
    score: 0,
    shieldTicksRemaining: 0,
    themeId,
  };
}

test("binds the selected board and private Photo Skin to play without putting photos on the wire", async ({ page }, testInfo) => {
  test.setTimeout(35_000);
  const roomId = `moat-proof-${testInfo.project.name.replace(/[^a-z0-9]+/giu, "-").toLowerCase()}`;
  const playerId = "human-moat-proof";
  let joinMessage: Record<string, unknown> | undefined;

  await page.addInitScript(({ key }) => {
    const portrait = (
      background: string,
      shirt: string,
      skin: string,
      hair: string,
      smile: boolean,
    ) => {
      const canvas = document.createElement("canvas");
      canvas.width = 192;
      canvas.height = 192;
      const context = canvas.getContext("2d")!;
      context.fillStyle = background;
      context.fillRect(0, 0, 192, 192);
      context.fillStyle = shirt;
      context.beginPath();
      context.arc(96, 198, 78, Math.PI, Math.PI * 2);
      context.fill();
      context.fillStyle = skin;
      context.beginPath();
      context.ellipse(96, 92, 54, 64, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = hair;
      context.beginPath();
      context.arc(96, 63, 57, Math.PI, Math.PI * 2);
      context.fill();
      context.fillStyle = "#ffffff";
      context.beginPath();
      context.ellipse(76, 91, 11, 14, 0, 0, Math.PI * 2);
      context.ellipse(116, 91, 11, 14, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#162036";
      context.beginPath();
      context.arc(78, 93, 5, 0, Math.PI * 2);
      context.arc(118, 93, 5, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "#6d2334";
      context.lineWidth = 6;
      context.lineCap = "round";
      context.beginPath();
      context.arc(96, 117, 23, smile ? 0.12 * Math.PI : 1.12 * Math.PI, smile ? 0.88 * Math.PI : 1.88 * Math.PI);
      context.stroke();
      return canvas.toDataURL("image/png");
    };
    const first = portrait("#245ca8", "#f0bc3e", "#d9996d", "#38231d", true);
    const second = portrait("#713f91", "#2ec8a5", "#8b5339", "#101b2d", false);
    window.localStorage.setItem(key, JSON.stringify({
      version: 1,
      consented: true,
      enabled: true,
      themeId: "sunken-crown",
      photos: [
        {
          id: "local-proof-portrait-a",
          dataUrl: first,
          mimeType: "image/png",
          width: 192,
          height: 192,
          byteSize: first.length,
          focalPoint: { x: 0.5, y: 0.5 },
          sanitized: true,
          addedAtMs: 1,
        },
        {
          id: "local-proof-portrait-b",
          dataUrl: second,
          mimeType: "image/png",
          width: 192,
          height: 192,
          byteSize: second.length,
          focalPoint: { x: 0.5, y: 0.5 },
          sanitized: true,
          addedAtMs: 2,
        },
      ],
      privacy: {
        processing: "on-device-only",
        storage: "local-browser-only",
        uploads: "never",
        multiplayerVisibility: "authored-theme-only",
        moderatedPublicSharingRequired: true,
      },
      updatedAtMs: 3,
    }));
  }, { key: PHOTO_SKIN_STORAGE_KEY });

  await page.routeWebSocket(/\/arena$/u, (socket) => {
    socket.onMessage((raw) => {
      const message = JSON.parse(typeof raw === "string" ? raw : raw.toString()) as Record<string, unknown>;
      if (message.type !== "join") return;
      joinMessage ??= message;
      const welcome: WelcomeMessage = {
        type: "welcome",
        protocolVersion: PROTOCOL_VERSION,
        authority: "server",
        roomId,
        playerId,
        reconnectToken: "moat-proof-reconnect-token-0001",
        reconnected: false,
        tick: 20,
        fixedStepSeconds: 1 / 30,
        lastAcceptedSequence: -1,
      };
      const world: WorldMessage = {
        type: "world",
        protocolVersion: PROTOCOL_VERSION,
        authority: "server",
        roomId,
        tick: 20,
        arenaRadius: 1_200,
        collisionRadii: {
          baseRadius: 8,
          massRadiusFactor: 0.68,
          bodyRadiusFactor: 0.98,
        },
        drops: [],
        board: {
          id: BLACK_PEARL_RELAY_BOARD.id,
          name: BLACK_PEARL_RELAY_BOARD.name,
          chargingStations: BLACK_PEARL_RELAY_BOARD.chargingStations.map((station) => ({
            ...station,
            position: { ...station.position },
          })),
        },
      };
      const portCapstan = BLACK_PEARL_RELAY_BOARD.chargingStations[0];
      if (!portCapstan) throw new Error("Black Pearl Relay must define its port capstan.");
      const privateCaptain = publicPlayer(
        playerId,
        "Private Captain",
        "human",
        "sunken-crown",
        14,
        180,
      );
      privateCaptain.position = getChargingDockPosition(portCapstan);
      privateCaptain.direction = { x: 0, y: -1 };
      privateCaptain.body = Array.from({ length: 14 }, (_, index) => {
        const angle = portCapstan.dockAngleRadians -
          (index + 1) * (portCapstan.requiredWrapRadians / 13);
        return {
          x: portCapstan.position.x + Math.cos(angle) * portCapstan.wrapRadius,
          y: portCapstan.position.y + Math.sin(angle) * portCapstan.wrapRadius,
        };
      });
      const snapshot: SnapshotMessage = {
        type: "snapshot",
        protocolVersion: PROTOCOL_VERSION,
        authority: "server",
        roomId,
        tick: 20,
        serverTimeMs: 20_000,
        players: [
          privateCaptain,
          publicPlayer("bot-moat-proof", "Atlas Rival", "bot"),
        ],
        dropUpserts: [],
        removedDropIds: [],
        events: [],
        chargingStations: [
          {
            stationId: "port-capstan",
            phase: "charging",
            playerId,
            windingDirection: -1,
            progressTicks: 42,
            requiredTicks: 72,
            graceTicksRemaining: 0,
            cooldownTicksRemaining: 0,
            massAwarded: 0,
          },
          {
            stationId: "starboard-capstan",
            phase: "ready",
            windingDirection: 0,
            progressTicks: 0,
            requiredTicks: 72,
            graceTicksRemaining: 0,
            cooldownTicksRemaining: 0,
            massAwarded: 0,
          },
        ],
      };
      socket.send(JSON.stringify(welcome));
      socket.send(JSON.stringify(world));
      socket.send(JSON.stringify(snapshot));
    });
  });

  await page.goto(`/?room=${roomId}&board=black-pearl-relay`);
  await expect(page.getByTestId("board-picker")).toHaveAttribute("data-board-id", "black-pearl-relay");
  await page.getByTestId("live-lab-button").click();

  const arena = page.getByTestId("live-arena-canvas");
  await expect(arena).toHaveAttribute("data-authority", "server-confirmed");
  await expect(arena).toHaveAttribute("data-board-id", "black-pearl-relay");
  await expect(arena).toHaveAttribute("data-theme-id", "sunken-crown");
  await expect(arena).toHaveAttribute("data-local-photo-skin", "true");
  await expect.poll(async () => Number(await arena.getAttribute("data-local-photo-images"))).toBe(2);
  await expect(arena).toHaveAttribute("data-charging-station-id", "port-capstan");
  await expect(arena).toHaveAttribute("data-charging-station-phase", "charging");
  await expect(page.getByTestId("live-charging-station-status")).toHaveAttribute("data-owned", "true");
  await expect(page.getByTestId("live-charging-station-status")).toHaveAccessibleName(/YOUR CHARGE/u);
  await expect(page.getByTestId("pirate-radar")).toHaveAttribute("data-station-count", "2");

  expect(joinMessage).toMatchObject({
    type: "join",
    roomId,
    boardId: "black-pearl-relay",
    themeId: "sunken-crown",
  });
  expect(joinMessage).not.toHaveProperty("photo");
  expect(joinMessage).not.toHaveProperty("photos");
  expect(joinMessage).not.toHaveProperty("dataUrl");
  expect(joinMessage).not.toHaveProperty("renderPlan");

  const proofPath = `proof/browser/moat-${testInfo.project.name}-live.png`;
  try {
    await page.screenshot({ path: proofPath, fullPage: true, timeout: 15_000 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/unknown error, open/iu.test(message)) throw error;

    const fallbackPath = proofPath.replace(/\.png$/u, `-${process.pid}-${Date.now()}.png`);
    await page.screenshot({ path: fallbackPath, fullPage: true, timeout: 15_000 });
    testInfo.annotations.push({
      type: "proof-fallback",
      description: `Canonical proof was locked; current capture: ${fallbackPath}`,
    });
  }
  await page.getByTestId("live-exit-button").click();
  await expect(page.getByTestId("board-picker")).toHaveAttribute("data-board-locked", "true");
  await page.getByTestId("lobby-invite").click();
  const invite = new URL(await page.getByTestId("room-invite-url").inputValue());
  expect(invite.searchParams.get("room")).toBe(roomId);
  expect(invite.searchParams.get("board")).toBe("black-pearl-relay");
});

test("runs Black Pearl Relay locally with both capstans on the pirate radar", async ({ page }) => {
  await page.goto("/?board=black-pearl-relay");
  await page.getByTestId("solo-run-button").click();
  const arena = page.getByTestId("arena-canvas");
  await expect(arena).toHaveAttribute("data-board-id", "black-pearl-relay");
  await expect(page.getByTestId("pirate-radar")).toHaveAttribute("data-station-count", "2");
});

test("accepts an existing room's locked board after rejecting an override request", async ({ page }, testInfo) => {
  const roomId = `locked-board-${testInfo.project.name.replace(/[^a-z0-9]+/giu, "-").toLowerCase()}`;
  const playerId = "human-locked-board-proof";
  const joins: Record<string, unknown>[] = [];

  await page.routeWebSocket(/\/arena$/u, (socket) => {
    socket.onMessage((raw) => {
      const message = JSON.parse(typeof raw === "string" ? raw : raw.toString()) as Record<string, unknown>;
      if (message.type !== "join") return;
      joins.push(message);
      if (message.boardId !== undefined) {
        const mismatch: ErrorMessage = {
          type: "error",
          code: "ROOM_BOARD_MISMATCH",
          message: "Existing room board cannot be overridden.",
        };
        socket.send(JSON.stringify(mismatch));
        return;
      }

      const welcome: WelcomeMessage = {
        type: "welcome",
        protocolVersion: PROTOCOL_VERSION,
        authority: "server",
        roomId,
        playerId,
        reconnectToken: "locked-board-reconnect-token-0001",
        reconnected: false,
        tick: 40,
        fixedStepSeconds: 1 / 30,
        lastAcceptedSequence: -1,
      };
      const world: WorldMessage = {
        type: "world",
        protocolVersion: PROTOCOL_VERSION,
        authority: "server",
        roomId,
        tick: 40,
        arenaRadius: 1_200,
        collisionRadii: {
          baseRadius: 8,
          massRadiusFactor: 0.68,
          bodyRadiusFactor: 0.98,
        },
        drops: [],
        board: {
          id: OPEN_SEAS_BOARD.id,
          name: OPEN_SEAS_BOARD.name,
          chargingStations: [],
        },
      };
      const snapshot: SnapshotMessage = {
        type: "snapshot",
        protocolVersion: PROTOCOL_VERSION,
        authority: "server",
        roomId,
        tick: 40,
        serverTimeMs: 40_000,
        players: [publicPlayer(playerId, "Locked Board Captain", "human", "tideglass-corsair")],
        dropUpserts: [],
        removedDropIds: [],
        events: [],
      };
      socket.send(JSON.stringify(welcome));
      socket.send(JSON.stringify(world));
      socket.send(JSON.stringify(snapshot));
    });
  });

  await page.goto(`/?room=${roomId}&board=black-pearl-relay`);
  await page.getByTestId("live-lab-button").click();
  const arena = page.getByTestId("live-arena-canvas");
  await expect(arena).toHaveAttribute("data-authority", "server-confirmed");
  await expect(arena).toHaveAttribute("data-board-id", "open-seas");
  expect(joins.length).toBeGreaterThanOrEqual(2);
  expect(joins[0]).toMatchObject({ boardId: "black-pearl-relay" });
  expect(joins[1]).not.toHaveProperty("boardId");
  for (const reconnect of joins.slice(2)) {
    expect(reconnect).not.toHaveProperty("boardId");
    expect(reconnect).toHaveProperty("reconnectToken");
  }

  await page.getByTestId("live-exit-button").click();
  const picker = page.getByTestId("board-picker");
  await expect(picker).toHaveAttribute("data-board-id", "open-seas");
  await expect(picker).toHaveAttribute("data-board-locked", "true");
  await expect(picker).toContainText("CANNOT BE OVERRIDDEN");
});
