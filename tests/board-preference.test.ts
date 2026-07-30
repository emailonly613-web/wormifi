import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BoardPicker } from "../src/components/BoardPicker";
import {
  BOARD_OPTIONS,
  boardIdForJoin,
  buildBoardAwareInviteUrl,
  buildBoardPreferenceUrl,
  normalizeBoardPreference,
  readBoardPreference,
  resolveRoomBoardPreference,
} from "../src/game/boardPreference";

describe("board preference and immutable room selection", () => {
  it("uses Open Seas for missing, malformed, and unknown preferences", () => {
    expect(normalizeBoardPreference(undefined)).toBe("open-seas");
    expect(normalizeBoardPreference("ghost-fleet")).toBe("open-seas");
    expect(readBoardPreference("")).toBe("open-seas");
    expect(readBoardPreference("?room=crew-1&board=ghost-fleet")).toBe("open-seas");
    expect(readBoardPreference("?board=black-pearl-relay")).toBe("black-pearl-relay");
    expect(readBoardPreference("https://wormifi.com/?room=crew-1&board=black-pearl-relay"))
      .toBe("black-pearl-relay");
  });

  it("lets authoritative existing-room truth win and omits any override join field", () => {
    const lockedOpenSeas = resolveRoomBoardPreference("black-pearl-relay", "open-seas");
    expect(lockedOpenSeas).toEqual({
      boardId: "open-seas",
      requestedBoardId: "black-pearl-relay",
      existingRoomBoardId: "open-seas",
      locked: true,
      requestIgnored: true,
    });
    expect(boardIdForJoin(lockedOpenSeas)).toBeUndefined();

    const newRelayRoom = resolveRoomBoardPreference("black-pearl-relay");
    expect(newRelayRoom.locked).toBe(false);
    expect(boardIdForJoin(newRelayRoom)).toBe("black-pearl-relay");
  });

  it("puts only the effective non-default board on a clean invite", () => {
    const base = "https://wormifi.com/?room=crew-004217&c=gone&boardId=legacy#play";
    const relay = new URL(buildBoardAwareInviteUrl(base, "black-pearl-relay"));
    expect(relay.searchParams.get("room")).toBe("crew-004217");
    expect(relay.searchParams.get("board")).toBe("black-pearl-relay");
    expect(relay.searchParams.has("boardId")).toBe(false);

    const lockedOpenSeas = new URL(buildBoardAwareInviteUrl(
      relay.toString(),
      "black-pearl-relay",
      "open-seas",
    ));
    expect(lockedOpenSeas.searchParams.has("board")).toBe(false);

    const lockedRelay = new URL(buildBoardAwareInviteUrl(
      base,
      "open-seas",
      "black-pearl-relay",
    ));
    expect(lockedRelay.searchParams.get("board")).toBe("black-pearl-relay");
  });

  it("builds normalized board query URLs without mutating unrelated parameters", () => {
    const relay = new URL(buildBoardPreferenceUrl(
      "https://wormifi.com/?room=crew-9&boardId=legacy#crew",
      "black-pearl-relay",
    ));
    expect(relay.searchParams.get("room")).toBe("crew-9");
    expect(relay.searchParams.get("board")).toBe("black-pearl-relay");
    expect(relay.searchParams.has("boardId")).toBe(false);
    expect(relay.hash).toBe("#crew");

    const openSeas = new URL(buildBoardPreferenceUrl(relay.toString(), "open-seas"));
    expect(openSeas.searchParams.has("board")).toBe(false);
  });

  it("keeps the Black Pearl choice explicit about both wrap-capstan objectives", () => {
    const relay = BOARD_OPTIONS.find((option) => option.id === "black-pearl-relay");
    expect(relay).toMatchObject({
      objectiveCount: 2,
      objectiveDisclosure: "Two wrap-capstan objectives: Port Capstan and Starboard Capstan.",
    });
  });

  it("discloses all three default Open Seas harbor-loop rewards before play", () => {
    const openSeas = BOARD_OPTIONS.find((option) => option.id === "open-seas");
    expect(openSeas).toMatchObject({
      objectiveCount: 3,
      objectiveDisclosure: "Three mini harbors: circle back to each buoy for +2.5, +4, or +7 size.",
    });
  });
});

describe("accessible BoardPicker markup", () => {
  it("defaults to Open Seas and presents two native radio choices with full relay disclosure", () => {
    const markup = renderToStaticMarkup(createElement(BoardPicker));

    expect(markup).toContain("CHOOSE YOUR BOARD");
    expect(markup).toContain('data-board-id="open-seas"');
    expect(markup).toContain('data-board-locked="false"');
    expect(markup.match(/type="radio"/gu)).toHaveLength(2);
    expect(markup).toMatch(/checked="" value="open-seas"/u);
    expect(markup).toContain("Open Seas is the default");
    expect(markup).toContain("Three mini harbors: circle back to each buoy for +2.5, +4, or +7 size.");
    expect(markup).toContain("Two wrap-capstan objectives: Port Capstan and Starboard Capstan.");
  });

  it("locks every control to the existing room board even when a different board was requested", () => {
    const markup = renderToStaticMarkup(createElement(BoardPicker, {
      value: "open-seas",
      existingRoomBoardId: "black-pearl-relay",
    }));

    expect(markup).toContain('data-board-id="black-pearl-relay"');
    expect(markup).toContain('data-board-locked="true"');
    expect(markup.match(/disabled=""/gu)).toHaveLength(2);
    expect(markup).toMatch(/checked="" value="black-pearl-relay"/u);
    expect(markup).toContain(
      "EXISTING ROOM LOCKED TO BLACK PEARL RELAY — ITS BOARD CANNOT BE OVERRIDDEN.",
    );
  });
});
