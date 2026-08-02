import { expect, test } from "@playwright/test";
import { AuthoritativeArenaServer } from "../../server/src/server";
import {
  PROTOCOL_VERSION,
  type PublicDropState,
  type PublicPlayerState,
  type SnapshotMessage,
  type WelcomeMessage,
  type WorldMessage,
} from "../../server/src/protocol";

let arenaServer: AuthoritativeArenaServer;
let arenaUrl: string;

test.beforeAll(async () => {
  arenaServer = new AuthoritativeArenaServer({
    host: "127.0.0.1",
    port: 0,
    targetPopulation: 4,
    targetDropCount: 120,
    arenaRadius: 1_200,
    fixedStepHz: 30,
    snapshotHz: 15,
    reconnectGraceMs: 3_000,
  });
  arenaUrl = (await arenaServer.start()).websocketUrl;
});

test.afterAll(async () => {
  await arenaServer.stop();
});

test("a free Captain Room accepts its server-owned board and reaches live authority", async ({ page }) => {
  const room = "captain-10-0123456789abcdefabcd";
  await page.goto(`/?room=${room}&arena_ws=${encodeURIComponent(arenaUrl)}`);

  const arena = page.getByTestId("live-arena-canvas");
  await expect(arena).toHaveAttribute("data-authority", "server-confirmed");
  await expect(arena).toHaveAttribute("data-board-id", "captain-cove-10");
  await expect(arena).toHaveAttribute("data-player-count", "1");
  await expect(page.getByTestId("live-human-count")).toContainText("1 HUMAN");
  await expect(page.getByTestId("captain-passport")).toHaveCount(0);
});

