/**
 * Animated material layers for the continuous pirate worm.
 *
 * Every authored theme names a `pattern`; until this module existed those nine
 * patterns were metadata only, so nine themes rendered as one identical worm
 * in nine palettes. Each pattern is now a real animated material painted along
 * the body centerline.
 *
 * Contract with the collider (same law as the base worm surface):
 * - Every mark stays inside the skin stroke, at most 0.71 × bodyRadius from
 *   the centerline. Materials never widen the visible worm beyond the
 *   authoritative silhouette.
 * - `motion` scales the time term only. At motion 0 every material is a fully
 *   deterministic still composition — required by reduced-motion players and
 *   by replay/screenshot determinism.
 * - Each material draws a bounded number of batched passes (≤3 strokes/fills
 *   total, one beginPath per pass). No per-point save/restore, no allocation
 *   inside point loops. This runs for every visible worm on every frame in
 *   crowded 29-chain scenes; the frame budget is already spoken for.
 */

import {
  WORM_MATERIAL_PATTERNS,
  isWormMaterialPattern,
  wormMaterialForIdentity,
  type WormMaterialPattern,
} from "./wormMaterialPatterns";

export {
  WORM_MATERIAL_PATTERNS,
  isWormMaterialPattern,
  wormMaterialForIdentity,
  type WormMaterialPattern,
};

const TAU = Math.PI * 2;

/** The inner edge of the skin stroke; no material mark may cross it. */
const MATERIAL_MAX_OFFSET = 0.71;

export interface WormMaterialPoint {
  x: number;
  y: number;
}

export interface WormMaterialOptions {
  points: readonly WormMaterialPoint[];
  bodyRadius: number;
  palette: readonly string[];
  /** Stable per-player number so identical themes stay visually out of phase. */
  identity: number;
  now: number;
  /** 0 = still composition, 1 = full motion. Values in between slow the flow. */
  motion: number;
  /** Soft bloom around the brightest pass. Costs shadowBlur; off by default. */
  glow?: boolean;
}

/** One precomputed unit tangent+normal per interior point, allocation-free. */
const tangentScratch = { x: 1, y: 0 };

function tangentAt(
  points: readonly WormMaterialPoint[],
  index: number,
): WormMaterialPoint {
  const from = points[Math.max(0, index - 1)];
  const to = points[Math.min(points.length - 1, index + 1)];
  const x = to.x - from.x;
  const y = to.y - from.y;
  const length = Math.hypot(x, y);
  if (length > 0.0001) {
    tangentScratch.x = x / length;
    tangentScratch.y = y / length;
  }
  return tangentScratch;
}

function applyGlow(
  context: CanvasRenderingContext2D,
  color: string,
  bodyRadius: number,
  glow: boolean | undefined,
) {
  if (!glow) return;
  context.shadowColor = color;
  context.shadowBlur = Math.min(10, bodyRadius * 0.55);
}

function clearGlow(context: CanvasRenderingContext2D) {
  context.shadowBlur = 0;
}

/** Fractional part that stays stable for the negative phases identity can produce. */
function fract(value: number): number {
  return value - Math.floor(value);
}

/**
 * A flowing highlight ribbon weaving across the centerline like a current.
 * Two out-of-phase passes read as liquid moving through the body.
 */
