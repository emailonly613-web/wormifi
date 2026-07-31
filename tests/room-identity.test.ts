import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildRoomInviteUrl,
  createCrewRoomId,
  normalizeRoomId,
  roomIdentityLabel,
} from "../src/game/roomIdentity";
import {
  PirateRadar,
  projectRadarPoint,
  projectRadarRadius,
  radarHeadingDegrees,
} from "../src/components/PirateRadar";

describe("room identity", () => {
  it("normalizes friend codes to the server room contract", () => {
    expect(normalizeRoomId("  My Crew!! 42 ")).toBe("my-crew-42");
    expect(normalizeRoomId("---")).toBe("public-1");
    expect(normalizeRoomId("A".repeat(40))).toBe("a".repeat(32));
    expect(roomIdentityLabel("my-crew-42")).toBe("ROOM #MY-CREW-42");
  });

  it("builds a clean friend link without local sockets or solo challenges", () => {
    const url = new URL(buildRoomInviteUrl(
      "crew-004217",
      "https://wormifi.com/?c=solo-token&arena_ws=ws%3A%2F%2Flocalhost%3A8080#play",
    ));
    expect(url.origin).toBe("https://wormifi.com");
    expect(url.searchParams.get("room")).toBe("crew-004217");
    expect(url.searchParams.has("c")).toBe(false);
    expect(url.searchParams.has("arena_ws")).toBe(false);
    expect(url.hash).toBe("");
  });

  it("creates a six-digit human-readable crew room", () => {
    expect(createCrewRoomId(4_217)).toBe("crew-004217");
  });
});

describe("fair pirate radar projection", () => {
  it("maps the arena center and clamps out-of-bounds positions to the chart rim", () => {
    expect(projectRadarPoint({ x: 0, y: 0 }, 1_200)).toEqual({ x: 50, y: 50 });
    const edge = projectRadarPoint({ x: 4_800, y: 0 }, 1_200);
    expect(edge.x).toBe(91);
    expect(edge.y).toBe(50);
  });

  it("turns a world heading into the chart arrow rotation", () => {
    expect(radarHeadingDegrees({ x: 1, y: 0 })).toBe(90);
    expect(radarHeadingDegrees({ x: 0, y: -1 })).toBe(0);
  });

  it("scales a Heat Ring against the full arena without exceeding the chart", () => {
    expect(projectRadarRadius(340, 1_200)).toBeCloseTo(11.62, 2);
    expect(projectRadarRadius(1_200, 1_200)).toBe(41);
    expect(projectRadarRadius(9_999, 1_200)).toBe(82);
    expect(projectRadarRadius(Number.NaN, 1_200)).toBe(0);
  });

  it("renders the full competition cluster, a radius-accurate hazard, and stations", () => {
    const markup = renderToStaticMarkup(createElement(PirateRadar, {
      scopeLabel: "ROOM #PROOF",
      roomId: "proof",
      arenaRadius: 1_200,
      position: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      alive: true,
      otherPlayers: [
        { id: "human-2", kind: "human", position: { x: 120, y: -80 }, alive: true },
        { id: "bot-1", kind: "bot", position: { x: -400, y: 300 }, alive: true },
        { id: "bot-dead", kind: "bot", position: { x: 20, y: 20 }, alive: false },
      ],
      landmarks: [{
        id: "heat-proof",
        kind: "heat-ring",
        position: { x: 320, y: 0 },
        radius: 340,
      }],
      stations: [{ id: "station-a", position: { x: -700, y: 0 }, active: true }],
      competition: {
        rank: 73,
        rankTotal: 200,
        score: 4_250,
        size: 318,
        humans: 1,
        ai: 199,
        testIdPrefix: "live-hud",
      },
    }));

    expect(markup).toContain('data-other-player-count="2"');
    expect(markup).toContain('data-human-player-count="1"');
    expect(markup).toContain('data-ai-player-count="1"');
    expect(markup).toContain('data-hazard-count="1"');
    expect(markup).toContain('data-world-radius="340"');
    expect(markup).toContain('data-station-count="1"');
    expect(markup.match(/data-testid="radar-other-player"/gu)).toHaveLength(2);
    expect(markup).toContain('data-testid="radar-station"');
    expect(markup).toContain('data-testid="live-hud-rank"');
    expect(markup).toContain('aria-label="Rank 73 of 200"');
    expect(markup).toContain('data-testid="live-hud-score"');
    expect(markup).toContain('data-testid="live-hud-length"');
    expect(markup).toContain('data-testid="radar-population"');
    expect(markup).toContain("1 HUMAN · 199 AI");
  });
});
