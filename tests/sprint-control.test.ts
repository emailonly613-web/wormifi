import { describe, expect, it } from "vitest";

import {
  MINIMUM_SPRINT_BURST_MS,
  remainingSprintBurstMs,
} from "../src/game/sprintControl";

describe("sprint input timing", () => {
  it("turns a quick tap into a server-visible burst without extending a hold", () => {
    expect(remainingSprintBurstMs(1_000, 1_020)).toBe(MINIMUM_SPRINT_BURST_MS - 20);
    expect(remainingSprintBurstMs(1_000, 1_000 + MINIMUM_SPRINT_BURST_MS)).toBe(0);
    expect(remainingSprintBurstMs(1_000, 2_000)).toBe(0);
  });

  it("fails safely when no valid press time exists", () => {
    expect(remainingSprintBurstMs(undefined, 1_000)).toBe(0);
    expect(remainingSprintBurstMs(Number.NaN, 1_000)).toBe(0);
    expect(remainingSprintBurstMs(1_000, Number.NaN)).toBe(MINIMUM_SPRINT_BURST_MS);
  });
});