test("two browser sessions share a confirmed server-owned room", async ({ browser }) => {
  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  const first = await firstContext.newPage();
  const second = await secondContext.newPage();
  const room = `browser-proof-${Date.now().toString(36)}`;
  const path = `/?room=${room}&board=black-pearl-relay&arena_ws=${encodeURIComponent(arenaUrl)}`;

  await Promise.all([first.goto(path), second.goto(path)]);
  await expect(first.getByTestId("lobby-room-identity")).toHaveText(`ROOM #${room.toUpperCase()}`);
  await expect(second.getByTestId("lobby-room-identity")).toHaveText(`ROOM #${room.toUpperCase()}`);
  await Promise.all([
    first.getByTestId("settings-button").click(),
    second.getByTestId("settings-button").click(),
  ]);
  await expect(first.getByTestId("board-picker")).toHaveAttribute("data-board-id", "black-pearl-relay");
  await expect(second.getByTestId("board-picker")).toHaveAttribute("data-board-id", "black-pearl-relay");
  await Promise.all([
    first.getByTestId("settings-close").click(),
    second.getByTestId("settings-close").click(),
  ]);
  await first.getByLabel("Your arena name").fill("Browser Alice");
  await second.getByLabel("Your arena name").fill("Browser Bob");

  await Promise.all([
    first.getByTestId("live-lab-button").click(),
    second.getByTestId("live-lab-button").click(),
  ]);

  const firstArena = first.getByTestId("live-arena-canvas");
  const secondArena = second.getByTestId("live-arena-canvas");
  await expect(first.getByTestId("live-status")).toHaveText("LIVE · SERVER AUTHORITATIVE");
  await expect(second.getByTestId("live-status")).toHaveText("LIVE · SERVER AUTHORITATIVE");
  await expect(firstArena).toHaveAttribute("data-authority", "server-confirmed");
  await expect(secondArena).toHaveAttribute("data-authority", "server-confirmed");
  await expect(firstArena).toHaveAttribute("data-board-id", "black-pearl-relay");
  await expect(secondArena).toHaveAttribute("data-board-id", "black-pearl-relay");
  await expect(firstArena).toHaveAttribute("data-player-count", "4");
  await expect(secondArena).toHaveAttribute("data-player-count", "4");
  await expect(first.getByTestId("live-human-count")).toContainText("2 HUMANS");
  await expect(second.getByTestId("live-human-count")).toContainText("2 HUMANS");
  const firstRoomIdentity = first.getByTestId("room-identity");
  await expect(firstRoomIdentity).toHaveText(new RegExp(`LIVE ROOM #${room.toUpperCase()}`, "u"));
  await expect(firstRoomIdentity).toHaveAttribute("data-room-id", room);
  await expect(first.getByTestId("in-game-invite")).toBeVisible();
  const firstRadar = first.getByTestId("pirate-radar");
  await expect(firstRadar).toBeVisible();
  await expect(firstRadar).toHaveAttribute("data-room-id", room);
  const visibleRadarCounts = await firstRadar.evaluate((element) => ({
    rivals: Number(element.getAttribute("data-rival-marker-count")),
    other: Number(element.getAttribute("data-other-player-count")),
    humans: Number(element.getAttribute("data-human-player-count")),
    ai: Number(element.getAttribute("data-ai-player-count")),
  }));
  expect(visibleRadarCounts.rivals).toBe(visibleRadarCounts.other);
  expect(visibleRadarCounts.other).toBeGreaterThanOrEqual(0);
  expect(visibleRadarCounts.other).toBeLessThanOrEqual(3);
  expect(visibleRadarCounts.humans + visibleRadarCounts.ai).toBe(visibleRadarCounts.other);
  await expect(firstRadar).toHaveAttribute("data-station-count", "2");
  await expect(firstRadar).toHaveAttribute("data-spyglass-bearing-count", "0");
  await expect(firstRadar).toHaveAttribute(
    "data-fair-intel",
    "arena-bounds,self-heading,full-population-map,collector,public-hazard,stations",
  );
  await expect(firstRadar.getByTestId("radar-player")).toBeVisible();
  await expect(firstRadar.getByTestId("radar-other-player")).toHaveCount(visibleRadarCounts.other);
  await expect(firstRadar.getByTestId("radar-collector")).toHaveCount(1);
  await expect(firstRadar.getByTestId("radar-station")).toHaveCount(2);
  const exactMass = Number(await firstArena.getAttribute("data-player-mass"));
  const baseRadius = Number(await firstArena.getAttribute("data-collision-base-radius"));
  const massFactor = Number(await firstArena.getAttribute("data-collision-mass-factor"));
  const bodyFactor = Number(await firstArena.getAttribute("data-collision-body-factor"));
  const renderedHeadRadius = Number(await firstArena.getAttribute("data-collision-head-radius"));
  const renderedBodyRadius = Number(await firstArena.getAttribute("data-collision-body-radius"));
  const expectedHeadRadius = baseRadius + Math.sqrt(exactMass) * massFactor;
  expect(baseRadius).toBeCloseTo(8, 5);
  expect(massFactor).toBeCloseTo(0.68, 5);
  expect(bodyFactor).toBeCloseTo(0.98, 5);
  expect(renderedHeadRadius).toBeCloseTo(expectedHeadRadius, 2);
  expect(renderedBodyRadius).toBeCloseTo(expectedHeadRadius * bodyFactor, 2);
  expect(renderedBodyRadius).toBeLessThan(renderedHeadRadius);
  expect(renderedBodyRadius / renderedHeadRadius).toBeCloseTo(0.98, 2);
  const firstPlayerId = await firstArena.getAttribute("data-player-id");
  expect(firstPlayerId).toMatch(/^human-/u);
  await Promise.all([
    first.screenshot({ path: "proof/browser/multiplayer/01-alice-live.png", fullPage: true }),
    second.screenshot({ path: "proof/browser/multiplayer/02-bob-live.png", fullPage: true }),
  ]);

  const beforeTick = Number(await firstArena.getAttribute("data-server-tick"));
  await first.keyboard.press("ArrowDown");
  await first.keyboard.down("Space");
  await first.waitForTimeout(220);
  await first.keyboard.up("Space");
  await expect.poll(async () => Number(await firstArena.getAttribute("data-server-tick"))).toBeGreaterThan(beforeTick);

  // Reload keeps the reconnect token in this tab's sessionStorage. The room is
  // not called LIVE again until the replacement socket gets a welcome and a
  // fresh authoritative snapshot.
  await first.reload();
  await first.getByTestId("live-lab-button").click();
  await expect(first.getByTestId("live-status")).toHaveText("LIVE · SERVER AUTHORITATIVE");
  await expect(firstArena).toHaveAttribute("data-authority", "server-confirmed");
  await expect(firstArena).toHaveAttribute("data-player-id", firstPlayerId ?? "missing-player-id");
  await expect(firstArena).toHaveAttribute("data-board-id", "black-pearl-relay");
  await expect(first.getByTestId("live-human-count")).toContainText("2 HUMANS");

  await first.getByTestId("in-game-invite").click();
  const inviteDialog = first.getByTestId("room-invite-dialog");
  await expect(inviteDialog).toContainText(`ROOM #${room.toUpperCase()}`);
  const invite = new URL(await first.getByTestId("room-invite-url").inputValue());
  expect(invite.searchParams.get("room")).toBe(room);
  expect(invite.searchParams.get("board")).toBe("black-pearl-relay");
  await first.getByRole("button", { name: "CLOSE" }).click();

  await Promise.all([firstContext.close(), secondContext.close()]);
});