function drawTidalRibbon(
  context: CanvasRenderingContext2D,
  options: WormMaterialOptions,
) {
  const { points, bodyRadius, palette, identity, now, motion, glow } = options;
  const t = now * 0.0022 * motion + identity * 0.61;
  const sway = bodyRadius * 0.4;

  for (let pass = 0; pass < 2; pass += 1) {
    const phaseShift = pass * Math.PI;
    context.globalAlpha = pass === 0 ? 0.5 : 0.26;
    context.strokeStyle = pass === 0 ? (palette[2] ?? "#a0fff0") : "#ffffff";
    context.lineWidth = Math.max(1, bodyRadius * (pass === 0 ? 0.3 : 0.14));
    if (pass === 0) applyGlow(context, context.strokeStyle, bodyRadius, glow);
    context.beginPath();
    for (let index = 0; index < points.length; index += 1) {
      const tangent = tangentAt(points, index);
      const offset = Math.sin(index * 0.86 + t * 2.2 + phaseShift) * sway;
      const x = points[index].x - tangent.y * offset;
      const y = points[index].y + tangent.x * offset;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
    clearGlow(context);
  }
}

/**
 * A recovered-gold specular gleam sweeping head→tail on a loop, the way light
 * runs down a polished crown band.
 */
function drawCrownWake(
  context: CanvasRenderingContext2D,
  options: WormMaterialOptions,
) {
  const { points, bodyRadius, palette, identity, now, motion, glow } = options;
  if (points.length < 3) return;
  const sweep = fract(now * 0.00028 * motion + identity * 0.137);
  const center = sweep * (points.length - 1);
  const span = Math.max(2, points.length * 0.22);

  // Static crown seam: a thin gold spine line the gleam travels along.
  context.globalAlpha = 0.3;
  context.strokeStyle = palette[0] ?? "#f4c75b";
  context.lineWidth = Math.max(1, bodyRadius * 0.12);
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index].x, points[index].y);
  }
  context.stroke();

  // The traveling gleam window.
  const from = Math.max(0, Math.ceil(center - span));
  const to = Math.min(points.length - 1, Math.floor(center + span));
  if (to > from) {
    context.globalAlpha = 0.62;
    context.strokeStyle = "#ffe9a4";
    context.lineWidth = Math.max(1.2, bodyRadius * 0.3);
    applyGlow(context, "#ffe9a4", bodyRadius, glow);
    context.beginPath();
    context.moveTo(points[from].x, points[from].y);
    for (let index = from + 1; index <= to; index += 1) {
      context.lineTo(points[index].x, points[index].y);
    }
    context.stroke();
    clearGlow(context);
  }

  // Three crown points riding the brightest sample.
  const peak = points[Math.max(0, Math.min(points.length - 1, Math.round(center)))];
  context.globalAlpha = 0.85;
  context.fillStyle = "#fff2b8";
  context.beginPath();
  for (let jewel = -1; jewel <= 1; jewel += 1) {
    const radius = bodyRadius * (jewel === 0 ? 0.16 : 0.1);
    const x = peak.x + jewel * bodyRadius * 0.42;
    context.moveTo(x + radius, peak.y);
    context.arc(x, peak.y, radius, 0, TAU);
  }
  context.fill();
}

/** Sonar pings blooming at fixed body stations with staggered phases. */
function drawSignalBloom(
  context: CanvasRenderingContext2D,
  options: WormMaterialOptions,
) {
  const { points, bodyRadius, palette, identity, now, motion, glow } = options;
  const t = now * 0.0009 * motion + identity * 0.29;

  // Two batched rings passes; alpha varies per pass, not per station.
  for (let pass = 0; pass < 2; pass += 1) {
    const color = pass === 0 ? (palette[0] ?? "#ff806d") : (palette[2] ?? "#ffd7a2");
    context.strokeStyle = color;
    context.globalAlpha = pass === 0 ? 0.42 : 0.24;
    context.lineWidth = Math.max(1, bodyRadius * (pass === 0 ? 0.12 : 0.08));
    if (pass === 0) applyGlow(context, color, bodyRadius, glow);
    context.beginPath();
    for (let index = 1 + pass; index < points.length - 1; index += 3) {
      const phase = fract(t + index * 0.37);
      const radius = bodyRadius * (0.16 + phase * 0.5);
      if (radius > bodyRadius * MATERIAL_MAX_OFFSET) continue;
      const point = points[index];
      context.moveTo(point.x + radius, point.y);
      context.arc(point.x, point.y, radius, 0, TAU);
    }
    context.stroke();
    clearGlow(context);
  }
}

