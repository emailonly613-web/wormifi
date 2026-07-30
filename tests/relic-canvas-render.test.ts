import { describe, expect, it } from "vitest";

import {
  createActiveRelicCanvasModel,
  createGroundRelicCanvasModel,
  groundRelicLabelLocalOffsetX,
  groundRelicLabelOffsetX,
} from "../src/game/relicCanvasRender";

describe("Relic canvas presentation", () => {
  it("keeps named ground Relics out of ordinary-loot and Compass presentation", () => {
    const spyglass = createGroundRelicCanvasModel({
      relicKind: "emerald-spyglass",
      relicDurationTicks: 100,
    }, 0.1, 1_000);
    const cutlass = createGroundRelicCanvasModel({
      relicKind: "pepper-cutlass",
      relicDurationTicks: 80,
    }, 0.1, 1_000);

    expect(spyglass).toMatchObject({
      durationSeconds: 10,
      durationLabel: "10S",
      label: "EMERALD SPYGLASS · 10S",
      presentation: {
        relicKind: "emerald-spyglass",
        effectText: "25% FARTHER VIEW + DANGER BEARINGS",
        ground: { spriteName: "emerald-spyglass" },
      },
    });
    expect(cutlass).toMatchObject({
      durationSeconds: 8,
      label: "PEPPER CUTLASS · 8S",
      presentation: {
        relicKind: "pepper-cutlass",
        effectText: "BOOST COST -25% · SAME TOP SPEED",
        ground: { spriteName: "pepper-cutlass" },
      },
    });
    expect(spyglass?.label).not.toContain("COMPASS");
    expect(cutlass?.label).not.toContain("COMPASS");
  });

  it("maps only the legacy Collector ground envelope to Loot Compass", () => {
    expect(createGroundRelicCanvasModel({
      specialist: "collector",
      specialistDurationTicks: 120,
    }, 0.1, 0)).toMatchObject({
      label: "LOOT COMPASS · 12S",
      spriteRotation: 0,
      orbitRotation: 0,
      presentation: {
        relicKind: "loot-compass",
        ground: { spriteName: "loot-compass" },
      },
    });
    expect(createGroundRelicCanvasModel({}, 0.1, 0)).toBeUndefined();
  });

  it("keeps carrier identity explicit through its authoritative expiry tick", () => {
    const active = {
      kind: "collector" as const,
      relicKind: "pepper-cutlass" as const,
      activatedAtTick: 20,
      expiresAtTick: 100,
      durationTicks: 80,
    };
    expect(createActiveRelicCanvasModel(active, 60)).toMatchObject({
      timerRatio: 0.5,
      presentation: {
        relicKind: "pepper-cutlass",
        ground: { spriteName: "pepper-cutlass" },
      },
    });
    expect(createActiveRelicCanvasModel(active, 100)).toBeUndefined();
    expect(createActiveRelicCanvasModel({
      ...active,
      relicKind: undefined,
    }, 60)?.presentation.relicKind).toBe("loot-compass");
  });

  it("clamps a ground Relic label into narrow mobile canvas edges", () => {
    expect(groundRelicLabelOffsetX(380, 390, 120)).toBe(-56);
    expect(groundRelicLabelOffsetX(10, 390, 120)).toBe(56);
    expect(groundRelicLabelOffsetX(195, 390, 120)).toBe(0);
    expect(groundRelicLabelOffsetX(310, 320, 400)).toBe(-150);
  });

  it("converts mobile CSS edge corrections back through camera zoom and DPR", () => {
    // A 120-local-pixel label at 1.5 CSS px/local occupies 180 CSS px.
    // Centered at x=370 on a 390px canvas, it must move 78 CSS px left,
    // which is 52 local pixels regardless of backing-store DPR.
    expect(groundRelicLabelLocalOffsetX(370, 390, 120, 1.5)).toBe(-52);
    expect(groundRelicLabelLocalOffsetX(20, 390, 120, 1.5)).toBe(52);
    expect(groundRelicLabelLocalOffsetX(195, 390, 120, 1.5)).toBe(0);
    expect(groundRelicLabelLocalOffsetX(370, 390, 120, 0)).toBe(0);
  });
});
