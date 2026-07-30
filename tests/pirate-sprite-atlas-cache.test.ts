import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const ATLAS_DIMENSIONS = {
  1: { width: 680, height: 816 },
  2: { width: 1360, height: 1632 },
} as const;

const createdImages: ReadyImage[] = [];

class ReadyImage {
  complete = true;
  naturalWidth = 313;
  naturalHeight = 313;
  width = 313;
  height = 313;
  decoding = "auto";
  decode = vi.fn(() => Promise.resolve());
  addEventListener = vi.fn();
  private value = "";

  constructor() {
    createdImages.push(this);
  }

  set src(value: string) {
    this.value = value;
    const match = value.match(/ground-treasure-rotations-(1|2)x\.png$/);
    if (!match) return;
    const scale = Number(match[1]) as 1 | 2;
    this.naturalWidth = ATLAS_DIMENSIONS[scale].width;
    this.naturalHeight = ATLAS_DIMENSIONS[scale].height;
    this.width = this.naturalWidth;
    this.height = this.naturalHeight;
  }

  get src() {
    return this.value;
  }
}

function canvasContext(sourceScale = 1) {
  return {
    getTransform: vi.fn(() => ({ a: sourceScale, d: sourceScale })),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    drawImage: vi.fn(),
    imageSmoothingEnabled: false,
    imageSmoothingQuality: "low",
    globalAlpha: 1,
  };
}

async function flushMicrotasks(count = 20) {
  for (let index = 0; index < count; index += 1) await Promise.resolve();
}

const ITEM = {
  id: "semantic-treasure",
  position: { x: 10, y: 20 },
  radius: 8,
  seed: 1,
  screenX: 32,
  screenY: 48,
};