/** Cut-gem facets along the spine; one facet at a time catches the light. */
function drawFacetedWake(
  context: CanvasRenderingContext2D,
  options: WormMaterialOptions,
) {
  const { points, bodyRadius, palette, identity, now, motion, glow } = options;
  if (points.length < 3) return;
  const size = bodyRadius * 0.4;
  const glintIndex = 1 + Math.floor(fract(now * 0.0006 * motion + identity * 0.41) * (points.length - 2));

  context.globalAlpha = 0.32;
  context.fillStyle = palette[2] ?? "#dbff8e";
  context.beginPath();
  for (let index = 1; index < points.length - 1; index += 2) {
    const point = points[index];
    context.moveTo(point.x, point.y - size);
    context.lineTo(point.x + size, point.y);
    context.lineTo(point.x, point.y + size);
    context.lineTo(point.x - size, point.y);
    context.closePath();
  }
  context.fill();

  const glint = points[glintIndex];
  if (glint) {
    context.globalAlpha = 0.88;
    context.fillStyle = "#ffffff";
    applyGlow(context, palette[0] ?? "#44f0a5", bodyRadius, glow);
    context.beginPath();
    context.moveTo(glint.x, glint.y - size);
    context.lineTo(glint.x + size, glint.y);
    context.lineTo(glint.x, glint.y + size);
    context.lineTo(glint.x - size, glint.y);
    context.closePath();
    context.fill();
    clearGlow(context);
  }
}

/** Bold gold war-chevrons marching tailward like a conveyor of banners. */
function drawRaiderChevron(
  context: CanvasRenderingContext2D,
  options: WormMaterialOptions,
) {
  const { points, bodyRadius, palette, identity, now, motion, glow } = options;
  if (points.length < 4) return;
  const spacing = 3;
  const march = Math.floor(fract(now * 0.0011 * motion + identity * 0.17) * spacing);
  const arm = bodyRadius * 0.5;

  context.globalAlpha = 0.55;
  context.strokeStyle = palette[2] ?? "#ffd36a";
  context.lineWidth = Math.max(1.1, bodyRadius * 0.17);
  context.lineCap = "round";
  applyGlow(context, palette[2] ?? "#ffd36a", bodyRadius, glow);
  context.beginPath();
  for (let index = 1 + march; index < points.length - 1; index += spacing) {
    const tangent = tangentAt(points, index);
    const center = points[index];
    // A chevron pointing toward the head: two arms swept back from a spine tip.
    const tipX = center.x + tangent.x * arm * 0.5;
    const tipY = center.y + tangent.y * arm * 0.5;
    context.moveTo(tipX - tangent.x * arm - tangent.y * arm, tipY - tangent.y * arm + tangent.x * arm);
    context.lineTo(tipX, tipY);
    context.lineTo(tipX - tangent.x * arm + tangent.y * arm, tipY - tangent.y * arm - tangent.x * arm);
  }
  context.stroke();
  clearGlow(context);
}

/** Ghost-pearl crescents drifting through two slow opposing opacity tides. */
function drawSpectralRipple(
  context: CanvasRenderingContext2D,
  options: WormMaterialOptions,
) {
  const { points, bodyRadius, palette, identity, now, motion, glow } = options;
  const t = now * 0.0016 * motion + identity * 0.53;
  const radius = bodyRadius * 0.52;

  for (let pass = 0; pass < 2; pass += 1) {
    const tide = 0.16 + 0.13 * Math.sin(t + pass * Math.PI);
    context.globalAlpha = Math.max(0.06, tide);
    context.strokeStyle = pass === 0 ? (palette[0] ?? "#fff4dd") : (palette[2] ?? "#8dfff0");
    context.lineWidth = Math.max(1, bodyRadius * 0.14);
    if (pass === 0) applyGlow(context, context.strokeStyle, bodyRadius, glow);
    context.beginPath();
    for (let index = 1 + pass; index < points.length - 1; index += 2) {
      const point = points[index];
      const open = 0.55 * Math.PI + (pass === 0 ? 0 : Math.PI);
      context.moveTo(
        point.x + Math.cos(open) * radius,
        point.y + Math.sin(open) * radius,
      );
      context.arc(point.x, point.y, radius, open, open + Math.PI * 0.9);
    }
    context.stroke();
    clearGlow(context);
  }
}

