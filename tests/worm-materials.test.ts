import { describe, expect, it } from "vitest";
import {
  WORM_MATERIAL_PATTERNS,
  drawWormMaterial,
  isWormMaterialPattern,
  wormMaterialForIdentity,
  type WormMaterialOptions,
  type WormMaterialPattern,
} from "../src/game/wormMaterials";
import { drawContinuousPirateWorm } from "../src/game/treasureRender";
import { COSMETIC_THEME_CATALOG, COSMETIC_THEME_TIERS } from "../src/game/cosmeticThemes";
import {
  DEFAULT_RENDER_PREFERENCES,
  MATERIAL_MOTION_LEVELS,
  RENDER_PREFERENCES_STORAGE_KEY,
  materialGlowEnabled,
  materialMotionScale,
  normalizeRenderPreferences,
  readRenderPreferences,
  writeRenderPreferences,
} from "../src/game/renderPreferences";

/**
 * Records every path command with its coordinates plus the style at each
 * stroke/fill, so two draws can be compared for exact visual equality.
 */
function commandRecordingContext() {
  const commands: string[] = [];
  const strokeWidths: number[] = [];
  let paintOperations = 0;
  const target: Record<PropertyKey, unknown> = { lineWidth: 1, globalAlpha: 1 };
  const record = (name: string) => (...args: unknown[]) => {
    commands.push(`${name}(${args.map((value) => typeof value === "number" ? value.toFixed(3) : String(value)).join(",")})`);
  };
  const context = new Proxy(target, {
    get: (object, property) => {
      if (property === "moveTo" || property === "lineTo" || property === "quadraticCurveTo" ||
          property === "arc" || property === "closePath" || property === "beginPath") {
        return record(String(property));
      }
      if (property === "stroke" || property === "fill") {
        return () => {
          paintOperations += 1;
          if (property === "stroke" && typeof object.lineWidth === "number") {
            strokeWidths.push(object.lineWidth);
          }
          commands.push(`${String(property)}[${String(object.strokeStyle ?? object.fillStyle)}|${String(object.globalAlpha)}|${String(object.lineWidth)}]`);
        };
      }
      if (property === "save" || property === "restore") return () => undefined;
      if (property in object) return object[property];
      return () => undefined;
    },
    set: (object, property, value) => {
      object[property] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return {
    context,
    commands,
    strokeWidths,
    paintCount: () => paintOperations,
  };
}

const SPINE_POINTS = Array.from({ length: 12 }, (_, index) => ({
  x: 300 - index * 22,
  y: 80 + Math.sin(index * 0.55) * 26,
}));

function materialOptions(overrides: Partial<WormMaterialOptions> = {}): WormMaterialOptions {
  return {
    points: SPINE_POINTS,
    bodyRadius: 14,
    palette: ["#64ffe1", "#166d83", "#effff8"],
    identity: 9,
    now: 4_200,
    motion: 1,
    ...overrides,
  };
}

describe("worm material engine", () => {
  it("renders every declared pattern with bounded batched passes", () => {
    for (const pattern of WORM_MATERIAL_PATTERNS) {
      const { paintCount, strokeWidths } = (() => {
        const recorder = commandRecordingContext();
        drawWormMaterial(recorder.context, pattern, materialOptions());
        return recorder;
      })();
      expect(paintCount(), pattern).toBeGreaterThan(0);
      // The frame budget contract: a material spends at most four batched
      // passes, never one paint per body point.
      expect(paintCount(), pattern).toBeLessThanOrEqual(4);
      // No material stroke approaches the base skin stroke, let alone the
      // collider-width keel.
      for (const width of strokeWidths) {
        expect(width, pattern).toBeLessThan(14 * 1.42);
      }
    }
  });

  it("is a deterministic still image at motion 0 regardless of the clock", () => {
    for (const pattern of WORM_MATERIAL_PATTERNS) {
      const first = commandRecordingContext();
      const second = commandRecordingContext();
      drawWormMaterial(first.context, pattern, materialOptions({ motion: 0, now: 1_000 }));
      drawWormMaterial(second.context, pattern, materialOptions({ motion: 0, now: 987_654 }));
      expect(second.commands, pattern).toEqual(first.commands);
    }
  });

  it("animates at full motion: a later clock changes the paint", () => {
    let changed = 0;
    for (const pattern of WORM_MATERIAL_PATTERNS) {
      const first = commandRecordingContext();
      const second = commandRecordingContext();
      drawWormMaterial(first.context, pattern, materialOptions({ now: 1_000 }));
      drawWormMaterial(second.context, pattern, materialOptions({ now: 5_750 }));
      if (JSON.stringify(second.commands) !== JSON.stringify(first.commands)) changed += 1;
    }
    expect(changed).toBe(WORM_MATERIAL_PATTERNS.length);
  });

  it("draws nothing for degenerate bodies instead of throwing", () => {
    const { context, paintCount } = commandRecordingContext();
    drawWormMaterial(context, "tidal-ribbon", materialOptions({ points: [SPINE_POINTS[0]] }));
    drawWormMaterial(context, "crown-wake", materialOptions({ bodyRadius: 0 }));
    expect(paintCount()).toBe(0);
  });

  it("validates pattern names", () => {
    expect(isWormMaterialPattern("crown-wake")).toBe(true);
    expect(isWormMaterialPattern("neon-hyperdrive")).toBe(false);
    expect(isWormMaterialPattern(undefined)).toBe(false);
  });

  it("assigns a stable authored material to unthemed crews", () => {
    expect(wormMaterialForIdentity(0)).toBe(WORM_MATERIAL_PATTERNS[0]);
    expect(wormMaterialForIdentity(-10)).toBe(WORM_MATERIAL_PATTERNS[1]);
    expect(wormMaterialForIdentity(Number.NaN)).toBe(WORM_MATERIAL_PATTERNS[0]);
    expect(WORM_MATERIAL_PATTERNS).toContain(wormMaterialForIdentity(98_765));
  });
});

describe("worm material inside the full worm surface", () => {
  it("keeps the widest stroke at the exact collider width with a material active", () => {
    for (const pattern of WORM_MATERIAL_PATTERNS) {
      const { context, strokeWidths } = commandRecordingContext();
      drawContinuousPirateWorm(context, {
        points: SPINE_POINTS,
        headRadius: 15,
        bodyRadius: 14,
        palette: ["#64ffe1", "#166d83", "#effff8"],
        direction: { x: 1, y: 0 },
        shielded: false,
        identity: 3,
        now: 2_000,
        pattern: pattern as WormMaterialPattern,
        materialMotion: 1,
        materialGlow: true,
      });
      expect(Math.max(...strokeWidths), pattern).toBe(28);
    }
  });

  it("stays byte-identical to the plain surface when no pattern is given", () => {
    const withoutPattern = commandRecordingContext();
    const withUndefined = commandRecordingContext();
    const base = {
      points: SPINE_POINTS,
      headRadius: 15,
      bodyRadius: 14,
      palette: ["#64ffe1", "#166d83", "#effff8"],
      direction: { x: 1, y: 0 },
      shielded: false,
      identity: 3,
      now: 2_000,
    };
    drawContinuousPirateWorm(withoutPattern.context, base);
    drawContinuousPirateWorm(withUndefined.context, { ...base, pattern: undefined, materialMotion: 0.5 });
    expect(withUndefined.commands).toEqual(withoutPattern.commands);
  });
});

describe("authored theme catalog materials", () => {
  it("gives every theme a real material and a real tier", () => {
    for (const theme of COSMETIC_THEME_CATALOG) {
      expect(isWormMaterialPattern(theme.pattern), theme.id).toBe(true);
      expect(COSMETIC_THEME_TIERS).toContain(theme.tier);
    }
  });

  it("uses every material in some authored theme", () => {
    for (const pattern of WORM_MATERIAL_PATTERNS) {
      expect(
        COSMETIC_THEME_CATALOG.some((theme) => theme.pattern === pattern),
        pattern,
      ).toBe(true);
    }
  });

  it("keeps a graded ladder: every tier is represented", () => {
    for (const tier of COSMETIC_THEME_TIERS) {
      expect(
        COSMETIC_THEME_CATALOG.some((theme) => theme.tier === tier),
        tier,
      ).toBe(true);
    }
  });
});

describe("render preferences", () => {
  function memoryStorage(initial?: string) {
    const entries = new Map<string, string>();
    if (initial !== undefined) entries.set(RENDER_PREFERENCES_STORAGE_KEY, initial);
    return {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => void entries.set(key, value),
      entries,
    };
  }

  it("defaults to full motion with glow", () => {
    expect(readRenderPreferences(memoryStorage())).toEqual(DEFAULT_RENDER_PREFERENCES);
  });

  it("survives corrupted storage by falling back to defaults", () => {
    expect(readRenderPreferences(memoryStorage("{not json"))).toEqual(DEFAULT_RENDER_PREFERENCES);
    expect(normalizeRenderPreferences({ materialMotion: "warp-speed", materialGlow: "yes" }))
      .toEqual(DEFAULT_RENDER_PREFERENCES);
  });

  it("round-trips a write and maps every level to its motion scale", () => {
    const storage = memoryStorage();
    writeRenderPreferences({ materialMotion: "subtle", materialGlow: false }, storage);
    expect(readRenderPreferences(storage)).toEqual({ materialMotion: "subtle", materialGlow: false });
    expect(materialGlowEnabled(storage)).toBe(false);
    expect(materialMotionScale(storage)).toBeCloseTo(0.45);

    const scales = MATERIAL_MOTION_LEVELS.map((level) => {
      writeRenderPreferences({ materialMotion: level, materialGlow: true }, storage);
      return materialMotionScale(storage);
    });
    expect(scales[0]).toBe(1);
    expect(scales[2]).toBe(0);
    expect(new Set(scales).size).toBe(3);
  });
});
