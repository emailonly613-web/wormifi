import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  createLocalRadarIntel,
} from "../src/components/ArenaCanvas";
import {
  createLiveRadarIntel,
  mergeSnapshotWithPresence,
} from "../src/components/LiveArenaCanvas";
import { PirateRadar } from "../src/components/PirateRadar";
import { createGameState, spawnPlayer } from "../src/game/core";
import {
  PROTOCOL_VERSION,
  type PresenceMessage,
  type PublicPlayerState,
  type SnapshotMessage,
} from "../server/src/protocol";

function activeSpyglass() {
  return {
    kind: "collector" as const,
    relicKind: "emerald-spyglass" as const,
    activatedAtTick: 0,
    expiresAtTick: 100,
    durationTicks: 100,
  };
}

function publicPlayer(
  id: string,
  x: number,
  specialist?: PublicPlayerState["specialist"],
): PublicPlayerState {
  return {
    id,
    name: id,
    kind: id === "captain" ? "human" : "bot",
    connected: true,
    alive: true,
    position: { x, y: 0 },
    direction: { x: 1, y: 0 },
    body: [{ x: x - 10, y: 0 }],
    mass: 100,
    kills: 0,
    score: 0,
    shieldTicksRemaining: 0,
    specialist,
  };
}

function liveSnapshot(carrier: PublicPlayerState): SnapshotMessage {
  return {
    type: "snapshot",
    protocolVersion: PROTOCOL_VERSION,
    authority: "server",
    roomId: "spyglass-proof",
    tick: 10,
    serverTimeMs: 1_000,
    players: [
      carrier,
      publicPlayer("ordinary-visible", 50),
      publicPlayer("distant-secret-contact", 220),
    ],
    dropUpserts: [],
    removedDropIds: [],
    events: [],
  };
}