test("Heat Ring UI reconciles a resolved hoard from the event's real death-drop IDs and mass", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const roomId = "heat-ring-client-resolved";
  const playerId = "human-heat-proof";
  const botIds = ["bot-ruby-wake", "bot-jade-jib"] as const;
  const heatRing: NonNullable<WorldMessage["heatRing"]> = {
    phase: "active",
    theme: "corsair",
    center: { x: 320, y: 0 },
    radius: 340,
    safeSpawnRadius: 380,
    botIds,
    startsAtTick: 0,
    reverseAtTick: 30,
    earliestResolveTick: 90,
    deadlineTick: 240,
  };
  const collisionRadii = {
    baseRadius: 8,
    massRadiusFactor: 0.68,
    bodyRadiusFactor: 0.98,
  };
  const player = (
    id: string,
    name: string,
    kind: PublicPlayerState["kind"],
    position: { x: number; y: number },
    alive = true,
  ): PublicPlayerState => ({
    id,
    name,
    kind,
    connected: true,
    alive,
    position,
    direction: { x: 1, y: 0 },
    body: [
      { x: position.x - 20, y: position.y },
      { x: position.x - 40, y: position.y },
      { x: position.x - 60, y: position.y },
    ],
    mass: 48,
    kills: 0,
    score: 0,
    shieldTicksRemaining: 0,
  });
  const jewels: PublicDropState[] = [
    {
      id: "ruby-hoard-1",
      position: { x: 478, y: 22 },
      mass: 3.25,
      radius: 5.2,
      source: "death",
      originPlayerId: botIds[0],
    },
    {
      id: "ruby-hoard-2",
      position: { x: 491, y: 8 },
      mass: 5.5,
      radius: 5.2,
      source: "death",
      originPlayerId: botIds[0],
    },
    {
      id: "jade-hoard-1",
      position: { x: 504, y: -15 },
      mass: 8.5,
      radius: 5.2,
      source: "death",
      originPlayerId: botIds[0],
    },
  ];
  let resolved = false;
  let tick = 0;
  let socketSend: ((data: string) => void) | undefined;
  const sendSnapshot = (events: SnapshotMessage["events"], dropUpserts: PublicDropState[] = []) => {
    const snapshot: SnapshotMessage = {
      type: "snapshot",
      protocolVersion: PROTOCOL_VERSION,
      authority: "server",
      roomId,
      tick,
      serverTimeMs: 40_000 + tick,
      players: [
        player(playerId, "Heat Proof", "human", { x: 0, y: 0 }),
        player(botIds[0], "Ruby Wake", "bot", { x: 300, y: 20 }, !resolved),
        player(botIds[1], "Jade Jib", "bot", { x: 340, y: -20 }, true),
      ],
      dropUpserts,
      removedDropIds: [],
      events,
    };
    socketSend?.(JSON.stringify(snapshot));
  };

  await page.routeWebSocket("ws://heat-ring-resolved.test/arena", (socket) => {
    socketSend = (data) => socket.send(data);
    socket.onMessage((raw) => {
      const message = JSON.parse(typeof raw === "string" ? raw : raw.toString()) as {
        type?: string;
        direction?: { y?: number };
      };
      if (message.type === "join") {
        const welcome: WelcomeMessage = {
          type: "welcome",
          protocolVersion: PROTOCOL_VERSION,
          authority: "server",
          roomId,
          playerId,
          reconnectToken: "heat-resolved-reconnect-token-0001",
          reconnected: false,
          tick,
          fixedStepSeconds: 1 / 30,
          lastAcceptedSequence: -1,
        };
        const world: WorldMessage = {
          type: "world",
          protocolVersion: PROTOCOL_VERSION,
          authority: "server",
          roomId,
          tick,
          arenaRadius: 1_200,
          collisionRadii,
          drops: [],
          heatRing,
        };
        socket.send(JSON.stringify(welcome));
        socket.send(JSON.stringify(world));
        sendSnapshot([{ type: "heatRingStarted", tick, heatRing }]);
        return;
      }
      if (message.type !== "input" || resolved || (message.direction?.y ?? 0) < 0.7) return;
      resolved = true;
      tick = 111;
      sendSnapshot([
        {
          type: "playerDied",
          tick,
          playerId: botIds[0],
          killerId: botIds[1],
          cause: "collision",
          collisionTime: 0.42,
        },
        {
          type: "heatRingResolved",
          tick,
          botIds,
          winnerId: botIds[1],
          defeatedId: botIds[0],
          dropIds: jewels.map((drop) => drop.id),
          totalMass: jewels.reduce((sum, drop) => sum + drop.mass, 0),
        },
      ], jewels);
    });
  });

  await page.goto(`/?room=${roomId}&arena_ws=${encodeURIComponent("ws://heat-ring-resolved.test/arena")}`);
  await page.getByLabel("Your arena name").fill("Heat Proof");
  await page.getByTestId("live-lab-button").click();
  const arena = page.getByTestId("live-arena-canvas");
  await expect(page.getByTestId("live-status")).toHaveText("LIVE · SERVER AUTHORITATIVE");
  await expect(arena).toHaveAttribute("data-heat-ring-phase", "active");
  await expect(arena).toHaveAttribute("data-heat-ring-bots", "2");
  await expect(arena).toHaveAttribute("data-heat-ring-jewels", "0");
  await expect(arena).toHaveAttribute("data-heat-ring-mass", "0");
  await expect(page.getByTestId("live-action-callout")).toContainText("CORSAIR HEAT RING");
  const radar = page.getByTestId("pirate-radar");
  await expect(radar).toHaveAttribute("data-hazard-count", "1");
  await expect(radar).toHaveAttribute("data-other-player-count", "2");
  const radarHeatRing = radar.getByTestId("radar-heat-ring");
  await expect(radarHeatRing).toHaveAttribute("data-world-radius", "340");
  expect(Number(await radarHeatRing.locator("circle").getAttribute("r"))).toBeCloseTo(11.62, 2);

  await page.keyboard.press("ArrowDown");
  await expect(arena).toHaveAttribute("data-heat-ring-phase", "resolved");
  await expect(arena).toHaveAttribute("data-heat-ring-bots", "2");
  await expect(arena).toHaveAttribute("data-heat-ring-jewels", "3");
  await expect(arena).toHaveAttribute("data-heat-ring-mass", "17.25");
  await expect(arena).toHaveAttribute("data-rival-remains-count", "3");
  await expect(radar).toHaveAttribute("data-hazard-count", "0");
  await expect(radarHeatRing).toHaveCount(0);
  const callout = page.getByTestId("live-action-callout");
  await expect(callout).toContainText("JADE JIB WINS");
  await expect(callout).toContainText("RIVAL HOARD RELEASED · 3 REAL JEWELS · 17.3 SIZE");
  await expect(callout).not.toContainText("VERIFYING");
  expect(pageErrors).toEqual([]);
});

