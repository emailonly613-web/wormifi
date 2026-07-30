import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  PIRATE_RENDER_ASSETS,
  drawContinuousPirateWorm,
  drawFacetedGem,
  drawNauticalChart,
  drawRivalHoardGem,
  drawTreasureChest,
  drawTreasureShard,
} from "../src/game/treasureRender";

function recordingContext() {
  const roundMarks: string[] = [];
  const strokeWidths: number[] = [];
  const strokeBeginPathCounts: number[] = [];
  const strokeRecords: Array<{
    strokeStyle: unknown;
    lineWidth: unknown;
    globalAlpha: unknown;
    lineDash: number[];
    moveToCount: number;
    lineToCount: number;
    quadraticCurveToCount: number;
  }> = [];
  let beginPathCount = 0;
  let moveToCount = 0;
  let lineToCount = 0;
  let quadraticCurveToCount = 0;
  const target: Record<PropertyKey, unknown> = { lineWidth: 1, lineDash: [] };
  const context = new Proxy(target, {
    get: (object, property) => {
      if (property === "beginPath") {
        return () => {
          beginPathCount += 1;
          moveToCount = 0;
          lineToCount = 0;
          quadraticCurveToCount = 0;
        };
      }
      if (property === "moveTo") return () => { moveToCount += 1; };
      if (property === "lineTo") return () => { lineToCount += 1; };
      if (property === "quadraticCurveTo") {
        return () => { quadraticCurveToCount += 1; };
      }
      if (property === "arc" || property === "ellipse") {
        return () => roundMarks.push(String(property));
      }
      if (property === "setLineDash") {
        return (lineDash: number[]) => {
          object.lineDash = [...lineDash];
        };
      }
      if (property === "stroke") {
        return () => {
          if (typeof object.lineWidth === "number") strokeWidths.push(object.lineWidth);
          strokeBeginPathCounts.push(beginPathCount);
          strokeRecords.push({
            strokeStyle: object.strokeStyle,
            lineWidth: object.lineWidth,
            globalAlpha: object.globalAlpha,
            lineDash: [...(object.lineDash as number[])],
            moveToCount,
            lineToCount,
            quadraticCurveToCount,
          });
        };
      }
      if (property in object) return object[property];
      return () => undefined;
    },
    set: (object, property, value) => {
      object[property] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { context, roundMarks, strokeWidths, strokeBeginPathCounts, strokeRecords };
}

describe("pirate treasure visual contract", () => {
  it("renders every collectible class as shaped treasure, never a circular pellet", () => {
    const { context, roundMarks } = recordingContext();
    drawFacetedGem(context, 2.2, "#ff527e", 1_000, 11);
    drawTreasureChest(context, 4.2, "#55e6d0", 1_000, 12);
    drawRivalHoardGem(context, 3.2, "#5ba5ff", 1_000, 13);
    drawTreasureShard(context, 10, 10, 2, "#ffd56c", 0.2);
    expect(roundMarks).toEqual([]);
  });

  it("uses wave routes and compass geometry instead of a dotted arena grid", () => {
    const { context, roundMarks, strokeRecords } = recordingContext();
    drawNauticalChart(context, 390, 844, { x: 20, y: -50 }, 0.7, 1_000);
    expect(roundMarks).toEqual([]);

    const waveStrokes = strokeRecords.filter(
      (record) => record.strokeStyle === "rgba(73, 175, 195, 0.105)",
    );
    expect(waveStrokes).toHaveLength(1);
    expect(waveStrokes[0].moveToCount).toBeGreaterThan(1);
    expect(waveStrokes[0].lineToCount).toBeGreaterThan(waveStrokes[0].moveToCount);

    const routeStrokes = strokeRecords.filter(
      (record) => record.strokeStyle === "rgba(246, 205, 105, 0.08)",
    );
    expect(routeStrokes).toHaveLength(1);
    expect(routeStrokes[0].moveToCount).toBeGreaterThan(1);
    expect(routeStrokes[0].lineToCount).toBe(routeStrokes[0].moveToCount);
    expect(routeStrokes[0].lineDash).toEqual([18, 15]);
  });

  it("keeps the install icons on the same pirate-jewel art contract", () => {
    const icon = readFileSync(resolve("public/icon.svg"), "utf8");
    const maskable = readFileSync(resolve("public/icons/wormifi-maskable.svg"), "utf8");
    expect(icon).not.toContain('<circle cx="386"');
    expect(icon).not.toContain('<circle cx="423"');
    expect(maskable).not.toContain('<circle cx="374"');
    expect(maskable).not.toContain('<circle cx="398"');
    expect(icon).toContain('fill="#5b1b2d"');
    expect(maskable).toContain('fill="#5b1b2d"');
  });

  it("ships every optional authored renderer asset as a valid PNG", () => {
    for (const assetPath of Object.values(PIRATE_RENDER_ASSETS)) {
      const bytes = readFileSync(resolve(`public${assetPath}`));
      expect(bytes.subarray(0, 8).toString("hex"), assetPath).toBe("89504e470d0a1a0a");
    }
  });

  it("falls back synchronously to one collider-width worm surface", () => {
    const { context, strokeWidths, strokeBeginPathCounts } = recordingContext();
    drawContinuousPirateWorm(context, {
      points: [
        { x: 40, y: 20 },
        { x: 26, y: 22 },
        { x: 13, y: 27 },
        { x: 2, y: 34 },
      ],
      headRadius: 13,
      bodyRadius: 12,
      palette: ["#20ccb8", "#075d69", "#a0fff0"],
      direction: { x: 1, y: 0 },
      shielded: false,
      identity: 7,
      now: 1_000,
    });

    expect(Math.max(...strokeWidths)).toBe(24);
    expect(strokeWidths).toContain(12 * 1.86);
    expect(strokeWidths).toContain(12 * 1.42);
    expect(strokeBeginPathCounts.slice(0, 4)).toEqual([1, 1, 1, 1]);
  });

  it("batches every scale chevron into one unchanged styled stroke", () => {
    const { context, strokeRecords } = recordingContext();
    drawContinuousPirateWorm(context, {
      points: Array.from({ length: 10 }, (_, index) => ({
        x: 180 - index * 15,
        y: 30 + Math.sin(index * 0.45) * 18,
      })),
      headRadius: 13,
      bodyRadius: 12,
      palette: ["#20ccb8", "#075d69", "#a0fff0"],
      direction: { x: 1, y: 0 },
      shielded: false,
      identity: 2,
      now: 1_000,
    });

    const chevronStrokes = strokeRecords.filter(
      (record) => record.strokeStyle === "rgba(4,31,41,0.92)",
    );
    expect(chevronStrokes).toHaveLength(1);
    expect(chevronStrokes[0]).toMatchObject({
      lineWidth: 12 * 0.07,
      globalAlpha: 0.34,
      moveToCount: 4,
      quadraticCurveToCount: 4,
    });
  });
});