afterEach(() => {
  createdImages.length = 0;
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("bounded static pirate treasure rotation atlases", () => {
  it("preloads authored sprites without guessing a ground-atlas scale before the first canvas draw", async () => {
    const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    const requestIdleCallback = vi.fn((callback: () => void) => {
      callback();
      return 1;
    });
    vi.stubGlobal("Image", ReadyImage);
    vi.stubGlobal("window", {
      devicePixelRatio: 2,
      requestAnimationFrame,
      requestIdleCallback,
    });
    const {
      PIRATE_SPRITE_NAMES,
      drawGroundTreasureSpriteField,
      preloadPirateSpriteAtlas,
    } = await import("../src/game/pirateSpriteAtlas");

    preloadPirateSpriteAtlas();
    await flushMicrotasks();

    const authoredImages = createdImages.filter((image) =>
      !image.src.includes("ground-treasure-rotations")
    );
    expect(authoredImages).toHaveLength(PIRATE_SPRITE_NAMES.length);
    expect(new Set(authoredImages.map((image) => image.src))).toEqual(
      new Set(PIRATE_SPRITE_NAMES.map((name) =>
        `/assets/sprites/pirate-atlas/${name}.png`
      )),
    );
    expect(createdImages.some((image) =>
      image.src.includes("ground-treasure-rotations")
    )).toBe(false);

    // The crowded desktop canvas can intentionally render below the device's
    // DPR. Its actual backing transform, not window.devicePixelRatio, owns the
    // atlas choice.
    const context = canvasContext(1);
    drawGroundTreasureSpriteField(
      context as unknown as CanvasRenderingContext2D,
      [ITEM],
      () => ITEM.position,
      1,
      1440,
      900,
      0,
    );
    await flushMicrotasks();

    expect(createdImages.filter((image) =>
      image.src.includes("ground-treasure-rotations-1x.png")
    )).toHaveLength(1);
    expect(createdImages.some((image) =>
      image.src.includes("ground-treasure-rotations-2x.png")
    )).toBe(false);
  });

  it("falls back immediately, then reuses one asynchronously decoded atlas", async () => {
    vi.stubGlobal("Image", ReadyImage);
    const { drawGroundTreasureSpriteField } = await import(
      "../src/game/pirateSpriteAtlas"
    );
    const context = canvasContext(1);

    drawGroundTreasureSpriteField(
      context as unknown as CanvasRenderingContext2D,
      [ITEM],
      () => ITEM.position,
      1,
      320,
      180,
      0,
    );
    expect(context.drawImage.mock.calls[0]?.[0]).toBeInstanceOf(ReadyImage);
    expect(String((context.drawImage.mock.calls[0]?.[0] as ReadyImage).src)).toContain(
      "treasure-ruby-cluster.png",
    );

    await flushMicrotasks();
    const atlasImages = createdImages.filter((image) =>
      image.src.includes("ground-treasure-rotations-1x.png")
    );
    expect(atlasImages).toHaveLength(1);

    context.drawImage.mockClear();
    drawGroundTreasureSpriteField(
      context as unknown as CanvasRenderingContext2D,
      [ITEM],
      () => ITEM.position,
      1,
      320,
      180,
      100,
    );
    drawGroundTreasureSpriteField(
      context as unknown as CanvasRenderingContext2D,
      [ITEM],
      () => ITEM.position,
      1,
      320,
      180,
      200,
    );

    expect(context.drawImage).toHaveBeenCalledTimes(2);
    expect(context.drawImage.mock.calls.every(([source]) => source === atlasImages[0])).toBe(true);
    expect(createdImages.filter((image) => image.src.includes("ground-treasure-rotations")))
      .toHaveLength(1);
    expect(context.getTransform).toHaveBeenCalledTimes(3);
    expect(context.imageSmoothingEnabled).toBe(false);
    expect(context.imageSmoothingQuality).toBe("low");
  });

  it("loads only the requested backing scale and never creates runtime canvases or bitmaps", async () => {
    const createBitmap = vi.fn(() => {
      throw new Error("runtime bitmap creation must not run");
    });
    const createElement = vi.fn(() => {
      throw new Error("runtime atlas canvas creation must not run");
    });
    vi.stubGlobal("Image", ReadyImage);
    vi.stubGlobal("createImageBitmap", createBitmap);
    vi.stubGlobal("document", { createElement });
    const { drawGroundTreasureSpriteField } = await import(
      "../src/game/pirateSpriteAtlas"
    );
    const context = canvasContext(2);

    drawGroundTreasureSpriteField(
      context as unknown as CanvasRenderingContext2D,
      [ITEM],
      () => ITEM.position,
      1,
      320,
      180,
      0,
    );
    await flushMicrotasks();

    expect(createBitmap).not.toHaveBeenCalled();
    expect(createElement).not.toHaveBeenCalled();
    expect(createdImages.filter((image) => image.src.includes("ground-treasure-rotations-2x.png")))
      .toHaveLength(1);
    expect(createdImages.some((image) => image.src.includes("ground-treasure-rotations-1x.png")))
      .toBe(false);
  });

  it("maps semantic treasure and rotation classes to exact packed cells", async () => {
    vi.stubGlobal("Image", ReadyImage);
    const { drawGroundTreasureSpriteField } = await import(
      "../src/game/pirateSpriteAtlas"
    );
    const items = [0, 42, 84].map((seed, index) => ({
      ...ITEM,
      id: `cell-${seed}`,
      seed,
      screenX: 60 + index * 70,
    }));
    const context = canvasContext(1);
    drawGroundTreasureSpriteField(
      context as unknown as CanvasRenderingContext2D,
      items,
      () => ITEM.position,
      1,
      320,
      180,
      0,
    );
    await flushMicrotasks();
    context.drawImage.mockClear();
    drawGroundTreasureSpriteField(
      context as unknown as CanvasRenderingContext2D,
      items,
      () => ITEM.position,
      1,
      320,
      180,
      100,
    );

    const cellExtent = 68;
    const expectedFlatIndexes = items.map(({ seed }) =>
      (seed % 7) * 17 + seed % 17
    );
    expect(context.drawImage.mock.calls.map((call) => call[1])).toEqual(
      expectedFlatIndexes.map((index) => index % 10 * cellExtent),
    );
    expect(context.drawImage.mock.calls.map((call) => call[2])).toEqual(
      expectedFlatIndexes.map((index) => Math.floor(index / 10) * cellExtent),
    );
    expect(context.drawImage.mock.calls.every((call) => call[3] === 68 && call[4] === 68))
      .toBe(true);
  });

  it("preserves exact pulse sizing at source scales one and two", async () => {
    vi.stubGlobal("Image", ReadyImage);
    const { drawGroundTreasureSpriteField } = await import(
      "../src/game/pirateSpriteAtlas"
    );
    const positivePulseAt = Math.PI / 2 / 0.0024;
    const negativePulseAt = Math.PI * 3 / 2 / 0.0024;

    for (const sourceScale of [1, 2]) {
      const context = canvasContext(sourceScale);
      const baseSize = 30.1;
      const item = { ...ITEM, radius: baseSize / 3, seed: 0 };
      drawGroundTreasureSpriteField(
        context as unknown as CanvasRenderingContext2D,
        [item],
        () => item.position,
        1,
        320,
        180,
        0,
      );
      await flushMicrotasks();
      context.drawImage.mockClear();
      drawGroundTreasureSpriteField(
        context as unknown as CanvasRenderingContext2D,
        [item],
        () => item.position,
        1,
        320,
        180,
        positivePulseAt,
      );
      drawGroundTreasureSpriteField(
        context as unknown as CanvasRenderingContext2D,
        [item],
        () => item.position,
        1,
        320,
        180,
        negativePulseAt,
      );

      const cellExtent = sourceScale === 1 ? 68 : 136;
      expect(Number(context.drawImage.mock.calls[0]?.[7]) * 48 / (cellExtent / sourceScale))
        .toBeCloseTo(baseSize, 8);
      expect(Number(context.drawImage.mock.calls[1]?.[7]) * 48 / (cellExtent / sourceScale))
        .toBeCloseTo(baseSize * 0.94, 8);
    }
  });

  it("negative-caches an invalid atlas and keeps the authored fallback", async () => {
    class InvalidAtlasImage extends ReadyImage {
      override set src(value: string) {
        super.src = value;
        if (value.includes("ground-treasure-rotations")) {
          this.naturalWidth = 1;
          this.naturalHeight = 1;
        }
      }

      override get src() {
        return super.src;
      }
    }
    vi.stubGlobal("Image", InvalidAtlasImage);
    const { drawGroundTreasureSpriteField } = await import(
      "../src/game/pirateSpriteAtlas"
    );
    const context = canvasContext();
    delete (context as Partial<typeof context>).getTransform;

    drawGroundTreasureSpriteField(
      context as unknown as CanvasRenderingContext2D,
      [ITEM],
      () => ITEM.position,
      1,
      320,
      180,
      0,
    );
    await flushMicrotasks();
    drawGroundTreasureSpriteField(
      context as unknown as CanvasRenderingContext2D,
      [ITEM],
      () => ITEM.position,
      1,
      320,
      180,
      100,
    );
    await flushMicrotasks();

    expect(createdImages.filter((image) => image.src.includes("ground-treasure-rotations")))
      .toHaveLength(1);
    expect(context.drawImage.mock.calls.every(([source]) =>
      !String((source as ReadyImage).src).includes("ground-treasure-rotations")
    )).toBe(true);
  });

  it("ships deterministic lossless atlases with the contracted dimensions", async () => {
    for (const scale of [1, 2] as const) {
      const png = await readFile(path.resolve(
        `public/assets/sprites/pirate-atlas/ground-treasure-rotations-${scale}x.png`,
      ));
      expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
      expect(png.readUInt32BE(16)).toBe(ATLAS_DIMENSIONS[scale].width);
      expect(png.readUInt32BE(20)).toBe(ATLAS_DIMENSIONS[scale].height);
      expect(png.length).toBeLessThan(2_000_000);
    }
  });

  it("keeps the active-scale atlas cache explicitly bounded", async () => {
    const { PIRATE_GROUND_TREASURE_CACHE_LIMIT } = await import(
      "../src/game/pirateSpriteAtlas"
    );
    expect(PIRATE_GROUND_TREASURE_CACHE_LIMIT).toBe(2);
  });
});
