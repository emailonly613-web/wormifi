import { describe, expect, it } from "vitest";

import {
  createGrowthEasingState,
  easedMassFor,
  pruneGrowthEasing,
} from "../src/game/growthPresentation";

describe("growth presentation easing (the hoard-vacuum balloon fix)", () => {
  it("swells toward a big meal over frames instead of popping same-tick", () => {
    const state = createGrowthEasingState();
    expect(easedMassFor(state, "worm", 49, 0)).toBe(49);
    // The measured flaw: 49 -> 499 inside one second. The first frame after
    // the spike must present far below the target, then converge.
    const first = easedMassFor(state, "worm", 120, 16);
    expect(first).toBeGreaterThan(49);
    expect(first).toBeLessThan(60);
    let mass = first;
    for (let frame = 2; frame <= 150; frame += 1) {
      mass = easedMassFor(state, "worm", 120, frame * 16);
    }
    expect(mass).toBeGreaterThan(118);
  });

  it("presents shrinks faster than growth — combat feedback must not lag", () => {
    const growth = createGrowthEasingState();
    easedMassFor(growth, "worm", 100, 0);
    const grown = easedMassFor(growth, "worm", 200, 50);

    const shrink = createGrowthEasingState();
    easedMassFor(shrink, "worm", 200, 0);
    const shrunk = easedMassFor(shrink, "worm", 100, 50);

    const growthProgress = (grown - 100) / 100;
    const shrinkProgress = (200 - shrunk) / 100;
    expect(shrinkProgress).toBeGreaterThan(growthProgress);
  });

  it("snaps on respawn-scale jumps instead of easing across the board", () => {
    const state = createGrowthEasingState();
    easedMassFor(state, "worm", 3_000, 0);
    // Death -> respawn at spawn mass: a > 3x drop must snap, never glide.
    expect(easedMassFor(state, "worm", 48, 16)).toBe(48);
  });

  it("is deterministic, frame-rate independent, and fails safe on bad input", () => {
    const at60 = createGrowthEasingState();
    easedMassFor(at60, "worm", 100, 0);
    const whole = easedMassFor(at60, "worm", 150, 1_000 / 60);

    const at120 = createGrowthEasingState();
    easedMassFor(at120, "worm", 100, 0);
    easedMassFor(at120, "worm", 150, 1_000 / 120);
    const halves = easedMassFor(at120, "worm", 150, 1_000 / 60);
    expect(halves).toBeCloseTo(whole, 10);

    const state = createGrowthEasingState();
    expect(easedMassFor(state, "worm", Number.NaN, 0)).toBeNaN();
    expect(easedMassFor(state, "worm", -5, 0)).toBe(-5);
  });

  it("prunes worms not seen for two seconds", () => {
    const state = createGrowthEasingState();
    easedMassFor(state, "stale", 100, 0);
    easedMassFor(state, "fresh", 100, 2_400);
    pruneGrowthEasing(state, 2_500);
    expect(state.byId.has("stale")).toBe(false);
    expect(state.byId.has("fresh")).toBe(true);
  });
});
