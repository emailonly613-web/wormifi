import { describe, expect, it } from "vitest";
import {
  buildFounding50GameUrl,
  buildFounding50ShareUrl,
  readGrowthLaunchIntent,
} from "../src/growthCampaign";

describe("Founding 50 growth campaign", () => {
  it("opens only the exact allowlisted captain-room launch intent", () => {
    expect(readGrowthLaunchIntent("?launch=captain-room")).toBe("captain-room");
    expect(readGrowthLaunchIntent("?launch=play")).toBeNull();
    expect(readGrowthLaunchIntent("?launch=captain-room-now")).toBeNull();
  });

  it("builds consent-compatible play and host campaign links", () => {
    const play = new URL(buildFounding50GameUrl("play"));
    expect(play.origin).toBe("https://wormifi.com");
    expect(play.searchParams.get("utm_campaign")).toBe("founding_50");
    expect(play.searchParams.get("utm_id")).toBe("play");
    expect(play.searchParams.has("launch")).toBe(false);

    const host = new URL(buildFounding50GameUrl("host"));
    expect(host.searchParams.get("utm_id")).toBe("host");
    expect(host.searchParams.get("launch")).toBe("captain-room");
  });

  it("builds a distinct player-referral link for the campaign page", () => {
    const share = new URL(buildFounding50ShareUrl());
    expect(share.pathname).toBe("/founding-50.html");
    expect(share.searchParams.get("utm_source")).toBe("player_share");
    expect(share.searchParams.get("utm_medium")).toBe("referral");
    expect(share.searchParams.get("utm_id")).toBe("founding_crew");
  });
});
