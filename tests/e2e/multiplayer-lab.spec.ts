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

test("two browser sessions share a confirmed server-owned room", async ({ browser }) => {
  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  const first = await firstContext.newPage();
  const second = await secondContext.newPage();
  const room = `browser-proof-${Date.now().toString(36)}`;
  const path = `/?room=${room}&arena_ws=${encodeURIComponent(arenaUrl)}`;

  await Promise.all([first.goto(path), second.goto(path)]);
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
  await expect(firstArena).toHaveAttribute("data-player-count", "4");
  await expect(secondArena).toHaveAttribute("data-player-count", "4");
  await expect(first.getByTestId("live-human-count")).toContainText("2 HUMANS");
  await expect(second.getByTestId("live-human-count")).toContainText("2 HUMANS");
  const exactMass = Number(await firstArena.getAttribute("data-player-mass"));
  const baseRadius = Number(await firstArena.getAttribute("data-collision-base-radius"));
  const massFactor = Number(await firstArena.getAttribute("data-collision-mass-factor"));
  const bodyFactor = Number(await firstArena.getAttribute("data-collision-body-factor"));
  const renderedHeadRadius = Number(await firstArena.getAttribute("data-collision-head-radius"));
  const renderedBodyRadius = Number(await firstArena.getAttribute("data-collision-body-radius"));
  const expectedHeadRadius = baseRadius + Math.sqrt(exactMass) * massFactor;
  expect(renderedHeadRadius).toBeCloseTo(expectedHeadRadius, 2);
  expect(renderedBodyRadius).toBeCloseTo(expectedHeadRadius * bodyFactor, 2);
  expect(renderedBodyRadius).toBeLessThan(renderedHeadRadius);
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
  await expect(first.getByTestId("live-human-count")).toContainText("2 HUMANS");

  await Promise.all([firstContext.close(), secondContext.close()]);
});

test("Collector is visible and active while Rival Remains stay outside its vacuum", async ({ page }) => {
  expect(PROTOCOL_VERSION).toBe(4);
  const roomId = "collector-client-proof";
  const playerId = "human-collector-proof";
  const collectorDropId = "collector-beacon-proof";
  const fixedStepSeconds = 1 / 30;
  const collisionRadii = {
    baseRadius: 9,
    massRadiusFactor: 0.42,
    bodyRadiusFactor: 0.88,
  };
  const drops: PublicDropState[] = [
    {
      id: "neutral-spark-proof",
      position: { x: 60, y: 20 },
      mass: 2,
      radius: 5,
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
    const sendSnapshot = (removedDropIds: string[] = []) => {
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
        events: [],
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
        sendSnapshot([collectorDropId]);
      } else if (active) {
        sendSnapshot();
      }
    });
  });

  await page.goto(`/?room=${roomId}&arena_ws=${encodeURIComponent("ws://collector-fixture.test/arena")}`);
  await page.getByLabel("Your arena name").fill("Collector Proof");
  await page.getByTestId("live-lab-button").click();

  const arena = page.getByTestId("live-arena-canvas");
  const collector = page.getByTestId("live-collector-status");
  await expect(page.getByTestId("live-status")).toHaveText("LIVE · SERVER AUTHORITATIVE");
  await expect(arena).toHaveAttribute("data-collector-beacon-count", "1");
  await expect(arena).toHaveAttribute("data-neutral-spark-count", "1");
  await expect(arena).toHaveAttribute("data-sprint-drop-count", "1");
  await expect(arena).toHaveAttribute("data-rival-remains-count", "1");
  await expect(collector).toContainText("FIND THE CYAN BEACON");
  await page.screenshot({ path: "proof/browser/multiplayer/03-collector-beacon.png", fullPage: true });

  const headRadiusBefore = await arena.getAttribute("data-collision-head-radius");
  const bodyRadiusBefore = await arena.getAttribute("data-collision-body-radius");
  await page.keyboard.down("Space");
  await expect(arena).toHaveAttribute("data-collector-active", "true");
  await page.keyboard.up("Space");
  await expect(collector).toHaveAttribute("data-active", "true");
  await expect(collector).toContainText(/PULLS SPARKS \+ YOUR SPRINT DROPS/u);
  await expect(arena).toHaveAttribute("data-collector-beacon-count", "0");
  await expect(arena).toHaveAttribute("data-rival-remains-count", "1");
  await expect(arena).toHaveAttribute("data-collision-head-radius", headRadiusBefore ?? "missing");
  await expect(arena).toHaveAttribute("data-collision-body-radius", bodyRadiusBefore ?? "missing");
  await page.screenshot({ path: "proof/browser/multiplayer/04-collector-active.png", fullPage: true });

  // The fixture keeps publishing authoritative active-Collector frames with no
  // removal for the Rival Remains. The client must retain and render them.
  await page.waitForTimeout(180);
  await expect(arena).toHaveAttribute("data-rival-remains-count", "1");
});

test("live lesson uses touch anchor, score rank, real Sprint spend, and honest respawn copy", async ({ page }) => {
  test.setTimeout(25_000);
  await page.setViewportSize({ width: 412, height: 915 });
  const roomId = "live-lesson-proof";
  const playerId = "human-live-lesson";
  const rivalId = "bot-live-rival";
  const sparkId = "live-tutorial-spark";
  const collisionRadii = {
    baseRadius: 9,
    massRadiusFactor: 0.42,
    bodyRadiusFactor: 0.88,
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
  await expect(page.getByTestId("tutorial-coach")).toContainText("YOU'RE MOVING");
  await expect(page.getByTestId("live-hud-rank")).toContainText("SCORE RANK");
  await expect(page.getByTestId("live-hud-rank")).toContainText("#2 / 2");
  await expect(page.getByLabel("Live score leaderboard")).toContainText("RESETS ON CRASH");
  await expect(page.getByLabel("Live score leaderboard")).toContainText("Touch Proof · YOU");
  await expect(page.getByTestId("live-next-rank-gap")).toContainText("NEXT RANK +150");
  await expect(page.getByTestId("live-hud-length")).toContainText("SIZE");
  await page.keyboard.press("ArrowLeft");
  await expect(arena).toHaveAttribute("data-tutorial-stage", "steer");

  const session = await page.context().newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 90, y: 480, radiusX: 4, radiusY: 4, force: 1, id: 1 }],
  });
  await expect(page.getByTestId("live-touch-guide")).toBeVisible();
  await page.screenshot({ path: "proof/browser/multiplayer/05-live-mobile-touch.png", fullPage: true });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: 90, y: 570, radiusX: 4, radiusY: 4, force: 1, id: 1 }],
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
  await expect(page.getByTestId("live-death-notice")).toContainText("YOUR HEAD HIT RANK RIVAL'S CREW");
  await page.screenshot({ path: "proof/browser/multiplayer/06-live-mobile-death.png", fullPage: true });
  await expect(arena).toHaveAttribute("data-player-alive", "true", { timeout: 2_000 });
  await expect(page.getByTestId("live-death-notice")).toContainText("DOTTED HALO = SHORT SPAWN GRACE");
});

test("an unreachable socket never receives a LIVE label", async ({ page }) => {
  await page.goto("/?arena_ws=ws%3A%2F%2F127.0.0.1%3A9&room=offline-proof");
  await page.getByTestId("live-lab-button").click();
  const status = page.getByTestId("live-status");
  await expect(status).not.toHaveText("LIVE · SERVER AUTHORITATIVE");
  await expect(page.getByTestId("live-arena-canvas")).toHaveAttribute("data-authority", "unconfirmed");
});