test("Heat Ring UI clears an authoritative abort without inventing treasure", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const roomId = "heat-ring-client-aborted";
  const playerId = "human-heat-abort";
  const botIds = ["bot-ruby-abort", "bot-jade-abort"] as const;
  const heatRing: NonNullable<WorldMessage["heatRing"]> = {
    phase: "active",
    theme: "corsair",
    center: { x: 320, y: 0 },
    radius: 340,
    safeSpawnRadius: 380,
    botIds,
    startsAtTick: 0,
    reverseAtTick: 30,
    earliestResolveTick: 90,
    deadlineTick: 240,
  };
  let tick = 0;
  let aborted = false;
  let socketSend: ((data: string) => void) | undefined;
  const players: PublicPlayerState[] = [
    {
      id: playerId,
      name: "Abort Proof",
      kind: "human",
      connected: true,
      alive: true,
      position: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      body: [{ x: -20, y: 0 }, { x: -40, y: 0 }, { x: -60, y: 0 }],
      mass: 48,
      kills: 0,
      score: 0,
      shieldTicksRemaining: 20,
    },
    ...botIds.map((id, index): PublicPlayerState => ({
      id,
      name: index === 0 ? "Ruby Wake" : "Jade Jib",
      kind: "bot",
      connected: true,
      alive: true,
      position: { x: 480 + index * 20, y: index === 0 ? 20 : -20 },
      direction: { x: index === 0 ? 1 : -1, y: 0 },
      body: [{ x: 460 + index * 20, y: index === 0 ? 20 : -20 }],
      mass: 48,
      kills: 0,
      score: 0,
      shieldTicksRemaining: 0,
    })),
  ];
  const sendSnapshot = (events: SnapshotMessage["events"]) => {
    const snapshot: SnapshotMessage = {
      type: "snapshot",
      protocolVersion: PROTOCOL_VERSION,
      authority: "server",
      roomId,
      tick,
      serverTimeMs: 50_000 + tick,
      players,
      dropUpserts: [],
      removedDropIds: [],
      events,
    };
    socketSend?.(JSON.stringify(snapshot));
  };

  await page.routeWebSocket("ws://heat-ring-aborted.test/arena", (socket) => {
    socketSend = (data) => socket.send(data);
    socket.onMessage((raw) => {
      const message = JSON.parse(typeof raw === "string" ? raw : raw.toString()) as {
        type?: string;
        direction?: { y?: number };
      };
      if (message.type === "join") {
        const welcome: WelcomeMessage = {
          type: "welcome",
          protocolVersion: PROTOCOL_VERSION,
          authority: "server",
          roomId,
          playerId,
          reconnectToken: "heat-abort-reconnect-token-0001",
          reconnected: false,
          tick,
          fixedStepSeconds: 1 / 30,
          lastAcceptedSequence: -1,
        };
        const world: WorldMessage = {
          type: "world",
          protocolVersion: PROTOCOL_VERSION,
          authority: "server",
          roomId,
          tick,
          arenaRadius: 1_200,
          collisionRadii: {
            baseRadius: 8,
            massRadiusFactor: 0.68,
            bodyRadiusFactor: 0.98,
          },
          drops: [],
        };
        socket.send(JSON.stringify(welcome));
        socket.send(JSON.stringify(world));
        // This fixture intentionally starts from an ordinary WorldMessage so
        // the active attributes must come from the validated started event.
        sendSnapshot([{ type: "heatRingStarted", tick, heatRing }]);
        return;
      }
      if (message.type !== "input" || aborted || (message.direction?.y ?? 0) > -0.7) return;
      aborted = true;
      tick = 30;
      sendSnapshot([{
        type: "heatRingAborted",
        tick,
        botIds,
        reason: "second-human",
      }]);
    });
  });

  await page.goto(`/?room=${roomId}&arena_ws=${encodeURIComponent("ws://heat-ring-aborted.test/arena")}`);
  await page.getByLabel("Your arena name").fill("Abort Proof");
  await page.getByTestId("live-lab-button").click();
  const arena = page.getByTestId("live-arena-canvas");
  await expect(page.getByTestId("live-status")).toHaveText("LIVE · SERVER AUTHORITATIVE");
  await expect(arena).toHaveAttribute("data-heat-ring-phase", "active");
  await expect(arena).toHaveAttribute("data-heat-ring-bots", "2");

  await page.keyboard.press("ArrowUp");
  await expect(arena).toHaveAttribute("data-heat-ring-phase", "aborted");
  await expect(arena).toHaveAttribute("data-heat-ring-bots", "2");
  await expect(arena).toHaveAttribute("data-heat-ring-jewels", "0");
  await expect(arena).toHaveAttribute("data-heat-ring-mass", "0");
  await expect(arena).toHaveAttribute("data-rival-remains-count", "0");
  await expect(page.getByTestId("live-action-callout")).toContainText(
    "CORSAIR DUEL CLEARED · HUMAN CREW ARRIVED",
  );
  expect(pageErrors).toEqual([]);
});

