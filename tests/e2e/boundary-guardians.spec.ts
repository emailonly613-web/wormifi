import { expect, test } from "@playwright/test";
import {
  PROTOCOL_VERSION,
  type PublicPlayerState,
  type SnapshotMessage,
  type WelcomeMessage,
  type WorldMessage,
} from "../../server/src/protocol";
import {
  ARENA_VISUAL_THEME_CATALOG,
  WORLD_COSMETICS_STORAGE_KEY,
} from "../../src/game/worldCosmetics";
import { getBoundaryGuardianSpec } from "../../src/game/boundaryGuardians";

function publicPlayer(
  id: string,
  position: { x: number; y: number },
  alive = true,
): PublicPlayerState {
  return {
    id,
    name: id === "guardian-captain" ? "Moat Captain" : "Boundary Rival",
    kind: id === "guardian-captain" ? "human" : "bot",
    connected: true,
    alive,
    position,
    direction: { x: 1, y: 0 },
    body: Array.from({ length: 8 }, (_, index) => ({
      x: position.x - (index + 1) * 16,
      y: position.y,
    })),
    mass: 110,
    kills: 0,
    score: 0,
    shieldTicksRemaining: 0,
    themeId: "tideglass-corsair",
  };
}

test("renders every arena skin's living moat and boundary strike", async ({ page }, testInfo) => {
  test.setTimeout(75_000);
  const roomId = `guardian-proof-${testInfo.project.name}`;
  const playerId = "guardian-captain";
  let sendBoundaryStrike: (() => void) | undefined;
  let tick = 70;

  await page.routeWebSocket(/\/arena$/u, (socket) => {
    socket.onMessage((raw) => {
      const message = JSON.parse(typeof raw === "string" ? raw : raw.toString()) as Record<string, unknown>;
      if (message.type !== "join") return;
      tick += 2;
      const welcome: WelcomeMessage = {
        type: "welcome",
        protocolVersion: PROTOCOL_VERSION,
        authority: "server",
        roomId,
        playerId,
        reconnectToken: `guardian-proof-token-${tick}`,
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
        arenaRadius: 360,
        collisionRadii: {
          baseRadius: 8,
          massRadiusFactor: 0.68,
          bodyRadiusFactor: 0.98,
        },
        drops: [],
        board: {
          id: "open-seas",
          name: "Open Seas",
          chargingStations: [],
        },
      };
      const captain = publicPlayer(playerId, { x: 0, y: 0 });
      const rival = publicPlayer("boundary-rival", { x: 340, y: 0 });
      const snapshot: SnapshotMessage = {
        type: "snapshot",
        protocolVersion: PROTOCOL_VERSION,
        authority: "server",
        roomId,
        tick,
        serverTimeMs: tick * 33,
        players: [captain, rival],
        dropUpserts: [],
        removedDropIds: [],
        events: [],
      };
      socket.send(JSON.stringify(welcome));
      socket.send(JSON.stringify(world));
      socket.send(JSON.stringify(snapshot));

      sendBoundaryStrike = () => {
        tick += 1;
        const defeatedRival = publicPlayer("boundary-rival", { x: 356, y: 0 }, false);
        const strike: SnapshotMessage = {
          ...snapshot,
          tick,
          serverTimeMs: tick * 33,
          players: [captain, defeatedRival],
          events: [{
            type: "playerDied",
            tick,
            playerId: defeatedRival.id,
            cause: "boundary",
            collisionTime: 1,
          }],
        };
        socket.send(JSON.stringify(strike));
      };
    });
  });

  await page.goto(`/?room=${roomId}`);
  for (const theme of ARENA_VISUAL_THEME_CATALOG) {
    await page.evaluate(({ storageKey, arenaThemeId }) => {
      window.localStorage.setItem(storageKey, JSON.stringify({
        pickupThemeId: "parent-sweet-feast",
        arenaThemeId,
        updatedAtMs: Date.now(),
      }));
    }, { storageKey: WORLD_COSMETICS_STORAGE_KEY, arenaThemeId: theme.id });
    await page.goto(`/?room=${roomId}`);
    await page.getByTestId("live-lab-button").click();

    const arena = page.getByTestId("live-arena-canvas");
    await expect(arena).toHaveAttribute("data-authority", "server-confirmed");
    await expect(arena).toHaveAttribute("data-boundary-moat-id", theme.id);
    await expect(arena).toHaveAttribute(
      "data-boundary-guardian-label",
      getBoundaryGuardianSpec(theme.id).label,
    );
    sendBoundaryStrike?.();
    await page.waitForTimeout(180);
    await arena.screenshot({
      path: `proof/browser/boundary-guardians/${testInfo.project.name}-${theme.id}.png`,
    });
  }
});
