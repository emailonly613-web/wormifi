import { describe, expect, it } from "vitest";
import {
  ensureGtagQueue,
  isValidGa4MeasurementId,
  readSafeCampaignParameters,
  sanitizePageLocation,
  sanitizeReferrer,
} from "../src/analytics";

describe("privacy-conscious analytics helpers", () => {
  it("requires a real-looking GA4 Measurement ID", () => {
    expect(isValidGa4MeasurementId(undefined)).toBe(false);
    expect(isValidGa4MeasurementId("G-PLACEHOLDER")).toBe(false);
    expect(isValidGa4MeasurementId("UA-123-4")).toBe(false);
    expect(isValidGa4MeasurementId("G-AB12CD34EF")).toBe(true);
  });

  it("removes room, challenge, and campaign query values from page_location", () => {
    expect(sanitizePageLocation({
      origin: "https://wormifi.com",
      pathname: "/",
    } as Location)).toBe("https://wormifi.com/");
  });

  it("keeps only an internal path or an external origin in referrers", () => {
    expect(sanitizeReferrer("https://wormifi.com/multiplayer.html?room=private#join", "https://wormifi.com"))
      .toBe("https://wormifi.com/multiplayer.html");
    expect(sanitizeReferrer("https://example.com/a/person@email.test?secret=yes", "https://wormifi.com"))
      .toBe("https://example.com");
  });

  it("allowlists useful acquisition fields while rejecting likely personal data", () => {
    expect(readSafeCampaignParameters(
      "?utm_source=reddit&utm_medium=social&utm_campaign=launch&utm_content=creative-a&room=PRIVATE&c=TOKEN",
    )).toEqual({
      campaign_source: "reddit",
      campaign_medium: "social",
      campaign_name: "launch",
      campaign_id: undefined,
    });
    expect(readSafeCampaignParameters("?utm_source=person@example.com&utm_campaign=123456789"))
      .toEqual({
        campaign_source: undefined,
        campaign_medium: undefined,
        campaign_name: undefined,
        campaign_id: undefined,
      });
  });

  it("queues gtag commands as arguments objects so gtag.js executes them", () => {
    // A plain array pushes fine and is then silently ignored by gtag.js, which
    // is indistinguishable from "analytics works" everywhere except Google's
    // servers. This shipped once and cost the site every hit it ever recorded.
    // The suite runs in node, so stand up just enough of a window for the
    // queue helper to attach itself to.
    const host = globalThis as { window?: unknown };
    const previousWindow = host.window;
    const layer: unknown[] = [];
    const fakeWindow = { dataLayer: layer } as unknown as Window & typeof globalThis;
    host.window = fakeWindow;

    ensureGtagQueue();
    fakeWindow.gtag!("event", "page_view", { page_title: "test" });

    expect(layer).toHaveLength(1);
    expect(Array.isArray(layer[0])).toBe(false);
    expect(Object.prototype.toString.call(layer[0])).toBe("[object Arguments]");
    expect(Array.from(layer[0] as ArrayLike<unknown>)).toEqual([
      "event",
      "page_view",
      { page_title: "test" },
    ]);

    host.window = previousWindow;
  });
});