describe("Emerald Spyglass radar information boundary", () => {
  it("keeps all 200 real roster entries on radar while bodies stay nearby", () => {
    const nearby = liveSnapshot(publicPlayer("captain", 0));
    nearby.players = nearby.players.slice(0, 2);
    const presence: PresenceMessage = {
      type: "presence",
      protocolVersion: PROTOCOL_VERSION,
      authority: "server",
      roomId: nearby.roomId,
      tick: nearby.tick,
      players: Array.from({ length: 200 }, (_, index) => {
        const player = index < nearby.players.length
          ? nearby.players[index]
          : publicPlayer(`seat-${index + 1}`, index * 12);
        return {
          id: player.id,
          name: player.name,
          kind: player.kind,
          connected: player.connected,
          alive: player.alive,
          position: player.position,
          mass: player.mass,
          kills: player.kills,
          score: player.score,
        };
      }),
    };
    const merged = mergeSnapshotWithPresence(nearby, presence);
    expect(merged.players).toHaveLength(200);
    expect(merged.players.find((player) => player.id === "ordinary-visible")?.body).not.toHaveLength(0);
    expect(merged.players.find((player) => player.id === "seat-200")?.body).toHaveLength(0);
    expect(createLiveRadarIntel(merged, "captain", 100).visiblePlayers).toHaveLength(199);
  });

  it("keeps every local competitor on the population map while adding coarse danger bearings", () => {
    const state = createGameState("local-spyglass-radar", {
      arenaRadius: 1_000,
      spawnShieldSeconds: 0,
    });
    const carrier = spawnPlayer(state, {
      id: "captain",
      kind: "human",
      position: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      shieldSeconds: 0,
    });
    spawnPlayer(state, {
      id: "ordinary-visible",
      position: { x: 50, y: 0 },
      direction: { x: 1, y: 0 },
      shieldSeconds: 0,
    });
    spawnPlayer(state, {
      id: "distant-secret-contact",
      position: { x: 220, y: 0 },
      direction: { x: 1, y: 0 },
      shieldSeconds: 0,
    });
    state.tick = 10;

    const baseline = createLocalRadarIntel(state, carrier.id, 100);
    expect(baseline.visiblePlayers.map((player) => player.id)).toEqual([
      "ordinary-visible",
      "distant-secret-contact",
    ]);
    expect(baseline.dangerBearings).toEqual([]);
    expect(JSON.stringify(baseline)).toContain("distant-secret-contact");

    carrier.specialist = activeSpyglass();
    const active = createLocalRadarIntel(state, carrier.id, 100);
    expect(active.visiblePlayers.map((player) => player.id)).toEqual([
      "ordinary-visible",
      "distant-secret-contact",
    ]);
    expect(active.dangerBearings).toEqual([
      { sector: "E", distanceBand: "far", threatCount: 1 },
    ]);
    expect(JSON.stringify(active)).toContain("distant-secret-contact");
    expect(active.dangerBearings[0]).not.toHaveProperty("position");
    expect(active.dangerBearings[0]).not.toHaveProperty("id");
  });

  it("applies the same full-population map to authoritative live snapshots", () => {
    const baseline = createLiveRadarIntel(
      liveSnapshot(publicPlayer("captain", 0)),
      "captain",
      100,
    );
    expect(baseline.visiblePlayers.map((player) => player.id)).toEqual([
      "ordinary-visible",
      "distant-secret-contact",
    ]);
    expect(baseline.dangerBearings).toEqual([]);
    expect(JSON.stringify(baseline)).toContain("distant-secret-contact");

    const active = createLiveRadarIntel(
      liveSnapshot(publicPlayer("captain", 0, activeSpyglass())),
      "captain",
      100,
    );
    expect(active.visiblePlayers.map((player) => player.id)).toEqual([
      "ordinary-visible",
      "distant-secret-contact",
    ]);
    expect(active.dangerBearings).toEqual([
      { sector: "E", distanceBand: "far", threatCount: 1 },
    ]);
    expect(JSON.stringify(active)).toContain("distant-secret-contact");
    expect(active.dangerBearings[0]).not.toHaveProperty("position");
    expect(active.dangerBearings[0]).not.toHaveProperty("id");
  });

  it("renders fixed edge bearings with accessible text beside existing radar landmarks", () => {
    const baselineMarkup = renderToStaticMarkup(createElement(PirateRadar, {
      scopeLabel: "SOLO",
      arenaRadius: 1_000,
      position: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      alive: true,
      landmarks: [{ id: "loot-compass", kind: "collector", position: { x: -300, y: 20 } }],
      stations: [{ id: "port-capstan", position: { x: 200, y: 200 }, active: true }],
      otherPlayers: [
        { id: "ordinary-visible", kind: "bot", position: { x: 50, y: 0 }, alive: true },
      ],
    }));
    expect(baselineMarkup).toContain('data-rival-marker-count="1"');
    expect(baselineMarkup).toContain('data-station-count="1"');
    expect(baselineMarkup).toContain('data-landmark-kinds="collector"');
    expect(baselineMarkup).toContain('data-spyglass-bearing-count="0"');
    expect(baselineMarkup).not.toContain('data-testid="radar-spyglass-bearing"');

    const activeMarkup = renderToStaticMarkup(createElement(PirateRadar, {
      scopeLabel: "SOLO",
      arenaRadius: 1_000,
      position: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      alive: true,
      landmarks: [{ id: "loot-compass", kind: "collector", position: { x: -300, y: 20 } }],
      stations: [{ id: "port-capstan", position: { x: 200, y: 200 }, active: true }],
      otherPlayers: [
        { id: "ordinary-visible", kind: "bot", position: { x: 50, y: 0 }, alive: true },
      ],
      dangerBearings: [{ sector: "E", distanceBand: "far", threatCount: 2 }],
    }));
    expect(activeMarkup).toContain('data-spyglass-bearing-count="1"');
    expect(activeMarkup).toContain('data-spyglass-sectors="E"');
    expect(activeMarkup).toContain('data-testid="radar-spyglass-bearing"');
    expect(activeMarkup).toContain('data-sector="E"');
    expect(activeMarkup).toContain('data-distance-band="far"');
    expect(activeMarkup).toContain('data-threat-count="2"');
    expect(activeMarkup).toContain("Emerald Spyglass danger: E far, 2 threats.");
    expect(activeMarkup).toContain('data-station-count="1"');
    expect(activeMarkup).not.toContain("distant-secret-contact");
  });
});