/** Flame licks flickering off the spine with per-point pseudo-random phase. */
function drawCutlassFlame(
  context: CanvasRenderingContext2D,
  options: WormMaterialOptions,
) {
  const { points, bodyRadius, palette, identity, now, motion, glow } = options;
  if (points.length < 3) return;
  const t = now * 0.0063 * motion + identity * 0.71;

  for (let pass = 0; pass < 2; pass += 1) {
    context.globalAlpha = pass === 0 ? 0.5 : 0.62;
    context.strokeStyle = pass === 0 ? (palette[0] ?? "#ff5b32") : (palette[2] ?? "#ffe05e");
    context.lineWidth = Math.max(1, bodyRadius * (pass === 0 ? 0.2 : 0.1));
    context.lineCap = "round";
    if (pass === 0) applyGlow(context, context.strokeStyle, bodyRadius, glow);
    context.beginPath();
    for (let index = 1; index < points.length - 1; index += 2) {
      const tangent = tangentAt(points, index);
      const side = index % 4 === 1 ? 1 : -1;
      const flicker = 0.5 + 0.24 * Math.sin(t + index * 2.7);
      const reach = bodyRadius * flicker * (pass === 0 ? 1 : 0.62);
      if (reach > bodyRadius * MATERIAL_MAX_OFFSET) continue;
      const point = points[index];
      const normalX = -tangent.y * side;
      const normalY = tangent.x * side;
      context.moveTo(point.x, point.y);
      context.quadraticCurveTo(
        point.x + normalX * reach * 0.5 - tangent.x * reach * 0.35,
        point.y + normalY * reach * 0.5 - tangent.y * reach * 0.35,
        point.x + normalX * reach,
        point.y + normalY * reach,
      );
    }
    context.stroke();
    clearGlow(context);
  }
}

