import { describe, expect, it } from "vitest";
import { isAuthoritativeEvent } from "../src/components/LiveArenaCanvas";

describe("live authoritative harbor event validation", () => {
  it("accepts every server-owned charging lifecycle event", () => {
    const events = [
      {
        type: "chargingStarted",
        tick: 10,
        stationId: "coin-cay",
        playerId: "captain",
        windingDirection: -1,
        requiredTicks: 1,
      },
      {
        type: "chargingInterrupted",
        tick: 11,
        stationId: "coin-cay",
        playerId: "captain",
        progressTicks: 0,
      },
      {
        type: "chargingResumed",
        tick: 12,
        stationId: "coin-cay",
        playerId: "captain",
        progressTicks: 0,
      },
      {
        type: "chargingReset",
        tick: 13,
        stationId: "coin-cay",
        playerId: "captain",
        massAwarded: 0,
      },
      {
        type: "chargingCompleted",
        tick: 14,
        stationId: "coin-cay",
        playerId: "captain",
        massAwarded: 2.5,
        cooldownTicks: 120,
      },
    ];

    expect(events.every(isAuthoritativeEvent)).toBe(true);
  });

  it("rejects malformed or client-invented reward values", () => {
    expect(isAuthoritativeEvent({
      type: "chargingCompleted",
      tick: 14,
      stationId: "coin-cay",
      playerId: "captain",
      massAwarded: Number.POSITIVE_INFINITY,
      cooldownTicks: 120,
    })).toBe(false);
    expect(isAuthoritativeEvent({
      type: "chargingStarted",
      tick: 10,
      stationId: "coin-cay",
      playerId: "captain",
      windingDirection: 0,
      requiredTicks: 1,
    })).toBe(false);
  });
});
