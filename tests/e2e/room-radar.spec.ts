import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import {
  PROTOCOL_VERSION,
  packSnapshotTupleForWire,
  type PresenceMessage,
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

async function openPhoneMap(page: Page, testInfo: TestInfo) {
  if (!testInfo.project.name.includes("mobile")) return;
  const assist = page.getByTestId("mobile-play-assist");
  const continueButton = assist.getByTestId("mobile-web-continue");
  if (await continueButton.isVisible().catch(() => false)) {
    try {
      await continueButton.click({ timeout: 1_500 });
    } catch (error) {
      if (await assist.isVisible().catch(() => false)) throw error;
    }
  }
  await page.getByTestId("mobile-map-toggle").click();
}

test("keeps honest local identity and the pirate chart through play, results, and replay", async ({ page }, testInfo) => {
  test.setTimeout(50_000);
  await page.goto("/");
  await page.getByTestId("solo-run-button").click();
  await openPhoneMap(page, testInfo);

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
  await expect(radar).toHaveAttribute("data-station-count", "3");
  await expect(radar).toHaveAttribute(
    "aria-label",
    /shows your position and heading, the arena boundary, \d+ active competitor markers across the full board/i,
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
  const replayCrewCounts = await radar.evaluate((element) => ({
    other: Number(element.getAttribute("data-other-player-count")),
    rivals: Number(element.getAttribute("data-rival-marker-count")),
    ai: Number(element.getAttribute("data-ai-player-count")),
  }));
  // Replay population dots remain honest: every represented rival is still an
  // actual AI state from the replay rather than a manufactured crowd marker.
  expect(replayCrewCounts.ai).toBe(replayCrewCounts.other);
  expect(replayCrewCounts.rivals).toBe(replayCrewCounts.other);
  await expectInsideViewport(radar, page);

  await expect(page.getByTestId("arena-canvas")).toHaveAttribute("data-replay-state", "complete", {
    timeout: 8_000,
  });
  await expect(radar).toBeVisible();
  await expect(radar).toContainText("REPLAY · LAST POSITION");
});

test("ordinary Play Live accepts the assigned public arena while friend links stay pinned", async ({ page }) => {
  const assignedRoomId = "public-2";
  const playerId = "human-matchmade-self";
  let joinMessage: Record<string, unknown> | undefined;

  await page.routeWebSocket(/\/arena$/u, (socket) => {
    socket.onMessage((raw) => {
      const message = JSON.parse(typeof raw === "string" ? raw : raw.toString()) as Record<string, unknown>;
      if (message.type !== "join") return;
      joinMessage = message;
      const welcome: WelcomeMessage = {
        type: "welcome",
        protocolVersion: PROTOCOL_VERSION,
        authority: "server",
        roomId: assignedRoomId,
        playerId,
        reconnectToken: "matchmaking-proof-reconnect-token-0001",
        reconnected: false,
        tick: 12,
        fixedStepSeconds: 1 / 30,
        lastAcceptedSequence: -1,
      };
      const world: WorldMessage = {
        type: "world",
        protocolVersion: PROTOCOL_VERSION,
        authority: "server",
        roomId: assignedRoomId,
        tick: 12,
        arenaRadius: 1_450,
        collisionRadii: {
          baseRadius: 8,
          massRadiusFactor: 0.68,
          bodyRadiusFactor: 0.98,
        },
        drops: [],
      };
      const snapshot: SnapshotMessage = {
        type: "snapshot",
        protocolVersion: PROTOCOL_VERSION,
        authority: "server",
        roomId: assignedRoomId,
        tick: 12,
        serverTimeMs: 12_000,
        players: [{
          id: playerId,
          name: "Matchmade Self",
          kind: "human",
          connected: true,
          alive: true,
          position: { x: 0, y: 0 },
          direction: { x: 1, y: 0 },
          body: [{ x: -20, y: 0 }],
          mass: 48,
          kills: 0,
          score: 0,
          shieldTicksRemaining: 30,
        }],
        dropUpserts: [],
        removedDropIds: [],
        events: [],
      };
      socket.send(JSON.stringify(welcome));
      socket.send(JSON.stringify(world));
      socket.send(JSON.stringify(packSnapshotTupleForWire(snapshot)));
    });
  });

  await page.goto("/");
  await page.getByTestId("live-lab-button").click();
  await expect(page.getByTestId("live-arena-canvas")).toHaveAttribute(
    "data-authority",
    "server-confirmed",
  );
  expect(joinMessage).toMatchObject({
    type: "join",
    roomId: "public-1",
    matchmakingV1: true,
    presenceV1: true,
    snapshotTupleV1: true,
  });
  await expect(page.getByTestId("room-identity")).toContainText("LIVE ROOM #PUBLIC-2");
  await expect(page.getByTestId("pirate-radar")).toHaveAttribute("data-room-id", assignedRoomId);
  await expect.poll(() => new URL(page.url()).searchParams.get("room")).toBe(assignedRoomId);
  expect(new URL(page.url()).searchParams.get("match")).toBe("public");

  await page.getByTestId("in-game-invite").click();
  const invite = new URL(await page.getByTestId("room-invite-url").inputValue());
  expect(invite.searchParams.get("room")).toBe(assignedRoomId);
  expect(invite.searchParams.has("match")).toBe(false);
});

test("maps authoritative crews and Heat Ring geometry on desktop and mobile death states", async ({ page }, testInfo) => {
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

  await page.routeWebSocket(/\/arena$/u, (socket) => {
    const sendPresence = () => {
      const roster = [
        player(playerId, "Radar Self", "human", { x: 120, y: -60 }),
        player("human-radar-friend", "Radar Friend", "human", { x: 260, y: -40 }),
        player("bot-radar-rival", "Radar Rival", "bot", { x: 20, y: 100 }),
        ...Array.from({ length: 197 }, (_, index) => {
          const angle = index * Math.PI * (3 - Math.sqrt(5));
          const radius = 500 + (index % 30) * 90;
          return player(
            `bot-remote-${index + 1}`,
            `Remote Rival ${index + 1}`,
            "bot",
            { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius },
          );
        }),
      ];
      const presence: PresenceMessage = {
        type: "presence",
        protocolVersion: PROTOCOL_VERSION,
        authority: "server",
        roomId,
        tick,
        players: roster.map((candidate) => ({
          id: candidate.id,
          name: candidate.name,
          kind: candidate.kind,
          connected: candidate.connected,
          alive: candidate.alive,
          position: candidate.position,
          mass: candidate.mass,
          kills: candidate.kills,
          score: candidate.score,
        })),
      };
      socket.send(JSON.stringify(presence));
    };
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
          // Both real rivals must remain on the full-board population map.
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
        sendPresence();
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

  await page.goto(`/?room=${roomId}`);
  await page.getByTestId("live-lab-button").click();
  await openPhoneMap(page, testInfo);
  const arena = page.getByTestId("live-arena-canvas");
  const roomIdentity = page.getByTestId("room-identity");
  const radar = page.getByTestId("pirate-radar");
  await expect(arena).toHaveAttribute("data-authority", "server-confirmed");
  await expect(roomIdentity).toContainText("LIVE ROOM #RADAR-PROOF-ROOM");
  await expect(radar).toHaveAttribute("data-room-id", roomId);
  await expect(radar).toHaveAttribute("data-other-player-count", "199");
  await expect(radar).toHaveAttribute("data-human-player-count", "1");
  await expect(radar).toHaveAttribute("data-ai-player-count", "198");
  await expect(radar).toHaveAttribute("data-hazard-count", "1");
  await expect(radar).toHaveAttribute("data-station-count", "0");
  await expect(radar.getByTestId("radar-other-player")).toHaveCount(199);
  const heatRing = radar.getByTestId("radar-heat-ring");
  await expect(heatRing).toHaveAttribute("data-world-radius", "240");
  expect(Number(await heatRing.locator("circle").getAttribute("r"))).toBeCloseTo(8.2, 2);
  await expectInsideViewport(roomIdentity, page);
  await expectInsideViewport(radar, page);

  await page.keyboard.press("ArrowDown");
  await expect(arena).toHaveAttribute("data-player-alive", "false");
  await expect(roomIdentity).toContainText("LIVE ROOM #RADAR-PROOF-ROOM");
  await expect(radar).toContainText("RESPAWNING");
  await expect(radar).toHaveAttribute("data-other-player-count", "199");
  await expectInsideViewport(radar, page);
});