/** A lightning bolt crackling along a stretch of hull that jumps over time. */
function drawBroadsideBolt(
  context: CanvasRenderingContext2D,
  options: WormMaterialOptions,
) {
  const { points, bodyRadius, palette, identity, now, motion, glow } = options;
  if (points.length < 4) return;

  // The bolt occupies one moving stretch; the jump cadence is time-stepped so
  // motion 0 pins it to a stable stretch instead of strobing.
  const step = Math.floor(now * 0.0016 * motion) + Math.abs(Math.trunc(identity));
  const start = 1 + ((step * 7) % Math.max(1, points.length - 3));
  const end = Math.min(points.length - 2, start + Math.max(3, Math.floor(points.length * 0.4)));
  const jag = bodyRadius * 0.34;

  // Static brass seams so the hull reads armored even between strikes.
  context.globalAlpha = 0.24;
  context.strokeStyle = palette[2] ?? "#f2c75c";
  context.lineWidth = Math.max(1, bodyRadius * 0.09);
  context.beginPath();
  for (let index = 2; index < points.length - 1; index += 3) {
    const tangent = tangentAt(points, index);
    const point = points[index];
    context.moveTo(point.x - tangent.y * jag, point.y + tangent.x * jag);
    context.lineTo(point.x + tangent.y * jag, point.y - tangent.x * jag);
  }
  context.stroke();

  if (end > start) {
    context.globalAlpha = 0.78;
    context.strokeStyle = "#fdf6c9";
    context.lineWidth = Math.max(1.1, bodyRadius * 0.16);
    context.lineJoin = "round";
    applyGlow(context, palette[0] ?? "#a9bfd2", bodyRadius, glow);
    context.beginPath();
    for (let index = start; index <= end; index += 1) {
      const tangent = tangentAt(points, index);
      const side = index % 2 === 0 ? 1 : -1;
      const x = points[index].x - tangent.y * jag * side;
      const y = points[index].y + tangent.x * jag * side;
      if (index === start) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
    clearGlow(context);
  }
}

/** Barber-pole bands sliding along the body so the hull appears to twist. */
function drawOracleSpiral(
  context: CanvasRenderingContext2D,
  options: WormMaterialOptions,
) {
  const { points, bodyRadius, palette, identity, now, motion, glow } = options;
  if (points.length < 3) return;
  const t = now * 0.0021 * motion + identity * 0.83;
  const reach = bodyRadius * 0.58;

  for (let pass = 0; pass < 2; pass += 1) {
    const color = pass === 0 ? (palette[0] ?? "#c27cff") : (palette[2] ?? "#50d8ff");
    context.globalAlpha = pass === 0 ? 0.42 : 0.3;
    context.strokeStyle = color;
    context.lineWidth = Math.max(1, bodyRadius * (pass === 0 ? 0.2 : 0.12));
    context.lineCap = "round";
    if (pass === 0) applyGlow(context, color, bodyRadius, glow);
    context.beginPath();
    for (let index = 1; index < points.length - 1; index += 1) {
      // The band's lateral position cycles along the body and drifts with
      // time; a diagonal stroke at that offset reads as a wrapped spiral.
      const cycle = Math.sin(index * 0.72 - t * 2.4 + pass * Math.PI);
      const offset = cycle * reach * 0.62;
      const tangent = tangentAt(points, index);
      const point = points[index];
      const baseX = point.x - tangent.y * offset;
      const baseY = point.y + tangent.x * offset;
      const armX = (tangent.x * 0.55 - tangent.y * 0.45) * bodyRadius * 0.4;
      const armY = (tangent.y * 0.55 + tangent.x * 0.45) * bodyRadius * 0.4;
      context.moveTo(baseX - armX, baseY - armY);
      context.lineTo(baseX + armX, baseY + armY);
    }
    context.stroke();
    clearGlow(context);
  }
}

/**
 * FOUNDER'S PACK — Kraken's Ink. Drifting abyssal ink billows, curling
 * tentacle flicks whose curl breathes with time, and paired sucker marks.
 */
function drawKrakenInk(
  context: CanvasRenderingContext2D,
  options: WormMaterialOptions,
) {
  const { points, bodyRadius, palette, identity, now, motion, glow } = options;
  if (points.length < 3) return;
  const t = now * 0.0014 * motion + identity * 0.47;

  // Ink billows sliding slowly along the hull.
  context.globalAlpha = 0.34;
  context.fillStyle = palette[1] ?? "#1b0f33";
  context.beginPath();
  for (let index = 1; index < points.length - 1; index += 2) {
    const drift = Math.sin(t + index * 0.9);
    const tangent = tangentAt(points, index);
    const radius = bodyRadius * (0.3 + 0.2 * Math.abs(drift));
    const x = points[index].x + tangent.x * drift * bodyRadius * 0.3;
    const y = points[index].y + tangent.y * drift * bodyRadius * 0.3;
    context.moveTo(x + radius, y);
    context.arc(x, y, radius, 0, TAU);
  }
  context.fill();

  // Tentacle flicks curling off alternating sides; the curl breathes.
  context.globalAlpha = 0.55;
  context.strokeStyle = palette[0] ?? "#8a5cff";
  context.lineWidth = Math.max(1, bodyRadius * 0.14);
  context.lineCap = "round";
  applyGlow(context, palette[0] ?? "#8a5cff", bodyRadius, glow);
  context.beginPath();
  for (let index = 1; index < points.length - 1; index += 2) {
    const tangent = tangentAt(points, index);
    const side = index % 4 === 1 ? 1 : -1;
    const breathe = 0.44 + 0.18 * Math.sin(t * 2.1 + index * 1.9);
    const reach = bodyRadius * breathe;
    const point = points[index];
    const normalX = -tangent.y * side;
    const normalY = tangent.x * side;
    context.moveTo(point.x, point.y);
    // The control point swings with time so the tip appears to curl.
    const curl = Math.sin(t * 1.7 + index) * 0.5;
    context.quadraticCurveTo(
      point.x + normalX * reach * 0.55 + tangent.x * reach * curl,
      point.y + normalY * reach * 0.55 + tangent.y * reach * curl,
      point.x + normalX * reach - tangent.x * reach * 0.4,
      point.y + normalY * reach - tangent.y * reach * 0.4,
    );
  }
  context.stroke();
  clearGlow(context);

  // Paired sucker marks, static, along the opposite side.
  context.globalAlpha = 0.4;
  context.fillStyle = palette[2] ?? "#d9c6ff";
  context.beginPath();
  for (let index = 2; index < points.length - 1; index += 3) {
    const tangent = tangentAt(points, index);
    const side = index % 4 === 1 ? -1 : 1;
    const radius = Math.max(0.6, bodyRadius * 0.07);
    for (let pair = 0; pair < 2; pair += 1) {
      const along = (pair === 0 ? -1 : 1) * bodyRadius * 0.16;
      const x = points[index].x - tangent.y * side * bodyRadius * 0.42 + tangent.x * along;
      const y = points[index].y + tangent.x * side * bodyRadius * 0.42 + tangent.y * along;
      context.moveTo(x + radius, y);
      context.arc(x, y, radius, 0, TAU);
    }
  }
  context.fill();
}

/**
 * FOUNDER'S PACK — Phoenix Wake. Embers rise off the hull and fade as they
 * climb; a reignition pulse sweeps TAIL→HEAD — deliberately the opposite
 * direction to the free crown gleam, so the two never read as one effect.
 */
function drawPhoenixWake(
  context: CanvasRenderingContext2D,
  options: WormMaterialOptions,
) {
  const { points, bodyRadius, palette, identity, now, motion, glow } = options;
  if (points.length < 3) return;
  const t = now * 0.0019 * motion + identity * 0.31;

  // Charred spine the fire lives on.
  context.globalAlpha = 0.3;
  context.strokeStyle = palette[1] ?? "#4a1208";
  context.lineWidth = Math.max(1, bodyRadius * 0.12);
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index].x, points[index].y);
  }
  context.stroke();

  // Embers in two age groups so alpha varies without per-ember paints.
  for (let pass = 0; pass < 2; pass += 1) {
    context.globalAlpha = pass === 0 ? 0.62 : 0.3;
    context.fillStyle = pass === 0 ? (palette[0] ?? "#ff7a2f") : (palette[2] ?? "#ffd36a");
    if (pass === 0) applyGlow(context, palette[0] ?? "#ff7a2f", bodyRadius, glow);
    context.beginPath();
    for (let index = 1 + pass; index < points.length - 1; index += 2) {
      const rise = fract(t * 0.9 + index * 0.37);
      const lift = rise * bodyRadius * 0.58;
      if (lift > bodyRadius * MATERIAL_MAX_OFFSET) continue;
      const tangent = tangentAt(points, index);
      const side = index % 4 === 1 ? 1 : -1;
      const size = Math.max(0.7, bodyRadius * 0.13 * (1 - rise * 0.6));
      const x = points[index].x - tangent.y * side * lift + tangent.x * Math.sin(rise * TAU) * bodyRadius * 0.08;
      const y = points[index].y + tangent.x * side * lift + tangent.y * Math.sin(rise * TAU) * bodyRadius * 0.08;
      context.moveTo(x, y - size);
      context.lineTo(x + size, y);
      context.lineTo(x, y + size);
      context.lineTo(x - size, y);
      context.closePath();
    }
    context.fill();
    if (pass === 0) clearGlow(context);
  }

  // The reignition pulse, sweeping tail→head.
  const sweep = 1 - fract(t * 0.24);
  const center = sweep * (points.length - 1);
  const span = Math.max(2, points.length * 0.18);
  const from = Math.max(0, Math.ceil(center - span));
  const to = Math.min(points.length - 1, Math.floor(center + span));
  if (to > from) {
    context.globalAlpha = 0.58;
    context.strokeStyle = "#fff1c4";
    context.lineWidth = Math.max(1.2, bodyRadius * 0.26);
    applyGlow(context, "#ffb35c", bodyRadius, glow);
    context.beginPath();
    context.moveTo(points[from].x, points[from].y);
    for (let index = from + 1; index <= to; index += 1) {
      context.lineTo(points[index].x, points[index].y);
    }
    context.stroke();
    clearGlow(context);
  }
}