test("Treasure Magnet is visible and active while Rival Remains stay outside its pull", async ({ page }) => {
  expect(PROTOCOL_VERSION).toBe(5);
  const roomId = "collector-client-proof";
  const playerId = "human-collector-proof";
  const collectorDropId = "collector-beacon-proof";
  const fixedStepSeconds = 1 / 30;
  const collisionRadii = {
    baseRadius: 8,
    massRadiusFactor: 0.68,
    bodyRadiusFactor: 0.98,
  };
  const drops: PublicDropState[] = [
    {
      id: "neutral-spark-proof",
      position: { x: 20, y: 0 },
      mass: 2,
      radius: 5,
      source: "arena",
    },
    {
      id: "pop-cluster-proof",
      position: { x: 74, y: -42 },
      mass: 5.8,
      radius: 6.2,
      source: "arena",
    },
    {
      id: "sprint-drop-proof",
      position: { x: 90, y: 0 },
      mass: 1.5,
      radius: 5,
      source: "boost",
      originPlayerId: playerId,
    },
    {
      id: "rival-remains-proof",
      position: { x: 115, y: -20 },
      mass: 3,
      radius: 6,
      source: "death",
      originPlayerId: "bot-rival-proof",
    },
    {
      id: collectorDropId,
      position: { x: 32, y: 0 },
      mass: 0,
      radius: 9,
      source: "arena",
      specialist: "collector",
      specialistDurationTicks: 360,
    },
  ];
  const publicPlayer = (active: boolean, tick: number): PublicPlayerState => ({
    id: playerId,
    name: "Collector Proof",
    kind: "human",
    connected: true,
    alive: true,
    position: { x: 0, y: 0 },
    direction: { x: 1, y: 0 },
    body: [
      { x: -22, y: 0 },
      { x: -44, y: 0 },
      { x: -66, y: 0 },
    ],
    mass: 100,
    kills: 0,
    score: 100,
    shieldTicksRemaining: 0,
    ...(active ? {
      specialist: {
        kind: "collector" as const,
        activatedAtTick: tick,
        expiresAtTick: tick + 360,
        durationTicks: 360,
      },
    } : {}),
  });

  await page.routeWebSocket("ws://collector-fixture.test/arena", (socket) => {
    let tick = 100;
    let active = false;
    let pullSent = false;
    const sendSnapshot = (
      removedDropIds: string[] = [],
      events: SnapshotMessage["events"] = [],
    ) => {
      const snapshot: SnapshotMessage = {
        type: "snapshot",
        protocolVersion: PROTOCOL_VERSION,
        authority: "server",
        roomId,
        tick,
        serverTimeMs: 10_000 + tick,
        players: [publicPlayer(active, 105)],
        dropUpserts: [],
        removedDropIds,
        events,
      };
      socket.send(JSON.stringify(snapshot));
    };
    socket.onMessage((raw) => {
      const message = JSON.parse(typeof raw === "string" ? raw : raw.toString()) as {
        type?: string;
        boost?: boolean;
      };
      if (message.type === "join") {
        const welcome: WelcomeMessage = {
          type: "welcome",
          protocolVersion: PROTOCOL_VERSION,
          authority: "server",
          roomId,
          playerId,
          reconnectToken: "collector-proof-reconnect-token-0001",
          reconnected: false,
          tick,
          fixedStepSeconds,
          lastAcceptedSequence: -1,
        };
        const world: WorldMessage = {
          type: "world",
          protocolVersion: PROTOCOL_VERSION,
          authority: "server",
          roomId,
          tick,
          arenaRadius: 1_200,
          collisionRadii,
          drops,
        };
        socket.send(JSON.stringify(welcome));
        socket.send(JSON.stringify(world));
        sendSnapshot();
        return;
      }
      if (message.type !== "input") return;
      tick += 2;
      if (message.boost && !active) {
        active = true;
        tick = 105;
        sendSnapshot([collectorDropId], [{
          type: "specialistActivated",
          tick,
          playerId,
          dropId: collectorDropId,
          specialist: "collector",
          durationTicks: 360,
        }]);
      } else if (active && !pullSent) {
        pullSent = true;
        tick += 2;
        sendSnapshot(["neutral-spark-proof"], [{
          type: "dropCollected",
          tick,
          playerId,
          dropId: "neutral-spark-proof",
          mass: 2,
        }]);
      } else if (active) {
        sendSnapshot();
      }
    });
  });

  await page.goto(`/?room=${roomId}&arena_ws=${encodeURIComponent("ws://collector-fixture.test/arena")}`);
  await page.getByLabel("Your arena name").fill("Collector Proof");
  await page.getByTestId("live-lab-button").click();

  const arena = page.getByTestId("live-arena-canvas");
  const collector = page.getByTestId("live-relic-status");
  await expect(page.getByTestId("live-status")).toHaveText("LIVE · SERVER AUTHORITATIVE");
  await expect(arena).toHaveAttribute("data-collector-beacon-count", "1");
  await expect(arena).toHaveAttribute("data-neutral-spark-count", "2");
  await expect(arena).toHaveAttribute("data-pop-cluster-count", "1");
  await expect(arena).toHaveAttribute("data-sprint-drop-count", "1");
  await expect(arena).toHaveAttribute("data-rival-remains-count", "1");
  await expect(collector).toHaveCount(0);
  await page.screenshot({ path: "proof/browser/multiplayer/03-collector-beacon.png", fullPage: true });

  const headRadiusBefore = await arena.getAttribute("data-collision-head-radius");
  const bodyRadiusBefore = await arena.getAttribute("data-collision-body-radius");
  await page.keyboard.down("Space");
  await expect(arena).toHaveAttribute("data-collector-active", "true");
  await expect(page.getByTestId("live-action-callout")).toContainText("MAGNET ON");
  await expect.poll(
    async () => Number(await arena.getAttribute("data-live-particle-count")),
  ).toBeGreaterThan(0);
  await page.screenshot({ path: "proof/browser/multiplayer/07-live-collector-celebration.png", fullPage: true });
  await page.keyboard.up("Space");
  await expect(collector).toHaveAttribute("data-relic-kind", "loot-compass");
  await expect(collector).toHaveAccessibleName("Treasure Magnet Relic status");
  await expect(collector.getByRole("status")).toHaveAccessibleName(/PULLS GEMS \+ YOUR WAKE LOOT/u);
  await expect(arena).toHaveAttribute("data-neutral-spark-count", "1");
  await expect.poll(
    async () => Number(await arena.getAttribute("data-collector-pull-events")),
  ).toBeGreaterThan(0);
  await expect(arena).toHaveAttribute("data-collector-beacon-count", "0");
  await expect(arena).toHaveAttribute("data-rival-remains-count", "1");
  await expect(arena).toHaveAttribute("data-collision-head-radius", headRadiusBefore ?? "missing");
  await expect(arena).toHaveAttribute("data-collision-body-radius", bodyRadiusBefore ?? "missing");
  await page.screenshot({ path: "proof/browser/multiplayer/04-collector-active.png", fullPage: true });

  // The fixture keeps publishing authoritative active-Loot-Compass frames with no
  // removal for the Rival Remains. The client must retain and render them.
  await page.waitForTimeout(180);
  await expect(arena).toHaveAttribute("data-rival-remains-count", "1");
});

