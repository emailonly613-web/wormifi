import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PacePicker } from "../src/components/PacePicker";
import {
  buildGamePacePreferenceUrl,
  buildPaceAwareInviteUrl,
  getGamePaceProfile,
  paceIdForJoin,
  readGamePacePreference,
  resolveRoomPacePreference,
} from "../src/game/gamePace";

describe("published room pace selection", () => {
  it("uses slow Harbor for missing and unknown values and publishes exact speeds", () => {
    expect(readGamePacePreference("")).toBe("harbor");
    expect(readGamePacePreference("?pace=warp-nine")).toBe("harbor");
    expect(readGamePacePreference("?pace=harbor")).toBe("harbor");
    expect(getGamePaceProfile("harbor")).toMatchObject({ baseSpeed: 100, boostSpeed: 170 });
    expect(getGamePaceProfile("classic")).toMatchObject({ baseSpeed: 212, boostSpeed: 330 });
    expect(getGamePaceProfile("tempest")).toMatchObject({ baseSpeed: 235, boostSpeed: 365 });
  });

  it("lets existing room truth win and omits a private override", () => {
    const locked = resolveRoomPacePreference("tempest", "harbor");
    expect(locked).toEqual({
      paceId: "harbor",
      requestedPaceId: "tempest",
      existingRoomPaceId: "harbor",
      locked: true,
      requestIgnored: true,
    });
    expect(paceIdForJoin(locked)).toBeUndefined();
    expect(paceIdForJoin(resolveRoomPacePreference("tempest"))).toBe("tempest");
  });

  it("normalizes pace URLs and carries the effective non-default pace in invites", () => {
    const tempest = new URL(buildGamePacePreferenceUrl(
      "https://wormifi.com/?room=crew-1&paceId=legacy#play",
      "tempest",
    ));
    expect(tempest.searchParams.get("pace")).toBe("tempest");
    expect(tempest.searchParams.has("paceId")).toBe(false);
    expect(tempest.hash).toBe("#play");

    const harbor = new URL(buildPaceAwareInviteUrl(tempest.toString(), "harbor"));
    expect(harbor.searchParams.has("pace")).toBe(false);
    const locked = new URL(buildPaceAwareInviteUrl(harbor.toString(), "classic", "harbor"));
    expect(locked.searchParams.has("pace")).toBe(false);
  });

  it("renders three accessible choices and discloses an existing-room lock", () => {
    const defaultMarkup = renderToStaticMarkup(createElement(PacePicker));
    expect(defaultMarkup).toContain("CHOOSE GAME SPEED");
    expect(defaultMarkup.match(/type="radio"/gu)).toHaveLength(3);
    expect(defaultMarkup).toMatch(/checked="" value="harbor"/u);

    const lockedMarkup = renderToStaticMarkup(createElement(PacePicker, {
      value: "tempest",
      existingRoomPaceId: "harbor",
    }));
    expect(lockedMarkup).toContain('data-pace-id="harbor"');
    expect(lockedMarkup.match(/disabled=""/gu)).toHaveLength(3);
    expect(lockedMarkup).toContain("EXISTING ROOM LOCKED TO HARBOR SPEED.");
  });
});