/**
 * FOUNDER'S PACK — Leviathan Scale. Overlapping plate arcs across the hull;
 * three phase-offset color passes make the iridescence roll down the body.
 */
function drawLeviathanScale(
  context: CanvasRenderingContext2D,
  options: WormMaterialOptions,
) {
  const { points, bodyRadius, palette, identity, now, motion, glow } = options;
  if (points.length < 3) return;
  const t = now * 0.0016 * motion + identity * 0.67;
  const radius = bodyRadius * 0.55;
  const colors = [
    palette[0] ?? "#2fd6c3",
    palette[2] ?? "#9a7bff",
    "#ffd36a",
  ];

  for (let pass = 0; pass < 3; pass += 1) {
    // Each pass owns every third plate; its shimmer rolls along the body.
    context.strokeStyle = colors[pass];
    context.globalAlpha = 0.22 + 0.2 * Math.sin(t * 1.8 + pass * (TAU / 3));
    context.lineWidth = Math.max(1, bodyRadius * 0.13);
    context.lineCap = "round";
    if (pass === 0) applyGlow(context, colors[0], bodyRadius, glow);
    context.beginPath();
    for (let index = 1 + pass; index < points.length - 1; index += 3) {
      const tangent = tangentAt(points, index);
      const facing = Math.atan2(tangent.y, tangent.x);
      const point = points[index];
      // A plate is a rearward-open arc, like one fish scale seen side-on.
      context.moveTo(
        point.x + Math.cos(facing + Math.PI * 0.62) * radius,
        point.y + Math.sin(facing + Math.PI * 0.62) * radius,
      );
      context.arc(point.x, point.y, radius, facing + Math.PI * 0.62, facing + Math.PI * 1.38);
    }
    context.stroke();
    if (pass === 0) clearGlow(context);
  }
}