test("a server-confirmed chain cut produces bounded live celebration feedback", async ({ page }) => {
  const roomId = "live-cut-feedback-proof";
  const playerId = "human-cut-proof";
  const rivalId = "bot-cut-proof";
  const collisionRadii = {
    baseRadius: 8,
    massRadiusFactor: 0.68,
    bodyRadiusFactor: 0.98,
  };
  let tick = 400;
  let cutSent = false;
  let socketSend: ((data: string) => void) | undefined;
  const ownPlayer: PublicPlayerState = {
    id: playerId,
    name: "Cut Proof",
    kind: "human",
    connected: true,
    alive: true,
    position: { x: 0, y: 0 },
    direction: { x: 1, y: 0 },
    body: [{ x: -22, y: 0 }, { x: -44, y: 0 }],
    mass: 112,
    kills: 1,
    score: 640,
    shieldTicksRemaining: 0,
  };
  const rival: PublicPlayerState = {
    id: rivalId,
    name: "Drama Llama",
    kind: "bot",
    connected: true,
    alive: true,
    position: { x: 90, y: 35 },
    direction: { x: -1, y: 0 },
    body: [{ x: 112, y: 35 }, { x: 134, y: 35 }, { x: 156, y: 35 }],
    mass: 130,
    kills: 0,
    score: 520,
    shieldTicksRemaining: 0,
  };
  const sendSnapshot = (cut = false) => {
    const snapshot: SnapshotMessage = {
      type: "snapshot",
      protocolVersion: PROTOCOL_VERSION,
      authority: "server",
      roomId,
      tick,
      serverTimeMs: 30_000 + tick,
      players: [ownPlayer, cut ? { ...rival, alive: false } : rival],
      dropUpserts: [],
      removedDropIds: [],
      events: cut ? [{
        type: "playerDied",
        tick,
        playerId: rivalId,
        killerId: playerId,
        cause: "collision",
        collisionTime: 0.42,
      }] : [],
    };
    socketSend?.(JSON.stringify(snapshot));
  };

  await page.routeWebSocket("ws://live-cut-feedback.test/arena", (socket) => {
    socketSend = (data) => socket.send(data);
    socket.onMessage((raw) => {
      const message = JSON.parse(typeof raw === "string" ? raw : raw.toString()) as {
        type?: string;
        direction?: { y?: number };
      };
      if (message.type === "join") {
        const welcome: WelcomeMessage = {
          type: "welcome",
          protocolVersion: PROTOCOL_VERSION,
          authority: "server",
          roomId,
          playerId,
          reconnectToken: "cut-feedback-reconnect-token-0001",
          reconnected: false,
          tick,
          fixedStepSeconds: 1 / 30,
          lastAcceptedSequence: -1,
        };
        const world: WorldMessage = {
          type: "world",
          protocolVersion: PROTOCOL_VERSION,
          authority: "server",
          roomId,
          tick,
          arenaRadius: 1_200,
          collisionRadii,
          drops: [],
        };
        socket.send(JSON.stringify(welcome));
        socket.send(JSON.stringify(world));
        sendSnapshot();
        return;
      }
      if (message.type !== "input" || cutSent || (message.direction?.y ?? 0) < 0.7) return;
      cutSent = true;
      tick += 2;
      sendSnapshot(true);
    });
  });

  await page.goto(`/?room=${roomId}&arena_ws=${encodeURIComponent("ws://live-cut-feedback.test/arena")}`);
  await page.getByLabel("Your arena name").fill("Cut Proof");
  await page.getByTestId("live-lab-button").click();
  const arena = page.getByTestId("live-arena-canvas");
  await expect(page.getByTestId("live-status")).toHaveText("LIVE · SERVER AUTHORITATIVE");
  await page.keyboard.press("ArrowDown");
  const cutCallout = page.getByTestId("live-action-callout");
  await expect(cutCallout).toContainText("CHAIN CUT · Drama Llama RELEASED");
  await expect(cutCallout).toHaveCSS("opacity", "1", { timeout: 1_000 });
  const emittedParticles = Number(await arena.getAttribute("data-live-particle-emissions"));
  expect(emittedParticles).toBeGreaterThan(0);
  expect(emittedParticles).toBeLessThanOrEqual(20);
  await page.screenshot({ path: "proof/browser/multiplayer/08-live-chain-cut-celebration.png", fullPage: true });
});

