import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import {
  CINEMATIC_HEAD_CATALOG,
  captainPortraitSource,
  cinematicHeadSource,
} from "../src/game/cinematicHeads";
import { WORM_MATERIAL_PATTERNS } from "../src/game/wormMaterialPatterns";

function countAlphaPixels(bytes: Buffer) {
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  const stride = width * 4;
  const chunks: Buffer[] = [];
  for (let offset = 8; offset < bytes.length;) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    if (type === "IDAT") chunks.push(bytes.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks));
  let previous = Buffer.alloc(stride);
  let sourceOffset = 0;
  let transparent = 0;
  let visible = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = raw[sourceOffset];
    sourceOffset += 1;
    const scanline = Buffer.allocUnsafe(stride);
    for (let x = 0; x < stride; x += 1) {
      const encoded = raw[sourceOffset + x];
      const left = x >= 4 ? scanline[x - 4] : 0;
      const up = previous[x];
      const upperLeft = x >= 4 ? previous[x - 4] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = up;
      else if (filter === 3) predictor = Math.floor((left + up) / 2);
      else if (filter === 4) {
        const estimate = left + up - upperLeft;
        const leftDistance = Math.abs(estimate - left);
        const upDistance = Math.abs(estimate - up);
        const upperLeftDistance = Math.abs(estimate - upperLeft);
        predictor = leftDistance <= upDistance && leftDistance <= upperLeftDistance
          ? left
          : upDistance <= upperLeftDistance ? up : upperLeft;
      } else if (filter !== 0) {
        throw new Error(`Unsupported PNG filter ${filter}`);
      }
      scanline[x] = (encoded + predictor) & 0xff;
    }
    for (let x = 3; x < stride; x += 4) {
      if (scanline[x] === 0) transparent += 1;
      else visible += 1;
    }
    previous = scanline;
    sourceOffset += stride;
  }
  return { transparent, visible };
}

describe("cinematic creature heads", () => {
  it("assigns one distinct authored cutout to every material pattern", () => {
    expect(CINEMATIC_HEAD_CATALOG.map((head) => head.pattern))
      .toEqual(WORM_MATERIAL_PATTERNS);
    expect(new Set(CINEMATIC_HEAD_CATALOG.map((head) => head.file)).size)
      .toBe(WORM_MATERIAL_PATTERNS.length);
  });

  it("ships valid RGBA PNGs with real transparent and visible pixels", () => {
    for (const head of CINEMATIC_HEAD_CATALOG) {
      const source = cinematicHeadSource(head.pattern);
      const bytes = readFileSync(resolve(`public${source}`));
      expect(bytes.subarray(0, 8).toString("hex"), head.id)
        .toBe("89504e470d0a1a0a");
      // PNG IHDR color type 6 is truecolor with alpha.
      expect(bytes[25], head.id).toBe(6);
      expect(bytes[24], head.id).toBe(8);
      expect(bytes[28], head.id).toBe(0);
      const alpha = countAlphaPixels(bytes);
      expect(alpha.transparent, `${head.id} transparent pixels`).toBeGreaterThan(10_000);
      expect(alpha.visible, `${head.id} visible pixels`).toBeGreaterThan(10_000);
    }
  });

  it("ships a lightweight launcher portrait for every authored head", () => {
    for (const head of CINEMATIC_HEAD_CATALOG) {
      const source = captainPortraitSource(head.pattern);
      const path = resolve(`public${source}`);
      const bytes = readFileSync(path);
      expect(bytes.subarray(0, 4).toString("ascii"), head.id).toBe("RIFF");
      expect(bytes.subarray(8, 12).toString("ascii"), head.id).toBe("WEBP");
      expect(statSync(path).size, `${head.id} launcher payload`).toBeLessThan(40_000);
    }
  });
});