const MATERIAL_RENDERERS: Record<
  WormMaterialPattern,
  (context: CanvasRenderingContext2D, options: WormMaterialOptions) => void
> = {
  "tidal-ribbon": drawTidalRibbon,
  "crown-wake": drawCrownWake,
  "signal-bloom": drawSignalBloom,
  "faceted-wake": drawFacetedWake,
  "raider-chevron": drawRaiderChevron,
  "spectral-ripple": drawSpectralRipple,
  "cutlass-flame": drawCutlassFlame,
  "broadside-bolt": drawBroadsideBolt,
  "oracle-spiral": drawOracleSpiral,
  "kraken-ink": drawKrakenInk,
  "phoenix-wake": drawPhoenixWake,
  "leviathan-scale": drawLeviathanScale,
};

/**
 * Paints one pattern's material along the body. The caller has already painted
 * the base worm surface and clips nothing: every material keeps itself inside
 * the skin stroke by construction, so no silhouette clip pass is spent here.
 */
export function drawWormMaterial(
  context: CanvasRenderingContext2D,
  pattern: WormMaterialPattern,
  options: WormMaterialOptions,
): void {
  if (options.points.length < 2 || options.bodyRadius <= 0) return;
  const renderer = MATERIAL_RENDERERS[pattern];
  if (!renderer) return;
  context.save();
  renderer(context, {
    ...options,
    motion: Math.max(0, Math.min(1, Number.isFinite(options.motion) ? options.motion : 1)),
  });
  context.restore();
}