test("live lesson uses touch anchor, score rank, real Sprint spend, and honest respawn copy", async ({ page }) => {
  test.setTimeout(25_000);
  await page.setViewportSize({ width: 915, height: 412 });
  const roomId = "live-lesson-proof";
  const playerId = "human-live-lesson";
  const rivalId = "bot-live-rival";
  const sparkId = "live-tutorial-spark";
  const collisionRadii = {
    baseRadius: 8,
    massRadiusFactor: 0.68,
    bodyRadiusFactor: 0.98,
  };
  let tick = 200;
  let mass = 100;
  let alive = true;
  let positionY = 0;
  let overshot = false;
  let collected = false;
  let spent = false;
  let died = false;
  let socketSend: ((data: string) => void) | undefined;

  const ownPlayer = (): PublicPlayerState => ({
    id: playerId,
    name: "Touch Proof",
    kind: "human",
    connected: true,
    alive,
    position: { x: 45, y: positionY },
    direction: overshot ? { x: 0, y: 1 } : { x: 1, y: 0 },
    body: [{ x: 23, y: positionY }, { x: 1, y: positionY }, { x: -21, y: positionY }],
    mass,
    kills: 0,
    score: 100,
    shieldTicksRemaining: alive ? 70 : 0,
  });
  const rival: PublicPlayerState = {
    id: rivalId,
    name: "Rank Rival",
    kind: "bot",
    connected: true,
    alive: true,
    position: { x: 260, y: 0 },
    direction: { x: -1, y: 0 },
    body: [{ x: 282, y: 0 }, { x: 304, y: 0 }],
    mass: 120,
    kills: 1,
    score: 250,
    shieldTicksRemaining: 0,
  };
  const sendSnapshot = (
    events: SnapshotMessage["events"] = [],
    removedDropIds: string[] = [],
  ) => {
    const snapshot: SnapshotMessage = {
      type: "snapshot",
      protocolVersion: PROTOCOL_VERSION,
      authority: "server",
      roomId,
      tick,
      serverTimeMs: 20_000 + tick,
      players: [ownPlayer(), rival],
      dropUpserts: [],
      removedDropIds,
      events,
    };
    socketSend?.(JSON.stringify(snapshot));
  };

  await page.routeWebSocket("ws://live-lesson.test/arena", (socket) => {
    socketSend = (data) => socket.send(data);
    socket.onMessage((raw) => {
      const message = JSON.parse(typeof raw === "string" ? raw : raw.toString()) as {
        type?: string;
        boost?: boolean;
        direction?: { x?: number; y?: number };
      };
      if (message.type === "join") {
        const welcome: WelcomeMessage = {
          type: "welcome",
          protocolVersion: PROTOCOL_VERSION,
          authority: "server",
          roomId,
          playerId,
          reconnectToken: "live-lesson-reconnect-token-0001",
          reconnected: false,
          tick,
          fixedStepSeconds: 1 / 30,
          lastAcceptedSequence: -1,
        };
        const world: WorldMessage = {
          type: "world",
          protocolVersion: PROTOCOL_VERSION,
          authority: "server",
          roomId,
          tick,
          arenaRadius: 1_200,
          collisionRadii,
          drops: [
            {
              id: sparkId,
              position: { x: 45, y: 70 },
              mass: 4.5,
              radius: 7.5,
              source: "arena",
            },
            {
              id: "live-forward-retarget-spark",
              position: { x: 45, y: 300 },
              mass: 4.5,
              radius: 7.5,
              source: "arena",
            },
          ],
        };
        socket.send(JSON.stringify(welcome));
        socket.send(JSON.stringify(world));
        sendSnapshot();
        return;
      }
      if (message.type !== "input") return;
      tick += 2;
      if (!overshot && (message.direction?.y ?? 0) > 0.7) {
        overshot = true;
        positionY = 180;
        sendSnapshot();
        return;
      }
      if (overshot && !collected && (message.direction?.y ?? 0) > 0.7) {
        collected = true;
        mass += 4.5;
        sendSnapshot([{
          type: "dropCollected",
          tick,
          playerId,
          dropId: "live-forward-retarget-spark",
          mass: 4.5,
        }], ["live-forward-retarget-spark"]);
        return;
      }
      if (collected && message.boost && !spent) {
        spent = true;
        mass -= 1.5;
        sendSnapshot([{
          type: "massShed",
          tick,
          playerId,
          dropId: "live-sprint-drop",
          mass: 1.5,
        }]);
        return;
      }
      if (spent && !message.boost && !died) {
        died = true;
        alive = false;
        sendSnapshot([{
          type: "playerDied",
          tick,
          playerId,
          killerId: rivalId,
          cause: "collision",
          collisionTime: 0.4,
        }]);
        setTimeout(() => {
          tick += 12;
          alive = true;
          sendSnapshot([{
            type: "playerSpawned",
            tick,
            playerId,
          }]);
        }, 750);
        return;
      }
      sendSnapshot();
    });
  });

  await page.goto(`/?room=${roomId}&arena_ws=${encodeURIComponent("ws://live-lesson.test/arena")}`);
  await page.getByLabel("Your arena name").fill("Touch Proof");
  await page.getByTestId("live-lab-button").click();
  const arena = page.getByTestId("live-arena-canvas");
  await expect(page.getByTestId("live-status")).toHaveText("LIVE · SERVER AUTHORITATIVE");
  await expect(arena).toHaveAttribute("data-tutorial-stage", "steer");
  const tutorial = page.getByTestId("tutorial-coach");
  await expect(tutorial).toHaveAccessibleName("Turn your moving worm.");
  await expect(tutorial).toContainText("TURN TO TAKE CONTROL");
  await expect(page.getByTestId("live-hud-rank")).toContainText("PLACE");
  await expect(page.getByTestId("live-hud-rank")).toHaveAccessibleName("Rank 2 of 2");
  await expect(page.getByLabel("Live score leaderboard")).toContainText(
    "NAMES · SCORE · YOUR PLACE IN THE FIELD",
  );
  await expect(page.getByLabel("Live score leaderboard")).toContainText("Touch Proof · YOU");
  await expect(page.getByTestId("live-next-rank-gap")).toContainText("NEXT RANK +150");
  await expect(page.getByTestId("live-hud-length")).toContainText("SIZE");
  await page.keyboard.press("ArrowLeft");
  await expect(arena).toHaveAttribute("data-tutorial-stage", "steer");

  const session = await page.context().newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 90, y: 250, radiusX: 4, radiusY: 4, force: 1, id: 1 }],
  });
  await expect(page.getByTestId("live-touch-guide")).toBeVisible();
  await page.screenshot({ path: "proof/browser/multiplayer/05-live-mobile-touch.png", fullPage: true });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: 90, y: 330, radiusX: 4, radiusY: 4, force: 1, id: 1 }],
  });
  await expect(arena).toHaveAttribute("data-tutorial-stage", "sprint");
  await expect(arena).toHaveAttribute("data-tutorial-retarget-reason", "behind");
  await expect.poll(
    async () => Number(await arena.getAttribute("data-tutorial-retarget-count")),
  ).toBeGreaterThan(0);
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.getByTestId("live-touch-guide")).toHaveCount(0);

  await page.keyboard.down("Space");
  await expect(arena).toHaveAttribute("data-tutorial-stage", "sprint-release");
  await expect(arena).toHaveAttribute("data-tutorial-sprint-spent", "true");
  await page.keyboard.up("Space");
  await expect(arena).toHaveAttribute("data-tutorial-stage", "collision");
  await expect(arena).toHaveAttribute("data-player-alive", "false");
  await expect(page.getByTestId("live-death-notice")).toHaveAttribute(
    "aria-label",
    "YOU CRASHED · YOUR HEAD HIT RANK RIVAL'S CREW · RESPAWNING…",
  );
  await expect(page.getByTestId("live-death-notice").locator(".collision-impact-mark")).toBeVisible();
  await expect(page.getByTestId("live-death-notice")).not.toContainText("☠");
  await expect(page.getByTestId("room-identity")).toContainText(`LIVE ROOM #${roomId.toUpperCase()}`);
  await expect(page.getByTestId("pirate-radar")).toContainText("RESPAWNING");
  await page.screenshot({ path: "proof/browser/multiplayer/06-live-mobile-death.png", fullPage: true });
  await expect(arena).toHaveAttribute("data-player-alive", "true", { timeout: 2_000 });
  await expect(page.getByTestId("live-death-notice")).toHaveAttribute(
    "aria-label",
    "BACK IN · HEAD SAFE 1.5S · EVERY CREW BODY STAYS LETHAL",
  );
});

test("an unreachable socket never receives a LIVE label", async ({ page }) => {
  await page.goto("/?arena_ws=ws%3A%2F%2F127.0.0.1%3A9&room=offline-proof");
  await page.getByTestId("live-lab-button").click();
  const status = page.getByTestId("live-status");
  await expect(status).not.toHaveText("LIVE · SERVER AUTHORITATIVE");
  await expect(page.getByTestId("live-arena-canvas")).toHaveAttribute("data-authority", "unconfirmed");
});
