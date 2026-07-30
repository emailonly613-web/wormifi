import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  PROTOCOL_VERSION,
  type PublicPlayerState,
  type SnapshotMessage,
  type WelcomeMessage,
  type WorldMessage,
} from "../../server/src/protocol";

async function expectInsideViewport(locator: Locator, page: Page) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
}

test("keeps honest local identity and the pirate chart through play, results, and replay", async ({ page }) => {
  test.setTimeout(50_000);
  await page.goto("/");
  await page.getByTestId("solo-run-button").click();

  const roomIdentity = page.getByTestId("room-identity");
  const radar = page.getByTestId("pirate-radar");
  await expect(roomIdentity).toContainText("SOLO RUN — NO LIVE ROOM");
  await expect(radar).toBeVisible();
  await expect(radar).toHaveAttribute("data-room-id", "none");
  await expect(radar).toHaveAttribute("data-human-player-count", "0");
  const localCrewCounts = await radar.evaluate((element) => ({
    other: Number(element.getAttribute("data-other-player-count")),
    ai: Number(element.getAttribute("data-ai-player-count")),
  }));
  expect(localCrewCounts.other).toBeGreaterThan(0);
  expect(localCrewCounts.ai).toBe(localCrewCounts.other);
  await expect(radar).toHaveAttribute("data-station-count", "0");
  await expect(radar).toHaveAttribute(
    "aria-label",
    /shows your position and heading, the arena boundary, \d+ ordinarily visible crew markers/i,
  );
  await expect(radar.getByTestId("radar-other-player").first()).toBeVisible();
  await expectInsideViewport(roomIdentity, page);
  await expectInsideViewport(radar, page);

  await page.keyboard.press("ArrowDown");
  await expect(page.getByTestId("results-panel")).toBeVisible({ timeout: 24_000 });
  await expect(roomIdentity).toContainText("SOLO RUN — NO LIVE ROOM");
  await expect(radar).toBeVisible();
  await expect(radar).toContainText("RUN ENDED");
  await expectInsideViewport(radar, page);

  await page.getByTestId("watch-local-replay").click();
  await expect(page.getByTestId("local-replay-panel")).toBeVisible();
  await expect(page.getByTestId("arena-canvas")).toHaveAttribute("data-replay-state", "playing", {
    timeout: 8_000,
  });
  await expect(roomIdentity).toContainText("SOLO RUN — NO LIVE ROOM");
  await expect(radar).toBeVisible();
  expect(Number(await radar.getAttribute("data-other-player-count"))).toBeGreaterThan(0);
  await expectInsideViewport(radar, page);

  await expect(page.getByTestId("arena-canvas")).toHaveAttribute("data-replay-state", "complete", {
    timeout: 8_000,
  });
  await expect(radar).toBeVisible();
  await expect(radar).toContainText("REPLAY · LAST POSITION");
});

test("maps authoritative crews and Heat Ring geometry on desktop and mobile death states", async ({ page }) => {
  const roomId = "radar-proof-room";
  const playerId = "human-radar-self";
  let tick = 100;
  let alive = true;

  const player = (
    id: string,
    name: string,
    kind: PublicPlayerState["kind"],
    position: { x: number; y: number },
  ): PublicPlayerState => ({
    id,
    name,
    kind,
    connected: true,
    alive: id === playerId ? alive : true,
    position,
    direction: id === playerId ? { x: 0, y: 1 } : { x: 1, y: 0 },
    body: [{ x: position.x - 20, y: position.y }],
    mass: 48,
    kills: 0,
    score: 10,
    shieldTicksRemaining: 0,
  });

  await page.routeWebSocket("ws://radar-proof.test/arena", (socket) => {
    const sendSnapshot = (events: SnapshotMessage["events"] = []) => {
      const snapshot: SnapshotMessage = {
        type: "snapshot",
        protocolVersion: PROTOCOL_VERSION,
        authority: "server",
        roomId,
        tick,
        serverTimeMs: 50_000 + tick,
        players: [
          player(playerId, "Radar Self", "human", { x: 120, y: -60 }),
          // Keep both rivals inside ordinary camera visibility. The radar must
          // map what the captain can already see without leaking global positions.
          player("human-radar-friend", "Radar Friend", "human", { x: 260, y: -40 }),
          player("bot-radar-rival", "Radar Rival", "bot", { x: 20, y: 100 }),
        ],
        dropUpserts: [],
        removedDropIds: [],
        events,
      };
      socket.send(JSON.stringify(snapshot));
    };

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
          reconnectToken: "radar-proof-reconnect-token-0001",
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
            baseRadius: 6.5,
            massRadiusFactor: 0.58,
            bodyRadiusFactor: 0.88,
          },
          drops: [],
          heatRing: {
            phase: "active",
            theme: "corsair",
            center: { x: 300, y: -120 },
            radius: 240,
            safeSpawnRadius: 380,
            botIds: ["bot-radar-rival", "bot-radar-wing"],
            startsAtTick: 0,
            reverseAtTick: 30,
            earliestResolveTick: 90,
            deadlineTick: 240,
          },
        };
        socket.send(JSON.stringify(welcome));
        socket.send(JSON.stringify(world));
        sendSnapshot();
        return;
      }
      if (message.type !== "input" || !alive || (message.direction?.y ?? 0) < 0.7) return;
      alive = false;
      tick += 2;
      sendSnapshot([{
        type: "playerDied",
        tick,
        playerId,
        killerId: "bot-radar-rival",
        cause: "collision",
        collisionTime: 0.4,
      }]);
    });
  });

  await page.goto(`/?room=${roomId}&arena_ws=${encodeURIComponent("ws://radar-proof.test/arena")}`);
  await page.getByTestId("live-lab-button").click();
  const arena = page.getByTestId("live-arena-canvas");
  const roomIdentity = page.getByTestId("room-identity");
  const radar = page.getByTestId("pirate-radar");
  await expect(arena).toHaveAttribute("data-authority", "server-confirmed");
  await expect(roomIdentity).toContainText("LIVE ROOM #RADAR-PROOF-ROOM");
  await expect(radar).toHaveAttribute("data-room-id", roomId);
  await expect(radar).toHaveAttribute("data-other-player-count", "2");
  await expect(radar).toHaveAttribute("data-human-player-count", "1");
  await expect(radar).toHaveAttribute("data-ai-player-count", "1");
  await expect(radar).toHaveAttribute("data-hazard-count", "1");
  await expect(radar).toHaveAttribute("data-station-count", "0");
  await expect(radar.getByTestId("radar-other-player")).toHaveCount(2);
  const heatRing = radar.getByTestId("radar-heat-ring");
  await expect(heatRing).toHaveAttribute("data-world-radius", "240");
  expect(Number(await heatRing.locator("circle").getAttribute("r"))).toBeCloseTo(8.2, 2);
  await expectInsideViewport(roomIdentity, page);
  await expectInsideViewport(radar, page);

  await page.keyboard.press("ArrowDown");
  await expect(arena).toHaveAttribute("data-player-alive", "false");
  await expect(roomIdentity).toContainText("LIVE ROOM #RADAR-PROOF-ROOM");
  await expect(radar).toContainText("RESPAWNING");
  await expect(radar).toHaveAttribute("data-other-player-count", "2");
  await expectInsideViewport(radar, page);
});
