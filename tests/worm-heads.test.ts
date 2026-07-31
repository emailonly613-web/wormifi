import { describe, expect, it } from "vitest";
import {
  drawWormHeadFace,
  eyeOpenness,
  gazeVector,
  type WormHeadOptions,
} from "../src/game/wormHeads";
import { WORM_MATERIAL_PATTERNS } from "../src/game/wormMaterialPatterns";

/** Records commands with coordinates so two paints can be compared exactly. */
function recordingContext() {
  const commands: string[] = [];
  let paints = 0;
  const target: Record<PropertyKey, unknown> = { lineWidth: 1, globalAlpha: 1 };
  const record = (name: string) => (...args: unknown[]) => {
    commands.push(`${name}(${args.map((v) => typeof v === "number" ? v.toFixed(3) : String(v)).join(",")})`);
  };
  const context = new Proxy(target, {
    get: (object, property) => {
      if (["moveTo", "lineTo", "quadraticCurveTo", "arc", "ellipse", "closePath", "beginPath"].includes(String(property))) {
        return record(String(property));
      }
      if (property === "stroke" || property === "fill") {
        return () => {
          paints += 1;
          commands.push(`${String(property)}[${String(object.strokeStyle ?? object.fillStyle)}|${String(object.globalAlpha)}]`);
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
  return { context, commands, paintCount: () => paints };
}

function headOptions(overrides: Partial<WormHeadOptions> = {}): WormHeadOptions {
  return {
    radius: 16,
    palette: ["#64ffe1", "#166d83", "#effff8"],
    direction: { x: 1, y: 0.2 },
    identity: 7,
    now: 5_000,
    motion: 1,
    shielded: false,
    ...overrides,
  };
}

describe("worm head faces", () => {
  it("gives every material pattern its own face", () => {
    const signatures = new Map<string, string>();
    for (const pattern of WORM_MATERIAL_PATTERNS) {
      const { context, commands, paintCount } = recordingContext();
      const drawn = drawWormHeadFace(context, pattern, headOptions({ motion: 0 }));
      expect(drawn, pattern).toBe(true);
      expect(paintCount(), pattern).toBeGreaterThan(1);
      // Faces are hand-authored but bounded: no face may degenerate into a
      // per-frame paint storm.
      expect(paintCount(), pattern).toBeLessThanOrEqual(16);
      signatures.set(pattern, commands.join(";"));
    }
    // Every material has a genuinely different face signature.
    expect(new Set(signatures.values()).size).toBe(WORM_MATERIAL_PATTERNS.length);
  });

  it("is a deterministic still at motion 0 at any clock", () => {
    for (const pattern of WORM_MATERIAL_PATTERNS) {
      const first = recordingContext();
      const second = recordingContext();
      drawWormHeadFace(first.context, pattern, headOptions({ motion: 0, now: 1_000 }));
      drawWormHeadFace(second.context, pattern, headOptions({ motion: 0, now: 654_321 }));
      expect(second.commands, pattern).toEqual(first.commands);
    }
  });

  it("tracks the steering direction with the pupils", () => {
    const up = recordingContext();
    const down = recordingContext();
    drawWormHeadFace(up.context, "tidal-ribbon", headOptions({ motion: 0, direction: { x: 0.4, y: -1 } }));
    drawWormHeadFace(down.context, "tidal-ribbon", headOptions({ motion: 0, direction: { x: 0.4, y: 1 } }));
    expect(down.commands).not.toEqual(up.commands);
  });

  it("declines unknown styles and degenerate radii", () => {
    const { context, paintCount } = recordingContext();
    expect(drawWormHeadFace(context, "not-a-style" as never, headOptions())).toBe(false);
    expect(drawWormHeadFace(context, "crown-wake", headOptions({ radius: 0 }))).toBe(false);
    expect(paintCount()).toBe(0);
  });
});

describe("blink and gaze primitives", () => {
  it("keeps eyes open at motion 0 and blinks on a schedule at motion 1", () => {
    expect(eyeOpenness(7, 999_999, 0)).toBe(eyeOpenness(7, 0, 0));
    let sawBlink = false;
    for (let ms = 0; ms < 8_000; ms += 40) {
      if (eyeOpenness(7, ms, 1) < 0.5) { sawBlink = true; break; }
    }
    expect(sawBlink).toBe(true);
  });

  it("desynchronizes blinks across identities", () => {
    const closedAt = (identity: number) => {
      for (let ms = 0; ms < 8_000; ms += 20) {
        if (eyeOpenness(identity, ms, 1) < 0.5) return ms;
      }
      return -1;
    };
    expect(closedAt(3)).not.toBe(closedAt(4));
  });

  it("falls back to a forward gaze for a standing worm", () => {
    expect(gazeVector({ x: 0, y: 0 })).toEqual({ x: 1, y: 0 });
    const gaze = gazeVector({ x: 3, y: 4 });
    expect(Math.hypot(gaze.x, gaze.y)).toBeCloseTo(1);
  });
});
