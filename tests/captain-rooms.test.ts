import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CaptainRooms } from "../src/components/CaptainRooms";
import {
  CAPTAIN_ROOM_TIERS,
  buildCaptainRoomInviteUrl,
  captainRoomTierFromRoomId,
  createCaptainRoomId,
  createCaptainRoomBoard,
} from "../src/game/captainRooms";
import { getGameBoardProfile } from "../src/game/chargingStations";

describe("Captain Rooms viral-launch contract", () => {
  it("defines exact 10, 20, and 30-seat rooms as free at launch", () => {
    expect(CAPTAIN_ROOM_TIERS.map((tier) => ({
      seats: tier.humanSeats,
      launchPriceUsdCents: tier.launchPriceUsdCents,
      launchAccess: tier.launchAccess,
    }))).toEqual([
      { seats: 10, launchPriceUsdCents: 0, launchAccess: "free" },
      { seats: 20, launchPriceUsdCents: 0, launchAccess: "free" },
      { seats: 30, launchPriceUsdCents: 0, launchAccess: "free" },
    ]);
  });

  it("creates an opaque capacity-bound room id and a clean Wormifi invite", () => {
    const roomId = createCaptainRoomId(
      "captain-room-30-session-v1",
      new Uint32Array([0x1234abcd, 0x5678ef90, 0xa1b2c3d4]),
    );
    expect(roomId).toBe("captain-30-1234abcd5678ef90a1b2");
    expect(captainRoomTierFromRoomId(roomId)?.humanSeats).toBe(30);
    expect(captainRoomTierFromRoomId("captain-30-too-short")).toBeUndefined();

    const invite = new URL(buildCaptainRoomInviteUrl(
      roomId,
      "https://wormifi.com/?match=public&board=black-pearl-relay&pace=tempest&c=secret#play",
    ));
    expect(invite.origin).toBe("https://wormifi.com");
    expect(invite.pathname).toBe("/");
    expect([...invite.searchParams.entries()]).toEqual([["room", roomId]]);
    expect(invite.hash).toBe("");
  });

  it("builds a distinct bounded board for every hosted capacity", () => {
    for (const tier of CAPTAIN_ROOM_TIERS) {
      const board = createCaptainRoomBoard(tier.id);
      expect(board.id).toBe(tier.boardId);
      expect(board.name).toContain(String(tier.humanSeats));
      expect(board.chargingStations).toHaveLength(3);
      expect(board.chargingStations.every((station) =>
        Math.hypot(station.position.x, station.position.y) + station.wrapRadius < tier.arenaRadius
      )).toBe(true);
      // Public joins cannot buy themselves a larger room by naming this board.
      expect(getGameBoardProfile(board.id)).toBeUndefined();
    }
  });

  it("shows the full venue promise and an explicit no-checkout boundary", () => {
    const markup = renderToStaticMarkup(createElement(CaptainRooms, {
      onClose: () => undefined,
      onCreateRoom: () => undefined,
    }));
    expect(markup).toContain("CAPTAIN ROOMS");
    expect(markup).toContain("UP TO 10");
    expect(markup).toContain("UP TO 20");
    expect(markup).toContain("UP TO 30");
    expect(markup).toContain("Free at launch");
    expect(markup).toContain("CREATE · COPY · SEND · PLAY — 100% FREE");
    expect(markup).toContain("zero login wall");
    expect(markup).toContain("CREATE FREE ROOM &amp; COPY LINK");
    expect(markup).not.toContain("$4.99");
    expect(markup).not.toContain("CREDIT");
  });
});
