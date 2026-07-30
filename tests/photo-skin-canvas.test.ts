import { describe, expect, it } from "vitest";
import {
  buildPhotoSkinCanvasPortholes,
  drawPhotoSkinCanvas,
  type PhotoSkinCanvasRenderPlan,
} from "../src/game/photoSkinCanvas";

interface CanvasCall {
  method: string;
  args: unknown[];
}

function fakeCanvasContext() {
  const calls: CanvasCall[] = [];
  const record = (method: string) => (...args: unknown[]) => calls.push({ method, args });
  const context = {
    globalAlpha: 1,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    save: record("save"),
    restore: record("restore"),
    beginPath: record("beginPath"),
    moveTo: record("moveTo"),
    lineTo: record("lineTo"),
    closePath: record("closePath"),
    arc: record("arc"),
    clip: record("clip"),
    translate: record("translate"),
    drawImage: record("drawImage"),
    fill: record("fill"),
    stroke: record("stroke"),
  } as unknown as CanvasRenderingContext2D;
  return { context, calls };
}

function renderPlan(ids: readonly string[]): PhotoSkinCanvasRenderPlan {
  return {
    theme: { palette: ["#64ffe1", "#166d83", "#effff8"] },
    localPhotosEnabled: true,
    localPhotos: ids.map((id, index) => ({
      id,
      width: index % 2 === 0 ? 800 : 400,
      height: index % 2 === 0 ? 400 : 800,
      focalPoint: {
        x: index === 0 ? -1 : index === 1 ? 2 : 0.5,
        y: index === 1 ? 1 : 0.5,
      },
    })),
  };
}

describe("collision-contained portrait portholes", () => {
  it("reveals an ordered prefix as the continuous worm gains usable length", () => {
    const plan = renderPlan(["first", "second", "third", "fourth", "fifth", "sixth"]);
    const short = buildPhotoSkinCanvasPortholes(
      [{ x: 0, y: 0 }, { x: 78, y: 0 }],
      12,
      { x: 1, y: 0 },
      plan,
    );
    const grown = buildPhotoSkinCanvasPortholes(
      [{ x: 0, y: 0 }, { x: 560, y: 0 }],
      12,
      { x: 1, y: 0 },
      plan,
    );

    expect(short.length).toBeGreaterThan(0);
    expect(short.length).toBeLessThan(grown.length);
    expect(short.map((porthole) => porthole.photoId)).toEqual(
      plan.localPhotos.slice(0, short.length).map((photo) => photo.id),
    );
    expect(grown.map((porthole) => porthole.photoId)).toEqual([
      "first",
      "second",
      "third",
      "fourth",
      "fifth",
      "sixth",
    ]);
    expect(grown.every((porthole) => (
      porthole.outerRadius <= 12 * 0.72 &&
      porthole.innerRadius < porthole.outerRadius &&
      porthole.center.y === 0
    ))).toBe(true);
  });

  it("uses square focal crops suitable for recognizable upright portraits", () => {
    const portholes = buildPhotoSkinCanvasPortholes(
      [{ x: 0, y: 0 }, { x: 180, y: 0 }],
      14,
      { x: 1, y: 0 },
      renderPlan(["wide-face", "tall-face"]),
    );

    expect(portholes).toHaveLength(2);
    expect(portholes[0].sourceCrop).toEqual({
      sx: 0,
      sy: 0,
      sw: 400,
      sh: 400,
    });
    expect(portholes[1].sourceCrop).toEqual({
      sx: 0,
      sy: 400,
      sw: 400,
      sh: 400,
    });
  });

  it("draws each available portrait after one exact union-of-capsules body clip", () => {
    const { context, calls } = fakeCanvasContext();
    const firstImage = { tag: "portrait-first" } as unknown as CanvasImageSource;
    const secondImage = { tag: "portrait-second" } as unknown as CanvasImageSource;
    const result = drawPhotoSkinCanvas(context, {
      points: [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 120, y: 40 }],
      bodyRadius: 10,
      direction: { x: 1, y: 0 },
      decodedImages: new Map([
        ["first", firstImage],
        ["second", secondImage],
      ]),
      renderPlan: renderPlan(["first", "second"]),
    });

    const clips = calls.filter((call) => call.method === "clip");
    const draws = calls.filter((call) => call.method === "drawImage");
    expect(result).toMatchObject({
      mode: "portrait-portholes",
      renderedPhotoIds: ["first", "second"],
      unavailablePhotoIds: [],
      deferredPhotoIds: [],
      plannedPortholeCount: 2,
      portholeCount: 2,
    });
    expect(draws).toHaveLength(2);
    expect(draws.map((draw) => draw.args[0])).toEqual([firstImage, secondImage]);
    expect(clips.length).toBeGreaterThanOrEqual(3);
    expect(calls.indexOf(clips[0])).toBeLessThan(calls.indexOf(draws[0]));
    for (const draw of draws) {
      expect(draw.args).toHaveLength(9);
      expect(draw.args[6]).toBeCloseTo(-5.5, 6);
      expect(draw.args[8]).toBeCloseTo(11, 6);
    }
  });

  it("reports decoded failures and length-deferred portraits without drawing them", () => {
    const { context } = fakeCanvasContext();
    const ids = ["first", "missing", "later-a", "later-b", "later-c", "later-d"];
    const plan = renderPlan(ids);
    const result = drawPhotoSkinCanvas(context, {
      points: [{ x: 0, y: 0 }, { x: 72, y: 0 }],
      bodyRadius: 12,
      direction: { x: 1, y: 0 },
      decodedImages: new Map([["first", {} as CanvasImageSource]]),
      renderPlan: plan,
    });

    expect(result.mode).toBe("portrait-portholes");
    expect(result.renderedPhotoIds).toEqual(["first"]);
    expect(result.unavailablePhotoIds).toContain("missing");
    expect(result.deferredPhotoIds).toEqual(
      ids.slice(result.plannedPortholeCount),
    );
  });

  it("fails closed to authored-theme-only without decoded images or a valid 2–6 photo plan", () => {
    const noImages = fakeCanvasContext();
    const unavailable = drawPhotoSkinCanvas(noImages.context, {
      points: [{ x: 0, y: 0 }, { x: 120, y: 0 }],
      bodyRadius: 10,
      direction: { x: 1, y: 0 },
      decodedImages: new Map(),
      renderPlan: renderPlan(["first", "second"]),
    });
    expect(unavailable).toMatchObject({
      mode: "authored-theme-only",
      renderedPhotoIds: [],
      unavailablePhotoIds: ["first", "second"],
      portholeCount: 0,
    });
    expect(noImages.calls).toEqual([]);

    const onePhoto = fakeCanvasContext();
    const invalidPlan = drawPhotoSkinCanvas(onePhoto.context, {
      points: [{ x: 0, y: 0 }, { x: 120, y: 0 }],
      bodyRadius: 10,
      direction: { x: Number.NaN, y: Number.NaN },
      decodedImages: new Map([["only", {} as CanvasImageSource]]),
      renderPlan: renderPlan(["only"]),
    });
    expect(invalidPlan.mode).toBe("authored-theme-only");
    expect(invalidPlan.portholeCount).toBe(0);
    expect(onePhoto.calls).toEqual([]);
  });
});
